export type ScreenId =
  | 'dashboard'
  | 'novi-nalog'
  | 'optimizator'
  | 'skladiste'
  | 'postavke';

export type ProductType =
  | 'Harmo komarnik'
  | 'Ugradbena roletna'
  | 'Vanjska ALU roletna'
  | 'Fiksni komarnik';

export type RalColorCode =
  | 'RAL 9016 - Bijela'
  | 'RAL 7016 - Antracit siva'
  | 'RAL 8014 - Sepija smeđa'
  | 'RAL 9006 - Srebrna metalik'
  | 'Zlatni hrast (Drvo dekor)';

export interface RalColorOption {
  value: RalColorCode;
  label: string;
  ralCode: string;
  hex: string;
  borderHex: string;
  surchargePercent: number;
}

export interface Client {
  id: string;
  organization_id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  created_at: string;
}

export type CutListComponentCode =
  | 'ROLETNA_L_ZASTORA'
  | 'ROLETNA_SIRINA_ZASTORA'
  | 'ROLETNA_VODILICE_137'
  | 'ROLETNA_VODILICE_165'
  | 'HARMO_HORIZONTALNA'
  | 'HARMO_VERTIKALA'
  | 'HARMO_RUCICA'
  | 'HARMO_VISINA_MREZICE'
  | 'HARMO_SIRINA_MREZICE'
  | 'HARMO_BROJ_POLJA_MREZICE'
  | 'HARMO_KANAP'
  | 'FIKSNI_OKVIR_SIRINA'
  | 'FIKSNI_OKVIR_VISINA'
  | 'FIKSNI_MREZICA';

export interface CutListItem {
  id: string;
  kodKomponente: CutListComponentCode;
  nazivKomponente: string;
  kategorija:
    | 'ALU Profil'
    | 'Zastor / Lamela'
    | 'Plisirana mrežica'
    | 'Kanap (Konac)';
  formulaExcel: string;
  mjeraCm: number;
  mjeraMm: number;
  prikazMjere: string;
  komadaPoJedinici: number;
  ukupnoKomada: number;
  ukupnaDuzinaMm: number;
  ulaziUBfdOptimizator: boolean;
}

export interface RoletnaBomNormativ {
  ulazSirinaCm: number;
  ulazVisinaCm: number;
  lZastoraMm: number;
  sirinaZastoraMm: number;
  vodilice137Mm: number;
  vodilice165Mm: number;
}

/**
 * Zvanični Lyctum tehnički normativ za "Plišse komarnik" (Harmonika komarnik)
 * Sve ulazne mjere u mm -> konverzija u cm (/ 10) -> primjena formule -> konverzija u mm (* 10)
 */
export interface HarmoBomNormativ {
  ulazSirinaCm: number;
  ulazVisinaCm: number;
  horizontalnaMm: number;
  vertikalaMm: number;
  rucicaMm: number;
  visinaMreziceMm: number;
  sirinaMreziceMm: number;
  brojPoljaMrezice: number;
  kanapMm: number;
  kanapMetara: number;
}

export interface SpecItem {
  sifra: string;
  naziv: string;
  dimenzijaOpis: string;
  kolicinaOpis: string;
  kolicinaBroj?: number;
  jedinicnaCijenaKM?: number;
  cijenaKM: number;
}

export interface CalculationResult {
  sirinaMm: number;
  visinaMm: number;
  sirinaCm: number;
  visinaCm: number;
  kolicina: number;
  tipProizvoda: ProductType;
  bojaRal: RalColorCode;
  potrebnaVodilicaMm: number;
  bocniProfilMm: number;
  potrebnaMrezicaM2: number;
  sirinaLameleMm?: number;
  brojLamela?: number;
  osovinaMm?: number;
  kutijaTip?: string;
  roletnaBom?: RoletnaBomNormativ;
  harmoBom?: HarmoBomNormativ;
  krojnaLista: CutListItem[];
  stavke: SpecItem[];
  profiliZaKrojenjeMm: number[];
  laborCostPerM2KM: number;
  marginPercent: number;
  materijalFeninga: number;
  materijalKM: number;
  radFeninga: number;
  radKM: number;
  marzaFeninga: number;
  marzaKM: number;
  cijenaPoKomaduKM: number;
  osnovicaKM: number;
  pdvKM: number;
  ukupnoSaPdvKM: number;
  osnovicaFeninga: number;
  pdvFeninga: number;
  ukupnoFeninga: number;
}

export type OrderStatus =
  | 'U proizvodnji'
  | 'Spremno za montažu'
  | 'Čeka materijal'
  | 'Završeno';

export interface WorkOrder {
  id: string;
  client_id?: string | null;
  klijent: string;
  klijentTelefon?: string;
  klijentEmail?: string;
  lokacija: string;
  tipProizvoda: ProductType;
  bojaRal: RalColorCode;
  sirinaMm: number;
  visinaMm: number;
  kolicina: number;
  datumKreiranja: string;
  rokIsporuke: string;
  status: OrderStatus;
  materijalSkinutSaStanja?: boolean;
  napomena?: string;
  labor_cost_fening?: number;
  margin_percent?: number;
  kalkulacija: CalculationResult;
}

export interface WarehouseItem {
  id: string;
  sifra: string;
  naziv: string;
  kategorija: 'ALU Profili' | 'Mrežice i Lamele' | 'Mehanizmi i Okov';
  boja: string;
  stanje: number;
  jedinica: 'm' | 'm²' | 'kom' | 'šipki (6m)';
  minZaliha: number;
  cijenaPoJediniciKM: number;
}

export interface StockCheckResult {
  isAvailable: boolean;
  missingItems: string[];
}

export interface StockMovement {
  id: string;
  datum: string;
  tip: 'ULAZ' | 'IZLAZ';
  artikalId: string;
  artikalNaziv: string;
  kolicina: number;
  jedinica: string;
  razlog: string;
}

export interface CutPieceSegment {
  duzinaMm: number;
  pozicijaStartMm: number;
  kerfMm: number;
  bojaKlasa: string;
  hexBoja: string;
}

export interface CutBar {
  redniBroj: number;
  duzinaSipkeMm: number;
  rezoviMm: number[];
  segmenti: CutPieceSegment[];
  iskoristenoCistoMm: number;
  ukupnoKerfMm: number;
  iskoristenoSaRezomMm: number;
  skartMm: number;
  iskoristenostProcenat: number;
}

export interface OptimizationSummary {
  id: string;
  datum: string;
  nazivNaloga: string;
  duzinaSipkeMm: number;
  debljinaRezaMm: number;
  ulazneDuzineMm: number[];
  sipke: CutBar[];
  ukupnoSipki: number;
  ukupnoIskoristenoMm: number;
  ukupnoKerfMm: number;
  ukupnoSkartMm: number;
  prosjecnaIskoristenostProcenat: number;
  ustedaKM: number;
}

export interface CompanySettings {
  nazivFirme: string;
  podnaslov: string;
  adresa: string;
  grad: string;
  jibBroj: string;
  pdvBroj: string;
  telefon: string;
  email: string;
  ziroRacun: string;
  banka: string;
  logoUrl: string;
  ovlastenoLice: string;
  defaultLaborCostPerM2: number;
  defaultMarginPercent: number;
}

export interface ToastMessage {
  id: string;
  tekst: string;
  tip: 'success' | 'info' | 'warning' | 'error';
}
