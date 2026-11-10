-- ============================================================================
-- ROLETNAPRO — SUPABASE MULTI-TENANT SAAS SQL ŠEMA SA RLS POLITIKAMA (FAZA 4)
-- Uputstvo: Kopirajte cijelu skriptu u Supabase Dashboard -> SQL Editor -> Run
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. TABELA: organizations (Firme / Proizvođači roletni i komarnika)
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subtitle TEXT DEFAULT 'Proizvodnja i montaža ALU roletni, plise komarnika i vanjskih sjenila',
  jib TEXT NOT NULL,
  pdv TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT DEFAULT '71000 Sarajevo, Bosna i Hercegovina',
  phone TEXT DEFAULT '+387 33 712 400',
  email TEXT DEFAULT 'prodaja@roletnapro.ba',
  bank_account TEXT DEFAULT '1610000012345678',
  bank_name TEXT DEFAULT 'Raiffeisen Bank dd Bosna i Hercegovina',
  authorized_person TEXT DEFAULT 'Ing. Emir Hadžić, dipl. maš.',
  logo_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. TABELA: profiles (Korisnici povezani sa auth.users i svojom firmom)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'manager', 'operator')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. TABELA: warehouse_items (Skladište repromaterijala po firmi)
CREATE TABLE IF NOT EXISTS public.warehouse_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  code TEXT NOT NULL DEFAULT 'AL-PRO',
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('ALU Profili', 'Mrežice i Lamele', 'Mehanizmi i Okov')),
  ral_color TEXT NOT NULL DEFAULT 'RAL 9016 - Bijela',
  quantity NUMERIC(12, 2) NOT NULL DEFAULT 0,
  unit TEXT NOT NULL CHECK (unit IN ('m', 'm²', 'kom', 'šipki (6m)')),
  min_stock NUMERIC(12, 2) NOT NULL DEFAULT 10,
  price_per_unit NUMERIC(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. TABELA: work_orders (Radni nalozi i kalkulacije)
CREATE TABLE IF NOT EXISTS public.work_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_code TEXT NOT NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  location TEXT NOT NULL DEFAULT 'Bosna i Hercegovina',
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  product_type TEXT NOT NULL,
  ral_color TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'U proizvodnji' CHECK (status IN ('U proizvodnji', 'Spremno za montažu', 'Čeka materijal', 'Završeno')),
  material_deducted BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  total_price NUMERIC(12, 2) NOT NULL,
  calculation_json JSONB NOT NULL,
  delivery_date TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. TABELA: stock_movements (Transakcijski dnevnik ulaza i izlaza robe)
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.warehouse_items(id) ON DELETE SET NULL,
  item_name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('ULAZ', 'IZLAZ')),
  quantity NUMERIC(12, 2) NOT NULL,
  unit TEXT NOT NULL DEFAULT 'kom',
  reason TEXT NOT NULL DEFAULT '',
  reference_order_id UUID REFERENCES public.work_orders(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. TABELA: cutting_optimizations (Istorija 1D BFD optimizacija krojenja)
CREATE TABLE IF NOT EXISTS public.cutting_optimizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  work_order_id UUID REFERENCES public.work_orders(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT 'BFD Optimizacija krojenja',
  bar_length_mm INTEGER NOT NULL DEFAULT 6000,
  kerf_mm INTEGER NOT NULL DEFAULT 4,
  bars_used INTEGER NOT NULL,
  used_mm INTEGER NOT NULL DEFAULT 0,
  waste_mm INTEGER NOT NULL,
  efficiency NUMERIC(5, 2) NOT NULL,
  input_lengths_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  bars_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- POMOĆNA FUNKCIJA ZA MULTI-TENANT IZOLACIJU (Vraća organization_id ulogovanog)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_my_organization_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id
  FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1;
$$;

-- ============================================================================
-- UKLJUČIVANJE ROW LEVEL SECURITY (RLS) NA SVIM TABELAMA
-- ============================================================================
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouse_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cutting_optimizations ENABLE ROW LEVEL SECURITY;

-- 1. RLS Politike za organizations
CREATE POLICY "Korisnik vidi samo svoju organizaciju"
  ON public.organizations FOR SELECT
  TO authenticated
  USING (id = public.get_my_organization_id());

CREATE POLICY "Korisnik može kreirati organizaciju pri registraciji"
  ON public.organizations FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Vlasnik/Korisnik može ažurirati svoju organizaciju"
  ON public.organizations FOR UPDATE
  TO authenticated
  USING (id = public.get_my_organization_id())
  WITH CHECK (id = public.get_my_organization_id());

-- 2. RLS Politike za profiles
CREATE POLICY "Korisnik vidi profile unutar svoje organizacije"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid() OR organization_id = public.get_my_organization_id());

CREATE POLICY "Korisnik kreira vlastiti profil pri registraciji"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "Korisnik ažurira vlastiti profil"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- 3. RLS Politike za warehouse_items
CREATE POLICY "Izolacija skladišta po organizaciji"
  ON public.warehouse_items FOR ALL
  TO authenticated
  USING (organization_id = public.get_my_organization_id())
  WITH CHECK (organization_id = public.get_my_organization_id());

-- 4. RLS Politike za work_orders
CREATE POLICY "Izolacija radnih naloga po organizaciji"
  ON public.work_orders FOR ALL
  TO authenticated
  USING (organization_id = public.get_my_organization_id())
  WITH CHECK (organization_id = public.get_my_organization_id());

-- 5. RLS Politike za stock_movements
CREATE POLICY "Izolacija kretanja robe po organizaciji"
  ON public.stock_movements FOR ALL
  TO authenticated
  USING (organization_id = public.get_my_organization_id())
  WITH CHECK (organization_id = public.get_my_organization_id());

-- 6. RLS Politike za cutting_optimizations
CREATE POLICY "Izolacija BFD optimizacija po organizaciji"
  ON public.cutting_optimizations FOR ALL
  TO authenticated
  USING (organization_id = public.get_my_organization_id())
  WITH CHECK (organization_id = public.get_my_organization_id());
