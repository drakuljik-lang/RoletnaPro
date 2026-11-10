import React, { useEffect, useState } from 'react';
import {
  Scissors,
  Plus,
  RotateCcw,
  CheckCircle2,
  SlidersHorizontal,
  Layers,
  AlertCircle,
  Loader2,
  History,
} from 'lucide-react';
import { OptimizationSummary } from '../types';
import { runBestFitDecreasing } from '../utils/optimizer';
import { useAppContext } from '../context/AppContext';

interface CuttingOptimizerScreenProps {
  externalLengths?: number[] | null;
  externalSourceLabel?: string | null;
}

export const CuttingOptimizerScreen: React.FC<CuttingOptimizerScreenProps> = ({
  externalLengths,
  externalSourceLabel,
}) => {
  const { optimizationHistory, saveOptimizationResult } = useAppContext();

  const [duzineInput, setDuzineInput] = useState<string>('1200, 1150, 800');
  const [duzinaSipkeInput, setDuzinaSipkeInput] = useState<string>('6000');
  const [debljinaRezaInput, setDebljinaRezaInput] = useState<string>('0');
  const [nazivNalogaInput, setNazivNalogaInput] = useState<string>(
    'Standardno krojenje profila'
  );
  const [pojedinacnaDuzina, setPojedinacnaDuzina] = useState<string>('');
  const [pojedinacnaKolicina, setPojedinacnaKolicina] = useState<string>('2');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);

  const [rezultat, setRezultat] = useState<OptimizationSummary>(() =>
    runBestFitDecreasing([1200, 1150, 800], 6000, 0, 'Osnovni nalog krojenja')
  );

  // Ako su poslane dužine sa Dashboarda ili iz Kalkulatora
  useEffect(() => {
    if (externalLengths && externalLengths.length > 0) {
      const formatted = externalLengths.join(', ');
      setDuzineInput(formatted);
      if (externalSourceLabel) {
        setNazivNalogaInput(externalSourceLabel);
      }
      const barLen = Number(duzinaSipkeInput) || 6000;
      const kerf = Number(debljinaRezaInput) || 0;
      const summary = runBestFitDecreasing(
        externalLengths,
        barLen,
        kerf,
        externalSourceLabel || 'Uvezeni radni nalog'
      );
      setRezultat(summary);
      setErrorMsg(null);
    }
  }, [externalLengths, externalSourceLabel]);

  const parseLengthsString = (str: string): number[] => {
    return str
      .split(/[,;\s\n]+/)
      .map((s) => Number(s.trim()))
      .filter((n) => !Number.isNaN(n) && n > 0);
  };

  const handleOptimize = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const parsedLengths = parseLengthsString(duzineInput);
    const barLength = Number(duzinaSipkeInput) || 6000;
    const kerf = Number(debljinaRezaInput) || 0;

    if (parsedLengths.length === 0) {
      setErrorMsg(
        'Unesite barem jednu ispravnu dužinu za rezanje u milimetrima (npr. 1200, 1150, 800).'
      );
      return;
    }

    const oversized = parsedLengths.find((l) => l > barLength);
    if (oversized) {
      setErrorMsg(
        `Komad dužine ${oversized} mm je duži od zadate šipke (${barLength} mm). Povećajte dužinu šipke ili smanjite mjeru.`
      );
      return;
    }

    setErrorMsg(null);
    setIsCalculating(true);
    await new Promise((r) => setTimeout(r, 260));

    const summary = runBestFitDecreasing(
      parsedLengths,
      barLength,
      kerf,
      nazivNalogaInput.trim() || 'BFD Optimizacija'
    );
    setRezultat(summary);
    saveOptimizationResult(summary);
    setIsCalculating(false);
  };

  const handleAddPieceQuick = () => {
    const len = Number(pojedinacnaDuzina);
    const qty = Math.max(1, Math.min(50, Number(pojedinacnaKolicina) || 1));
    if (!len || len <= 0) return;

    const current = parseLengthsString(duzineInput);
    const added = Array(qty).fill(len);
    const combined = [...current, ...added];
    const nextStr = combined.join(', ');
    setDuzineInput(nextStr);
    setPojedinacnaDuzina('');

    const barLength = Number(duzinaSipkeInput) || 6000;
    const kerf = Number(debljinaRezaInput) || 0;
    const summary = runBestFitDecreasing(
      combined,
      barLength,
      kerf,
      nazivNalogaInput
    );
    setRezultat(summary);
  };

  const handleLoadExample = (
    lengthsStr: string,
    barStr: string,
    kerfStr: string,
    label: string
  ) => {
    setDuzineInput(lengthsStr);
    setDuzinaSipkeInput(barStr);
    setDebljinaRezaInput(kerfStr);
    setNazivNalogaInput(label);
    setErrorMsg(null);
    const parsed = parseLengthsString(lengthsStr);
    const summary = runBestFitDecreasing(
      parsed,
      Number(barStr) || 6000,
      Number(kerfStr) || 0,
      label
    );
    setRezultat(summary);
  };

  return (
    <div className="space-y-8">
      {/* Zaglavlje */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <p className="text-xs font-medium text-slate-500">
            Best-Fit Decreasing (BFD) 1D algoritam · Podrška za debljinu reza testere (Kerf)
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mt-1">
            Optimizator Krojenja Šipki
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-500 mr-1">Brzi primjeri:</span>
          <button
            type="button"
            onClick={() =>
              handleLoadExample(
                '1200, 1150, 800',
                '6000',
                '0',
                'Osnovni primjer (1200, 1150, 800)'
              )
            }
            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            Osnovni (1200, 1150, 800)
          </button>
          <button
            type="button"
            onClick={() =>
              handleLoadExample(
                '2150, 2150, 1650, 1400, 1400, 1200, 1196, 1196, 1150, 950, 800, 800',
                '6000',
                '4',
                'Smjenski BFD nalog sa Kerf 4mm'
              )
            }
            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            BFD + Kerf 4mm (12 kom)
          </button>
        </div>
      </div>

      {externalSourceLabel && (
        <div className="px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between text-xs text-blue-900">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              Učitane mjere profila iz radnog naloga:{' '}
              <strong>{externalSourceLabel}</strong>
            </span>
          </div>
          <span className="font-mono tabular-nums font-semibold">
            {parseLengthsString(duzineInput).length} komada
          </span>
        </div>
      )}

      {/* Glavna mreža: Lijevo = Forma (4 kolone), Desno = Vizuelni BFD prikaz i istorija (8 kolona) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div className="pb-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Parametri BFD optimizacije
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Algoritam sortira komade opadajuće i bira šipku sa najmanjim ostatkom
              </p>
            </div>
            <SlidersHorizontal className="w-5 h-5 text-blue-600 shrink-0" />
          </div>

          <form onSubmit={handleOptimize} className="space-y-4">
            <div>
              <label
                htmlFor="input-naziv-optimizacije"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Oznaka krojne liste
              </label>
              <input
                id="input-naziv-optimizacije"
                type="text"
                value={nazivNalogaInput}
                onChange={(e) => setNazivNalogaInput(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <label
                htmlFor="input-duzine-rezanja"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Dužine koje treba rezati (mm)
              </label>
              <textarea
                id="input-duzine-rezanja"
                rows={3}
                value={duzineInput}
                onChange={(e) => setDuzineInput(e.target.value)}
                placeholder="npr. 1200, 1150, 800"
                className="w-full p-3 text-sm font-mono tabular-nums bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Ukupno zahtjeva za rezanje:{' '}
                <strong className="font-mono tabular-nums text-slate-800">
                  {parseLengthsString(duzineInput).length} kom
                </strong>
              </p>
            </div>

            {/* Brzo dodavanje komada */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
              <p className="text-xs font-semibold text-slate-700">
                Dodaj serijsku mjeru (dužina × komada)
              </p>
              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-6">
                  <input
                    type="number"
                    min={50}
                    max={6000}
                    value={pojedinacnaDuzina}
                    onChange={(e) => setPojedinacnaDuzina(e.target.value)}
                    placeholder="Dužina (mm)"
                    aria-label="Dužina pojedinačnog komada u mm"
                    className="w-full px-2.5 py-1.5 text-xs font-mono tabular-nums bg-white border border-slate-300 rounded-md"
                  />
                </div>
                <div className="col-span-3">
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={pojedinacnaKolicina}
                    onChange={(e) => setPojedinacnaKolicina(e.target.value)}
                    placeholder="Kol."
                    aria-label="Količina komada"
                    className="w-full px-2 py-1.5 text-xs font-mono tabular-nums bg-white border border-slate-300 rounded-md"
                  />
                </div>
                <div className="col-span-3">
                  <button
                    type="button"
                    onClick={handleAddPieceQuick}
                    className="w-full h-full inline-flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Dodaj
                  </button>
                </div>
              </div>
            </div>

            {/* Dužina šipke (mm) & Debljina reza testere (Kerf) */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="input-duzina-sipke"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Dužina šipke (mm)
                </label>
                <input
                  id="input-duzina-sipke"
                  type="number"
                  min={1000}
                  max={12000}
                  required
                  value={duzinaSipkeInput}
                  onChange={(e) => setDuzinaSipkeInput(e.target.value)}
                  placeholder="6000"
                  className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                />
              </div>

              <div>
                <label
                  htmlFor="input-debljina-reza"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Rez testere / Kerf (mm)
                </label>
                <input
                  id="input-debljina-reza"
                  type="number"
                  min={0}
                  max={15}
                  value={debljinaRezaInput}
                  onChange={(e) => setDebljinaRezaInput(e.target.value)}
                  placeholder="4"
                  className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">Šipka:</span>
                {['5800', '6000', '6500'].map((std) => (
                  <button
                    key={std}
                    type="button"
                    onClick={() => setDuzinaSipkeInput(std)}
                    className={`px-2 py-1 font-mono rounded border cursor-pointer transition-colors ${
                      duzinaSipkeInput === std
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {std}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1">
                <span className="text-slate-500">Kerf:</span>
                {['0', '3', '4'].map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setDebljinaRezaInput(k)}
                    className={`px-2 py-1 font-mono rounded border cursor-pointer transition-colors ${
                      debljinaRezaInput === k
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {k}mm
                  </button>
                ))}
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="pt-2 flex items-center gap-2.5">
              <button
                type="submit"
                disabled={isCalculating}
                className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 rounded-lg shadow-xs transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                {isCalculating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Optimizujem (BFD)...
                  </>
                ) : (
                  <>
                    <Scissors className="w-4 h-4" />
                    Optimizuj
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() =>
                  handleLoadExample(
                    '1200, 1150, 800',
                    '6000',
                    '0',
                    'Osnovni primjer'
                  )
                }
                title="Resetuj na početne vrijednosti"
                className="px-3.5 py-2.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>

        {/* Desno: Vizuelni BFD rezultati i Istorija optimizacija */}
        <div className="lg:col-span-8 space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <p className="text-xs font-medium text-slate-500">Ukupno šipki</p>
              <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
                {rezultat.ukupnoSipki} kom
              </p>
              <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                Šipka: {rezultat.duzinaSipkeMm} mm · Kerf: {rezultat.debljinaRezaMm} mm
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <p className="text-xs font-medium text-slate-500">
                Iskorišteno profila
              </p>
              <p className="text-2xl font-bold font-mono tabular-nums text-blue-700 mt-1">
                {rezultat.ukupnoIskoristenoMm} mm
              </p>
              <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                Rezovi testere: {rezultat.ukupnoKerfMm} mm
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <p className="text-xs font-medium text-slate-500">
                Ukupan Škart / Ostatak
              </p>
              <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
                {rezultat.ukupnoSkartMm} mm
              </p>
              <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                {(rezultat.ukupnoSkartMm / 1000).toFixed(2)} m ukupnog škarta
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <p className="text-xs font-medium text-slate-500">
                BFD Iskorištenost
              </p>
              <p className="text-2xl font-bold font-mono tabular-nums text-emerald-700 mt-1">
                {rezultat.prosjecnaIskoristenostProcenat}%
              </p>
              <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                Ušteda: ≈ {rezultat.ustedaKM.toFixed(1)} KM
              </p>
            </div>
          </div>

          {/* Vizuelni prikaz šipki sa različitim bojama rezova i jasno označenim škartom */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-200">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Vizuelni plan rezanja (Best-Fit Decreasing)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Svaka dužina ima svoju boju segmenta, a neiskorišteni dio na kraju šipke je označen kao Škart
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-xs bg-blue-600 inline-block" />
                  Korisni rezovi
                </span>
                {rezultat.debljinaRezaMm > 0 && (
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2 h-3 bg-amber-500 inline-block" />
                    Rez testere ({rezultat.debljinaRezaMm}mm)
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-xs bg-red-100 border border-red-300 inline-block" />
                  Škart (Ostatak)
                </span>
              </div>
            </div>

            <div className="space-y-6">
              {rezultat.sipke.map((sipka) => {
                const kerfNote =
                  sipka.ukupnoKerfMm > 0
                    ? ` (+ ${sipka.ukupnoKerfMm} mm rez)`
                    : '';
                const formulaText = `Šipka ${sipka.redniBroj}: ${sipka.rezoviMm.join(' + ')}${kerfNote} = ${sipka.iskoristenoSaRezomMm} mm. Škart: ${sipka.skartMm} mm`;

                const wastePercent = Number(
                  ((sipka.skartMm / sipka.duzinaSipkeMm) * 100).toFixed(2)
                );

                return (
                  <div
                    key={sipka.redniBroj}
                    className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-blue-600 shrink-0" />
                        <p className="text-sm font-bold font-mono tabular-nums text-slate-900">
                          {formulaText}
                        </p>
                      </div>
                      <span className="text-xs font-mono font-semibold tabular-nums text-emerald-700 shrink-0">
                        Iskorišteno: {sipka.iskoristenostProcenat}%
                      </span>
                    </div>

                    {/* Proporcionalni grafik šipke */}
                    <div className="w-full h-12 bg-slate-200 border border-slate-300 rounded-lg overflow-hidden flex items-stretch select-none">
                      {sipka.segmenti.map((seg, idx) => {
                        const widthPct = Math.max(
                          4,
                          Number(
                            ((seg.duzinaMm / sipka.duzinaSipkeMm) * 100).toFixed(
                              2
                            )
                          )
                        );

                        return (
                          <React.Fragment key={`${sipka.redniBroj}-seg-${idx}`}>
                            {seg.kerfMm > 0 && (
                              <div
                                title={`Rez testere (Kerf): ${seg.kerfMm} mm`}
                                className="w-1 h-full bg-amber-400 shrink-0"
                              />
                            )}
                            <div
                              style={{ width: `${widthPct}%` }}
                              title={`Komad #${idx + 1}: ${seg.duzinaMm} mm (Pozicija: ${seg.pozicijaStartMm} mm)`}
                              className={`h-full flex flex-col items-center justify-center border-r border-white/25 px-1 overflow-hidden transition-all ${seg.bojaKlasa}`}
                            >
                              <span className="text-xs font-mono font-bold tabular-nums leading-none truncate">
                                {seg.duzinaMm} mm
                              </span>
                              <span className="text-[10px] font-mono opacity-85 leading-none mt-1 truncate">
                                #{idx + 1}
                              </span>
                            </div>
                          </React.Fragment>
                        );
                      })}

                      {/* Jasno naznačen ŠKART segment */}
                      {sipka.skartMm > 0 && (
                        <div
                          style={{ width: `${Math.max(6, wastePercent)}%` }}
                          title={`Škart / Neiskorišteni ostatak šipke: ${sipka.skartMm} mm`}
                          className="h-full flex flex-col items-center justify-center bg-red-50/90 text-red-800 px-2 overflow-hidden border-l-2 border-dashed border-red-300"
                        >
                          <span className="text-xs font-mono font-bold tabular-nums leading-none truncate">
                            ŠKART: {sipka.skartMm} mm
                          </span>
                          <span className="text-[10px] font-mono text-red-600 leading-none mt-1 truncate">
                            ({(100 - sipka.iskoristenostProcenat).toFixed(1)}%)
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono tabular-nums text-slate-500 pt-0.5">
                      <span>0 mm</span>
                      <span>
                        Čisti profil: {sipka.iskoristenoCistoMm} mm · Rezovi:{' '}
                        {sipka.ukupnoKerfMm} mm · Škart: {sipka.skartMm} mm
                      </span>
                      <span>{sipka.duzinaSipkeMm} mm</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Istorija sačuvanih optimizacija u LocalStorage */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-slate-500" />
                <h3 className="text-sm font-bold text-slate-900">
                  Istorija optimizacija krojenja (Sačuvano u LocalStorage)
                </h3>
              </div>
              <span className="text-xs font-mono text-slate-500 tabular-nums">
                {optimizationHistory.length} zapisa
              </span>
            </div>

            <div className="overflow-x-auto max-h-60 overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                    <th className="py-2.5 px-4">ID · Datum</th>
                    <th className="py-2.5 px-4">Naziv naloga</th>
                    <th className="py-2.5 px-4 text-right">Broj šipki</th>
                    <th className="py-2.5 px-4 text-right">Iskorištenost</th>
                    <th className="py-2.5 px-4 text-right">Ukupan škart</th>
                    <th className="py-2.5 px-4 text-right">Akcija</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {optimizationHistory.map((hist) => (
                    <tr key={hist.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-4 font-mono text-slate-500 tabular-nums whitespace-nowrap">
                        {hist.id} · {hist.datum}
                      </td>
                      <td className="py-2.5 px-4 font-medium text-slate-900">
                        {hist.nazivNaloga}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-semibold tabular-nums">
                        {hist.ukupnoSipki} × {hist.duzinaSipkeMm} mm
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-700 tabular-nums">
                        {hist.prosjecnaIskoristenostProcenat}%
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-slate-700 tabular-nums">
                        {hist.ukupnoSkartMm} mm
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setDuzineInput(hist.ulazneDuzineMm.join(', '));
                            setDuzinaSipkeInput(String(hist.duzinaSipkeMm));
                            setDebljinaRezaInput(String(hist.debljinaRezaMm));
                            setNazivNalogaInput(hist.nazivNaloga);
                            setRezultat(hist);
                          }}
                          className="text-xs font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
                        >
                          Prikaži
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
