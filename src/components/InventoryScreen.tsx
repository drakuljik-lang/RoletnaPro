import React, { useState } from 'react';
import {
  Package,
  ArrowDownLeft,
  ArrowUpRight,
  AlertTriangle,
  CheckCircle2,
  Plus,
  History,
  Layers,
  Search,
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { WarehouseItem } from '../types';

export const InventoryScreen: React.FC = () => {
  const {
    warehouse,
    stockMovements,
    recordStockEntry,
    addNewWarehouseItem,
  } = useAppContext();

  // State za formu Ulaz / Izlaz robe
  const [tipPromjene, setTipPromjene] = useState<'ULAZ' | 'IZLAZ'>('ULAZ');
  const [odabraniArtikalId, setOdabraniArtikalId] = useState<string>(
    warehouse[0]?.id || 'wh-1'
  );
  const [kolicinaInput, setKolicinaInput] = useState<string>('10');
  const [razlogInput, setRazlogInput] = useState<string>(
    'Nabavka materijala — Otpremnica dobavljača'
  );

  // State za pretragu i filtriranje skladišta
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [kategorijaFilter, setKategorijaFilter] = useState<string>('SVE');

  // State za modal/panel dodavanja novog artikla
  const [showNewItemForm, setShowNewItemForm] = useState(false);
  const [noviSifra, setNoviSifra] = useState('AL-PR-09');
  const [noviNaziv, setNoviNaziv] = useState('');
  const [noviKat, setNoviKat] =
    useState<WarehouseItem['kategorija']>('ALU Profili');
  const [noviBoja, setNoviBoja] = useState('RAL 9016 - Bijela');
  const [noviStanje, setNoviStanje] = useState('50');
  const [noviJedinica, setNoviJedinica] =
    useState<WarehouseItem['jedinica']>('šipki (6m)');
  const [noviMin, setNoviMin] = useState('20');
  const [noviCijena, setNoviCijena] = useState('65');

  // Sumarni proračuni
  const ukupnoSipkiAlu = warehouse
    .filter((w) => w.jedinica === 'šipki (6m)')
    .reduce((acc, w) => acc + w.stanje, 0);
  const ukupnoMetaraAluProfila = ukupnoSipkiAlu * 6;

  const ukupnoMreziceM2 = warehouse
    .filter((w) => w.jedinica === 'm²')
    .reduce((acc, w) => acc + w.stanje, 0);

  const ukupnaVrijednostSkladistaKM = warehouse.reduce(
    (acc, w) => acc + w.stanje * w.cijenaPoJediniciKM,
    0
  );

  const artikliIspodMinimuma = warehouse.filter(
    (w) => w.stanje < w.minZaliha
  ).length;

  const handleStockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = Number(kolicinaInput);
    if (!odabraniArtikalId || Number.isNaN(qty) || qty <= 0) return;

    recordStockEntry(odabraniArtikalId, tipPromjene, qty, razlogInput);
    setKolicinaInput('5');
  };

  const handleAddNewItemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noviNaziv.trim()) return;

    addNewWarehouseItem({
      sifra: noviSifra.trim() || 'AL-NOVO',
      naziv: noviNaziv.trim(),
      kategorija: noviKat,
      boja: noviBoja.trim() || 'Standard',
      stanje: Number(noviStanje) || 0,
      jedinica: noviJedinica,
      minZaliha: Number(noviMin) || 10,
      cijenaPoJediniciKM: Number(noviCijena) || 15,
    });

    setNoviNaziv('');
    setShowNewItemForm(false);
  };

  const filteredWarehouse = warehouse.filter((item) => {
    const matchesCat =
      kategorijaFilter === 'SVE' || item.kategorija === kategorijaFilter;
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      item.naziv.toLowerCase().includes(q) ||
      item.sifra.toLowerCase().includes(q) ||
      item.boja.toLowerCase().includes(q);
    return matchesCat && matchesSearch;
  });

  const selectedItemObj = warehouse.find((w) => w.id === odabraniArtikalId);

  return (
    <div className="space-y-8">
      {/* Zaglavlje ekrana Skladište */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <p className="text-xs font-medium text-slate-500">
            Upravljanje zalihama repromaterijala · Automatsko povezivanje sa radnim nalozima
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mt-1">
            Skladište ALU Profila i Mrežice
          </h1>
        </div>

        <button
          type="button"
          onClick={() => setShowNewItemForm((prev) => !prev)}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          {showNewItemForm ? 'Zatvori unos artikla' : 'Dodaj novi artikal'}
        </button>
      </div>

      {/* KPI Kartice Stanja u Skladištu */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">
            ALU Profili na stanju
          </p>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1.5">
            {ukupnoSipkiAlu} šipki
          </p>
          <p className="text-xs font-mono tabular-nums text-blue-700 mt-1">
            Ukupno: {ukupnoMetaraAluProfila.toLocaleString('bs-BA')} m dužnih
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">
            Fiberglas i plise mrežica
          </p>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1.5">
            {ukupnoMreziceM2} m²
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Spremno za krojenje komarnika
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">
            Vrijednost zaliha u skladištu
          </p>
          <p className="text-2xl font-bold font-mono tabular-nums text-emerald-700 mt-1.5">
            {ukupnaVrijednostSkladistaKM.toLocaleString('bs-BA', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{' '}
            KM
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Obračun po nabavnim cijenama
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">
            Alarm minimalnih zaliha
          </p>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1.5">
            {artikliIspodMinimuma} artikala
          </p>
          <p className="text-xs text-amber-700 mt-1">
            {artikliIspodMinimuma > 0
              ? 'Potrebna dopuna zaliha od dobavljača'
              : 'Sve stavke iznad minimuma'}
          </p>
        </div>
      </div>

      {/* Opciona forma za dodavanje novog artikla */}
      {showNewItemForm && (
        <form
          onSubmit={handleAddNewItemSubmit}
          className="bg-white border border-blue-200 rounded-xl p-6 space-y-4"
        >
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h2 className="text-sm font-bold text-slate-900">
              Unos novog artikla u šifarnik skladišta
            </h2>
            <span className="text-xs text-slate-500">
              Automatski se čuva u LocalStorage
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Šifra artikla
              </label>
              <input
                type="text"
                required
                value={noviSifra}
                onChange={(e) => setNoviSifra(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Naziv profila / materijala
              </label>
              <input
                type="text"
                required
                placeholder="npr. ALU Završna lamela sa gumom (6m)"
                value={noviNaziv}
                onChange={(e) => setNoviNaziv(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kategorija
              </label>
              <select
                value={noviKat}
                onChange={(e) =>
                  setNoviKat(e.target.value as WarehouseItem['kategorija'])
                }
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg"
              >
                <option value="ALU Profili">ALU Profili</option>
                <option value="Mrežice i Lamele">Mrežice i Lamele</option>
                <option value="Mehanizmi i Okov">Mehanizmi i Okov</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                RAL Boja / Opis
              </label>
              <input
                type="text"
                value={noviBoja}
                onChange={(e) => setNoviBoja(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Početno stanje
              </label>
              <input
                type="number"
                min={0}
                value={noviStanje}
                onChange={(e) => setNoviStanje(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Jedinica mjere
              </label>
              <select
                value={noviJedinica}
                onChange={(e) =>
                  setNoviJedinica(e.target.value as WarehouseItem['jedinica'])
                }
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg"
              >
                <option value="šipki (6m)">šipki (6m)</option>
                <option value="m²">m²</option>
                <option value="m">m</option>
                <option value="kom">kom</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Cijena po jedinici (KM)
              </label>
              <input
                type="number"
                step="0.1"
                value={noviCijena}
                onChange={(e) => setNoviCijena(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowNewItemForm(false)}
              className="px-4 py-2 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg cursor-pointer"
            >
              Odustani
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer"
            >
              Sačuvaj artikal u skladište
            </button>
          </div>
        </form>
      )}

      {/* Glavni raspored: Lijevo = Forma za Ulaz/Izlaz robe (4 kolone), Desno = Stanje skladišta (8 kolona) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Lijevo: Forma za Ulaz robe i Izlaz robe */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div className="pb-4 border-b border-slate-200">
            <h2 className="text-base font-bold text-slate-900">
              Evidencija: Ulaz i Izlaz robe
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Ručni unos primke od dobavljača ili razduženje materijala
            </p>
          </div>

          {/* Segmented Toggle: Ulaz robe vs Izlaz robe */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 border border-slate-200 rounded-lg">
            <button
              type="button"
              onClick={() => {
                setTipPromjene('ULAZ');
                setRazlogInput('Ulaz robe — Otpremnica dobavljača');
              }}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                tipPromjene === 'ULAZ'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowDownLeft className="w-4 h-4" />
              Ulaz robe (+)
            </button>
            <button
              type="button"
              onClick={() => {
                setTipPromjene('IZLAZ');
                setRazlogInput('Izlaz robe za proizvodnju u radionici');
              }}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                tipPromjene === 'IZLAZ'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowUpRight className="w-4 h-4" />
              Izlaz robe (-)
            </button>
          </div>

          <form onSubmit={handleStockSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="select-skladiste-artikal"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Odaberite artikal / profil
              </label>
              <select
                id="select-skladiste-artikal"
                value={odabraniArtikalId}
                onChange={(e) => setOdabraniArtikalId(e.target.value)}
                className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
              >
                {warehouse.map((w) => (
                  <option key={w.id} value={w.id}>
                    [{w.sifra}] {w.naziv} — ({w.stanje} {w.jedinica})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="input-skladiste-kolicina"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Količina ({selectedItemObj?.jedinica || 'jedinica'})
              </label>
              <input
                id="input-skladiste-kolicina"
                type="number"
                step="0.1"
                min="0.1"
                required
                value={kolicinaInput}
                onChange={(e) => setKolicinaInput(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              {selectedItemObj && (
                <p className="text-[11px] text-slate-500 mt-1 font-mono tabular-nums">
                  Trenutno na stanju: {selectedItemObj.stanje}{' '}
                  {selectedItemObj.jedinica}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="input-skladiste-razlog"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Broj otpremnice / Napomena
              </label>
              <input
                id="input-skladiste-razlog"
                type="text"
                value={razlogInput}
                onChange={(e) => setRazlogInput(e.target.value)}
                placeholder="npr. Primka br. 204 - Feal / Razduženje po nalogu"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <button
              type="submit"
              className={`w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-semibold text-white rounded-lg shadow-xs transition-colors cursor-pointer ${
                tipPromjene === 'ULAZ'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-amber-600 hover:bg-amber-700'
              }`}
            >
              {tipPromjene === 'ULAZ' ? (
                <>
                  <ArrowDownLeft className="w-4 h-4" />
                  Proknjiži Ulaz Robe (+)
                </>
              ) : (
                <>
                  <ArrowUpRight className="w-4 h-4" />
                  Proknjiži Izlaz Robe (-)
                </>
              )}
            </button>
          </form>

          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600">
            <p className="font-semibold text-slate-800 mb-1">
              Automatsko skidanje sa stanja
            </p>
            <p>
              Kada na početnom ekranu promijenite status bilo kojeg radnog naloga
              u <strong>&ldquo;Završeno&rdquo;</strong>, aplikacija automatski
              obračunava utrošene šipke profila i kvadraturu mrežice te ih skida
              sa skladišta.
            </p>
          </div>
        </div>

        {/* Desno: Tabela stanja i Dnevnik ulaza/izlaza */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Trenutno stanje zaliha po artiklima
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Prikaz u šipkama (6m), dužnim metrima (m) i kvadratima (m²)
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Pretraži artikal..."
                    className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg"
                  />
                </div>
                <select
                  value={kategorijaFilter}
                  onChange={(e) => setKategorijaFilter(e.target.value)}
                  aria-label="Filter kategorije skladišta"
                  className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg cursor-pointer"
                >
                  <option value="SVE">Sve kategorije</option>
                  <option value="ALU Profili">ALU Profili</option>
                  <option value="Mrežice i Lamele">Mrežice i Lamele</option>
                  <option value="Mehanizmi i Okov">Mehanizmi i Okov</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                    <th className="py-3 px-4">Šifra</th>
                    <th className="py-3 px-4">Artikal i boja</th>
                    <th className="py-3 px-4 text-right">Stanje</th>
                    <th className="py-3 px-4 text-right">Ekvivalent</th>
                    <th className="py-3 px-4 text-right">Vrijednost (KM)</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {filteredWarehouse.map((item) => {
                    const isLow = item.stanje < item.minZaliha;
                    const ekvivalentMetara =
                      item.jedinica === 'šipki (6m)'
                        ? `${(item.stanje * 6).toFixed(0)} m`
                        : `${item.stanje} ${item.jedinica}`;

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/90">
                        <td className="py-3 px-4 font-mono text-slate-600 tabular-nums whitespace-nowrap">
                          {item.sifra}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">
                            {item.naziv}
                          </div>
                          <div className="text-slate-500 mt-0.5">
                            {item.kategorija} · {item.boja}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 tabular-nums whitespace-nowrap">
                          {item.stanje} {item.jedinica}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-blue-700 tabular-nums whitespace-nowrap">
                          {ekvivalentMetara}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-800 tabular-nums whitespace-nowrap">
                          {(item.stanje * item.cijenaPoJediniciKM).toFixed(2)} KM
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {isLow ? (
                            <span className="inline-flex items-center gap-1 text-amber-700 font-medium">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                              Ispod min. ({item.minZaliha})
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              Redovno
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Istorija ulaza i izlaza robe */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-slate-500" />
                <h3 className="text-sm font-bold text-slate-900">
                  Dnevnik ulaza i izlaza robe (Kartica artikala)
                </h3>
              </div>
              <span className="text-xs font-mono text-slate-500 tabular-nums">
                Posljednjih {stockMovements.length} promjena
              </span>
            </div>

            <div className="overflow-x-auto max-h-72 overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                    <th className="py-2.5 px-4">Datum i vrijeme</th>
                    <th className="py-2.5 px-4">Tip</th>
                    <th className="py-2.5 px-4">Artikal</th>
                    <th className="py-2.5 px-4 text-right">Količina</th>
                    <th className="py-2.5 px-4">Dokument / Razlog</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {stockMovements.map((mov) => (
                    <tr key={mov.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-4 font-mono text-slate-500 tabular-nums whitespace-nowrap">
                        {mov.datum}
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap font-semibold">
                        {mov.tip === 'ULAZ' ? (
                          <span className="text-emerald-700 inline-flex items-center gap-1">
                            <ArrowDownLeft className="w-3.5 h-3.5" />
                            ULAZ ROBE
                          </span>
                        ) : (
                          <span className="text-amber-700 inline-flex items-center gap-1">
                            <ArrowUpRight className="w-3.5 h-3.5" />
                            IZLAZ ROBE
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 font-medium text-slate-900">
                        {mov.artikalNaziv}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold tabular-nums whitespace-nowrap">
                        {mov.tip === 'ULAZ' ? '+' : '-'}
                        {mov.kolicina} {mov.jedinica}
                      </td>
                      <td className="py-2.5 px-4 text-slate-600">
                        {mov.razlog}
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
