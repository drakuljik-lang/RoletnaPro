import React, { useState } from 'react';
import {
  Building2,
  Save,
  Upload,
  RotateCcw,
  Phone,
  MapPin,
  CreditCard,
  Trash2,
  CheckCircle2,
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { CompanySettings } from '../types';

export const SettingsScreen: React.FC = () => {
  const {
    companySettings,
    updateCompanySettings,
    resetAllDemoData,
    showToast,
  } = useAppContext();

  const [formData, setFormData] = useState<CompanySettings>(companySettings);

  const handleChange = (field: keyof CompanySettings, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Konverzija odabrane slike sa računara u Base64 string za LocalStorage i PDF
  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1.5 * 1024 * 1024) {
      showToast('Slika logotipa mora biti manja od 1.5 MB.', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        handleChange('logoUrl', reader.result);
        showToast('Logo slika učitana! Kliknite "Sačuvaj postavke".', 'info');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateCompanySettings(formData);
  };

  return (
    <div className="space-y-8">
      {/* Zaglavlje */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <p className="text-xs font-medium text-slate-500">
            Konfiguracija podataka proizvođača · Automatski prikaz na PDF ponudama i zaglavlju
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mt-1">
            Postavke Firme i Identiteta
          </h1>
        </div>

        <button
          type="button"
          onClick={resetAllDemoData}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
          Resetuj sve demo podatke
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Lijevo: Forma za unos podataka firme (7 kolona) */}
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-5"
        >
          <div className="pb-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Osnovni podaci o firmi (BiH)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Ovi podaci se trajno čuvaju u pretraživaču (LocalStorage) i ispisuju na svakom PDF predračunu
              </p>
            </div>
            <Building2 className="w-5 h-5 text-blue-600 shrink-0" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Naziv firme / Obrta
              </label>
              <input
                type="text"
                required
                value={formData.nazivFirme}
                onChange={(e) => handleChange('nazivFirme', e.target.value)}
                placeholder="npr. ROLETNAPRO d.o.o."
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Opis djelatnosti (Podnaslov na ponudi)
              </label>
              <input
                type="text"
                value={formData.podnaslov}
                onChange={(e) => handleChange('podnaslov', e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Ulica i broj (Adresa)
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  required
                  value={formData.adresa}
                  onChange={(e) => handleChange('adresa', e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Poštanski broj i Grad
              </label>
              <input
                type="text"
                required
                value={formData.grad}
                onChange={(e) => handleChange('grad', e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                ID / JIB broj (13 cifara)
              </label>
              <input
                type="text"
                required
                value={formData.jibBroj}
                onChange={(e) => handleChange('jibBroj', e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono tabular-nums bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                PDV broj (12 cifara)
              </label>
              <input
                type="text"
                required
                value={formData.pdvBroj}
                onChange={(e) => handleChange('pdvBroj', e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono tabular-nums bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Kontakt telefon
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  required
                  value={formData.telefon}
                  onChange={(e) => handleChange('telefon', e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs font-mono tabular-nums bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                E-mail adresa
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Transakcijski / Žiro račun
              </label>
              <div className="relative">
                <CreditCard className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={formData.ziroRacun}
                  onChange={(e) => handleChange('ziroRacun', e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs font-mono tabular-nums bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Naziv banke
              </label>
              <input
                type="text"
                value={formData.banka}
                onChange={(e) => handleChange('banka', e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Ovlašteno lice (Potpisnik na ponudi)
              </label>
              <input
                type="text"
                value={formData.ovlastenoLice}
                onChange={(e) => handleChange('ovlastenoLice', e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
              />
            </div>

            {/* Faza 6: Podrazumijevani trošak rada po m² i marža (%) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Podrazumijevani trošak rada (KM / m²)
              </label>
              <input
                type="number"
                step="0.5"
                min={0}
                value={formData.defaultLaborCostPerM2}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    defaultLaborCostPerM2: Number(e.target.value) || 0,
                  }))
                }
                className="w-full px-3 py-2 text-xs font-mono tabular-nums bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Podrazumijevana marža (%)
              </label>
              <input
                type="number"
                step="1"
                min={0}
                value={formData.defaultMarginPercent}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    defaultMarginPercent: Number(e.target.value) || 0,
                  }))
                }
                className="w-full px-3 py-2 text-xs font-mono tabular-nums bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
              />
            </div>

            {/* Logo URL ili Base64 Upload */}
            <div className="sm:col-span-2 pt-2 border-t border-slate-200 space-y-3">
              <label className="block text-xs font-semibold text-slate-700">
                Logotip firme (URL slike ili učitavanje Base64 fajla)
              </label>

              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={formData.logoUrl}
                  onChange={(e) => handleChange('logoUrl', e.target.value)}
                  placeholder="Unesite https://... URL logotipa ili učitajte sliku desno"
                  className="flex-1 px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />

                <label className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg cursor-pointer whitespace-nowrap shrink-0">
                  <Upload className="w-3.5 h-3.5" />
                  Učitaj sliku (Base64)
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoFileUpload}
                    className="hidden"
                  />
                </label>

                {formData.logoUrl && (
                  <button
                    type="button"
                    onClick={() => handleChange('logoUrl', '')}
                    className="inline-flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Ukloni
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-end">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Save className="w-4 h-4" />
              Sačuvaj postavke firme
            </button>
          </div>
        </form>

        {/* Desno: Uživo pregled zaglavlja PDF Ponude (5 kolona) */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h2 className="text-sm font-bold text-slate-900">
                Pregled zaglavlja na PDF ponudi
              </h2>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Uživo prikaz
              </span>
            </div>

            <div className="p-5 bg-slate-50 border border-slate-200 rounded-lg space-y-4">
              <div className="flex items-start gap-3.5">
                {formData.logoUrl ? (
                  <img
                    src={formData.logoUrl}
                    alt={formData.nazivFirme}
                    referrerPolicy="no-referrer"
                    className="w-14 h-14 object-contain rounded-lg border border-slate-200 bg-white p-1 shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-lg bg-slate-900 flex flex-col items-center justify-center p-2.5 shrink-0">
                    <div className="w-full h-1.5 bg-blue-500 rounded-xs mb-1" />
                    <div className="w-full h-1 bg-slate-200 rounded-xs mb-1" />
                    <div className="w-full h-1 bg-slate-300 rounded-xs mb-1" />
                    <div className="w-full h-1 bg-slate-400 rounded-xs mb-1" />
                    <div className="w-3/4 h-1.5 bg-blue-400 rounded-xs" />
                  </div>
                )}

                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {formData.nazivFirme || 'ROLETNAPRO d.o.o.'}
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {formData.podnaslov}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 text-xs font-mono tabular-nums text-slate-600 space-y-1">
                <p>
                  <strong>Adresa:</strong> {formData.adresa}, {formData.grad}
                </p>
                <p>
                  <strong>ID/JIB:</strong> {formData.jibBroj} ·{' '}
                  <strong>PDV:</strong> {formData.pdvBroj}
                </p>
                <p>
                  <strong>Kontakt:</strong> {formData.telefon} ·{' '}
                  {formData.email}
                </p>
                <p>
                  <strong>Žiro račun:</strong> {formData.ziroRacun} (
                  {formData.banka})
                </p>
                <p>
                  <strong>Potpisnik:</strong> {formData.ovlastenoLice}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
