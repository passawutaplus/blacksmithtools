-- BlackSmith Tools schema for Supabase (apply when connecting production DB)
-- Enable RLS on every table. Demo app currently uses local JSON store.

create extension if not exists "pgcrypto";

create table if not exists brands (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  name_th text not null
);

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  name_th text not null
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  name_th text not null,
  description text not null default '',
  price numeric(12,2) not null,
  stock int not null default 0,
  image_url text not null,
  images text[] not null default '{}',
  brand_ids uuid[] not null default '{}',
  category_ids uuid[] not null default '{}',
  compatibilities text[] not null default '{}',
  featured boolean not null default false,
  shopee_url text,
  lazada_url text,
  tiktok_url text,
  sku text unique not null,
  created_at timestamptz not null default now()
);

create table if not exists carts (
  id uuid primary key default gen_random_uuid(),
  items jsonb not null default '[]',
  updated_at timestamptz not null default now()
);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  number text unique not null,
  token text unique not null,
  status text not null,
  items jsonb not null,
  subtotal numeric(12,2) not null,
  shipping_fee numeric(12,2) not null,
  discount numeric(12,2) not null default 0,
  grand_total numeric(12,2) not null,
  address jsonb not null,
  payment_method text not null,
  events jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz
);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id),
  provider text not null,
  amount numeric(12,2) not null,
  status text not null,
  provider_ref text,
  slip_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists payments_provider_ref_uidx
  on payments(provider_ref) where provider_ref is not null;

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id),
  type text not null,
  number text unique not null,
  issued_at timestamptz not null default now(),
  emailed_at timestamptz,
  print_count int not null default 0
);

create table if not exists shipments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id),
  carrier text not null,
  tracking_no text not null default '',
  note text,
  shipped_at timestamptz not null default now(),
  delivered_at timestamptz
);

create table if not exists site_settings (
  id int primary key default 1 check (id = 1),
  data jsonb not null
);

alter table products enable row level security;
alter table orders enable row level security;
alter table payments enable row level security;
alter table documents enable row level security;
alter table shipments enable row level security;
alter table carts enable row level security;
alter table site_settings enable row level security;

-- Public read products
create policy "public read products" on products for select using (true);

-- Orders: customers use token via server only (service role / server actions)
-- Admin role via auth.jwt() -> app_metadata.role = 'admin'
create policy "admin all orders" on orders for all
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
