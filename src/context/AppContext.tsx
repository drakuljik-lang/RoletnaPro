import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import {
  CalculationResult,
  Client,
  CompanySettings,
  OptimizationSummary,
  OrderStatus,
  StockCheckResult,
  StockMovement,
  ToastMessage,
  WarehouseItem,
  WorkOrder,
} from '../types';
import {
  DEFAULT_COMPANY_SETTINGS,
  INITIAL_CLIENTS,
  INITIAL_OPTIMIZATION_HISTORY,
  INITIAL_STOCK_MOVEMENTS,
  INITIAL_WAREHOUSE,
  INITIAL_WORK_ORDERS,
} from '../utils/calculations';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';

/**
 * Dinamičko pronalaženje odgovarajućeg artikla u skladištu prema specifikaciji naloga
 * (tip proizvoda + RAL boja + kategorija), bez hardkodiranih ID-jeva
 */
function findMatchingWarehouseItem(
  warehouse: WarehouseItem[],
  kategorija: WarehouseItem['kategorija'],
  tipProizvoda: string,
  bojaRal: string
): WarehouseItem | undefined {
  const candidates = warehouse.filter((w) => w.kategorija === kategorija);
  if (candidates.length === 0) return undefined;

  const isKomarnik = tipProizvoda.toLowerCase().includes('komarnik');
  const ralShort = bojaRal.split(' - ')[0].trim().toLowerCase();

  if (kategorija === 'ALU Profili') {
    const exactMatch = candidates.find((item) => {
      const nameMatch = isKomarnik
        ? item.naziv.toLowerCase().includes('harmo') ||
          item.naziv.toLowerCase().includes('komarnik')
        : item.naziv.toLowerCase().includes('roletn') ||
          item.naziv.toLowerCase().includes('vodilica');
      const colorMatch = item.boja.toLowerCase().includes(ralShort);
      return nameMatch && colorMatch;
    });
    if (exactMatch) return exactMatch;

    const typeMatch = candidates.find((item) =>
      isKomarnik
        ? item.naziv.toLowerCase().includes('harmo') ||
          item.naziv.toLowerCase().includes('komarnik')
        : item.naziv.toLowerCase().includes('roletn') ||
          item.naziv.toLowerCase().includes('vodilica')
    );
    if (typeMatch) return typeMatch;
  }

  if (kategorija === 'Mrežice i Lamele') {
    if (isKomarnik) {
      return (
        candidates.find(
          (item) =>
            item.jedinica === 'm²' ||
            item.naziv.toLowerCase().includes('mrež')
        ) || candidates[0]
      );
    } else {
      return (
        candidates.find(
          (item) =>
            item.naziv.toLowerCase().includes('lamel') &&
            item.boja.toLowerCase().includes(ralShort)
        ) ||
        candidates.find((item) => item.naziv.toLowerCase().includes('lamel')) ||
        candidates[0]
      );
    }
  }

  return candidates[0];
}

interface AppContextValue {
  orders: WorkOrder[];
  warehouse: WarehouseItem[];
  stockMovements: StockMovement[];
  optimizationHistory: OptimizationSummary[];
  companySettings: CompanySettings;
  clients: Client[];
  toasts: ToastMessage[];
  isLoadingData: boolean;
  savedScrapPercent: number;
  savedMetersThisMonth: number;
  generateUniqueOrderCode: (prefix?: 'RN' | 'PN') => string;
  refetchAllData: () => Promise<void>;
  checkStockAvailability: (spec: CalculationResult) => StockCheckResult;
  fetchClients: () => Promise<void>;
  addClient: (
    payload: Omit<Client, 'id' | 'organization_id' | 'created_at'>
  ) => Promise<Client | null>;
  updateClient: (
    id: string,
    updates: Partial<Omit<Client, 'id' | 'organization_id' | 'created_at'>>
  ) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
  addWorkOrder: (order: WorkOrder) => Promise<void>;
  updateOrderStatus: (orderId: string, newStatus: OrderStatus) => Promise<void>;
  deleteWorkOrder: (orderId: string) => Promise<void>;
  recordStockEntry: (
    artikalId: string,
    tip: 'ULAZ' | 'IZLAZ',
    kolicina: number,
    razlog: string
  ) => Promise<void>;
  addNewWarehouseItem: (item: Omit<WarehouseItem, 'id'>) => Promise<void>;
  saveOptimizationResult: (summary: OptimizationSummary) => Promise<void>;
  updateCompanySettings: (newSettings: CompanySettings) => Promise<void>;
  resetAllDemoData: () => void;
  showToast: (
    tekst: string,
    tip?: 'success' | 'info' | 'warning' | 'error'
  ) => void;
  dismissToast: (id: string) => void;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user } = useAuth();

  const [orders, setOrders] = useState<WorkOrder[]>(INITIAL_WORK_ORDERS);
  const [warehouse, setWarehouse] =
    useState<WarehouseItem[]>(INITIAL_WAREHOUSE);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>(
    INITIAL_STOCK_MOVEMENTS
  );
  const [optimizationHistory, setOptimizationHistory] = useState<
    OptimizationSummary[]
  >(INITIAL_OPTIMIZATION_HISTORY);
  const [companySettings, setCompanySettings] = useState<CompanySettings>(
    DEFAULT_COMPANY_SETTINGS
  );
  const [clients, setClients] = useState<Client[]>(INITIAL_CLIENTS);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(false);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (
      tekst: string,
      tip: 'success' | 'info' | 'warning' | 'error' = 'success'
    ) => {
      const id = crypto.randomUUID();
      setToasts((prev) => [...prev, { id, tekst, tip }]);
      setTimeout(() => {
        dismissToast(id);
      }, 4500);
    },
    [dismissToast]
  );

  const generateUniqueOrderCode = useCallback(
    (prefix: 'RN' | 'PN' = 'RN'): string => {
      const uuidSegment = crypto.randomUUID().split('-')[0].toUpperCase();
      return `${prefix}-2026-${uuidSegment}`;
    },
    []
  );

  /**
   * KORAK 3: Validacija Stanja Skladišta
   * Provjerava stavke kalkulacije (okvire/profile, mrežice/lamele, traku/kanap/okov)
   * u odnosu na `warehouse` (filtrirano po organization_id i RAL boji).
   */
  const checkStockAvailability = useCallback(
    (spec: CalculationResult): StockCheckResult => {
      const missingItems: string[] = [];

      // 1. Provjera ALU profila (Okviri, Krilo K., Vodilice 137 / 165) prema RAL boji
      const totalProfileMm = spec.profiliZaKrojenjeMm.reduce(
        (sum, len) => sum + len,
        0
      );
      const potrebnoSipki = Number((totalProfileMm / 6000).toFixed(2));
      const matchedProfile = findMatchingWarehouseItem(
        warehouse,
        'ALU Profili',
        spec.tipProizvoda,
        spec.bojaRal
      );

      if (!matchedProfile) {
        missingItems.push(
          `ALU Profil (${spec.bojaRal}) — artikal nije pronađen u skladištu`
        );
      } else {
        const potrebnaKolicinaProfila =
          matchedProfile.jedinica === 'm'
            ? Number((totalProfileMm / 1000).toFixed(2))
            : potrebnoSipki;
        if (matchedProfile.stanje < potrebnaKolicinaProfila) {
          missingItems.push(
            `${matchedProfile.naziv} [${spec.bojaRal}]: potrebno ${potrebnaKolicinaProfila} ${matchedProfile.jedinica}, dostupno ${matchedProfile.stanje} ${matchedProfile.jedinica}`
          );
        }
      }

      // 2. Provjera Mrežice (za komarnike) ili ALU Lamela (za roletne)
      const isKomarnik = spec.tipProizvoda.toLowerCase().includes('komarnik');
      const matchedSecondary = findMatchingWarehouseItem(
        warehouse,
        'Mrežice i Lamele',
        spec.tipProizvoda,
        spec.bojaRal
      );

      if (isKomarnik) {
        const potrebnoMreziceM2 = Number(
          (spec.potrebnaMrezicaM2 * spec.kolicina).toFixed(2)
        );
        if (!matchedSecondary) {
          missingItems.push(
            `Mrežica (${potrebnoMreziceM2} m²) — artikal nije pronađen u skladištu`
          );
        } else if (matchedSecondary.stanje < potrebnoMreziceM2) {
          missingItems.push(
            `${matchedSecondary.naziv}: potrebno ${potrebnoMreziceM2} ${matchedSecondary.jedinica}, dostupno ${matchedSecondary.stanje} ${matchedSecondary.jedinica}`
          );
        }
      } else {
        const potrebnoLamelaM = Number(
          (
            ((spec.brojLamela || 30) *
              (spec.sirinaLameleMm || 1100) *
              spec.kolicina) /
            1000
          ).toFixed(2)
        );
        if (!matchedSecondary) {
          missingItems.push(
            `ALU Lamela (${potrebnoLamelaM} m) — artikal nije pronađen u skladištu`
          );
        } else if (matchedSecondary.stanje < potrebnoLamelaM) {
          missingItems.push(
            `${matchedSecondary.naziv}: potrebno ${potrebnoLamelaM} ${matchedSecondary.jedinica}, dostupno ${matchedSecondary.stanje} ${matchedSecondary.jedinica}`
          );
        }
      }

      // 3. Provjera Kanapa / Trake / Okova i mehanizama
      const matchedHardware = findMatchingWarehouseItem(
        warehouse,
        'Mehanizmi i Okov',
        spec.tipProizvoda,
        spec.bojaRal
      );
      const potrebnoSetovaOkova = spec.kolicina;

      if (!matchedHardware) {
        missingItems.push(
          `Kanap / Traka / Okov (${potrebnoSetovaOkova} set) — artikal nije pronađen u skladištu`
        );
      } else if (matchedHardware.stanje < potrebnoSetovaOkova) {
        missingItems.push(
          `${matchedHardware.naziv}: potrebno ${potrebnoSetovaOkova} ${matchedHardware.jedinica}, dostupno ${matchedHardware.stanje} ${matchedHardware.jedinica}`
        );
      }

      return {
        isAvailable: missingItems.length === 0,
        missingItems,
      };
    },
    [warehouse]
  );

  /**
   * KORAK 4: CRM Logika — Dohvatanje klijenata iz tabele `clients`
   */
  const fetchClients = useCallback(async () => {
    if (!user || !isSupabaseConfigured) return;

    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('organization_id', user.organizationId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setClients(
        data.map((c) => ({
          id: c.id,
          organization_id: c.organization_id,
          name: c.name,
          phone: c.phone || '',
          email: c.email || '',
          address: c.address || '',
          city: c.city || 'Sarajevo',
          created_at: c.created_at,
        }))
      );
    }
  }, [user]);

  const addClient = useCallback(
    async (
      payload: Omit<Client, 'id' | 'organization_id' | 'created_at'>
    ): Promise<Client | null> => {
      const orgId = user?.organizationId || 'org-sarajevo-01';
      const newClientObj: Client = {
        id: crypto.randomUUID(),
        organization_id: orgId,
        name: payload.name.trim(),
        phone: payload.phone.trim(),
        email: payload.email.trim(),
        address: payload.address.trim(),
        city: payload.city.trim() || 'Sarajevo',
        created_at: new Date().toISOString(),
      };

      if (isSupabaseConfigured && user) {
        const { data, error } = await supabase
          .from('clients')
          .insert({
            id: newClientObj.id,
            organization_id: user.organizationId,
            name: newClientObj.name,
            phone: newClientObj.phone,
            email: newClientObj.email,
            address: newClientObj.address,
            city: newClientObj.city,
          })
          .select()
          .single();

        if (error) {
          showToast(`Greška pri unosu kupca: ${error.message}`, 'error');
          return null;
        }

        const savedClient: Client = {
          id: data.id,
          organization_id: data.organization_id,
          name: data.name,
          phone: data.phone || '',
          email: data.email || '',
          address: data.address || '',
          city: data.city || 'Sarajevo',
          created_at: data.created_at,
        };
        setClients((prev) => [savedClient, ...prev]);
        showToast(`Kupac "${savedClient.name}" dodan u CRM bazu!`, 'success');
        return savedClient;
      } else {
        setClients((prev) => [newClientObj, ...prev]);
        showToast(`Kupac "${newClientObj.name}" dodan u CRM bazu!`, 'success');
        return newClientObj;
      }
    },
    [showToast, user]
  );

  const updateClient = useCallback(
    async (
      id: string,
      updates: Partial<Omit<Client, 'id' | 'organization_id' | 'created_at'>>
    ) => {
      if (isSupabaseConfigured && user) {
        const { error } = await supabase
          .from('clients')
          .update(updates)
          .eq('id', id)
          .eq('organization_id', user.organizationId);

        if (error) {
          showToast(`Greška pri ažuriranju kupca: ${error.message}`, 'error');
          return;
        }
        await fetchClients();
      } else {
        setClients((prev) =>
          prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
        );
      }
      showToast('Podaci o kupcu su ažurirani.', 'info');
    },
    [fetchClients, showToast, user]
  );

  const deleteClient = useCallback(
    async (id: string) => {
      if (isSupabaseConfigured && user) {
        const { error } = await supabase
          .from('clients')
          .delete()
          .eq('id', id)
          .eq('organization_id', user.organizationId);

        if (error) {
          showToast(`Greška pri brisanju kupca: ${error.message}`, 'error');
          return;
        }
      }
      setClients((prev) => prev.filter((c) => c.id !== id));
      showToast('Kupac je obrisan iz CRM evidencije.', 'warning');
    },
    [showToast, user]
  );

  const refetchAllData = useCallback(async () => {
    if (!user || !isSupabaseConfigured) {
      if (user) {
        setCompanySettings((prev) => ({
          ...prev,
          nazivFirme: user.organizationName || prev.nazivFirme,
          jibBroj: user.jib || prev.jibBroj,
          pdvBroj: user.pdv || prev.pdvBroj,
          adresa: user.address || prev.adresa,
          logoUrl: user.logoUrl ?? prev.logoUrl,
        }));
      }
      return;
    }

    setIsLoadingData(true);
    try {
      const orgId = user.organizationId;

      // 1. Učitaj podatke organizacije (uključujući default_labor_cost_per_m2 i default_margin_percent)
      const { data: orgRow } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', orgId)
        .single();

      if (orgRow) {
        setCompanySettings({
          nazivFirme: orgRow.name,
          podnaslov:
            orgRow.subtitle ||
            'Proizvodnja i montaža ALU roletni, plise komarnika i vanjskih sjenila',
          adresa: orgRow.address,
          grad: orgRow.city || 'Sarajevo, Bosna i Hercegovina',
          jibBroj: orgRow.jib,
          pdvBroj: orgRow.pdv,
          telefon: orgRow.phone || '+387 33 712 400',
          email: orgRow.email || user.email,
          ziroRacun: orgRow.bank_account || '1610000012345678',
          banka: orgRow.bank_name || 'Raiffeisen Bank dd BiH',
          logoUrl: orgRow.logo_url || '',
          ovlastenoLice: orgRow.authorized_person || user.fullName,
          defaultLaborCostPerM2: Number(
            orgRow.default_labor_cost_per_m2 ?? 15.0
          ),
          defaultMarginPercent: Number(orgRow.default_margin_percent ?? 20.0),
        });
      }

      // 2. Učitaj CRM kupce (`clients`)
      await fetchClients();

      // 3. Učitaj skladište (`warehouse_items`)
      const { data: whRows } = await supabase
        .from('warehouse_items')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: true });

      if (whRows) {
        setWarehouse(
          whRows.map((r) => ({
            id: r.id,
            sifra: r.code || 'AL-PRO',
            naziv: r.name,
            kategorija: r.type as WarehouseItem['kategorija'],
            boja: r.ral_color || 'Standard',
            stanje: Number(r.quantity),
            jedinica: r.unit as WarehouseItem['jedinica'],
            minZaliha: Number(r.min_stock || 10),
            cijenaPoJediniciKM: Number(r.price_per_unit || 0),
          }))
        );
      }

      // 4. Učitaj radne naloge (`work_orders`)
      const { data: orderRows } = await supabase
        .from('work_orders')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });

      if (orderRows) {
        setOrders(
          orderRows.map((r) => ({
            id: r.order_code || r.id,
            client_id: r.client_id || null,
            klijent: r.client_name,
            lokacija: r.location || 'Bosna i Hercegovina',
            tipProizvoda: r.product_type,
            bojaRal: r.ral_color,
            sirinaMm: Number(r.width_mm ?? r.width ?? 1200),
            visinaMm: Number(r.height_mm ?? r.height ?? 1000),
            kolicina: Number(r.quantity),
            datumKreiranja: new Date(r.created_at).toLocaleDateString('bs-BA'),
            rokIsporuke:
              r.delivery_date_label ||
              r.delivery_date ||
              new Date(r.created_at).toLocaleDateString('bs-BA'),
            status: r.status as OrderStatus,
            materijalSkinutSaStanja: Boolean(r.material_deducted),
            napomena: r.note || r.notes || undefined,
            labor_cost_fening: Number(r.labor_cost_fening || 0),
            margin_percent: Number(r.margin_percent || 20),
            kalkulacija: r.calculation_snapshot || r.calculation_json,
          }))
        );
      }

      // 5. Učitaj dnevnik ulaza i izlaza robe (`stock_movements`)
      const { data: movRows } = await supabase
        .from('stock_movements')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (movRows) {
        setStockMovements(
          movRows.map((m) => ({
            id: m.id,
            datum: new Date(m.created_at).toLocaleString('bs-BA', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }),
            tip: (m.movement_type === 'in' || m.type === 'ULAZ'
              ? 'ULAZ'
              : 'IZLAZ') as 'ULAZ' | 'IZLAZ',
            artikalId: m.warehouse_item_id || m.item_id || '',
            artikalNaziv: m.item_name || 'Skladišni artikal',
            kolicina: Number(m.quantity),
            jedinica: m.unit || 'kom',
            razlog: m.note || m.reason || '',
          }))
        );
      }

      // 6. Učitaj istoriju optimizacija (`cutting_optimizations`)
      const { data: optRows } = await supabase
        .from('cutting_optimizations')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (optRows && optRows.length > 0) {
        setOptimizationHistory(
          optRows.map((o) => ({
            id: o.id.slice(0, 8).toUpperCase(),
            datum: new Date(o.created_at).toLocaleString('bs-BA', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }),
            nazivNaloga: o.title || 'BFD Optimizacija',
            duzinaSipkeMm: Number(o.stock_length_mm || o.bar_length_mm || 6000),
            debljinaRezaMm: Number(o.kerf_mm || 0),
            ulazneDuzineMm: o.input_lengths_json || [],
            sipke: o.bars_json || [],
            ukupnoSipki: Number(o.bars_used || 1),
            ukupnoIskoristenoMm: Number(o.used_mm || 0),
            ukupnoKerfMm: 0,
            ukupnoSkartMm: Number(o.total_waste_mm || o.waste_mm || 0),
            prosjecnaIskoristenostProcenat: Number(
              o.efficiency_percent || o.efficiency || 0
            ),
            ustedaKM: Number(
              (((Number(o.used_mm || 3000) / 1000) * 0.145) * 14.5).toFixed(2)
            ),
          }))
        );
      }
    } finally {
      setIsLoadingData(false);
    }
  }, [fetchClients, user]);

  useEffect(() => {
    void refetchAllData();
  }, [refetchAllData]);

  // Dodavanje novog radnog naloga uz obaveznu validaciju skladišta (`checkStockAvailability`)
  const addWorkOrder = useCallback(
    async (newOrder: WorkOrder) => {
      const stockValidation = checkStockAvailability(newOrder.kalkulacija);

      const resolvedStatus: OrderStatus = stockValidation.isAvailable
        ? newOrder.status
        : 'Čeka materijal';

      if (!stockValidation.isAvailable) {
        showToast(
          `Upozorenje o zalihama: Nedostaje materijal (${stockValidation.missingItems.join(
            '; '
          )}). Nalog je označen kao "Čeka materijal".`,
          'warning'
        );
      }

      const orderWithUuid: WorkOrder = {
        ...newOrder,
        status: resolvedStatus,
        labor_cost_fening: newOrder.kalkulacija.radFeninga,
        margin_percent: newOrder.kalkulacija.marginPercent,
        id:
          newOrder.id && !newOrder.id.endsWith('undefined')
            ? newOrder.id
            : generateUniqueOrderCode('RN'),
      };

      if (isSupabaseConfigured && user) {
        const { error } = await supabase.from('work_orders').insert({
          id: crypto.randomUUID(),
          order_code: orderWithUuid.id,
          organization_id: user.organizationId,
          client_id: orderWithUuid.client_id || null,
          client_name: orderWithUuid.klijent,
          location: orderWithUuid.lokacija,
          width_mm: orderWithUuid.sirinaMm,
          height_mm: orderWithUuid.visinaMm,
          product_type: orderWithUuid.tipProizvoda,
          ral_color: orderWithUuid.bojaRal,
          quantity: orderWithUuid.kolicina,
          status: orderWithUuid.status,
          material_deducted: false,
          note: orderWithUuid.napomena || '',
          labor_cost_fening: orderWithUuid.kalkulacija.radFeninga,
          margin_percent: orderWithUuid.kalkulacija.marginPercent,
          price_subtotal_fening: orderWithUuid.kalkulacija.osnovicaFeninga,
          vat_fening: orderWithUuid.kalkulacija.pdvFeninga,
          price_total_fening: orderWithUuid.kalkulacija.ukupnoFeninga,
          calculation_snapshot: orderWithUuid.kalkulacija,
          delivery_date_label: orderWithUuid.rokIsporuke,
        });

        if (error) {
          showToast(`Greška pri upisu u Supabase: ${error.message}`, 'error');
          return;
        }
        await refetchAllData();
      } else {
        setOrders((prev) => [orderWithUuid, ...prev]);
      }

      if (stockValidation.isAvailable) {
        showToast(
          `Nalog ${orderWithUuid.id} (${orderWithUuid.klijent}) uspješno sačuvan! Materijal je dostupan na stanju.`,
          'success'
        );
      }
    },
    [
      checkStockAvailability,
      generateUniqueOrderCode,
      refetchAllData,
      showToast,
      user,
    ]
  );

  const recordStockEntry = useCallback(
    async (
      artikalId: string,
      tip: 'ULAZ' | 'IZLAZ',
      kolicina: number,
      razlog: string
    ) => {
      const cleanQty = Number(Math.max(0.1, kolicina).toFixed(2));
      const targetItem = warehouse.find((w) => w.id === artikalId);
      if (!targetItem) return;

      const nextStanje =
        tip === 'ULAZ'
          ? Number((targetItem.stanje + cleanQty).toFixed(2))
          : Number(Math.max(0, targetItem.stanje - cleanQty).toFixed(2));

      if (isSupabaseConfigured && user) {
        const { error: whErr } = await supabase
          .from('warehouse_items')
          .update({ quantity: nextStanje })
          .eq('id', artikalId)
          .eq('organization_id', user.organizationId);

        if (whErr) {
          showToast(`Greška pri ažuriranju zaliha: ${whErr.message}`, 'error');
          return;
        }

        await supabase.from('stock_movements').insert({
          id: crypto.randomUUID(),
          organization_id: user.organizationId,
          warehouse_item_id: artikalId,
          movement_type: tip === 'ULAZ' ? 'in' : 'out',
          quantity: cleanQty,
          note:
            razlog.trim() ||
            (tip === 'ULAZ' ? 'Redovni ulaz robe' : 'Razduženje materijala'),
        });

        await refetchAllData();
      } else {
        setWarehouse((prev) =>
          prev.map((item) =>
            item.id === artikalId ? { ...item, stanje: nextStanje } : item
          )
        );

        const newMovement: StockMovement = {
          id: crypto.randomUUID(),
          datum: new Date().toLocaleString('bs-BA', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }),
          tip,
          artikalId,
          artikalNaziv: targetItem.naziv,
          kolicina: cleanQty,
          jedinica: targetItem.jedinica,
          razlog:
            razlog.trim() ||
            (tip === 'ULAZ' ? 'Redovni ulaz robe' : 'Razduženje materijala'),
        };

        setStockMovements((prev) => [newMovement, ...prev]);
      }

      showToast(
        `${tip === 'ULAZ' ? 'Ulaz robe evidentiran' : 'Izlaz robe evidentiran'}: ${cleanQty} ${targetItem.jedinica}`,
        tip === 'ULAZ' ? 'success' : 'info'
      );
    },
    [refetchAllData, showToast, user, warehouse]
  );

  const updateOrderStatus = useCallback(
    async (orderId: string, newStatus: OrderStatus) => {
      const targetOrder = orders.find((o) => o.id === orderId);
      if (!targetOrder) return;

      const shouldDeductMaterial =
        newStatus === 'Završeno' && !targetOrder.materijalSkinutSaStanja;

      const calc = targetOrder.kalkulacija;
      const totalProfileMm = calc.profiliZaKrojenjeMm.reduce(
        (s, n) => s + n,
        0
      );
      const utrosenoSipki = Math.max(
        0.5,
        Number((totalProfileMm / 6000).toFixed(2))
      );
      const isKomarnik = targetOrder.tipProizvoda
        .toLowerCase()
        .includes('komarnik');
      const secondaryQty = isKomarnik
        ? Number((calc.potrebnaMrezicaM2 * targetOrder.kolicina).toFixed(2))
        : Number(
            (
              ((calc.brojLamela || 30) *
                (calc.sirinaLameleMm || 1100) *
                targetOrder.kolicina) /
              1000
            ).toFixed(2)
          );

      const matchedProfileItem = findMatchingWarehouseItem(
        warehouse,
        'ALU Profili',
        targetOrder.tipProizvoda,
        targetOrder.bojaRal
      );
      const matchedSecondaryItem = findMatchingWarehouseItem(
        warehouse,
        'Mrežice i Lamele',
        targetOrder.tipProizvoda,
        targetOrder.bojaRal
      );

      if (isSupabaseConfigured && user) {
        const { error: orderErr } = await supabase
          .from('work_orders')
          .update({
            status: newStatus,
            material_deducted:
              targetOrder.materijalSkinutSaStanja || newStatus === 'Završeno',
          })
          .eq('order_code', orderId)
          .eq('organization_id', user.organizationId);

        if (orderErr) {
          showToast(`Greška pri promjeni statusa: ${orderErr.message}`, 'error');
          return;
        }

        if (shouldDeductMaterial) {
          if (matchedProfileItem) {
            const nextProfileQty = Number(
              Math.max(0, matchedProfileItem.stanje - utrosenoSipki).toFixed(2)
            );
            await supabase
              .from('warehouse_items')
              .update({ quantity: nextProfileQty })
              .eq('id', matchedProfileItem.id)
              .eq('organization_id', user.organizationId);

            await supabase.from('stock_movements').insert({
              id: crypto.randomUUID(),
              organization_id: user.organizationId,
              warehouse_item_id: matchedProfileItem.id,
              movement_type: 'out',
              quantity: utrosenoSipki,
              note: `Automatsko razduženje po specifikaciji — nalog ${targetOrder.id} (${targetOrder.klijent})`,
            });
          }

          if (matchedSecondaryItem) {
            const nextSecQty = Number(
              Math.max(0, matchedSecondaryItem.stanje - secondaryQty).toFixed(2)
            );
            await supabase
              .from('warehouse_items')
              .update({ quantity: nextSecQty })
              .eq('id', matchedSecondaryItem.id)
              .eq('organization_id', user.organizationId);

            await supabase.from('stock_movements').insert({
              id: crypto.randomUUID(),
              organization_id: user.organizationId,
              warehouse_item_id: matchedSecondaryItem.id,
              movement_type: 'out',
              quantity: secondaryQty,
              note: `Automatsko razduženje po specifikaciji — nalog ${targetOrder.id} (${targetOrder.klijent})`,
            });
          }
        }

        await refetchAllData();
      } else {
        setOrders((prev) =>
          prev.map((o) =>
            o.id === orderId
              ? {
                  ...o,
                  status: newStatus,
                  materijalSkinutSaStanja:
                    o.materijalSkinutSaStanja || newStatus === 'Završeno',
                }
              : o
          )
        );

        if (shouldDeductMaterial) {
          const timestamp = new Date().toLocaleString('bs-BA', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });

          setWarehouse((prev) =>
            prev.map((w) => {
              if (matchedProfileItem && w.id === matchedProfileItem.id) {
                return {
                  ...w,
                  stanje: Number(
                    Math.max(0, w.stanje - utrosenoSipki).toFixed(2)
                  ),
                };
              }
              if (matchedSecondaryItem && w.id === matchedSecondaryItem.id) {
                return {
                  ...w,
                  stanje: Number(
                    Math.max(0, w.stanje - secondaryQty).toFixed(2)
                  ),
                };
              }
              return w;
            })
          );

          const movementsToAdd: StockMovement[] = [];
          if (matchedProfileItem) {
            movementsToAdd.push({
              id: crypto.randomUUID(),
              datum: timestamp,
              tip: 'IZLAZ',
              artikalId: matchedProfileItem.id,
              artikalNaziv: `${matchedProfileItem.naziv} [${targetOrder.bojaRal}]`,
              kolicina: utrosenoSipki,
              jedinica: matchedProfileItem.jedinica,
              razlog: `Automatsko razduženje po specifikaciji — nalog ${targetOrder.id} (${targetOrder.klijent})`,
            });
          }
          if (matchedSecondaryItem) {
            movementsToAdd.push({
              id: crypto.randomUUID(),
              datum: timestamp,
              tip: 'IZLAZ',
              artikalId: matchedSecondaryItem.id,
              artikalNaziv: matchedSecondaryItem.naziv,
              kolicina: secondaryQty,
              jedinica: matchedSecondaryItem.jedinica,
              razlog: `Automatsko razduženje po specifikaciji — nalog ${targetOrder.id} (${targetOrder.klijent})`,
            });
          }
          setStockMovements((prev) => [...movementsToAdd, ...prev]);
        }
      }

      if (shouldDeductMaterial) {
        showToast(
          `Nalog ${targetOrder.id} završen! Skinuto sa stanja: ${utrosenoSipki} ${
            matchedProfileItem?.jedinica || 'šipki'
          } i ${secondaryQty} ${matchedSecondaryItem?.jedinica || 'm²'}.`,
          'success'
        );
      } else {
        showToast(
          `Status naloga ${targetOrder.id} promijenjen u "${newStatus}".`,
          'info'
        );
      }
    },
    [orders, refetchAllData, showToast, user, warehouse]
  );

  const deleteWorkOrder = useCallback(
    async (orderId: string) => {
      if (isSupabaseConfigured && user) {
        await supabase
          .from('work_orders')
          .delete()
          .eq('order_code', orderId)
          .eq('organization_id', user.organizationId);
        await refetchAllData();
      } else {
        setOrders((prev) => prev.filter((o) => o.id !== orderId));
      }
      showToast(`Radni nalog ${orderId} je obrisan.`, 'warning');
    },
    [refetchAllData, showToast, user]
  );

  const addNewWarehouseItem = useCallback(
    async (item: Omit<WarehouseItem, 'id'>) => {
      const newId = crypto.randomUUID();
      if (isSupabaseConfigured && user) {
        const { error } = await supabase.from('warehouse_items').insert({
          id: newId,
          organization_id: user.organizationId,
          code: item.sifra,
          name: item.naziv,
          type: item.kategorija,
          ral_color: item.boja,
          quantity: item.stanje,
          unit: item.jedinica,
          min_stock: item.minZaliha,
          price_per_unit: item.cijenaPoJediniciKM,
        });
        if (error) {
          showToast(`Greška pri unosu artikla: ${error.message}`, 'error');
          return;
        }
        await refetchAllData();
      } else {
        setWarehouse((prev) => [...prev, { ...item, id: newId }]);
      }
      showToast(`Novi artikal "${item.naziv}" dodan u skladište!`, 'success');
    },
    [refetchAllData, showToast, user]
  );

  const saveOptimizationResult = useCallback(
    async (summary: OptimizationSummary) => {
      if (isSupabaseConfigured && user) {
        await supabase.from('cutting_optimizations').insert({
          id: crypto.randomUUID(),
          organization_id: user.organizationId,
          title: summary.nazivNaloga,
          stock_length_mm: summary.duzinaSipkeMm,
          kerf_mm: summary.debljinaRezaMm,
          efficiency_percent: summary.prosjecnaIskoristenostProcenat,
          total_waste_mm: summary.ukupnoSkartMm,
          result_json: summary,
        });
        await refetchAllData();
      } else {
        setOptimizationHistory((prev) => [summary, ...prev.slice(0, 19)]);
      }

      showToast(
        `Optimizacija sačuvana: ${summary.ukupnoSipki} šipki (${summary.prosjecnaIskoristenostProcenat}% iskorištenost).`,
        'success'
      );
    },
    [refetchAllData, showToast, user]
  );

  const updateCompanySettings = useCallback(
    async (newSettings: CompanySettings) => {
      if (isSupabaseConfigured && user) {
        const { error } = await supabase
          .from('organizations')
          .update({
            name: newSettings.nazivFirme,
            address: newSettings.adresa,
            city: newSettings.grad,
            jib: newSettings.jibBroj,
            pdv: newSettings.pdvBroj,
            phone: newSettings.telefon,
            email: newSettings.email,
            logo_url: newSettings.logoUrl,
            authorized_person: newSettings.ovlastenoLice,
            default_labor_cost_per_m2: newSettings.defaultLaborCostPerM2,
            default_margin_percent: newSettings.defaultMarginPercent,
          })
          .eq('id', user.organizationId);

        if (error) {
          showToast(`Greška pri čuvanju postavki: ${error.message}`, 'error');
          return;
        }
        await refetchAllData();
      } else {
        setCompanySettings(newSettings);
      }

      showToast(
        'Postavke firme (uključujući cijenu rada i maržu) su sačuvane!',
        'success'
      );
    },
    [refetchAllData, showToast, user]
  );

  const resetAllDemoData = useCallback(() => {
    setOrders(INITIAL_WORK_ORDERS);
    setWarehouse(INITIAL_WAREHOUSE);
    setStockMovements(INITIAL_STOCK_MOVEMENTS);
    setOptimizationHistory(INITIAL_OPTIMIZATION_HISTORY);
    setCompanySettings(DEFAULT_COMPANY_SETTINGS);
    setClients(INITIAL_CLIENTS);
    showToast('Podaci su vraćeni na početne vrijednosti.', 'info');
  }, [showToast]);

  const savedScrapPercent =
    optimizationHistory.length > 0
      ? Number(
          Math.max(
            12.4,
            Math.min(
              24.5,
              optimizationHistory[0].prosjecnaIskoristenostProcenat * 0.21
            )
          ).toFixed(1)
        )
      : 16.4;

  const savedMetersThisMonth = Number(
    (
      38.0 +
      optimizationHistory.reduce(
        (acc, h) => acc + h.ukupnoIskoristenoMm / 1000,
        0
      ) *
        0.15
    ).toFixed(1)
  );

  return (
    <AppContext.Provider
      value={{
        orders,
        warehouse,
        stockMovements,
        optimizationHistory,
        companySettings,
        clients,
        toasts,
        isLoadingData,
        savedScrapPercent,
        savedMetersThisMonth,
        generateUniqueOrderCode,
        refetchAllData,
        checkStockAvailability,
        fetchClients,
        addClient,
        updateClient,
        deleteClient,
        addWorkOrder,
        updateOrderStatus,
        deleteWorkOrder,
        recordStockEntry,
        addNewWarehouseItem,
        saveOptimizationResult,
        updateCompanySettings,
        resetAllDemoData,
        showToast,
        dismissToast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useAppContext mora biti korišten unutar AppProvider-a');
  }
  return ctx;
}
