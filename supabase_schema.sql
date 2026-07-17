-- Enable UUID extension for auto-generating IDs
create extension if not exists "uuid-ossp";

-- 1. SERVICES TABLE
create table if not exists services (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  price numeric not null,
  duration_minutes integer not null,
  description text,
  image text,
  active boolean default true,
  created_at timestamp with time zone default now()
);

-- 2. PRODUCTS TABLE
create table if not exists products (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  description text,
  price numeric not null,
  stock integer default 0,
  image text,
  category text,
  active boolean default true,
  created_at timestamp with time zone default now()
);

-- 3. PROFILES TABLE (For Auth Integration)
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  name text,
  role text default 'CLIENT', -- 'ADMIN', 'BARBER', 'CLIENT'
  email text,
  created_at timestamp with time zone default now()
);

-- 4. BARBERS TABLE
create table if not exists barbers (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  specialty text, -- Stored as comma-separated string (e.g. "Corte,Barba")
  avatar text,
  rating numeric default 5.0,
  commission_rate numeric default 0.5,
  username text,
  password text, -- Note: In a real production app, use Supabase Auth for all logins
  bio text,
  experience_years integer,
  shift_start text default '09:00',
  shift_end text default '18:00',
  break_start text,
  break_end text,
  active boolean default true,
  email text,
  profile_id uuid references profiles(id),
  created_at timestamp with time zone default now()
);

-- 5. APPOINTMENTS TABLE
create table if not exists appointments (
  id uuid default uuid_generate_v4() primary key,
  client_name text,
  service_id uuid references services(id),
  barber_id uuid references barbers(id),
  appointment_date date,
  appointment_time time,
  status text default 'scheduled', -- scheduled, finished, canceled, in_progress
  notes text,
  total_price numeric default 0,
  product_ids text[], -- Array of Product IDs included in the appointment
  commission_paid boolean default false,
  commission_payment_method text,
  client_arrived boolean default false,
  created_at timestamp with time zone default now()
);

-- 6. EXPENSES TABLE
create table if not exists expenses (
  id uuid default uuid_generate_v4() primary key,
  description text,
  amount numeric not null,
  date timestamp with time zone default now(),
  category text, -- FIXED, VARIABLE, MARKETING, OTHER
  created_at timestamp with time zone default now()
);

-- 7. REVENUES TABLE (Extra revenues outside appointments)
create table if not exists revenues (
  id uuid default uuid_generate_v4() primary key,
  description text,
  amount numeric not null,
  date timestamp with time zone default now(),
  category text, -- SERVICE, PRODUCT, OTHER
  created_at timestamp with time zone default now()
);

-- 8. ANNOUNCEMENTS TABLE
create table if not exists announcements (
  id uuid default uuid_generate_v4() primary key,
  title text,
  message text,
  active boolean default true,
  created_at timestamp with time zone default now()
);

-- 9. APP CONFIG TABLE (Singleton)
create table if not exists app_config (
  id integer primary key, -- Usually 1
  name text,
  address text,
  phone text,
  whatsapp text,
  opening_hour integer,
  closing_hour integer,
  open_days integer[], -- Array of day indices (0-6)
  logo text,
  primary_color text,
  admin_username text,
  admin_password text,
  updated_at timestamp with time zone default now()
);

-- --- STORAGE BUCKET CONFIGURATION ---
-- Attempt to create 'images' bucket if it doesn't exist
insert into storage.buckets (id, name, public) 
values ('images', 'images', true)
on conflict (id) do nothing;

-- --- ROW LEVEL SECURITY (RLS) POLICIES ---
-- Enabling RLS to allow control over access.
-- For this setup, we enable PUBLIC access to facilitate the demo and mixed-mode usage.

-- Services
alter table services enable row level security;
create policy "Enable all access for services" on services for all using (true) with check (true);

-- Products
alter table products enable row level security;
create policy "Enable all access for products" on products for all using (true) with check (true);

-- Barbers
alter table barbers enable row level security;
create policy "Enable all access for barbers" on barbers for all using (true) with check (true);

-- Profiles
alter table profiles enable row level security;
create policy "Enable all access for profiles" on profiles for all using (true) with check (true);

-- Appointments
alter table appointments enable row level security;
create policy "Enable all access for appointments" on appointments for all using (true) with check (true);

-- Expenses
alter table expenses enable row level security;
create policy "Enable all access for expenses" on expenses for all using (true) with check (true);

-- Revenues
alter table revenues enable row level security;
create policy "Enable all access for revenues" on revenues for all using (true) with check (true);

-- Announcements
alter table announcements enable row level security;
create policy "Enable all access for announcements" on announcements for all using (true) with check (true);

-- App Config
alter table app_config enable row level security;
create policy "Enable all access for app_config" on app_config for all using (true) with check (true);

-- Storage Policies (Images)
create policy "Public Access Images" on storage.objects for select using ( bucket_id = 'images' );
create policy "Public Upload Images" on storage.objects for insert with check ( bucket_id = 'images' );
create policy "Public Update Images" on storage.objects for update using ( bucket_id = 'images' );
create policy "Public Delete Images" on storage.objects for delete using ( bucket_id = 'images' );
