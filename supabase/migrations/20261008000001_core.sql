-- BARQ MVP core schema.
-- Principles: every table has RLS; clients never write tables directly — all
-- state changes go through SECURITY DEFINER functions that validate the caller,
-- enforce state machines, write an audit record and notify the other party.

create schema if not exists private;

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
create type public.app_role as enum ('buyer', 'supplier', 'admin');
create type public.rfq_status as enum ('DRAFT', 'PUBLISHED', 'OPEN', 'QUOTES_RECEIVED', 'EVALUATION', 'AWARDED', 'CLOSED', 'CANCELLED');
create type public.quote_status as enum ('SUBMITTED', 'WITHDRAWN', 'AWARDED', 'NOT_SELECTED');
create type public.order_status as enum ('PENDING', 'CONFIRMED', 'PROCESSING', 'READY_FOR_SHIPMENT', 'SHIPPED', 'DELIVERED', 'COMPLETED', 'CANCELLED');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table public.companies (
  id uuid primary key default gen_random_uuid(),
  kind public.app_role not null check (kind in ('buyer', 'supplier')),
  name text not null check (char_length(btrim(name)) between 2 and 120),
  cr_number text check (cr_number is null or char_length(cr_number) <= 40),
  city text check (city is null or char_length(city) <= 60),
  categories text[] not null default '{}',
  verification smallint not null default 0 check (verification between 0 and 3),
  verified_at timestamptz,
  verified_by uuid,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text not null check (char_length(btrim(full_name)) between 2 and 80),
  phone text check (phone is null or phone ~ '^\+?[0-9 ()-]{7,20}$'),
  role public.app_role not null,
  company_id uuid references public.companies (id),
  created_at timestamptz not null default now(),
  constraint company_required check (role = 'admin' or company_id is not null)
);
create index profiles_company_idx on public.profiles (company_id);

create table public.rfqs (
  id uuid primary key default gen_random_uuid(),
  number bigint generated always as identity (start with 1001) unique,
  buyer_company_id uuid not null references public.companies (id),
  created_by uuid not null references public.profiles (id),
  title text not null check (char_length(btrim(title)) between 3 and 120),
  category text not null check (category in ('c_hvac', 'c_pipes', 'c_elec', 'c_safety')),
  quantity integer not null check (quantity between 1 and 100000),
  unit text not null check (unit in ('u_pcs', 'u_box', 'u_m', 'u_ton')),
  spec text not null check (char_length(btrim(spec)) between 10 and 1000),
  location text not null check (location in ('l_seeb', 'l_bawshar', 'l_muttrah', 'l_amerat', 'l_qurayyat', 'l_muscat', 'l_rusayl', 'l_ghala')),
  required_by date not null,
  status public.rfq_status not null default 'OPEN',
  closes_at timestamptz not null,
  idempotency_key text not null check (char_length(idempotency_key) between 8 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (created_by, idempotency_key)
);
create index rfqs_buyer_idx on public.rfqs (buyer_company_id, created_at desc);
create index rfqs_open_idx on public.rfqs (category, closes_at) where status in ('OPEN', 'QUOTES_RECEIVED');

create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  rfq_id uuid not null references public.rfqs (id) on delete cascade,
  supplier_company_id uuid not null references public.companies (id),
  submitted_by uuid not null references public.profiles (id),
  unit_price_baisa bigint not null check (unit_price_baisa between 1 and 1000000000000),
  total_baisa bigint not null check (total_baisa > 0),
  min_days integer not null check (min_days between 1 and 365),
  max_days integer not null check (max_days between 1 and 365),
  warranty_months integer not null default 0 check (warranty_months between 0 and 120),
  payment_terms text not null check (payment_terms in ('ADVANCE_100', 'ADVANCE_50', 'ADVANCE_30', 'NET_30', 'NET_60')),
  notes text check (notes is null or char_length(notes) <= 1000),
  valid_until date,
  status public.quote_status not null default 'SUBMITTED',
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (rfq_id, supplier_company_id),
  check (max_days >= min_days)
);
create index quotes_supplier_idx on public.quotes (supplier_company_id, updated_at desc);

-- Immutable history of every submitted version of a quote.
create table public.quote_revisions (
  id bigint generated always as identity primary key,
  quote_id uuid not null references public.quotes (id) on delete cascade,
  version integer not null,
  unit_price_baisa bigint not null,
  total_baisa bigint not null,
  min_days integer not null,
  max_days integer not null,
  warranty_months integer not null,
  payment_terms text not null,
  notes text,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  unique (quote_id, version)
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  number bigint generated always as identity (start with 5001) unique,
  rfq_id uuid not null unique references public.rfqs (id),
  quote_id uuid not null unique references public.quotes (id),
  buyer_company_id uuid not null references public.companies (id),
  supplier_company_id uuid not null references public.companies (id),
  total_baisa bigint not null check (total_baisa > 0),
  status public.order_status not null default 'CONFIRMED',
  delivery_mode text not null default 'SUPPLIER' check (delivery_mode in ('SUPPLIER')),
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index orders_buyer_idx on public.orders (buyer_company_id, created_at desc);
create index orders_supplier_idx on public.orders (supplier_company_id, created_at desc);

create table public.order_events (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders (id) on delete cascade,
  status public.order_status not null,
  actor uuid,
  note text check (note is null or char_length(note) <= 500),
  created_at timestamptz not null default now()
);
create index order_events_order_idx on public.order_events (order_id, created_at);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null,
  params jsonb not null default '{}'::jsonb,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

create table public.audit_log (
  id bigint generated always as identity primary key,
  actor uuid,
  action text not null,
  entity text not null,
  entity_id uuid,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_log_entity_idx on public.audit_log (entity, entity_id);

-- ---------------------------------------------------------------------------
-- Helpers (private schema is not exposed through the API)
-- ---------------------------------------------------------------------------
create or replace function private.my_company() returns uuid
language sql stable security definer set search_path = '' as $$
  select company_id from public.profiles where id = auth.uid()
$$;

create or replace function private.my_role() returns public.app_role
language sql stable security definer set search_path = '' as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function private.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false)
$$;

create or replace function private.audit(p_action text, p_entity text, p_id uuid, p_meta jsonb default '{}'::jsonb)
returns void language sql security definer set search_path = '' as $$
  insert into public.audit_log (actor, action, entity, entity_id, meta) values (auth.uid(), p_action, p_entity, p_id, coalesce(p_meta, '{}'::jsonb))
$$;

create or replace function private.notify_company(p_company uuid, p_kind text, p_params jsonb, p_link text)
returns void language sql security definer set search_path = '' as $$
  insert into public.notifications (user_id, kind, params, link)
  select p.id, p_kind, coalesce(p_params, '{}'::jsonb), p_link from public.profiles p where p.company_id = p_company
$$;

create or replace function private.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger rfqs_touch before update on public.rfqs for each row execute function private.touch_updated_at();
create trigger quotes_touch before update on public.quotes for each row execute function private.touch_updated_at();
create trigger orders_touch before update on public.orders for each row execute function private.touch_updated_at();

grant usage on schema private to authenticated;
revoke all on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
alter table public.companies enable row level security;
alter table public.profiles enable row level security;
alter table public.rfqs enable row level security;
alter table public.quotes enable row level security;
alter table public.quote_revisions enable row level security;
alter table public.orders enable row level security;
alter table public.order_events enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_log enable row level security;

-- Nothing is readable anonymously; writes only through functions.
revoke all on all tables in schema public from anon;
revoke insert, update, delete, truncate, references, trigger on all tables in schema public from authenticated;
grant select on all tables in schema public to authenticated;
grant update (read_at) on public.notifications to authenticated;

-- companies: own company, the supplier directory, trading counterparties, admins.
create policy companies_select on public.companies for select to authenticated using (
  id = (select private.my_company())
  or kind = 'supplier'
  or (select private.is_admin())
  or exists (
    select 1 from public.orders o
    where (o.buyer_company_id = companies.id and o.supplier_company_id = (select private.my_company()))
  )
);

create policy profiles_select on public.profiles for select to authenticated using (
  id = (select auth.uid()) or (select private.is_admin())
);

-- Buyers see their own RFQs; suppliers see an RFQ only after winning it
-- (before that they use supplier_* functions that hide the buyer's identity).
create policy rfqs_select on public.rfqs for select to authenticated using (
  buyer_company_id = (select private.my_company())
  or (select private.is_admin())
  or exists (select 1 from public.orders o where o.rfq_id = rfqs.id and o.supplier_company_id = (select private.my_company()))
);

-- A supplier sees only its own quotes; the buyer sees all quotes on its RFQs.
create policy quotes_select on public.quotes for select to authenticated using (
  supplier_company_id = (select private.my_company())
  or (select private.is_admin())
  or exists (select 1 from public.rfqs r where r.id = quotes.rfq_id and r.buyer_company_id = (select private.my_company()))
);

create policy quote_revisions_select on public.quote_revisions for select to authenticated using (
  exists (select 1 from public.quotes q where q.id = quote_revisions.quote_id)
);

create policy orders_select on public.orders for select to authenticated using (
  buyer_company_id = (select private.my_company())
  or supplier_company_id = (select private.my_company())
  or (select private.is_admin())
);

create policy order_events_select on public.order_events for select to authenticated using (
  exists (select 1 from public.orders o where o.id = order_events.order_id)
);

create policy notifications_select on public.notifications for select to authenticated using (user_id = (select auth.uid()));
create policy notifications_update on public.notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy audit_log_select on public.audit_log for select to authenticated using ((select private.is_admin()));
