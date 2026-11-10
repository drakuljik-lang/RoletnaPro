import React, { useState } from 'react';
import {
  Plus,
  Scissors,
  Search,
  FileText,
  ArrowUpRight,
  Package,
  ClipboardList,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Trash2,
} from 'lucide-react';
import { OrderStatus, ScreenId, WorkOrder } from '../types';
import { RAL_COLORS } from '../utils/calculations';
import { useAppContext } from '../context/AppContext';

interface DashboardScreenProps {
  onNavigate: (screen: ScreenId) => void;
  onOpenOrderQuote: (order: WorkOrder) => void;
  onSendOrderToOptimizer: (order: WorkOrder) => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  onNavigate,
  onOpenOrderQuote,
  onSendOrderToOptimizer,
}) => {
  const {
    orders,
    warehouse,
    savedScrapPercent,
    savedMetersThisMonth,
    updateOrderStatus,
    deleteWorkOrder,
  } = useAppContext();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'SVI' | OrderStatus>('SVI');

  const aktivniNaloziCount = orders.filter(
    (o) => o.status !== 'Završeno'
  ).length;
  const ukupnoKomadaUProizvodnji = orders
    .filter((o) => o.status !== 'Završeno')
    .reduce((acc, o) => acc + o.kolicina, 0);

  const ukupnoSipkiProfila = warehouse
    .filter((w) => w.jedinica === 'šipki (6m)')
    .reduce((acc, w) => acc + w.stanje, 0);

  const niskeZaliheCount = warehouse.filter(
    (w) => w.stanje < w.minZaliha
  ).length;

  const filteredOrders = orders.filter((order) => {
    const matchesStatus =
      statusFilter === 'SVI' || order.status === statusFilter;
    const q = searchQuery.trim().toLowerCase();
    const matchesQuery =
      !q ||
      order.klijent.toLowerCase().includes(q) ||
      order.id.toLowerCase().includes(q) ||
      order.lokacija.toLowerCase().includes(q) ||
      order.tipProizvoda.toLowerCase().includes(q);
    return matchesStatus && matchesQuery;
  });

  const renderStatusText = (order: WorkOrder) => {
    switch (order.status) {
      case 'U proizvodnji':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700">
            <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            U proizvodnji
          </span>
        );
      case 'Spremno za montažu':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            Spremno za montažu
          </span>
        );
      case 'Čeka materijal':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            Čeka materijal
          </span>
        );
      case 'Završeno':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            Završeno {order.materijalSkinutSaStanja ? '· Razduženo' : ''}
          </span>
        );
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header & Primary CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <p className="text-xs font-medium text-slate-500">
            Svi podaci su trajno sačuvani u LocalStorage · Automatska veza sa skladištem
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mt-1">
            Kontrolna ploča proizvodnje
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate('skladiste')}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Package className="w-4 h-4 text-slate-500" />
            Skladište
          </button>
          <button
            type="button"
            onClick={() => onNavigate('optimizator')}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Scissors className="w-4 h-4 text-slate-500" />
            Optimizator Krojenja
          </button>
          <button
            type="button"
            onClick={() => onNavigate('novi-nalog')}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            Novi Nalog
          </button>
        </div>
      </div>

      {/* 3 Required Summary Cards */}
      <section aria-label="Ključni pokazatelji proizvodnje">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Broj aktivnih naloga */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-600">
                  Broj aktivnih naloga
                </h2>
                <p className="text-3xl font-bold font-mono tabular-nums text-slate-900 mt-2">
                  {aktivniNaloziCount}
                </p>
              </div>
              <div className="p-2.5 bg-blue-50 text-blue-700 rounded-lg border border-blue-100">
                <ClipboardList className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>
                Ukupno jedinica:{' '}
                <strong className="font-mono tabular-nums text-slate-800">
                  {ukupnoKomadaUProizvodnji} kom
                </strong>
              </span>
              <span>·</span>
              <button
                type="button"
                onClick={() => onNavigate('novi-nalog')}
                className="font-semibold text-blue-600 hover:text-blue-800 inline-flex items-center gap-1 cursor-pointer"
              >
                Dodaj nalog
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Card 2: Ušteda na škartu */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-600">
                  Ušteda na škartu
                </h2>
                <div className="flex items-baseline gap-2.5 mt-2">
                  <p className="text-3xl font-bold font-mono tabular-nums text-emerald-700">
                    {savedScrapPercent.toFixed(1)}%
                  </p>
                  <span className="text-xs font-medium text-emerald-700">
                    BFD algoritam
                  </span>
                </div>
              </div>
              <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-100">
                <TrendingDown className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>
                Ušteđeno ovog mjeseca:{' '}
                <strong className="font-mono tabular-nums text-slate-800">
                  {savedMetersThisMonth.toFixed(1)} m (≈{' '}
                  {(savedMetersThisMonth * 14.5).toFixed(0)} KM)
                </strong>
              </span>
              <button
                type="button"
                onClick={() => onNavigate('optimizator')}
                className="font-semibold text-blue-600 hover:text-blue-800 inline-flex items-center gap-1 cursor-pointer shrink-0"
              >
                Krojenje
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Card 3: Stanje u skladištu */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-600">
                  Stanje u skladištu
                </h2>
                <div className="flex items-baseline gap-2 mt-2">
                  <p className="text-3xl font-bold font-mono tabular-nums text-slate-900">
                    {ukupnoSipkiProfila}
                  </p>
                  <span className="text-xs font-medium text-slate-500">
                    šipki ALU ({ukupnoSipkiProfila * 6} m)
                  </span>
                </div>
              </div>
              <div className="p-2.5 bg-slate-100 text-slate-700 rounded-lg border border-slate-200">
                <Package className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>
                Mrežica:{' '}
                <strong className="font-mono tabular-nums text-slate-800">
                  {warehouse.find((w) => w.id === 'wh-4')?.stanje ?? 142} m²
                </strong>
              </span>
              <span>·</span>
              <button
                type="button"
                onClick={() => onNavigate('skladiste')}
                className="font-semibold text-blue-600 hover:text-blue-800 inline-flex items-center gap-1 cursor-pointer"
              >
                {niskeZaliheCount > 0
                  ? `${niskeZaliheCount} ispod min.`
                  : 'Upravljaj zalihama'}
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Active Work Orders Section */}
      <section
        aria-label="Aktivni radni nalozi"
        className="bg-white border border-slate-200 rounded-xl overflow-hidden"
      >
        <div className="p-6 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Evidencija radnih naloga
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Promjenom statusa u &ldquo;Završeno&rdquo; automatski se umanjuje stanje potrošenih profila i mrežice u skladištu
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Pretraži klijenta, grad ili RN..."
                className="pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white w-60"
              />
            </div>

            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200 overflow-x-auto">
              {(
                [
                  'SVI',
                  'U proizvodnji',
                  'Spremno za montažu',
                  'Završeno',
                ] as const
              ).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setStatusFilter(tab)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    statusFilter === tab
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab === 'SVI' ? 'Svi nalozi' : tab}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                <th className="py-3 px-4">Broj naloga</th>
                <th className="py-3 px-4">Klijent i lokacija</th>
                <th className="py-3 px-4">Tip proizvoda i RAL boja</th>
                <th className="py-3 px-4 text-right">Dimenzije (Š×V)</th>
                <th className="py-3 px-4 text-right">Kol.</th>
                <th className="py-3 px-4 text-right">Vrijednost (sa PDV)</th>
                <th className="py-3 px-4">Status naloga</th>
                <th className="py-3 px-4 text-right">Akcije</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="py-10 px-6 text-center text-slate-500"
                  >
                    <p className="font-medium text-slate-700">
                      Nema pronađenih radnih naloga za odabrani filter.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const ralObj =
                    RAL_COLORS.find((c) => c.value === order.bojaRal) ||
                    RAL_COLORS[0];

                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-slate-50/90 transition-colors"
                    >
                      <td className="py-3 px-4 font-mono font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                        {order.id}
                        <div className="text-[11px] font-normal text-slate-400">
                          {order.datumKreiranja}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">
                          {order.klijent}
                        </div>
                        <div className="text-slate-500 mt-0.5">
                          {order.lokacija}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900">
                          {order.tipProizvoda}
                        </div>
                        <div className="text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <span
                            className="w-2.5 h-2.5 rounded-xs border inline-block shrink-0"
                            style={{
                              backgroundColor: ralObj.hex,
                              borderColor: ralObj.borderHex,
                            }}
                          />
                          <span>{order.bojaRal}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-800 whitespace-nowrap">
                        <div>
                          {order.sirinaMm} × {order.visinaMm} mm
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Vodilica: {order.kalkulacija.potrebnaVodilicaMm} mm
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold tabular-nums text-slate-900 whitespace-nowrap">
                        {order.kolicina} kom
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold tabular-nums text-slate-900 whitespace-nowrap">
                        {order.kalkulacija.ukupnoSaPdvKM.toFixed(2)} KM
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          {renderStatusText(order)}
                          <select
                            aria-label={`Promijeni status za ${order.id}`}
                            value={order.status}
                            onChange={(e) =>
                              updateOrderStatus(
                                order.id,
                                e.target.value as OrderStatus
                              )
                            }
                            className="text-[11px] text-slate-600 bg-transparent border border-slate-200 rounded px-1.5 py-0.5 w-fit focus:outline-none focus:border-blue-600 cursor-pointer"
                          >
                            <option value="U proizvodnji">U proizvodnji</option>
                            <option value="Spremno za montažu">
                              Spremno za montažu
                            </option>
                            <option value="Čeka materijal">Čeka materijal</option>
                            <option value="Završeno">
                              Završeno (Skini sa stanja)
                            </option>
                          </select>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => onSendOrderToOptimizer(order)}
                            title="Pošalji dužine profila u BFD Optimizator Krojenja"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0"
                          >
                            <Scissors className="w-3.5 h-3.5 text-slate-600" />
                            Krojenje
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenOrderQuote(order)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            PDF Ponuda
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteWorkOrder(order.id)}
                            title="Obriši radni nalog"
                            aria-label={`Obriši nalog ${order.id}`}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
