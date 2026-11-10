import React, { useState } from 'react';
import {
  Building2,
  Lock,
  Mail,
  User,
  MapPin,
  FileText,
  ArrowRight,
  Loader2,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LoginScreen: React.FC = () => {
  const { signIn, signUp, signInDemoTenant, isSupabaseReady } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('emir.hadzic@roletnapro.ba');
  const [password, setPassword] = useState('RoletnaPro2026!');

  // Polja za registraciju nove firme (organizations + profiles role='owner')
  const [fullName, setFullName] = useState('Ing. Emir Hadžić, dipl. maš.');
  const [organizationName, setOrganizationName] = useState(
    'ALU-ROLETNE KOVAČEVIĆ d.o.o.'
  );
  const [jib, setJib] = useState('4201948510006');
  const [pdv, setPdv] = useState('201948510006');
  const [address, setAddress] = useState('Rajlovačka cesta bb, 71000 Sarajevo');

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);

    try {
      if (mode === 'login') {
        const { error } = await signIn(email, password);
        if (error) setErrorMsg(error);
      } else {
        if (!organizationName.trim() || !jib.trim()) {
          setErrorMsg('Unesite puni naziv firme i JIB broj.');
          setSubmitting(false);
          return;
        }
        const { error } = await signUp({
          email,
          password,
          fullName,
          organizationName,
          jib,
          pdv,
          address,
        });
        if (error) setErrorMsg(error);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Top Bar */}
      <header className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-blue-600 flex flex-col items-center justify-center p-1.5">
            <div className="w-full h-1 bg-white rounded-xs mb-0.5" />
            <div className="w-full h-0.5 bg-blue-200 rounded-xs mb-0.5" />
            <div className="w-3/4 h-1 bg-white rounded-xs" />
          </div>
          <span className="text-lg font-bold tracking-tight">RoletnaPro</span>
        </div>

        <span className="text-xs text-slate-400">
          Multi-Tenant SaaS Platforma za proizvođače roletni i komarnika u BiH
        </span>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-8 py-10 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        {/* Lijeva kolona: Opis SaaS arhitekture */}
        <div className="lg:col-span-6 space-y-6">
          <div className="space-y-3">
            <p className="text-xs font-semibold text-blue-700 tracking-wide uppercase">
              ROLETNAPRO CLOUD · MULTI-TENANT ARHITEKTURA
            </p>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 leading-tight">
              Upravljajte proizvodnjom roletni, krojnim listama i skladištem u oblaku.
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              Svaka registrovana firma dobija potpuno izolovano radno okruženje
              zaštićeno PostgreSQL Row Level Security (RLS) politikama.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Potpuna Multi-Tenant izolacija podataka (RLS)
                </h2>
                <p className="text-xs text-slate-600 mt-0.5">
                  Vaši klijenti, cijene, normativi i skladište vezani su za vaš{' '}
                  <code className="font-mono text-slate-800">
                    organization_id
                  </code>
                  .
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Cjelobrojna fening aritmetika i 1D BFD optimizator
                </h2>
                <p className="text-xs text-slate-600 mt-0.5">
                  Tačan obračun PDV-a (17%), automatsko razduženje skladišta po
                  tipu i RAL boji profila, te PDF ponude sa punim bosanskim
                  dijakritičkim znakovima (č, ć, ž, š, đ).
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
              <div className="text-xs">
                <p className="font-semibold text-slate-900">
                  Status baze podataka:{' '}
                  {isSupabaseReady
                    ? 'Povezano na Supabase PostgreSQL'
                    : 'Spreman Supabase klijent (Aktivan lokalni SaaS režim)'}
                </p>
                <p className="text-slate-500 mt-0.5">
                  Možete se odmah prijaviti ili registrovati novu firmu sa ulogom{' '}
                  <code className="font-mono">owner</code>.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => signInDemoTenant()}
              className="px-3.5 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              Brzi ulaz u aplikaciju
            </button>
          </div>
        </div>

        {/* Desna kolona: Prijava / Registracija */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-xs">
          {/* Segmented Mode Switcher */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 border border-slate-200 rounded-lg mb-6">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMsg(null);
              }}
              className={`py-2 px-3 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                mode === 'login'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Prijava postojećeg korisnika
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setErrorMsg(null);
              }}
              className={`py-2 px-3 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                mode === 'register'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Registracija nove firme (Owner)
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Naziv firme (kreira zapis u tabeli organizations)
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      required
                      value={organizationName}
                      onChange={(e) => setOrganizationName(e.target.value)}
                      placeholder="npr. ALU-ROLETNE KOVAČEVIĆ d.o.o."
                      className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      ID / JIB broj firme
                    </label>
                    <div className="relative">
                      <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        required
                        value={jib}
                        onChange={(e) => setJib(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-xs font-mono tabular-nums bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      PDV broj (12 cifara)
                    </label>
                    <input
                      type="text"
                      required
                      value={pdv}
                      onChange={(e) => setPdv(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono tabular-nums bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Ime i prezime vlasnika (uloga: owner)
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Sjedište i adresa
                    </label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        required
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Službena e-mail adresa
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ime@firma.ba"
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Lozinka
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                />
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-medium">
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Provjera podataka...
                </>
              ) : mode === 'login' ? (
                <>
                  Prijavi se u radni prostor
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  Registruj firmu i kreiraj Owner nalog
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </main>

      <footer className="px-6 py-4 border-t border-slate-200 bg-white text-xs text-slate-500 flex items-center justify-between">
        <span>© 2026 RoletnaPro SaaS — Bosna i Hercegovina</span>
        <span>Supabase PostgreSQL + Row Level Security (RLS)</span>
      </footer>
    </div>
  );
};
