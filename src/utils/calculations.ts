import {
  CalculationResult,
  Client,
  CompanySettings,
  CutListItem,
  HarmoBomNormativ,
  OptimizationSummary,
  ProductType,
  RalColorCode,
  RalColorOption,
  RoletnaBomNormativ,
  SpecItem,
  StockMovement,
  WarehouseItem,
  WorkOrder,
} from '../types';
import { runBestFitDecreasing } from './optimizer';

/**
 * Jedinične cijene materijala (KM) definisane kao konstante na vrhu fajla
 * Svi novčani obračuni pretvaraju se u cijele feninge (1 KM = 100 feninga)
 */
export const PRICE_RATES_KM = {
  HARMO_OKVIR_PROFIL_M: 14.5,
  HARMO_RUCICA_PROFIL_M: 16.0,
  HARMO_MREZICA_M2: 32.0,
  HARMO_KANAP_M: 1.8,
  HARMO_OKOV_SET: 8.5,
  ROLETNA_ZASTOR_M2: 58.0,
  ROLETNA_SIRINA_ZASTORA_M: 42.0,
  ROLETNA_OSOVINA_AUTOMAT_SET: 24.0,
  ROLETNA_VODILICA_137_M: 16.5,
  ROLETNA_VODILICA_165_M: 18.0,
  FIKSNI_PROFIL_M: 8.5,
  FIKSNI_MREZICA_M2: 18.0,
  FIKSNI_OKOV_SET: 7.5,
} as const;

export const RAL_COLORS: RalColorOption[] = [
  {
    value: 'RAL 9016 - Bijela',
    label: 'RAL 9016 — Saobraćajna bijela',
    ralCode: 'RAL 9016',
    hex: '#F8FAFC',
    borderHex: '#CBD5E1',
    surchargePercent: 0,
  },
  {
    value: 'RAL 7016 - Antracit siva',
    label: 'RAL 7016 — Antracit siva (Mat)',
    ralCode: 'RAL 7016',
    hex: '#374151',
    borderHex: '#1F2937',
    surchargePercent: 8,
  },
  {
    value: 'RAL 8014 - Sepija smeđa',
    label: 'RAL 8014 — Sepija smeđa',
    ralCode: 'RAL 8014',
    hex: '#4A3728',
    borderHex: '#35261B',
    surchargePercent: 5,
  },
  {
    value: 'RAL 9006 - Srebrna metalik',
    label: 'RAL 9006 — Bijeli aluminij (Srebrna)',
    ralCode: 'RAL 9006',
    hex: '#9CA3AF',
    borderHex: '#6B7280',
    surchargePercent: 8,
  },
  {
    value: 'Zlatni hrast (Drvo dekor)',
    label: 'Zlatni hrast — Renolit folija (Drvo dekor)',
    ralCode: 'DEKOR 2178',
    hex: '#9A5B25',
    borderHex: '#784419',
    surchargePercent: 18,
  },
];

export const PRODUCT_TYPES: {
  value: ProductType;
  label: string;
  opis: string;
  osnovnaCijenaM2KM: number;
}[] = [
  {
    value: 'Harmo komarnik',
    label: 'Harmo komarnik — Plišse komarnik (Lyctum normativ)',
    opis: 'Aluminijski Plišse (Harmonika) komarnik po zvaničnom Lyctum tehničkom crtežu (Horizontalna, Vertikala, Ručica, Mrežica, Broj polja, Kanap)',
    osnovnaCijenaM2KM: 95,
  },
  {
    value: 'Ugradbena roletna',
    label: 'Ugradbena roletna (Nadprozorska kutija)',
    opis: 'Ugradbena roletna po fabričkom Excel normativu (L Zastora, Širina Zastora, Vodilice 137 i Vodilice 165)',
    osnovnaCijenaM2KM: 135,
  },
  {
    value: 'Vanjska ALU roletna',
    label: 'Vanjska ALU roletna (Predprozorska 45°)',
    opis: 'Vanjska ALU roletna po fabričkom Excel normativu (L Zastora, Širina Zastora, Vodilice 137 i Vodilice 165)',
    osnovnaCijenaM2KM: 145,
  },
  {
    value: 'Fiksni komarnik',
    label: 'Fiksni komarnik (ALU okvir 25x11mm)',
    opis: 'Fiksni aluminijski ram sa fiberglas mrežicom i zakretnim kukicama',
    osnovnaCijenaM2KM: 48,
  },
];

/**
 * Finansijski obračun u feningima (1 KM = 100 feninga)
 */
export function kmToFeninga(iznosKM: number): number {
  if (Number.isNaN(iznosKM) || !Number.isFinite(iznosKM)) return 0;
  const scaled = Math.round(iznosKM * 10000) / 100;
  return Math.round(scaled);
}

export function feningaToKM(feninga: number): number {
  return Number((feninga / 100).toFixed(2));
}

export function formatFeningaKM(feninga: number): string {
  const sign = feninga < 0 ? '-' : '';
  const abs = Math.abs(feninga);
  const cijeli = Math.floor(abs / 100);
  const dec = abs % 100;
  return `${sign}${cijeli}.${dec < 10 ? '0' : ''}${dec}`;
}

export function obracunajPdvFeninga(
  osnovicaFeninga: number,
  stopaPdvProcent: number = 17
): {
  osnovicaFeninga: number;
  pdvFeninga: number;
  ukupnoFeninga: number;
  osnovicaKM: number;
  pdvKM: number;
  ukupnoSaPdvKM: number;
} {
  const cleanOsnovica = Math.round(osnovicaFeninga);
  const pdvFeninga = Math.round((cleanOsnovica * stopaPdvProcent) / 100);
  const ukupnoFeninga = cleanOsnovica + pdvFeninga;

  return {
    osnovicaFeninga: cleanOsnovica,
    pdvFeninga: pdvFeninga,
    ukupnoFeninga: ukupnoFeninga,
    osnovicaKM: feningaToKM(cleanOsnovica),
    pdvKM: feningaToKM(pdvFeninga),
    ukupnoSaPdvKM: feningaToKM(ukupnoFeninga),
  };
}

/**
 * Proizvodni normativ (BOM) iz Excel tabele za Roletne
 */
export function calculateRoletnaBom(
  sirinaMm: number,
  visinaMm: number
): RoletnaBomNormativ {
  const sirinaCm = sirinaMm / 10;
  const visinaCm = visinaMm / 10;

  const lZastoraMm = Math.round((sirinaCm - 7) * 10);
  const sirinaZastoraMm = Math.round((visinaCm * 25) / 100 - 2) * 10;
  const vodilice137Mm = Math.round((visinaCm - 14) * 10);
  const vodilice165Mm = Math.round((visinaCm - 17) * 10);

  return {
    ulazSirinaCm: sirinaCm,
    ulazVisinaCm: visinaCm,
    lZastoraMm: Math.max(0, lZastoraMm),
    sirinaZastoraMm: Math.max(0, sirinaZastoraMm),
    vodilice137Mm: Math.max(0, vodilice137Mm),
    vodilice165Mm: Math.max(0, vodilice165Mm),
  };
}

/**
 * FAZA 6: Zvanični tehnički normativ (BOM) prema crtežima kompanije "Lyctum"
 * za "Plišse komarnik" (Harmonika komarnik).
 *
 * SVE ULAZNE MJERE SU U MILIMETRIMA (mm).
 * Pretvaraju se u centimetre (cm) dijeljenjem sa 10, primjenjuje se formula,
 * a zatim se rezultat vraća u milimetre množenjem sa 10 uz Math.round().
 */
export function calculateHarmoBom(
  sirinaMm: number,
  visinaMm: number
): HarmoBomNormativ {
  const sirinaCm = sirinaMm / 10;
  const visinaCm = visinaMm / 10;

  // 1. Horizontalna (Širina okvira): Širina komarnika umanjena za 70 mm (7 cm)
  const horizontalnaMm = Math.round((sirinaMm / 10 - 7) * 10);

  // 2. Vertikala (Visina okvira): Visina komarnika umanjena za 74 mm (7.4 cm)
  const vertikalaMm = Math.round((visinaMm / 10 - 7.4) * 10);

  // 3. Ručica (Krilo): Identična dužina kao Vertikala
  const rucicaMm = Math.round((visinaMm / 10 - 7.4) * 10);

  // 4. Visina mrežice: Visina komarnika umanjena za 50 mm (5 cm)
  const visinaMreziceMm = Math.round((visinaMm / 10 - 5) * 10);

  // 5. Širina mrežice: Jednaka punoj širini komarnika
  const sirinaMreziceMm = Math.round(sirinaMm);

  // 6. Broj polja mrežice (Redova): Širina u cm podijeljena sa 1.4 cm (tj. sirinaMm / 14)
  const brojPoljaMrezice = Math.round(sirinaMm / 14);

  // 7. Kanap (Konac): 6 nizova kanapa + 50 cm za čvorove -> Math.round((visinaMm / 10 * 6 + 50) * 10)
  const kanapMm = Math.round(((visinaMm / 10) * 6 + 50) * 10);
  const kanapMetara = Number((kanapMm / 1000).toFixed(2));

  return {
    ulazSirinaCm: sirinaCm,
    ulazVisinaCm: visinaCm,
    horizontalnaMm: Math.max(0, horizontalnaMm),
    vertikalaMm: Math.max(0, vertikalaMm),
    rucicaMm: Math.max(0, rucicaMm),
    visinaMreziceMm: Math.max(0, visinaMreziceMm),
    sirinaMreziceMm: Math.max(0, sirinaMreziceMm),
    brojPoljaMrezice: Math.max(1, brojPoljaMrezice),
    kanapMm: Math.max(0, kanapMm),
    kanapMetara: Math.max(0, kanapMetara),
  };
}

/**
 * FAZA 6: Obračun materijala, rada, marže i PDV-a isključivo u integer feningima
 */
function finalizeFinancialBreakdown(
  stavke: SpecItem[],
  rawAreaM2PerUnit: number,
  kolicina: number,
  laborCostPerM2KM: number,
  marginPercent: number
) {
  const materijalFeninga = stavke.reduce(
    (sum, item) => sum + kmToFeninga(item.cijenaKM),
    0
  );

  const ukupnaPovrsinaM2 = rawAreaM2PerUnit * kolicina;
  const radFeninga = Math.round(ukupnaPovrsinaM2 * laborCostPerM2KM * 100);

  const zbirMaterijalIRadFeninga = materijalFeninga + radFeninga;
  const osnovicaFeninga = Math.round(
    zbirMaterijalIRadFeninga * (1 + marginPercent / 100)
  );
  const marzaFeninga = osnovicaFeninga - zbirMaterijalIRadFeninga;

  const obracun = obracunajPdvFeninga(osnovicaFeninga, 17);
  const jedinicnaCijenaProizvodaFeninga = Math.round(
    osnovicaFeninga / kolicina
  );

  return {
    laborCostPerM2KM,
    marginPercent,
    materijalFeninga,
    materijalKM: feningaToKM(materijalFeninga),
    radFeninga,
    radKM: feningaToKM(radFeninga),
    marzaFeninga,
    marzaKM: feningaToKM(marzaFeninga),
    cijenaPoKomaduKM: feningaToKM(jedinicnaCijenaProizvodaFeninga),
    osnovicaFeninga: obracun.osnovicaFeninga,
    pdvFeninga: obracun.pdvFeninga,
    ukupnoFeninga: obracun.ukupnoFeninga,
    osnovicaKM: obracun.osnovicaKM,
    pdvKM: obracun.pdvKM,
    ukupnoSaPdvKM: obracun.ukupnoSaPdvKM,
  };
}

export function calculateOrderSpec(
  sirinaMmInput: number,
  visinaMmInput: number,
  tipProizvoda: ProductType,
  bojaRal: RalColorCode,
  kolicinaInput: number = 1,
  laborCostPerM2Input: number = 15,
  marginPercentInput: number = 20
): CalculationResult {
  const sirinaMm = Math.max(300, Math.min(5000, Math.round(sirinaMmInput || 0)));
  const visinaMm = Math.max(300, Math.min(4000, Math.round(visinaMmInput || 0)));
  const kolicina = Math.max(1, Math.min(200, Math.round(kolicinaInput || 1)));
  const laborCostPerM2 = Math.max(0, Number(laborCostPerM2Input) || 0);
  const marginPercent = Math.max(0, Number(marginPercentInput) || 0);

  // Konverzija u centimetre (cm)
  const sirinaCm = sirinaMm / 10;
  const visinaCm = visinaMm / 10;

  const ralOption =
    RAL_COLORS.find((c) => c.value === bojaRal) || RAL_COLORS[0];
  const colorMultiplier = 1 + ralOption.surchargePercent / 100;

  const rawAreaM2 = (sirinaMm * visinaMm) / 1_000_000;
  const potrebnaMrezicaM2 = Number(rawAreaM2.toFixed(2));
  const obracunskaM2 = Math.max(1.0, rawAreaM2);

  const stavke: SpecItem[] = [];
  const krojnaLista: CutListItem[] = [];
  const profiliZaKrojenjeMm: number[] = [];

  if (tipProizvoda === 'Harmo komarnik') {
    const bom = calculateHarmoBom(sirinaMm, visinaMm);

    // Za svaki komad Plišse komarnika u BFD Optimizator šaljemo tačne dužine profila:
    // 2x Horizontalna, 2x Vertikala i 1x Ručica (sve u mm)
    for (let i = 0; i < kolicina; i++) {
      profiliZaKrojenjeMm.push(
        bom.horizontalnaMm,
        bom.horizontalnaMm,
        bom.vertikalaMm,
        bom.vertikalaMm,
        bom.rucicaMm
      );
    }

    krojnaLista.push(
      {
        id: 'cut-hk-horizontalna',
        kodKomponente: 'HARMO_HORIZONTALNA',
        nazivKomponente: 'Horizontalna (Širina okvira)',
        kategorija: 'ALU Profil',
        formulaExcel: 'Math.round((sirinaMm / 10 - 7) * 10)',
        mjeraCm: Number((bom.horizontalnaMm / 10).toFixed(2)),
        mjeraMm: bom.horizontalnaMm,
        prikazMjere: `${bom.horizontalnaMm} mm (${(bom.horizontalnaMm / 10).toFixed(1)} cm)`,
        komadaPoJedinici: 2,
        ukupnoKomada: 2 * kolicina,
        ukupnaDuzinaMm: bom.horizontalnaMm * 2 * kolicina,
        ulaziUBfdOptimizator: true,
      },
      {
        id: 'cut-hk-vertikala',
        kodKomponente: 'HARMO_VERTIKALA',
        nazivKomponente: 'Vertikala (Visina okvira)',
        kategorija: 'ALU Profil',
        formulaExcel: 'Math.round((visinaMm / 10 - 7.4) * 10)',
        mjeraCm: Number((bom.vertikalaMm / 10).toFixed(2)),
        mjeraMm: bom.vertikalaMm,
        prikazMjere: `${bom.vertikalaMm} mm (${(bom.vertikalaMm / 10).toFixed(1)} cm)`,
        komadaPoJedinici: 2,
        ukupnoKomada: 2 * kolicina,
        ukupnaDuzinaMm: bom.vertikalaMm * 2 * kolicina,
        ulaziUBfdOptimizator: true,
      },
      {
        id: 'cut-hk-rucica',
        kodKomponente: 'HARMO_RUCICA',
        nazivKomponente: 'Ručica (Krilo)',
        kategorija: 'ALU Profil',
        formulaExcel: 'Math.round((visinaMm / 10 - 7.4) * 10)',
        mjeraCm: Number((bom.rucicaMm / 10).toFixed(2)),
        mjeraMm: bom.rucicaMm,
        prikazMjere: `${bom.rucicaMm} mm (${(bom.rucicaMm / 10).toFixed(1)} cm)`,
        komadaPoJedinici: 1,
        ukupnoKomada: 1 * kolicina,
        ukupnaDuzinaMm: bom.rucicaMm * kolicina,
        ulaziUBfdOptimizator: true,
      },
      {
        id: 'cut-hk-visina-mrezice',
        kodKomponente: 'HARMO_VISINA_MREZICE',
        nazivKomponente: 'Visina mrežice',
        kategorija: 'Plisirana mrežica',
        formulaExcel: 'Math.round((visinaMm / 10 - 5) * 10)',
        mjeraCm: Number((bom.visinaMreziceMm / 10).toFixed(2)),
        mjeraMm: bom.visinaMreziceMm,
        prikazMjere: `${bom.visinaMreziceMm} mm (Širina: ${bom.sirinaMreziceMm} mm)`,
        komadaPoJedinici: 1,
        ukupnoKomada: 1 * kolicina,
        ukupnaDuzinaMm: bom.visinaMreziceMm * kolicina,
        ulaziUBfdOptimizator: false,
      },
      {
        id: 'cut-hk-broj-polja',
        kodKomponente: 'HARMO_BROJ_POLJA_MREZICE',
        nazivKomponente: 'Broj polja mrežice (Redova)',
        kategorija: 'Plisirana mrežica',
        formulaExcel: 'Math.round(sirinaMm / 14)',
        mjeraCm: Number((bom.sirinaMreziceMm / 10).toFixed(2)),
        mjeraMm: bom.brojPoljaMrezice,
        prikazMjere: `${bom.brojPoljaMrezice} polja (korak 14 mm / 1.4 cm)`,
        komadaPoJedinici: 1,
        ukupnoKomada: bom.brojPoljaMrezice * kolicina,
        ukupnaDuzinaMm: 0,
        ulaziUBfdOptimizator: false,
      },
      {
        id: 'cut-hk-kanap',
        kodKomponente: 'HARMO_KANAP',
        nazivKomponente: 'Kanap (Konac)',
        kategorija: 'Kanap (Konac)',
        formulaExcel: 'Math.round((visinaMm / 10 * 6 + 50) * 10)',
        mjeraCm: Number((bom.kanapMm / 10).toFixed(2)),
        mjeraMm: bom.kanapMm,
        prikazMjere: `${bom.kanapMetara.toFixed(2)} m (${bom.kanapMm} mm)`,
        komadaPoJedinici: 1,
        ukupnoKomada: 1 * kolicina,
        ukupnaDuzinaMm: bom.kanapMm * kolicina,
        ulaziUBfdOptimizator: false,
      }
    );

    // Finansijski obračun stavki u integer feningima koristeći konstante sa vrha fajla
    const jedFeningHorizontalna = kmToFeninga(
      ((bom.horizontalnaMm * 2) / 1000) *
        PRICE_RATES_KM.HARMO_OKVIR_PROFIL_M *
        colorMultiplier
    );
    const jedFeningVertikala = kmToFeninga(
      ((bom.vertikalaMm * 2) / 1000) *
        PRICE_RATES_KM.HARMO_OKVIR_PROFIL_M *
        colorMultiplier
    );
    const jedFeningRucica = kmToFeninga(
      (bom.rucicaMm / 1000) *
        PRICE_RATES_KM.HARMO_RUCICA_PROFIL_M *
        colorMultiplier
    );
    const jedFeningMrezica = kmToFeninga(
      obracunskaM2 * PRICE_RATES_KM.HARMO_MREZICA_M2
    );
    const jedFeningKanap = kmToFeninga(
      (bom.kanapMm / 1000) * PRICE_RATES_KM.HARMO_KANAP_M +
        PRICE_RATES_KM.HARMO_OKOV_SET
    );

    stavke.push(
      {
        sifra: 'LY-HK-HOR',
        naziv: `Horizontalna (Širina okvira): ${bom.horizontalnaMm} mm`,
        dimenzijaOpis: `2 × ${bom.horizontalnaMm} mm (Širina - 70 mm)`,
        kolicinaOpis: `${((bom.horizontalnaMm * 2 * kolicina) / 1000).toFixed(2)} m`,
        kolicinaBroj: kolicina,
        jedinicnaCijenaKM: feningaToKM(jedFeningHorizontalna),
        cijenaKM: feningaToKM(jedFeningHorizontalna * kolicina),
      },
      {
        sifra: 'LY-HK-VER',
        naziv: `Vertikala (Visina okvira): ${bom.vertikalaMm} mm`,
        dimenzijaOpis: `2 × ${bom.vertikalaMm} mm (Visina - 74 mm)`,
        kolicinaOpis: `${((bom.vertikalaMm * 2 * kolicina) / 1000).toFixed(2)} m`,
        kolicinaBroj: kolicina,
        jedinicnaCijenaKM: feningaToKM(jedFeningVertikala),
        cijenaKM: feningaToKM(jedFeningVertikala * kolicina),
      },
      {
        sifra: 'LY-HK-RUC',
        naziv: `Ručica (Krilo): ${bom.rucicaMm} mm`,
        dimenzijaOpis: `1 × ${bom.rucicaMm} mm (Visina - 74 mm)`,
        kolicinaOpis: `${((bom.rucicaMm * kolicina) / 1000).toFixed(2)} m`,
        kolicinaBroj: kolicina,
        jedinicnaCijenaKM: feningaToKM(jedFeningRucica),
        cijenaKM: feningaToKM(jedFeningRucica * kolicina),
      },
      {
        sifra: 'LY-HK-MRZ',
        naziv: `Visina mrežice: ${bom.visinaMreziceMm} mm (${bom.brojPoljaMrezice} polja)`,
        dimenzijaOpis: `Visina: ${bom.visinaMreziceMm} mm × Širina: ${bom.sirinaMreziceMm} mm (${bom.brojPoljaMrezice} polja)`,
        kolicinaOpis: `${(potrebnaMrezicaM2 * kolicina).toFixed(2)} m²`,
        kolicinaBroj: kolicina,
        jedinicnaCijenaKM: feningaToKM(jedFeningMrezica),
        cijenaKM: feningaToKM(jedFeningMrezica * kolicina),
      },
      {
        sifra: 'LY-HK-KNP',
        naziv: `Kanap (Konac): ${bom.kanapMetara.toFixed(2)} m (${bom.kanapMm} mm)`,
        dimenzijaOpis: `6 nizova + 50 cm čvorovi (${bom.kanapMetara.toFixed(2)} m/kom)`,
        kolicinaOpis: `${((bom.kanapMm * kolicina) / 1000).toFixed(2)} m`,
        kolicinaBroj: kolicina,
        jedinicnaCijenaKM: feningaToKM(jedFeningKanap),
        cijenaKM: feningaToKM(jedFeningKanap * kolicina),
      }
    );

    const fin = finalizeFinancialBreakdown(
      stavke,
      rawAreaM2,
      kolicina,
      laborCostPerM2,
      marginPercent
    );

    return {
      sirinaMm,
      visinaMm,
      sirinaCm,
      visinaCm,
      kolicina,
      tipProizvoda,
      bojaRal,
      potrebnaVodilicaMm: bom.horizontalnaMm,
      bocniProfilMm: bom.vertikalaMm,
      potrebnaMrezicaM2,
      harmoBom: bom,
      krojnaLista,
      stavke,
      profiliZaKrojenjeMm,
      ...fin,
    };
  }

  if (
    tipProizvoda === 'Ugradbena roletna' ||
    tipProizvoda === 'Vanjska ALU roletna'
  ) {
    const bom = calculateRoletnaBom(sirinaMm, visinaMm);
    const brojLamela = Math.max(1, Math.round(bom.sirinaZastoraMm / 10));

    for (let i = 0; i < kolicina; i++) {
      profiliZaKrojenjeMm.push(
        bom.lZastoraMm,
        bom.vodilice137Mm,
        bom.vodilice137Mm,
        bom.vodilice165Mm,
        bom.vodilice165Mm
      );
    }

    krojnaLista.push(
      {
        id: 'cut-rol-l-zastora',
        kodKomponente: 'ROLETNA_L_ZASTORA',
        nazivKomponente: 'L Zastora (Dužina zastora)',
        kategorija: 'Zastor / Lamela',
        formulaExcel: '(sirinaCm - 7) * 10',
        mjeraCm: Number((bom.lZastoraMm / 10).toFixed(2)),
        mjeraMm: bom.lZastoraMm,
        prikazMjere: `${bom.lZastoraMm} mm (${(bom.lZastoraMm / 10).toFixed(1)} cm)`,
        komadaPoJedinici: 1,
        ukupnoKomada: 1 * kolicina,
        ukupnaDuzinaMm: bom.lZastoraMm * kolicina,
        ulaziUBfdOptimizator: true,
      },
      {
        id: 'cut-rol-sirina-zastora',
        kodKomponente: 'ROLETNA_SIRINA_ZASTORA',
        nazivKomponente: 'Širina Zastora',
        kategorija: 'Zastor / Lamela',
        formulaExcel: 'ROUND(((visinaCm * 25) / 100) - 2) * 10',
        mjeraCm: Number((bom.sirinaZastoraMm / 10).toFixed(2)),
        mjeraMm: bom.sirinaZastoraMm,
        prikazMjere: `${bom.sirinaZastoraMm} mm (${brojLamela} lamela)`,
        komadaPoJedinici: 1,
        ukupnoKomada: 1 * kolicina,
        ukupnaDuzinaMm: bom.sirinaZastoraMm * kolicina,
        ulaziUBfdOptimizator: false,
      },
      {
        id: 'cut-rol-vodilice-137',
        kodKomponente: 'ROLETNA_VODILICE_137',
        nazivKomponente: 'Vodilice 137',
        kategorija: 'ALU Profil',
        formulaExcel: '(visinaCm - 14) * 10',
        mjeraCm: Number((bom.vodilice137Mm / 10).toFixed(2)),
        mjeraMm: bom.vodilice137Mm,
        prikazMjere: `${bom.vodilice137Mm} mm (${(bom.vodilice137Mm / 10).toFixed(1)} cm)`,
        komadaPoJedinici: 2,
        ukupnoKomada: 2 * kolicina,
        ukupnaDuzinaMm: bom.vodilice137Mm * 2 * kolicina,
        ulaziUBfdOptimizator: true,
      },
      {
        id: 'cut-rol-vodilice-165',
        kodKomponente: 'ROLETNA_VODILICE_165',
        nazivKomponente: 'Vodilice 165',
        kategorija: 'ALU Profil',
        formulaExcel: '(visinaCm - 17) * 10',
        mjeraCm: Number((bom.vodilice165Mm / 10).toFixed(2)),
        mjeraMm: bom.vodilice165Mm,
        prikazMjere: `${bom.vodilice165Mm} mm (${(bom.vodilice165Mm / 10).toFixed(1)} cm)`,
        komadaPoJedinici: 2,
        ukupnoKomada: 2 * kolicina,
        ukupnaDuzinaMm: bom.vodilice165Mm * 2 * kolicina,
        ulaziUBfdOptimizator: true,
      }
    );

    const jedFeningLZastora = kmToFeninga(
      obracunskaM2 * PRICE_RATES_KM.ROLETNA_ZASTOR_M2 * colorMultiplier
    );
    const jedFeningSirinaZastora = kmToFeninga(
      (bom.sirinaZastoraMm / 1000) *
        PRICE_RATES_KM.ROLETNA_SIRINA_ZASTORA_M *
        colorMultiplier +
        PRICE_RATES_KM.ROLETNA_OSOVINA_AUTOMAT_SET
    );
    const jedFeningVodilice137 = kmToFeninga(
      ((bom.vodilice137Mm * 2) / 1000) *
        PRICE_RATES_KM.ROLETNA_VODILICA_137_M *
        colorMultiplier
    );
    const jedFeningVodilice165 = kmToFeninga(
      ((bom.vodilice165Mm * 2) / 1000) *
        PRICE_RATES_KM.ROLETNA_VODILICA_165_M *
        colorMultiplier
    );

    stavke.push(
      {
        sifra: 'RL-ZAS-L',
        naziv: `L Zastora (Dužina zastora): ${bom.lZastoraMm} mm`,
        dimenzijaOpis: `L Zastora: ${bom.lZastoraMm} mm`,
        kolicinaOpis: `${((bom.lZastoraMm * kolicina) / 1000).toFixed(2)} m`,
        kolicinaBroj: kolicina,
        jedinicnaCijenaKM: feningaToKM(jedFeningLZastora),
        cijenaKM: feningaToKM(jedFeningLZastora * kolicina),
      },
      {
        sifra: 'RL-ZAS-S',
        naziv: `Širina Zastora: ${bom.sirinaZastoraMm} mm`,
        dimenzijaOpis: `Širina Zastora: ${bom.sirinaZastoraMm} mm (${brojLamela} lamela)`,
        kolicinaOpis: `${(potrebnaMrezicaM2 * kolicina).toFixed(2)} m²`,
        kolicinaBroj: kolicina,
        jedinicnaCijenaKM: feningaToKM(jedFeningSirinaZastora),
        cijenaKM: feningaToKM(jedFeningSirinaZastora * kolicina),
      },
      {
        sifra: 'RL-VOD-137',
        naziv: `Vodilice 137: ${bom.vodilice137Mm} mm`,
        dimenzijaOpis: `Vodilice 137: ${bom.vodilice137Mm} mm (2 kom/jed)`,
        kolicinaOpis: `${((bom.vodilice137Mm * 2 * kolicina) / 1000).toFixed(2)} m`,
        kolicinaBroj: kolicina,
        jedinicnaCijenaKM: feningaToKM(jedFeningVodilice137),
        cijenaKM: feningaToKM(jedFeningVodilice137 * kolicina),
      },
      {
        sifra: 'RL-VOD-165',
        naziv: `Vodilice 165: ${bom.vodilice165Mm} mm`,
        dimenzijaOpis: `Vodilice 165: ${bom.vodilice165Mm} mm (2 kom/jed)`,
        kolicinaOpis: `${((bom.vodilice165Mm * 2 * kolicina) / 1000).toFixed(2)} m`,
        kolicinaBroj: kolicina,
        jedinicnaCijenaKM: feningaToKM(jedFeningVodilice165),
        cijenaKM: feningaToKM(jedFeningVodilice165 * kolicina),
      }
    );

    const fin = finalizeFinancialBreakdown(
      stavke,
      rawAreaM2,
      kolicina,
      laborCostPerM2,
      marginPercent
    );

    return {
      sirinaMm,
      visinaMm,
      sirinaCm,
      visinaCm,
      kolicina,
      tipProizvoda,
      bojaRal,
      potrebnaVodilicaMm: bom.vodilice137Mm,
      bocniProfilMm: bom.vodilice165Mm,
      potrebnaMrezicaM2,
      sirinaLameleMm: bom.lZastoraMm,
      brojLamela,
      osovinaMm: bom.lZastoraMm,
      kutijaTip: '137 / 165 mm',
      roletnaBom: bom,
      krojnaLista,
      stavke,
      profiliZaKrojenjeMm,
      ...fin,
    };
  }

  // Fiksni komarnik
  const horizMm = Math.max(0, Math.round((sirinaCm - 0.4) * 10));
  const vertMm = Math.max(0, Math.round((visinaCm - 0.4) * 10));

  for (let i = 0; i < kolicina; i++) {
    profiliZaKrojenjeMm.push(horizMm, horizMm, vertMm, vertMm);
  }

  krojnaLista.push(
    {
      id: 'cut-fk-sirina',
      kodKomponente: 'FIKSNI_OKVIR_SIRINA',
      nazivKomponente: 'Okvir Širina (Fiksni)',
      kategorija: 'ALU Profil',
      formulaExcel: '(sirinaCm - 0.4) * 10',
      mjeraCm: Number((horizMm / 10).toFixed(2)),
      mjeraMm: horizMm,
      prikazMjere: `${horizMm} mm (${(horizMm / 10).toFixed(1)} cm)`,
      komadaPoJedinici: 2,
      ukupnoKomada: 2 * kolicina,
      ukupnaDuzinaMm: horizMm * 2 * kolicina,
      ulaziUBfdOptimizator: true,
    },
    {
      id: 'cut-fk-visina',
      kodKomponente: 'FIKSNI_OKVIR_VISINA',
      nazivKomponente: 'Okvir Visina (Fiksni)',
      kategorija: 'ALU Profil',
      formulaExcel: '(visinaCm - 0.4) * 10',
      mjeraCm: Number((vertMm / 10).toFixed(2)),
      mjeraMm: vertMm,
      prikazMjere: `${vertMm} mm (${(vertMm / 10).toFixed(1)} cm)`,
      komadaPoJedinici: 2,
      ukupnoKomada: 2 * kolicina,
      ukupnaDuzinaMm: vertMm * 2 * kolicina,
      ulaziUBfdOptimizator: true,
    }
  );

  const jedinicnaCijenaProfilaKM = Number(
    (
      ((horizMm * 2 + vertMm * 2) / 1000) *
      PRICE_RATES_KM.FIKSNI_PROFIL_M *
      colorMultiplier
    ).toFixed(2)
  );
  const jedinicniFeningiProfila = kmToFeninga(jedinicnaCijenaProfilaKM);
  const ukupnoFeningaProfila = jedinicniFeningiProfila * kolicina;

  const jedinicnaCijenaMreziceKM = Number(
    (obracunskaM2 * PRICE_RATES_KM.FIKSNI_MREZICA_M2).toFixed(2)
  );
  const jedinicniFeningiMrezice = kmToFeninga(jedinicnaCijenaMreziceKM);
  const ukupnoFeningaMrezice = jedinicniFeningiMrezice * kolicina;

  const jedinicniFeningiOkova = kmToFeninga(PRICE_RATES_KM.FIKSNI_OKOV_SET);
  const ukupnoFeningaOkova = jedinicniFeningiOkova * kolicina;

  stavke.push(
    {
      sifra: 'AL-FK-25',
      naziv: `Okvir Širina: ${horizMm} mm / Okvir Visina: ${vertMm} mm`,
      dimenzijaOpis: `2 × ${horizMm} mm + 2 × ${vertMm} mm`,
      kolicinaOpis: `${(((horizMm * 2 + vertMm * 2) * kolicina) / 1000).toFixed(2)} m`,
      kolicinaBroj: kolicina,
      jedinicnaCijenaKM: feningaToKM(jedinicniFeningiProfila),
      cijenaKM: feningaToKM(ukupnoFeningaProfila),
    },
    {
      sifra: 'MR-FG-01',
      naziv: `Fiberglas mrežica: ${sirinaMm} × ${visinaMm} mm`,
      dimenzijaOpis: `${sirinaMm} × ${visinaMm} mm`,
      kolicinaOpis: `${(potrebnaMrezicaM2 * kolicina).toFixed(2)} m²`,
      kolicinaBroj: kolicina,
      jedinicnaCijenaKM: feningaToKM(jedinicniFeningiMrezice),
      cijenaKM: feningaToKM(ukupnoFeningaMrezice),
    },
    {
      sifra: 'OK-FK-04',
      naziv: 'Ugaoni PVC spojnici (4 kom) + zakretne kukice',
      dimenzijaOpis: 'Komplet za montažu',
      kolicinaOpis: `${kolicina} set`,
      kolicinaBroj: kolicina,
      jedinicnaCijenaKM: feningaToKM(jedinicniFeningiOkova),
      cijenaKM: feningaToKM(ukupnoFeningaOkova),
    }
  );

  const fin = finalizeFinancialBreakdown(
    stavke,
    rawAreaM2,
    kolicina,
    laborCostPerM2,
    marginPercent
  );

  return {
    sirinaMm,
    visinaMm,
    sirinaCm,
    visinaCm,
    kolicina,
    tipProizvoda,
    bojaRal,
    potrebnaVodilicaMm: horizMm,
    bocniProfilMm: vertMm,
    potrebnaMrezicaM2,
    krojnaLista,
    stavke,
    profiliZaKrojenjeMm,
    ...fin,
  };
}

export function optimizeLinearCutting(
  rawLengths: number[],
  barLengthMmInput: number = 6000,
  kerfMmInput: number = 4,
  nazivNaloga: string = 'Optimizacija krojenja'
): OptimizationSummary {
  return runBestFitDecreasing(
    rawLengths,
    barLengthMmInput,
    kerfMmInput,
    nazivNaloga
  );
}

export const DEFAULT_COMPANY_SETTINGS: CompanySettings = {
  nazivFirme: 'ROLETNAPRO d.o.o.',
  podnaslov:
    'Proizvodnja i montaža ALU roletni, plise komarnika i vanjskih sjenila',
  adresa: 'Rajlovačka cesta bb',
  grad: '71000 Sarajevo, Bosna i Hercegovina',
  jibBroj: '4201948510006',
  pdvBroj: '201948510006',
  telefon: '+387 33 712 400',
  email: 'prodaja@roletnapro.ba',
  ziroRacun: '1610000012345678',
  banka: 'Raiffeisen Bank dd Bosna i Hercegovina',
  logoUrl: '',
  ovlastenoLice: 'Ing. Emir Hadžić, dipl. maš.',
  defaultLaborCostPerM2: 15.0,
  defaultMarginPercent: 20.0,
};

export const INITIAL_CLIENTS: Client[] = [
  {
    id: 'cli-kovacevic-01',
    organization_id: 'org-sarajevo-01',
    name: 'Stolarija Kovačević d.o.o.',
    phone: '+387 61 224 890',
    email: 'info@stolarija-kovacevic.ba',
    address: 'Hrasnička cesta 42',
    city: 'Sarajevo — Ilidža',
    created_at: '2026-11-01T08:00:00.000Z',
  },
  {
    id: 'cli-eurogradnja-02',
    organization_id: 'org-sarajevo-01',
    name: 'EuroGradnja Invest d.o.o.',
    phone: '+387 61 510 300',
    email: 'nabavka@eurogradnja.ba',
    address: 'Bulevar II korpusa bb',
    city: 'Tuzla — Sjenjak',
    created_at: '2026-11-02T09:30:00.000Z',
  },
  {
    id: 'cli-begovic-03',
    organization_id: 'org-sarajevo-01',
    name: 'Adnan Begović (Privatni objekat)',
    phone: '+387 62 778 112',
    email: 'adnan.begovic@gmail.com',
    address: 'Zalik br. 18',
    city: 'Mostar — Zalik',
    created_at: '2026-11-03T11:15:00.000Z',
  },
  {
    id: 'cli-bhplast-04',
    organization_id: 'org-sarajevo-01',
    name: 'BH Plast-Profil d.o.o.',
    phone: '+387 32 441 900',
    email: 'proizvodnja@bhplast.ba',
    address: 'Poslovna zona Zenica I',
    city: 'Zenica — Poslovna zona',
    created_at: '2026-11-04T10:00:00.000Z',
  },
];

export const INITIAL_WORK_ORDERS: WorkOrder[] = [
  {
    id: 'RN-2026-104',
    client_id: 'cli-kovacevic-01',
    klijent: 'Stolarija Kovačević d.o.o.',
    klijentTelefon: '+387 61 224 890',
    lokacija: 'Sarajevo — Ilidža',
    tipProizvoda: 'Harmo komarnik',
    bojaRal: 'RAL 7016 - Antracit siva',
    sirinaMm: 2040,
    visinaMm: 2000,
    kolicina: 2,
    datumKreiranja: '05.11.2026.',
    rokIsporuke: '08.11.2026.',
    status: 'U proizvodnji',
    napomena: 'Balkonska vrata, dvokrilni preklop na magnet',
    labor_cost_fening: 12240,
    margin_percent: 20,
    kalkulacija: calculateOrderSpec(
      2040,
      2000,
      'Harmo komarnik',
      'RAL 7016 - Antracit siva',
      2,
      15,
      20
    ),
  },
  {
    id: 'RN-2026-103',
    client_id: 'cli-eurogradnja-02',
    klijent: 'EuroGradnja Invest d.o.o.',
    klijentTelefon: '+387 61 510 300',
    lokacija: 'Tuzla — Sjenjak',
    tipProizvoda: 'Ugradbena roletna',
    bojaRal: 'RAL 9016 - Bijela',
    sirinaMm: 1400,
    visinaMm: 1450,
    kolicina: 4,
    datumKreiranja: '04.11.2026.',
    rokIsporuke: '09.11.2026.',
    status: 'U proizvodnji',
    napomena: 'Stambeni objekat Lamela B — 3. sprat',
    labor_cost_fening: 12180,
    margin_percent: 20,
    kalkulacija: calculateOrderSpec(
      1400,
      1450,
      'Ugradbena roletna',
      'RAL 9016 - Bijela',
      4,
      15,
      20
    ),
  },
  {
    id: 'RN-2026-102',
    client_id: 'cli-begovic-03',
    klijent: 'Adnan Begović (Privatni objekat)',
    klijentTelefon: '+387 62 778 112',
    lokacija: 'Mostar — Zalik',
    tipProizvoda: 'Vanjska ALU roletna',
    bojaRal: 'Zlatni hrast (Drvo dekor)',
    sirinaMm: 1200,
    visinaMm: 1600,
    kolicina: 3,
    datumKreiranja: '03.11.2026.',
    rokIsporuke: '06.11.2026.',
    status: 'Spremno za montažu',
    napomena: 'Montaža u subotu ujutro u 09:00h',
    labor_cost_fening: 8640,
    margin_percent: 20,
    kalkulacija: calculateOrderSpec(
      1200,
      1600,
      'Vanjska ALU roletna',
      'Zlatni hrast (Drvo dekor)',
      3,
      15,
      20
    ),
  },
  {
    id: 'RN-2026-101',
    client_id: 'cli-bhplast-04',
    klijent: 'BH Plast-Profil d.o.o.',
    klijentTelefon: '+387 32 441 900',
    lokacija: 'Zenica — Poslovna zona',
    tipProizvoda: 'Harmo komarnik',
    bojaRal: 'RAL 9016 - Bijela',
    sirinaMm: 1200,
    visinaMm: 1000,
    kolicina: 4,
    datumKreiranja: '02.11.2026.',
    rokIsporuke: '05.11.2026.',
    status: 'Spremno za montažu',
    napomena: 'Preuzimanje u radionici',
    labor_cost_fening: 7200,
    margin_percent: 20,
    kalkulacija: calculateOrderSpec(
      1200,
      1000,
      'Harmo komarnik',
      'RAL 9016 - Bijela',
      4,
      15,
      20
    ),
  },
];

export const INITIAL_WAREHOUSE: WarehouseItem[] = [
  {
    id: 'wh-1',
    sifra: 'AL-HK-9016',
    naziv: 'ALU Profil Harmo vodilica 22mm (6m šipka)',
    kategorija: 'ALU Profili',
    boja: 'RAL 9016 - Bijela',
    stanje: 84,
    jedinica: 'šipki (6m)',
    minZaliha: 25,
    cijenaPoJediniciKM: 68.0,
  },
  {
    id: 'wh-2',
    sifra: 'AL-HK-7016',
    naziv: 'ALU Profil Harmo vodilica 22mm (6m šipka)',
    kategorija: 'ALU Profili',
    boja: 'RAL 7016 - Antracit siva',
    stanje: 62,
    jedinica: 'šipki (6m)',
    minZaliha: 25,
    cijenaPoJediniciKM: 74.0,
  },
  {
    id: 'wh-3',
    sifra: 'AL-VR-5322',
    naziv: 'ALU Vodilica za roletnu 53×22mm sa četkicom (6m)',
    kategorija: 'ALU Profili',
    boja: 'RAL 9016 / RAL 7016 / Zlatni hrast',
    stanje: 110,
    jedinica: 'šipki (6m)',
    minZaliha: 30,
    cijenaPoJediniciKM: 82.5,
  },
  {
    id: 'wh-4',
    sifra: 'MR-PL-180',
    naziv: 'Plisirana mrežica za Harmo komarnik (paket 30m²)',
    kategorija: 'Mrežice i Lamele',
    boja: 'Antracit siva UV',
    stanje: 142,
    jedinica: 'm²',
    minZaliha: 40,
    cijenaPoJediniciKM: 22.0,
  },
  {
    id: 'wh-5',
    sifra: 'LM-AL-39',
    naziv: 'ALU Lamela 39mm punjena PU pjenom',
    kategorija: 'Mrežice i Lamele',
    boja: 'RAL 9016 / RAL 7016 / Zlatni hrast',
    stanje: 680,
    jedinica: 'm',
    minZaliha: 200,
    cijenaPoJediniciKM: 2.35,
  },
  {
    id: 'wh-6',
    sifra: 'OK-GR-AUT',
    naziv: 'Ugradbeni i vanjski automati, traka i kanap set',
    kategorija: 'Mehanizmi i Okov',
    boja: 'Bijela / Smeđa / Univerzalno',
    stanje: 45,
    jedinica: 'kom',
    minZaliha: 20,
    cijenaPoJediniciKM: 8.9,
  },
];

export const INITIAL_STOCK_MOVEMENTS: StockMovement[] = [
  {
    id: 'MOV-1002',
    datum: '05.11.2026. 08:15',
    tip: 'ULAZ',
    artikalId: 'wh-1',
    artikalNaziv: 'ALU Profil Harmo vodilica 22mm (6m šipka)',
    kolicina: 30,
    jedinica: 'šipki (6m)',
    razlog: 'Ulaz robe — Dobavljač Feal Široki Brijeg (Otpremnica #482)',
  },
  {
    id: 'MOV-1001',
    datum: '04.11.2026. 14:40',
    tip: 'IZLAZ',
    artikalId: 'wh-4',
    artikalNaziv: 'Plisirana mrežica za Harmo komarnik (paket 30m²)',
    kolicina: 7.2,
    jedinica: 'm²',
    razlog: 'Završen nalog RN-2026-100 (Dom-Invest Banja Luka)',
  },
];

export const INITIAL_OPTIMIZATION_HISTORY: OptimizationSummary[] = [
  runBestFitDecreasing(
    [1970, 1970, 1926, 1926, 1926],
    6000,
    4,
    'RN-2026-104 — Stolarija Kovačević (Lyctum Plišse BOM)'
  ),
];
