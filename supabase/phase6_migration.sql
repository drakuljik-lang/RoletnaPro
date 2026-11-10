-- ============================================================================
-- ROLETNAPRO SAAS - FAZA 6 SQL MIGRACIJA (CRM, PROFITABILNOST I SKLADIŠTE)
-- Pokrenite ovu skriptu u Supabase Dashboard -> SQL Editor
-- ============================================================================

create extension if not exists "pgcrypto";

-- 1. Kreiranje tabele `clients` (CRM baza kupaca po organizaciji)
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  phone text default '',
  email text default '',
  address text default '',
  city text default 'Sarajevo',
  created_at timestamptz not null default now()
);

-- Uključivanje RLS-a i kreiranje Tenant izolacijskih politika za `clients`
alter table public.clients enable row level security;

drop policy if exists "Tenant izolacija za clients" on public.clients;
create policy "Tenant izolacija za clients"
  on public.clients for all
  to authenticated
  using (organization_id = public.get_my_organization_id())
  with check (organization_id = public.get_my_organization_id());

-- 2. Dodavanje kolona za rad i maržu u tabelu `organizations`
alter table public.organizations
  add column if not exists default_labor_cost_per_m2 numeric(12, 2) not null default 15.00,
  add column if not exists default_margin_percent numeric(6, 2) not null default 20.00;

-- 3. Dodavanje kolona `client_id`, `labor_cost_fening` i `margin_percent` u `work_orders`
alter table public.work_orders
  add column if not exists client_id uuid references public.clients(id) on delete set null,
  add column if not exists labor_cost_fening integer not null default 0,
  add column if not exists margin_percent numeric(6, 2) not null default 0;
