create extension if not exists "pgcrypto";

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  calorie_target integer not null default 1800,
  protein_target_g numeric not null default 110,
  fat_target_g numeric not null default 55,
  carbs_target_g numeric not null default 210,
  created_at timestamptz not null default now()
);

create type public.meal_type as enum ('breakfast', 'lunch', 'dinner', 'snack');
create type public.nutrition_source as enum ('ai', 'usda', 'open_food_facts', 'user', 'mock');

create table public.meal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  meal_type public.meal_type not null,
  title text not null,
  photo_url text,
  eaten_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.ingredients (
  id uuid primary key default gen_random_uuid(),
  meal_entry_id uuid not null references public.meal_entries(id) on delete cascade,
  name text not null,
  weight_g numeric not null,
  calories_kcal numeric not null,
  protein_g numeric not null default 0,
  fat_g numeric not null default 0,
  carbs_g numeric not null default 0,
  fiber_g numeric not null default 0,
  confidence numeric,
  source public.nutrition_source not null default 'ai',
  standard_source public.nutrition_source,
  standard_source_id text,
  standard_display_name text,
  standard_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.favorite_foods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  ingredients jsonb not null,
  created_at timestamptz not null default now()
);

create table public.daily_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  report_date date not null,
  summary jsonb not null,
  narrative text not null,
  created_at timestamptz not null default now(),
  unique (user_id, report_date)
);

alter table public.profiles enable row level security;
alter table public.meal_entries enable row level security;
alter table public.ingredients enable row level security;
alter table public.favorite_foods enable row level security;
alter table public.daily_reports enable row level security;

create policy "profiles are self visible" on public.profiles for select using (auth.uid() = id);
create policy "profiles are self editable" on public.profiles for update using (auth.uid() = id);

create policy "meal entries are owned" on public.meal_entries for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "ingredients follow meal ownership" on public.ingredients for all using (
  exists (select 1 from public.meal_entries m where m.id = meal_entry_id and m.user_id = auth.uid())
) with check (
  exists (select 1 from public.meal_entries m where m.id = meal_entry_id and m.user_id = auth.uid())
);
create policy "favorite foods are owned" on public.favorite_foods for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "daily reports are owned" on public.daily_reports for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('meal-photos', 'meal-photos', false)
on conflict (id) do nothing;
