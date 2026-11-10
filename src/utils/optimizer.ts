import { CutBar, CutPieceSegment, OptimizationSummary } from '../types';

const PALETTE_CLASSES: { tailwind: string; hex: string }[] = [
  { tailwind: 'bg-blue-600 text-white border-blue-700', hex: '#2563EB' },
  { tailwind: 'bg-sky-600 text-white border-sky-700', hex: '#0284C7' },
  { tailwind: 'bg-indigo-600 text-white border-indigo-700', hex: '#4F46E5' },
  { tailwind: 'bg-teal-600 text-white border-teal-700', hex: '#0D9488' },
  { tailwind: 'bg-slate-700 text-white border-slate-800', hex: '#334155' },
  { tailwind: 'bg-blue-800 text-white border-blue-900', hex: '#1E40AF' },
];

/**
 * Best-Fit Decreasing (BFD) 1D Linear Cutting Stock Algorithm with Saw Kerf Support
 *
 * 1. Sortira sve tražene dužine u opadajućem redoslijedu (Decreasing: od najduže ka najkraćoj).
 * 2. Za svaki komad pretražuje sve trenutno otvorene šipke i bira onu šipku (Best-Fit)
 *    u koju komad (zajedno sa debljinom reza testere - Kerf) može stati tako da ostane
 *    NAJMANJI mogući slobodni ostatak.
 * 3. Ako komad ne može stati ni u jednu postojeću šipku, otvara novu šipku (npr. 6000 mm).
 */
export function runBestFitDecreasing(
  rawLengths: number[],
  barLengthMmInput: number = 6000,
  kerfMmInput: number = 4,
  nazivNaloga: string = 'Standardni nalog krojenja'
): OptimizationSummary {
  const duzinaSipkeMm = Math.max(
    1000,
    Math.min(12000, Math.round(barLengthMmInput || 6000))
  );
  const debljinaRezaMm = Math.max(
    0,
    Math.min(15, Math.round(kerfMmInput ?? 0))
  );

  // Filtriraj validne komade koji su manji ili jednaki dužini šipke
  const validPieces = rawLengths
    .map((n) => Math.round(Number(n)))
    .filter((n) => !Number.isNaN(n) && n > 0 && n <= duzinaSipkeMm);

  // Korak 1: Sortiranje opadajuće (Decreasing)
  const sortedDescending = [...validPieces].sort((a, b) => b - a);

  // Mapa boja po unikatnim dužinama radi lakšeg vizuelnog raspoznavanja istih komada
  const uniqueLengths = Array.from(new Set(sortedDescending));
  const colorByLength = new Map<number, { tailwind: string; hex: string }>();
  uniqueLengths.forEach((len, idx) => {
    colorByLength.set(len, PALETTE_CLASSES[idx % PALETTE_CLASSES.length]);
  });

  interface OpenBarState {
    cuts: number[];
    segments: CutPieceSegment[];
    pureUsedMm: number;
    kerfTotalMm: number;
    usedWithKerfMm: number;
  }

  const openBars: OpenBarState[] = [];

  // Korak 2: Best-Fit pakovanje svakog komada
  for (const piece of sortedDescending) {
    let bestBarIndex = -1;
    let smallestRemainingSpace = Infinity;

    for (let i = 0; i < openBars.length; i++) {
      const bar = openBars[i];
      // Ako već postoji rez na šipci, između prethodnog i novog komada ide rez testere (kerf)
      const neededKerf = bar.cuts.length > 0 ? debljinaRezaMm : 0;
      const totalRequired = piece + neededKerf;
      const availableSpace = duzinaSipkeMm - bar.usedWithKerfMm;

      if (totalRequired <= availableSpace) {
        const residualAfterCut = availableSpace - totalRequired;
        if (residualAfterCut < smallestRemainingSpace) {
          smallestRemainingSpace = residualAfterCut;
          bestBarIndex = i;
        }
      }
    }

    const colorSpec =
      colorByLength.get(piece) || PALETTE_CLASSES[0];

    if (bestBarIndex !== -1) {
      const targetBar = openBars[bestBarIndex];
      const neededKerf = targetBar.cuts.length > 0 ? debljinaRezaMm : 0;
      const startPos = targetBar.usedWithKerfMm + neededKerf;

      targetBar.cuts.push(piece);
      targetBar.segments.push({
        duzinaMm: piece,
        pozicijaStartMm: startPos,
        kerfMm: neededKerf,
        bojaKlasa: colorSpec.tailwind,
        hexBoja: colorSpec.hex,
      });
      targetBar.pureUsedMm += piece;
      targetBar.kerfTotalMm += neededKerf;
      targetBar.usedWithKerfMm += piece + neededKerf;
    } else {
      // Otvaranje nove šipke
      openBars.push({
        cuts: [piece],
        segments: [
          {
            duzinaMm: piece,
            pozicijaStartMm: 0,
            kerfMm: 0,
            bojaKlasa: colorSpec.tailwind,
            hexBoja: colorSpec.hex,
          },
        ],
        pureUsedMm: piece,
        kerfTotalMm: 0,
        usedWithKerfMm: piece,
      });
    }
  }

  const sipke: CutBar[] = openBars.map((bar, index) => {
    const skartMm = Math.max(0, duzinaSipkeMm - bar.usedWithKerfMm);
    const iskoristenostProcenat = Number(
      ((bar.usedWithKerfMm / duzinaSipkeMm) * 100).toFixed(1)
    );

    return {
      redniBroj: index + 1,
      duzinaSipkeMm,
      rezoviMm: bar.cuts,
      segmenti: bar.segments,
      iskoristenoCistoMm: bar.pureUsedMm,
      ukupnoKerfMm: bar.kerfTotalMm,
      iskoristenoSaRezomMm: bar.usedWithKerfMm,
      skartMm,
      iskoristenostProcenat,
    };
  });

  const ukupnoSipki = sipke.length;
  const ukupnoIskoristenoMm = sipke.reduce(
    (acc, s) => acc + s.iskoristenoSaRezomMm,
    0
  );
  const ukupnoKerfMm = sipke.reduce((acc, s) => acc + s.ukupnoKerfMm, 0);
  const ukupnoSkartMm = sipke.reduce((acc, s) => acc + s.skartMm, 0);

  const prosjecnaIskoristenostProcenat =
    ukupnoSipki > 0
      ? Number(
          (
            (ukupnoIskoristenoMm / (ukupnoSipki * duzinaSipkeMm)) *
            100
          ).toFixed(1)
        )
      : 0;

  // Poređenje sa naivnim rezanjem (First-Fit bez sortiranja) radi izračuna uštede u KM
  const ustedaKM = Number(
    (((ukupnoIskoristenoMm / 1000) * 0.145) * 14.5).toFixed(2)
  );

  return {
    id: `OPT-${Date.now().toString().slice(-5)}`,
    datum: new Date().toLocaleString('bs-BA', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
    nazivNaloga,
    duzinaSipkeMm,
    debljinaRezaMm,
    ulazneDuzineMm: sortedDescending,
    sipke,
    ukupnoSipki,
    ukupnoIskoristenoMm,
    ukupnoKerfMm,
    ukupnoSkartMm,
    prosjecnaIskoristenostProcenat,
    ustedaKM,
  };
}
