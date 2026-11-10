import React, { useState, useEffect } from 'react';
import {
  Calculator,
  FileText,
  CheckCircle2,
  Scissors,
  Ruler,
  Layers,
  Palette,
  User,
  MapPin,
  Loader2,
  UserPlus,
  Phone,
  Mail,
  AlertTriangle,
  Percent,
  Coins,
  X,
} from 'lucide-react';
import {
  CalculationResult,
  CutListItem,
  ProductType,
  RalColorCode,
  SpecItem,
  WorkOrder,
} from '../types';
import {
  calculateOrderSpec,
  PRODUCT_TYPES,
  RAL_COLORS,
} from '../utils/calculations';
import { useAppContext } from '../context/AppContext';

interface NewOrderScreenProps {
  onOpenQuoteModal: (data: {
    client_id?: string | null;
    klijent: string;
    klijentTelefon?: string;
    klijentEmail?: string;
    lokacija: string;
    napomena: string;
    brojPonude: string;
    kalkulacija: CalculationResult;
  }) => void;
  onSendLengthsToOptimizer: (lengths: number[], opis: string) => void;
}

function findMatchingSpecItem(
  cut: CutListItem,
  stavke: SpecItem[]
): SpecItem | undefined {
  switch (cut.kodKomponente) {
    case 'HARMO_HORIZONTALNA':
      return stavke.find((s) => s.sifra === 'LY-HK-HOR');
    case 'HARMO_VERTIKALA':
      return stavke.find((s) => s.sifra === 'LY-HK-VER');
    case 'HARMO_RUCICA':
      return stavke.find((s) => s.sifra === 'LY-HK-RUC');
    case 'HARMO_VISINA_MREZICE':
      return stavke.find((s) => s.sifra === 'LY-HK-MRZ');
    case 'HARMO_BROJ_POLJA_MREZICE':
      return undefined;
    case 'HARMO_KANAP':
      return stavke.find((s) => s.sifra === 'LY-HK-KNP');
    case 'ROLETNA_L_ZASTORA':
      return stavke.find((s) => s.sifra === 'RL-ZAS-L');
    case 'ROLETNA_SIRINA_ZASTORA':
      return stavke.find((s) => s.sifra === 'RL-ZAS-S');
    case 'ROLETNA_VODILICE_137':
      return stavke.find((s) => s.sifra === 'RL-VOD-137');
    case 'ROLETNA_VODILICE_165':
      return stavke.find((s) => s.sifra === 'RL-VOD-165');
    case 'FIKSNI_OKVIR_SIRINA':
      return stavke.find((s) => s.sifra === 'AL-FK-25');
    default:
      return undefined;
  }
}

export const NewOrderScreen: React.FC<NewOrderScreenProps> = ({
  onOpenQuoteModal,
  onSendLengthsToOptimizer,
}) => {
  const {
    clients,
    addClient,
    companySettings,
    checkStockAvailability,
    addWorkOrder,
    generateUniqueOrderCode,
    showToast,
  } = useAppContext();

  const [selectedClientId, setSelectedClientId] = useState<string>(
    clients[0]?.id || ''
  );
  const [klijent, setKlijent] = useState(
    clients[0]?.name || 'Stolarija Kovačević d.o.o.'
  );
  const [klijentTelefon, setKlijentTelefon] = useState(
    clients[0]?.phone || '+387 61 224 890'
  );
  const [klijentEmail, setKlijentEmail] = useState(
    clients[0]?.email || 'info@stolarija-kovacevic.ba'
  );
  const [lokacija, setLokacija] = useState(
    clients[0]?.city || 'Sarajevo — Ilidža'
  );

  const [sirinaMm, setSirinaMm] = useState<string>('2040');
  const [visinaMm, setVisinaMm] = useState<string>('2000');
  const [tipProizvoda, setTipProizvoda] =
    useState<ProductType>('Harmo komarnik');
  const [bojaRal, setBojaRal] =
    useState<RalColorCode>('RAL 7016 - Antracit siva');
  const [kolicina, setKolicina] = useState<string>('1');
  const [laborCostPerM2, setLaborCostPerM2] = useState<string>(
    String(companySettings.defaultLaborCostPerM2 ?? 15)
  );
  const [marginPercent, setMarginPercent] = useState<string>(
    String(companySettings.defaultMarginPercent ?? 20)
  );
  const [napomena, setNapomena] = useState<string>(
    'Montaža na postojeću PVC stolariju, otvaranje lijevo-desno'
  );

  // Modal za brzi unos novog kupca ("Novi Kupac")
  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientAddress, setNewClientAddress] = useState('');
  const [newClientCity, setNewClientCity] = useState('Sarajevo');
  const [isSavingClient, setIsSavingClient] = useState(false);

  // Automatsko popunjavanje troška rada i marže iz postavki firme kada se promijene
  useEffect(() => {
    setLaborCostPerM2(String(companySettings.defaultLaborCostPerM2 ?? 15));
    setMarginPercent(String(companySettings.defaultMarginPercent ?? 20));
  }, [
    companySettings.defaultLaborCostPerM2,
    companySettings.defaultMarginPercent,
  ]);

  const parsedWidth = Number(sirinaMm) || 0;
  const parsedHeight = Number(visinaMm) || 0;
  const parsedQty = Math.max(1, Number(kolicina) || 1);
  const parsedLabor = Math.max(0, Number(laborCostPerM2) || 0);
  const parsedMargin = Math.max(0, Number(marginPercent) || 0);

  const [rezultat, setRezultat] = useState<CalculationResult>(() =>
    calculateOrderSpec(
      2040,
      2000,
      'Harmo komarnik',
      'RAL 7016 - Antracit siva',
      1,
      companySettings.defaultLaborCostPerM2 ?? 15,
      companySettings.defaultMarginPercent ?? 20
    )
  );
  const [isCalculatedRecently, setIsCalculatedRecently] = useState(true);
  const [isCalculating, setIsCalculating] = useState(false);
  const [savedOrderId, setSavedOrderId] = useState<string | null>(null);
  const [validationMsg, setValidationMsg] = useState<string | null>(null);

  const stockCheck = checkStockAvailability(rezultat);

  const handleSelectClient = (clientId: string) => {
    setSelectedClientId(clientId);
    const found = clients.find((c) => c.id === clientId);
    if (found) {
      setKlijent(found.name);
      setKlijentTelefon(found.phone);
      setKlijentEmail(found.email);
      setLokacija(
        found.address ? `${found.city} (${found.address})` : found.city
      );
    }
  };

  const handleQuickCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim()) return;

    setIsSavingClient(true);
    const created = await addClient({
      name: newClientName,
      phone: newClientPhone,
      email: newClientEmail,
      address: newClientAddress,
      city: newClientCity || 'Sarajevo',
    });
    setIsSavingClient(false);

    if (created) {
      setSelectedClientId(created.id);
      setKlijent(created.name);
      setKlijentTelefon(created.phone);
      setKlijentEmail(created.email);
      setLokacija(
        created.address ? `${created.city} (${created.address})` : created.city
      );
      setNewClientName('');
      setNewClientPhone('');
      setNewClientEmail('');
      setNewClientAddress('');
      setIsNewClientModalOpen(false);
    }
  };

  const handleCalculate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (parsedWidth < 300 || parsedWidth > 5000) {
      setValidationMsg('Širina mora biti u rasponu od 300 mm do 5000 mm.');
      return;
    }
    if (parsedHeight < 300 || parsedHeight > 4000) {
      setValidationMsg('Visina mora biti u rasponu od 300 mm do 4000 mm.');
      return;
    }

    setValidationMsg(null);
    setIsCalculating(true);
    await new Promise((r) => setTimeout(r, 160));

    const calc = calculateOrderSpec(
      parsedWidth,
      parsedHeight,
      tipProizvoda,
      bojaRal,
      parsedQty,
      parsedLabor,
      parsedMargin
    );
    setRezultat(calc);
    setIsCalculatedRecently(true);
    setSavedOrderId(null);
    setIsCalculating(false);

    showToast(
      `Obračun izvršen: Materijal ${calc.materijalKM.toFixed(2)} KM + Rad ${calc.radKM.toFixed(2)} KM + Marža ${calc.marzaKM.toFixed(2)} KM = Osnovica ${calc.osnovicaKM.toFixed(2)} KM`,
      'info'
    );
  };

  const handleApplyPreset = (
    presetKlijent: string,
    presetGrad: string,
    w: number,
    h: number,
    tip: ProductType,
    ral: RalColorCode,
    kol: number
  ) => {
    setKlijent(presetKlijent);
    setLokacija(presetGrad);
    setSirinaMm(String(w));
    setVisinaMm(String(h));
    setTipProizvoda(tip);
    setBojaRal(ral);
    setKolicina(String(kol));
    setValidationMsg(null);
    const calc = calculateOrderSpec(
      w,
      h,
      tip,
      ral,
      kol,
      parsedLabor,
      parsedMargin
    );
    setRezultat(calc);
    setIsCalculatedRecently(true);
    setSavedOrderId(null);
  };

  const handleGenerateQuote = () => {
    const calc = calculateOrderSpec(
      parsedWidth || 2040,
      parsedHeight || 2000,
      tipProizvoda,
      bojaRal,
      parsedQty,
      parsedLabor,
      parsedMargin
    );
    setRezultat(calc);
    setIsCalculatedRecently(true);

    onOpenQuoteModal({
      client_id: selectedClientId || null,
      klijent: klijent.trim() || 'Kupac — Maloprodaja',
      klijentTelefon,
      klijentEmail,
      lokacija: lokacija.trim() || 'Bosna i Hercegovina',
      napomena,
      brojPonude: generateUniqueOrderCode('PN'),
      kalkulacija: calc,
    });
  };

  const handleSaveToWorkOrders = () => {
    const calc = calculateOrderSpec(
      parsedWidth || 2040,
      parsedHeight || 2000,
      tipProizvoda,
      bojaRal,
      parsedQty,
      parsedLabor,
      parsedMargin
    );
    setRezultat(calc);

    const newId = generateUniqueOrderCode('RN');
    const danas = new Date();
    const rok = new Date();
    rok.setDate(danas.getDate() + 4);

    const noviNalog: WorkOrder = {
      id: newId,
      client_id: selectedClientId || null,
      klijent: klijent.trim() || 'Kupac — Maloprodaja',
      klijentTelefon,
      klijentEmail,
      lokacija: lokacija.trim() || 'Sarajevo',
      tipProizvoda,
      bojaRal,
      sirinaMm: calc.sirinaMm,
      visinaMm: calc.visinaMm,
      kolicina: calc.kolicina,
      datumKreiranja: danas.toLocaleDateString('bs-BA'),
      rokIsporuke: rok.toLocaleDateString('bs-BA'),
      status: 'U proizvodnji',
      napomena,
      labor_cost_fening: calc.radFeninga,
      margin_percent: calc.marginPercent,
      kalkulacija: calc,
    };

    void addWorkOrder(noviNalog);
    setSavedOrderId(newId);
  };

  const selectedRalOption =
    RAL_COLORS.find((r) => r.value === rezultat.bojaRal) || RAL_COLORS[0];

  const formattedAreaM2 = Number(rezultat.potrebnaMrezicaM2.toFixed(2));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <p className="text-xs font-medium text-slate-500">
            Faza 6: Zvanični &ldquo;Lyctum&rdquo; Plišse komarnik BOM · CRM kupci · Profitabilnost u feningima
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mt-1">
            Novi Nalog — Kalkulator, CRM i Krojna Lista
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-500 mr-1">Lyctum / Fabrički primjeri:</span>
          <button
            type="button"
            onClick={() =>
              handleApplyPreset(
                'Stolarija Kovačević d.o.o.',
                'Sarajevo — Ilidža',
                2040,
                2000,
                'Harmo komarnik',
                'RAL 7016 - Antracit siva',
                1
              )
            }
            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            Plišse 2040×2000 mm
          </button>
          <button
            type="button"
            onClick={() =>
              handleApplyPreset(
                'BH Plast-Profil d.o.o.',
                'Zenica — Poslovna zona',
                900,
                2100,
                'Harmo komarnik',
                'RAL 9016 - Bijela',
                1
              )
            }
            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            Plišse 900×2100 mm
          </button>
          <button
            type="button"
            onClick={() =>
              handleApplyPreset(
                'EuroGradnja Invest d.o.o.',
                'Tuzla — Centar',
                1400,
                1450,
                'Ugradbena roletna',
                'RAL 9016 - Bijela',
                1
              )
            }
            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            Roletna 1400×1450 mm
          </button>
        </div>
      </div>

      {/* Main 2-Column Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Form Column */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6">
          <div className="pb-4 mb-5 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Kupac (CRM), Dimenzije i Marža
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Odaberite kupca iz baze ili dodajte novog klijenta
              </p>
            </div>
            <Calculator className="w-5 h-5 text-blue-600 shrink-0" />
          </div>

          <form onSubmit={handleCalculate} className="space-y-4">
            {/* CRM Odabir Kupca + Dugme "Novi Kupac" */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="select-crm-client"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Odabir kupca iz CRM baze (`clients`)
                </label>
                <button
                  type="button"
                  onClick={() => setIsNewClientModalOpen(true)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Novi Kupac
                </button>
              </div>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select
                  id="select-crm-client"
                  value={selectedClientId}
                  onChange={(e) => handleSelectClient(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white cursor-pointer"
                >
                  <option value="">— Ručni unos kupca —</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.city}) {c.phone ? `· ${c.phone}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="input-klijent"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Ime klijenta / Naziv firme
                </label>
                <input
                  id="input-klijent"
                  type="text"
                  required
                  value={klijent}
                  onChange={(e) => setKlijent(e.target.value)}
                  placeholder="npr. Stolarija Kovačević d.o.o."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                />
              </div>

              <div>
                <label
                  htmlFor="input-lokacija"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Grad / Adresa isporuke
                </label>
                <div className="relative">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="input-lokacija"
                    type="text"
                    value={lokacija}
                    onChange={(e) => setLokacija(e.target.value)}
                    placeholder="Sarajevo, Tuzla..."
                    className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="input-sirina"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Širina (mm){' '}
                  <span className="font-mono text-slate-400 font-normal">
                    = {(parsedWidth / 10).toFixed(1)} cm
                  </span>
                </label>
                <div className="relative">
                  <Ruler className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="input-sirina"
                    type="number"
                    min={300}
                    max={5000}
                    required
                    value={sirinaMm}
                    onChange={(e) => {
                      setSirinaMm(e.target.value);
                      setIsCalculatedRecently(false);
                    }}
                    placeholder="2040"
                    className="w-full pl-9 pr-10 py-2 text-sm font-mono tabular-nums bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400">
                    mm
                  </span>
                </div>
              </div>

              <div>
                <label
                  htmlFor="input-visina"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Visina (mm){' '}
                  <span className="font-mono text-slate-400 font-normal">
                    = {(parsedHeight / 10).toFixed(1)} cm
                  </span>
                </label>
                <div className="relative">
                  <Ruler className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="input-visina"
                    type="number"
                    min={300}
                    max={4000}
                    required
                    value={visinaMm}
                    onChange={(e) => {
                      setVisinaMm(e.target.value);
                      setIsCalculatedRecently(false);
                    }}
                    placeholder="2000"
                    className="w-full pl-9 pr-10 py-2 text-sm font-mono tabular-nums bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400">
                    mm
                  </span>
                </div>
              </div>
            </div>

            <div>
              <label
                htmlFor="select-tip-proizvoda"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Tip proizvoda
              </label>
              <div className="relative">
                <Layers className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select
                  id="select-tip-proizvoda"
                  value={tipProizvoda}
                  onChange={(e) => {
                    const newType = e.target.value as ProductType;
                    setTipProizvoda(newType);
                    const calc = calculateOrderSpec(
                      Number(sirinaMm) || 1200,
                      Number(visinaMm) || 1000,
                      newType,
                      bojaRal,
                      parsedQty,
                      parsedLabor,
                      parsedMargin
                    );
                    setRezultat(calc);
                    setIsCalculatedRecently(true);
                  }}
                  className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white cursor-pointer"
                >
                  {PRODUCT_TYPES.map((pt) => (
                    <option key={pt.value} value={pt.value}>
                      {pt.value}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label
                  htmlFor="select-boja-ral"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Boja profila (RAL karta)
                </label>
                <div className="relative">
                  <Palette className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <select
                    id="select-boja-ral"
                    value={bojaRal}
                    onChange={(e) => {
                      const newRal = e.target.value as RalColorCode;
                      setBojaRal(newRal);
                      const calc = calculateOrderSpec(
                        Number(sirinaMm) || 1200,
                        Number(visinaMm) || 1000,
                        tipProizvoda,
                        newRal,
                        parsedQty,
                        parsedLabor,
                        parsedMargin
                      );
                      setRezultat(calc);
                      setIsCalculatedRecently(true);
                    }}
                    className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white cursor-pointer"
                  >
                    {RAL_COLORS.map((ral) => (
                      <option key={ral.value} value={ral.value}>
                        {ral.value}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="input-kolicina"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Količina (kom)
                </label>
                <input
                  id="input-kolicina"
                  type="number"
                  min={1}
                  max={200}
                  value={kolicina}
                  onChange={(e) => {
                    setKolicina(e.target.value);
                    setIsCalculatedRecently(false);
                  }}
                  className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                />
              </div>
            </div>

            {/* Satnica / Trošak rada po m² i Marža (%) */}
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-200">
              <div>
                <label
                  htmlFor="input-labor-cost"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Satnica / Trošak rada po m²
                </label>
                <div className="relative">
                  <Coins className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="input-labor-cost"
                    type="number"
                    step="0.5"
                    min={0}
                    max={500}
                    value={laborCostPerM2}
                    onChange={(e) => {
                      setLaborCostPerM2(e.target.value);
                      setIsCalculatedRecently(false);
                    }}
                    className="w-full pl-9 pr-12 py-2 text-sm font-mono tabular-nums bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400">
                    KM/m²
                  </span>
                </div>
              </div>

              <div>
                <label
                  htmlFor="input-margin-percent"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Marža (%)
                </label>
                <div className="relative">
                  <Percent className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="input-margin-percent"
                    type="number"
                    step="1"
                    min={0}
                    max={300}
                    value={marginPercent}
                    onChange={(e) => {
                      setMarginPercent(e.target.value);
                      setIsCalculatedRecently(false);
                    }}
                    className="w-full pl-9 pr-9 py-2 text-sm font-mono tabular-nums bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400">
                    %
                  </span>
                </div>
              </div>
            </div>

            <div>
              <label
                htmlFor="input-napomena"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Tehnička napomena za radionicu
              </label>
              <input
                id="input-napomena"
                type="text"
                value={napomena}
                onChange={(e) => setNapomena(e.target.value)}
                placeholder="npr. Otvaranje sa lijeva na desno..."
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
              />
            </div>

            {validationMsg && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-medium">
                {validationMsg}
              </div>
            )}

            <div className="pt-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <button
                type="submit"
                disabled={isCalculating}
                className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 rounded-lg shadow-xs transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                {isCalculating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Izračunavam...
                  </>
                ) : (
                  <>
                    <Calculator className="w-4 h-4" />
                    Izračunaj
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleGenerateQuote}
                className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-semibold text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <FileText className="w-4 h-4 text-blue-700" />
                Generiši Ponudu
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Lyctum / Excel BOM Normativ, Stock Check, 2D Sketch & Profitability */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-200">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900">
                    Proizvodni normativ (BOM), Skladište i Profitabilnost
                  </h2>
                  {!isCalculatedRecently && (
                    <span className="text-xs text-amber-700 font-medium">
                      · Kliknite &ldquo;Izračunaj&rdquo; za osvježavanje
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Kupac: <strong>{klijent}</strong> · Otvor: {rezultat.sirinaMm}{' '}
                  × {rezultat.visinaMm} mm ({rezultat.sirinaCm} ×{' '}
                  {rezultat.visinaCm} cm) · {rezultat.kolicina} kom
                </p>
              </div>
              <span className="text-xs font-mono tabular-nums text-slate-600">
                {rezultat.tipProizvoda}
              </span>
            </div>

            {/* Validacija Stanja Skladišta (`checkStockAvailability`) */}
            <div
              className={`mt-4 p-3.5 rounded-lg border text-xs flex items-start gap-2.5 ${
                stockCheck.isAvailable
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                  : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}
            >
              {stockCheck.isAvailable ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-semibold">
                  {stockCheck.isAvailable
                    ? 'Provjera skladišta: Sav potreban materijal (ALU profili, mrežica/lamele i okov) je dostupan na stanju.'
                    : 'Upozorenje skladišta: Nedovoljno materijala na stanju za ovaj nalog!'}
                </p>
                {!stockCheck.isAvailable && (
                  <ul className="mt-1 space-y-0.5 text-[11px] font-mono list-disc list-inside">
                    {stockCheck.missingItems.map((msg) => (
                      <li key={msg}>{msg}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Key BOM Summary Cards */}
            {rezultat.harmoBom ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-5">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                  <p className="text-xs font-medium text-slate-500">
                    Okvir (Horizontalna i Vertikala)
                  </p>
                  <p className="text-sm font-bold font-mono tabular-nums text-blue-700 mt-1">
                    Horizontalna: {rezultat.harmoBom.horizontalnaMm} mm (2×)
                  </p>
                  <p className="text-sm font-bold font-mono tabular-nums text-slate-900 mt-0.5">
                    Vertikala: {rezultat.harmoBom.vertikalaMm} mm (2×)
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1 font-mono tabular-nums">
                    (Š_cm - 7)×10 · (V_cm - 7.4)×10
                  </p>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                  <p className="text-xs font-medium text-slate-500">
                    Ručica (Krilo) i Visina mrežice
                  </p>
                  <p className="text-sm font-bold font-mono tabular-nums text-blue-700 mt-1">
                    Ručica: {rezultat.harmoBom.rucicaMm} mm (1×)
                  </p>
                  <p className="text-sm font-bold font-mono tabular-nums text-slate-900 mt-0.5">
                    Visina mrežice: {rezultat.harmoBom.visinaMreziceMm} mm
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1 font-mono tabular-nums">
                    Širina mrežice: {rezultat.harmoBom.sirinaMreziceMm} mm
                  </p>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                  <p className="text-xs font-medium text-slate-500">
                    Broj polja mrežice i Kanap
                  </p>
                  <p className="text-sm font-bold font-mono tabular-nums text-blue-700 mt-1">
                    Polja mrežice: {rezultat.harmoBom.brojPoljaMrezice} polja
                  </p>
                  <p className="text-xs font-semibold font-mono tabular-nums text-slate-900 mt-0.5">
                    Kanap: {rezultat.harmoBom.kanapMetara.toFixed(2)} m (
                    {rezultat.harmoBom.kanapMm} mm)
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1 font-mono tabular-nums">
                    Korak 14 mm · 6 nizova + 50 cm čvorovi
                  </p>
                </div>
              </div>
            ) : rezultat.roletnaBom ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-5">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                  <p className="text-xs font-medium text-slate-500">
                    Zastor (Dužina i Širina)
                  </p>
                  <p className="text-sm font-bold font-mono tabular-nums text-blue-700 mt-1">
                    L Zastora: {rezultat.roletnaBom.lZastoraMm} mm
                  </p>
                  <p className="text-sm font-bold font-mono tabular-nums text-slate-900 mt-0.5">
                    Širina Zastora: {rezultat.roletnaBom.sirinaZastoraMm} mm
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1 font-mono tabular-nums">
                    (Š_cm - 7)×10 · ROUND(V_cm×25/100 - 2)×10
                  </p>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                  <p className="text-xs font-medium text-slate-500">
                    Vodilice 137 (Kutija 137mm)
                  </p>
                  <p className="text-lg font-bold font-mono tabular-nums text-blue-700 mt-1">
                    Vodilice 137: {rezultat.roletnaBom.vodilice137Mm} mm
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1 font-mono tabular-nums">
                    Formula: (visinaCm - 14) × 10 (2 kom)
                  </p>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                  <p className="text-xs font-medium text-slate-500">
                    Vodilice 165 (Kutija 165mm)
                  </p>
                  <p className="text-lg font-bold font-mono tabular-nums text-slate-900 mt-1">
                    Vodilice 165: {rezultat.roletnaBom.vodilice165Mm} mm
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1 font-mono tabular-nums">
                    Formula: (visinaCm - 17) × 10 (2 kom)
                  </p>
                </div>
              </div>
            ) : null}

            {/* 2D SVG Technical Sketch + Workshop Cut List */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 py-4 border-t border-b border-slate-200 items-start">
              {/* 2D SVG Sketch */}
              <div className="md:col-span-5 flex flex-col items-center justify-center bg-slate-50 border border-slate-200 rounded-lg p-4">
                <p className="text-[11px] font-mono font-semibold text-slate-700 mb-2 text-center">
                  {rezultat.harmoBom
                    ? `Gornja Horizontalna: ${rezultat.harmoBom.horizontalnaMm} mm`
                    : rezultat.roletnaBom
                      ? `L Zastora: ${rezultat.roletnaBom.lZastoraMm} mm`
                      : `Širina: ${rezultat.sirinaMm} mm`}
                </p>

                <svg
                  viewBox="0 0 280 240"
                  className="w-full max-w-[270px] h-52"
                  role="img"
                  aria-label="2D tehnička skica sa izračunatim Lyctum BOM mjerama"
                >
                  <line
                    x1="40"
                    y1="14"
                    x2="220"
                    y2="14"
                    stroke="#475569"
                    strokeWidth="1"
                    strokeDasharray="3 2"
                  />
                  <line
                    x1="242"
                    y1="26"
                    x2="242"
                    y2="196"
                    stroke="#475569"
                    strokeWidth="1"
                    strokeDasharray="3 2"
                  />

                  <rect
                    x="40"
                    y="26"
                    width="180"
                    height="170"
                    rx="2"
                    fill="#e2e8f0"
                    stroke={
                      selectedRalOption.hex === '#F8FAFC'
                        ? '#64748b'
                        : selectedRalOption.hex
                    }
                    strokeWidth="8"
                  />

                  {rezultat.roletnaBom ? (
                    <g>
                      <rect
                        x="36"
                        y="22"
                        width="188"
                        height="30"
                        fill={selectedRalOption.hex}
                        stroke="#334155"
                        strokeWidth="1.5"
                      />
                      <text
                        x="130"
                        y="40"
                        textAnchor="middle"
                        fill={
                          selectedRalOption.hex === '#F8FAFC'
                            ? '#0f172a'
                            : '#ffffff'
                        }
                        fontSize="8.5"
                        fontWeight="bold"
                        fontFamily="monospace"
                      >
                        L Zastora: {rezultat.roletnaBom.lZastoraMm} mm
                      </text>

                      {[64, 78, 92, 106, 120, 134, 148, 162, 176].map(
                        (yPos) => (
                          <line
                            key={yPos}
                            x1="46"
                            y1={yPos}
                            x2="214"
                            y2={yPos}
                            stroke="#64748b"
                            strokeWidth="1.5"
                          />
                        )
                      )}

                      <rect
                        x="62"
                        y="98"
                        width="136"
                        height="26"
                        rx="3"
                        fill="#ffffff"
                        fillOpacity="0.92"
                        stroke="#2563eb"
                        strokeWidth="1"
                      />
                      <text
                        x="130"
                        y="114"
                        textAnchor="middle"
                        fill="#1d4ed8"
                        fontSize="8.5"
                        fontWeight="bold"
                        fontFamily="monospace"
                      >
                        Širina Zastora: {rezultat.roletnaBom.sirinaZastoraMm} mm
                      </text>

                      <text
                        x="130"
                        y="218"
                        textAnchor="middle"
                        fill="#0f172a"
                        fontSize="8"
                        fontWeight="bold"
                        fontFamily="monospace"
                      >
                        Vod.137: {rezultat.roletnaBom.vodilice137Mm}mm | Vod.165:{' '}
                        {rezultat.roletnaBom.vodilice165Mm}mm
                      </text>
                    </g>
                  ) : rezultat.harmoBom ? (
                    <g>
                      {/* Plisirana mrežica (vertikalni nabori) */}
                      {[56, 70, 84, 98, 112, 126, 140, 154, 168, 182, 198].map(
                        (xPos) => (
                          <line
                            key={xPos}
                            x1={xPos}
                            y1="31"
                            x2={xPos}
                            y2="191"
                            stroke="#94a3b8"
                            strokeWidth="1"
                            strokeDasharray="3 2"
                          />
                        )
                      )}

                      {/* Lijeva i desna Vertikala oznaka */}
                      <text
                        x="22"
                        y="112"
                        textAnchor="middle"
                        fill="#0f172a"
                        fontSize="7.5"
                        fontWeight="bold"
                        fontFamily="monospace"
                        transform="rotate(-90 22 112)"
                      >
                        Lijeva Vertikala: {rezultat.harmoBom.vertikalaMm} mm
                      </text>
                      <text
                        x="258"
                        y="112"
                        textAnchor="middle"
                        fill="#0f172a"
                        fontSize="7.5"
                        fontWeight="bold"
                        fontFamily="monospace"
                        transform="rotate(90 258 112)"
                      >
                        Desna Vertikala: {rezultat.harmoBom.vertikalaMm} mm
                      </text>

                      {/* Središnja Ručica (Krilo) */}
                      <rect
                        x="126"
                        y="30"
                        width="8"
                        height="162"
                        fill="#1d4ed8"
                      />

                      {/* Oznaka Ručica (Krilo) i Mrežica unutar skice */}
                      <rect
                        x="50"
                        y="56"
                        width="160"
                        height="42"
                        rx="3"
                        fill="#ffffff"
                        fillOpacity="0.94"
                        stroke="#cbd5e1"
                        strokeWidth="1"
                      />
                      <text
                        x="130"
                        y="72"
                        textAnchor="middle"
                        fill="#1d4ed8"
                        fontSize="8.5"
                        fontWeight="bold"
                        fontFamily="monospace"
                      >
                        Ručica (Krilo): {rezultat.harmoBom.rucicaMm} mm
                      </text>
                      <text
                        x="130"
                        y="88"
                        textAnchor="middle"
                        fill="#0f172a"
                        fontSize="8"
                        fontWeight="bold"
                        fontFamily="monospace"
                      >
                        Mrežica: {rezultat.harmoBom.visinaMreziceMm}×
                        {rezultat.harmoBom.sirinaMreziceMm} mm
                      </text>

                      {/* Oznaka Broj polja mrežice i Kanap unutar skice */}
                      <rect
                        x="50"
                        y="124"
                        width="160"
                        height="40"
                        rx="3"
                        fill="#ffffff"
                        fillOpacity="0.94"
                        stroke="#cbd5e1"
                        strokeWidth="1"
                      />
                      <text
                        x="130"
                        y="139"
                        textAnchor="middle"
                        fill="#0f172a"
                        fontSize="8"
                        fontWeight="bold"
                        fontFamily="monospace"
                      >
                        Polja mrežice: {rezultat.harmoBom.brojPoljaMrezice} redova
                      </text>
                      <text
                        x="130"
                        y="154"
                        textAnchor="middle"
                        fill="#475569"
                        fontSize="8"
                        fontFamily="monospace"
                      >
                        Kanap: {rezultat.harmoBom.kanapMetara.toFixed(2)} m (
                        {rezultat.harmoBom.kanapMm} mm)
                      </text>

                      {/* Donja Horizontalna */}
                      <text
                        x="130"
                        y="214"
                        textAnchor="middle"
                        fill="#0f172a"
                        fontSize="8"
                        fontWeight="bold"
                        fontFamily="monospace"
                      >
                        Donja Horizontalna: {rezultat.harmoBom.horizontalnaMm} mm
                      </text>
                      <text
                        x="130"
                        y="228"
                        textAnchor="middle"
                        fill="#1d4ed8"
                        fontSize="7.5"
                        fontWeight="bold"
                        fontFamily="monospace"
                      >
                        Vertikala (2×): {rezultat.harmoBom.vertikalaMm} mm
                      </text>
                    </g>
                  ) : (
                    <g>
                      <text
                        x="130"
                        y="115"
                        textAnchor="middle"
                        fill="#1e293b"
                        fontSize="9"
                        fontWeight="bold"
                        fontFamily="monospace"
                      >
                        {formattedAreaM2} m²
                      </text>
                    </g>
                  )}
                </svg>

                <p className="text-[11px] font-mono text-slate-500 mt-1 text-center">
                  Otvor: {rezultat.sirinaMm}×{rezultat.visinaMm} mm ·{' '}
                  {selectedRalOption.ralCode}
                </p>
              </div>

              {/* Radionička krojna lista (BOM Tabela) */}
              <div className="md:col-span-7 space-y-4">
                <div>
                  <h3 className="text-xs font-semibold text-slate-800 mb-2">
                    Radionička krojna lista (Zvanični Lyctum / Excel BOM normativ)
                  </h3>
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600">
                          <th className="py-2 px-3">Komponenta</th>
                          <th className="py-2 px-3">Krojna mjera / Normativ</th>
                          <th className="py-2 px-3 text-center">Ukupno kom</th>
                          <th className="py-2 px-3 text-right">Materijal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 text-xs">
                        {rezultat.krojnaLista.map((cut) => {
                          const finItem = findMatchingSpecItem(
                            cut,
                            rezultat.stavke
                          );
                          const isBrojPolja =
                            cut.kodKomponente === 'HARMO_BROJ_POLJA_MREZICE';
                          const isKanap = cut.kodKomponente === 'HARMO_KANAP';

                          return (
                            <tr key={cut.id} className="hover:bg-slate-50/70">
                              <td className="py-2 px-3">
                                <p className="font-semibold text-slate-900">
                                  {cut.nazivKomponente}
                                </p>
                                <p className="text-[10px] font-mono text-slate-400">
                                  {cut.formulaExcel}
                                </p>
                              </td>
                              <td className="py-2 px-3 font-mono font-bold text-blue-700 tabular-nums whitespace-nowrap">
                                {isKanap || isBrojPolja ? (
                                  <span>{cut.prikazMjere}</span>
                                ) : (
                                  <>
                                    {cut.mjeraMm} mm{' '}
                                    <span className="text-[11px] font-normal text-slate-500">
                                      ({cut.mjeraCm} cm)
                                    </span>
                                  </>
                                )}
                              </td>
                              <td className="py-2 px-3 text-center font-mono text-slate-700 tabular-nums">
                                {isBrojPolja
                                  ? `${cut.mjeraMm} polja`
                                  : `${cut.ukupnoKomada}×`}
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                                {finItem
                                  ? `${finItem.cijenaKM.toFixed(2)} KM`
                                  : 'U sklopu mrežice'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Jasno razdvojeni troškovi: Materijal, Rad, Marža, Osnovica, PDV, Ukupno */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2 text-xs">
                  <p className="font-semibold text-slate-800 pb-1 border-b border-slate-200">
                    Struktura kalkulacije i profitabilnosti (Integer Fening aritmetika)
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                    <div>
                      <span className="text-slate-500 block text-[11px]">
                        1. Trošak materijala:
                      </span>
                      <strong className="font-mono tabular-nums text-slate-900">
                        {rezultat.materijalKM.toFixed(2)} KM
                      </strong>
                      <span className="text-[10px] font-mono text-slate-400 block">
                        ({rezultat.materijalFeninga} fen)
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-500 block text-[11px]">
                        2. Trošak rada ({rezultat.laborCostPerM2KM} KM/m²):
                      </span>
                      <strong className="font-mono tabular-nums text-slate-900">
                        {rezultat.radKM.toFixed(2)} KM
                      </strong>
                      <span className="text-[10px] font-mono text-slate-400 block">
                        ({rezultat.radFeninga} fen)
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-500 block text-[11px]">
                        3. Marža ({rezultat.marginPercent}%):
                      </span>
                      <strong className="font-mono tabular-nums text-emerald-700">
                        +{rezultat.marzaKM.toFixed(2)} KM
                      </strong>
                      <span className="text-[10px] font-mono text-slate-400 block">
                        ({rezultat.marzaFeninga} fen)
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                    <div className="text-slate-600">
                      Osnovica:{' '}
                      <strong className="font-mono tabular-nums text-slate-900">
                        {rezultat.osnovicaKM.toFixed(2)} KM
                      </strong>
                      <span className="mx-1.5">·</span>
                      PDV (17%):{' '}
                      <strong className="font-mono tabular-nums text-slate-900">
                        {rezultat.pdvKM.toFixed(2)} KM
                      </strong>
                    </div>
                    <div className="text-sm font-bold text-slate-900">
                      Ukupno sa PDV:{' '}
                      <span className="font-mono tabular-nums text-blue-700">
                        {rezultat.ukupnoSaPdvKM.toFixed(2)} KM
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() =>
                    onSendLengthsToOptimizer(
                      rezultat.profiliZaKrojenjeMm,
                      `${rezultat.tipProizvoda} ${rezultat.sirinaMm}×${rezultat.visinaMm}mm (${klijent || 'Novi nalog'})`
                    )
                  }
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Scissors className="w-4 h-4 text-blue-600" />
                  Pošalji u Optimizator ({rezultat.profiliZaKrojenjeMm.length}{' '}
                  profila)
                </button>

                {!savedOrderId ? (
                  <button
                    type="button"
                    onClick={handleSaveToWorkOrders}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Sačuvaj nalog u proizvodnju
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                    <CheckCircle2 className="w-4 h-4" />
                    Sačuvano ({savedOrderId})
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={handleGenerateQuote}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <FileText className="w-4 h-4 text-blue-400" />
                Generiši Ponudu (PDF)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal za brzi unos novog kupca ("Novi Kupac") */}
      {isNewClientModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-novi-kupac"
        >
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 bg-slate-900 text-white">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-blue-400" />
                <h3 id="modal-novi-kupac" className="text-sm font-bold">
                  Novi Kupac — Brzi unos u CRM bazu
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsNewClientModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleQuickCreateClient} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ime kupca ili naziv firme *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    placeholder="npr. Stolarija Kovačević d.o.o."
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Broj telefona *
                  </label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      required
                      value={newClientPhone}
                      onChange={(e) => setNewClientPhone(e.target.value)}
                      placeholder="+387 61 000 000"
                      className="w-full pl-8 pr-3 py-2 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Grad
                  </label>
                  <input
                    type="text"
                    value={newClientCity}
                    onChange={(e) => setNewClientCity(e.target.value)}
                    placeholder="Sarajevo"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    E-mail adresa
                  </label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="email"
                      value={newClientEmail}
                      onChange={(e) => setNewClientEmail(e.target.value)}
                      placeholder="klijent@firma.ba"
                      className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Adresa (ulica)
                  </label>
                  <input
                    type="text"
                    value={newClientAddress}
                    onChange={(e) => setNewClientAddress(e.target.value)}
                    placeholder="Džemala Bijedića bb"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewClientModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                >
                  Otkaži
                </button>
                <button
                  type="submit"
                  disabled={isSavingClient}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {isSavingClient ? 'Snimam...' : 'Sačuvaj Kupca'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
