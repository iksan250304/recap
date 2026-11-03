-- Jalankan di Supabase SQL Editor
create table projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name varchar(255) not null,
  budget numeric(15,2) not null default 0,
  created_at timestamptz not null default now()
);
create table purchase_planning (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  project_id uuid not null references projects on delete cascade,
  item_name varchar(255) not null,
  estimated_quantity numeric(10,2) not null default 1,
  unit varchar(50) not null default 'pcs',
  estimated_unit_price numeric(15,2) not null default 0,
  status text not null default 'Planned' check (status in ('Planned','Processing','Purchased','Cancelled'))
);
create table actual_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  project_id uuid not null references projects on delete cascade,
  store_name varchar(255) not null,
  purchase_date date not null,
  total_amount numeric(15,2) not null default 0,
  receipt_image_url text,  -- path di bucket 'receipts'
  created_at timestamptz not null default now()
);
create table purchase_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  purchase_id uuid not null references actual_purchases on delete cascade,
  item_name varchar(255) not null,
  category varchar(100) not null default 'Lainnya',
  quantity numeric(10,2) not null default 1,
  unit varchar(50) not null default 'pcs',
  unit_price numeric(15,2) not null default 0,
  subtotal numeric(15,2) generated always as (quantity * unit_price) stored
);
create index on purchase_planning(project_id);
create index on actual_purchases(project_id, purchase_date);
create index on purchase_items(purchase_id);

-- RLS: tiap user hanya akses datanya sendiri
do $$ declare t text; begin
  foreach t in array array['projects','purchase_planning','actual_purchases','purchase_items'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "own" on %I for all using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  end loop;
end $$;

-- Storage struk (privat, folder = user id)
insert into storage.buckets (id, name, public) values ('receipts','receipts',false) on conflict do nothing;
create policy "receipts own" on storage.objects for all to authenticated
  using (bucket_id='receipts' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id='receipts' and (storage.foldername(name))[1] = auth.uid()::text);
