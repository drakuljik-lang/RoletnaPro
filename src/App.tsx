/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  LayoutDashboard,
  Calculator,
  Scissors,
  Package,
  Settings,
  Plus,
  Building2,
  CheckCircle2,
  AlertTriangle,
  Info,
  X,
  LogOut,
  UserCheck,
} from 'lucide-react';
import { CalculationResult, ScreenId, WorkOrder } from './types';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider, useAppContext } from './context/AppContext';
import { LoginScreen } from './components/LoginScreen';
import { DashboardScreen } from './components/DashboardScreen';
import { NewOrderScreen } from './components/NewOrderScreen';
import { CuttingOptimizerScreen } from './components/CuttingOptimizerScreen';
import { InventoryScreen } from './components/InventoryScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { QuoteModal } from './components/QuoteModal';

function RoletnaProWorkspace() {
  const { user, loading: authLoading, signOut, isSupabaseReady } = useAuth();
  const {
    orders,
    companySettings,
    toasts,
    dismissToast,
    addWorkOrder,
    generateUniqueOrderCode,
  } = useAppContext();

  const [activeScreen, setActiveScreen] = useState<ScreenId>('dashboard');

  // Shared Optimizer state for passing profile lengths between tabs
  const [optimizerLengths, setOptimizerLengths] = useState<number[] | null>(
    null
  );
  const [optimizerSourceLabel, setOptimizerSourceLabel] = useState<
    string | null
  >(null);

  // Quote Modal State
  const [quoteModalData, setQuoteModalData] = useState<{
    isOpen: boolean;
    klijent: string;
    lokacija: string;
    napomena?: string;
    brojPonude: string;
    kalkulacija: CalculationResult;
    isAlreadySaved: boolean;
  } | null>(null);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="text-center space-y-2">
          <p className="text-base font-bold tracking-tight">RoletnaPro</p>
          <p className="text-xs text-slate-400">
            Učitavanje sigurnosne sesije i radnog prostora...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  const handleOpenOrderQuoteFromDashboard = (order: WorkOrder) => {
    setQuoteModalData({
      isOpen: true,
      klijent: order.klijent,
      lokacija: order.lokacija,
      napomena: order.napomena,
      brojPonude: order.id.replace('RN-', 'PN-'),
      kalkulacija: order.kalkulacija,
      isAlreadySaved: true,
    });
  };

  const handleSendOrderToOptimizer = (order: WorkOrder) => {
    setOptimizerLengths(order.kalkulacija.profiliZaKrojenjeMm);
    setOptimizerSourceLabel(
      `${order.id} — ${order.klijent} (${order.tipProizvoda})`
    );
    setActiveScreen('optimizator');
  };

  const handleSendLengthsToOptimizer = (lengths: number[], opis: string) => {
    setOptimizerLengths(lengths);
    setOptimizerSourceLabel(opis);
    setActiveScreen('optimizator');
  };

  const navItems: {
    id: ScreenId;
    shortLabel: string;
    sidebarLabel: string;
    icon: React.FC<{ className?: string }>;
  }[] = [
    {
      id: 'dashboard',
      shortLabel: 'Početna',
      sidebarLabel: 'Dashboard (Početna)',
      icon: LayoutDashboard,
    },
    {
      id: 'novi-nalog',
      shortLabel: 'Novi Nalog',
      sidebarLabel: 'Novi Nalog (Kalkulator)',
      icon: Calculator,
    },
    {
      id: 'optimizator',
      shortLabel: 'Optimizator',
      sidebarLabel: 'Optimizator Krojenja',
      icon: Scissors,
    },
    {
      id: 'skladiste',
      shortLabel: 'Skladište',
      sidebarLabel: 'Skladište (Zalihe)',
      icon: Package,
    },
    {
      id: 'postavke',
      shortLabel: 'Postavke',
      sidebarLabel: 'Postavke Firme',
      icon: Settings,
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Top Bar Contract: 3 zones separated by gap-8 */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-4 sm:gap-8 px-4 sm:px-6 py-3.5 bg-slate-900 text-white border-b border-slate-800">
        {/* Zone 1: Single text element wordmark */}
        <button
          type="button"
          onClick={() => setActiveScreen('dashboard')}
          className="text-lg font-bold tracking-tight text-white hover:text-blue-300 transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          RoletnaPro
        </button>

        {/* Zone 2: 5 concise single-line navigation links */}
        <nav
          aria-label="Glavna navigacija"
          className="flex items-center gap-4 sm:gap-6 text-xs sm:text-sm font-medium text-slate-300 overflow-x-auto no-scrollbar"
        >
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveScreen(item.id)}
              className={`py-1 transition-colors cursor-pointer whitespace-nowrap shrink-0 border-b-2 ${
                activeScreen === item.id
                  ? 'text-white border-blue-400 font-semibold'
                  : 'border-transparent hover:text-white'
              }`}
            >
              {item.shortLabel}
            </button>
          ))}
        </nav>

        {/* Zone 3: 1 Primary Action Button */}
        <div className="hidden sm:flex items-center shrink-0">
          <button
            type="button"
            onClick={() => setActiveScreen('novi-nalog')}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            Novi Nalog
          </button>
        </div>
      </header>

      {/* Workspace Body: Left Sidebar (Desktop) + Main Content Viewport */}
      <div className="flex-1 flex">
        <aside className="hidden xl:flex flex-col justify-between w-64 shrink-0 bg-white border-r border-slate-200 p-5">
          <div className="space-y-6">
            <div>
              <p className="px-3 text-xs font-semibold text-slate-400 mb-2">
                Moduli proizvodnje
              </p>
              <div className="space-y-1">
                {navItems.map((item) => {
                  const IconComponent = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveScreen(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                        activeScreen === item.id
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <IconComponent className="w-4 h-4 shrink-0" />
                      {item.sidebarLabel}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-5 border-t border-slate-200 px-3 space-y-3">
              <p className="text-xs font-semibold text-slate-700">
                Pregled pogona
              </p>
              <div className="space-y-2 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Aktivni nalozi:</span>
                  <strong className="font-mono tabular-nums text-slate-900">
                    {orders.filter((o) => o.status !== 'Završeno').length}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span>Standard šipke:</span>
                  <strong className="font-mono tabular-nums text-slate-900">
                    6000 mm
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span>Stopa PDV-a (BiH):</span>
                  <strong className="font-mono tabular-nums text-slate-900">
                    17%
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span>Baza podataka:</span>
                  <strong className="font-mono tabular-nums text-slate-900">
                    {isSupabaseReady ? 'Supabase RLS' : 'Lokalni SaaS'}
                  </strong>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 px-3 space-y-3">
            <div className="flex items-start gap-2.5 text-xs text-slate-600">
              <Building2 className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <div className="overflow-hidden">
                <p className="font-semibold text-slate-900 truncate">
                  {companySettings.nazivFirme}
                </p>
                <p className="text-[11px] text-slate-500 truncate">
                  {companySettings.grad}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <UserCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <div className="truncate">
                  <p className="font-medium text-slate-800 truncate">
                    {user.fullName || user.email}
                  </p>
                  <p className="text-[10px] text-slate-500 uppercase">
                    Uloga: {user.role || 'owner'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void signOut()}
                title="Odjavi se iz aplikacije"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer shrink-0"
              >
                <LogOut className="w-3.5 h-3.5" />
                Odjava
              </button>
            </div>
          </div>
        </aside>

        {/* Main Viewport */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-6 sm:py-8">
          {activeScreen === 'dashboard' && (
            <DashboardScreen
              onNavigate={setActiveScreen}
              onOpenOrderQuote={handleOpenOrderQuoteFromDashboard}
              onSendOrderToOptimizer={handleSendOrderToOptimizer}
            />
          )}

          {activeScreen === 'novi-nalog' && (
            <NewOrderScreen
              onSendLengthsToOptimizer={handleSendLengthsToOptimizer}
              onOpenQuoteModal={(data) =>
                setQuoteModalData({
                  isOpen: true,
                  klijent: data.klijent,
                  lokacija: data.lokacija,
                  napomena: data.napomena,
                  brojPonude: data.brojPonude,
                  kalkulacija: data.kalkulacija,
                  isAlreadySaved: false,
                })
              }
            />
          )}

          {activeScreen === 'optimizator' && (
            <CuttingOptimizerScreen
              externalLengths={optimizerLengths}
              externalSourceLabel={optimizerSourceLabel}
            />
          )}

          {activeScreen === 'skladiste' && <InventoryScreen />}

          {activeScreen === 'postavke' && <SettingsScreen />}
        </main>
      </div>

      {/* Quiet Footer */}
      <footer className="bg-white border-t border-slate-200 px-6 py-4 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
        <span>
          © 2026 {companySettings.nazivFirme} — RoletnaPro sistem za proizvodnju
          roletni i komarnika ({user.email})
        </span>
        <div className="flex flex-wrap items-center gap-3">
          {navItems.map((item, idx) => (
            <React.Fragment key={item.id}>
              {idx > 0 && <span>·</span>}
              <button
                type="button"
                onClick={() => setActiveScreen(item.id)}
                className="hover:text-slate-900 transition-colors cursor-pointer"
              >
                {item.shortLabel}
              </button>
            </React.Fragment>
          ))}
          <span>·</span>
          <button
            type="button"
            onClick={() => void signOut()}
            className="text-red-600 hover:text-red-700 font-semibold transition-colors cursor-pointer"
          >
            Odjavi se
          </button>
        </div>
      </footer>

      {/* Toast Notifications Container */}
      {toasts.length > 0 && (
        <div
          aria-live="polite"
          className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0"
        >
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-start justify-between gap-3 px-4 py-3 rounded-xl shadow-lg border text-xs font-medium transition-all ${
                t.tip === 'success'
                  ? 'bg-slate-900 text-white border-slate-800'
                  : t.tip === 'warning'
                    ? 'bg-amber-950 text-amber-100 border-amber-800'
                    : t.tip === 'error'
                      ? 'bg-red-950 text-red-100 border-red-800'
                      : 'bg-slate-800 text-slate-100 border-slate-700'
              }`}
            >
              <div className="flex items-start gap-2.5">
                {t.tip === 'success' && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                )}
                {t.tip === 'warning' && (
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                )}
                {t.tip === 'info' && (
                  <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                )}
                {t.tip === 'error' && (
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                )}
                <span>{t.tekst}</span>
              </div>
              <button
                type="button"
                onClick={() => dismissToast(t.id)}
                className="text-slate-400 hover:text-white cursor-pointer"
                aria-label="Zatvori obavještenje"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* PDF Quote Modal */}
      {quoteModalData && (
        <QuoteModal
          isOpen={quoteModalData.isOpen}
          onClose={() => setQuoteModalData(null)}
          klijent={quoteModalData.klijent}
          lokacija={quoteModalData.lokacija}
          napomena={quoteModalData.napomena}
          brojPonude={quoteModalData.brojPonude}
          kalkulacija={quoteModalData.kalkulacija}
          isAlreadySaved={quoteModalData.isAlreadySaved}
          onSaveToOrders={() => {
            const danas = new Date();
            const rok = new Date();
            rok.setDate(danas.getDate() + 4);
            void addWorkOrder({
              id: generateUniqueOrderCode('RN'),
              klijent: quoteModalData.klijent,
              lokacija: quoteModalData.lokacija,
              tipProizvoda: quoteModalData.kalkulacija.tipProizvoda,
              bojaRal: quoteModalData.kalkulacija.bojaRal,
              sirinaMm: quoteModalData.kalkulacija.sirinaMm,
              visinaMm: quoteModalData.kalkulacija.visinaMm,
              kolicina: quoteModalData.kalkulacija.kolicina,
              datumKreiranja: danas.toLocaleDateString('bs-BA'),
              rokIsporuke: rok.toLocaleDateString('bs-BA'),
              status: 'U proizvodnji',
              napomena: quoteModalData.napomena,
              kalkulacija: quoteModalData.kalkulacija,
            });
          }}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <RoletnaProWorkspace />
      </AppProvider>
    </AuthProvider>
  );
}
