-- 착장 기록·추천 앱 초기 스키마 (Supabase)
-- 적용: supabase db push 또는 SQL Editor에 붙여넣기

-- 프로필 (auth.users 1:1)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nickname text,
  default_region text,
  default_lat double precision,
  default_lng double precision,
  cold_sensitivity text check (cold_sensitivity in ('low', 'normal', 'high')),
  heat_sensitivity text check (heat_sensitivity in ('low', 'normal', 'high')),
  default_transport text,
  commute_student boolean default false,
  notifications_enabled boolean default false,
  onboarding_completed boolean default false,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

-- 날씨 스냅샷
create table if not exists public.weather_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  snapshot_date date not null,
  region_name text,
  temperature_current real,
  temperature_feels_like real,
  temperature_min real,
  temperature_max real,
  humidity real,
  wind_speed real,
  precipitation_type text,
  precipitation_probability real,
  weather_condition text,
  raw_json jsonb,
  created_at timestamptz default now() not null,
  unique (user_id, snapshot_date)
);

create index weather_logs_user_date on public.weather_logs (user_id, snapshot_date desc);

alter table public.weather_logs enable row level security;

create policy "weather_logs_all_own" on public.weather_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 착장
create table if not exists public.outfit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  weather_log_id uuid references public.weather_logs (id) on delete set null,
  worn_on date not null,
  photo_path text,
  top_category text,
  bottom_category text,
  outer_category text,
  shoes_category text,
  accessory_tags jsonb default '[]'::jsonb,
  thickness_level text,
  memo text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index outfit_logs_user_worn on public.outfit_logs (user_id, worn_on desc);

drop trigger if exists outfit_logs_updated_at on public.outfit_logs;
create trigger outfit_logs_updated_at
  before update on public.outfit_logs
  for each row execute function public.set_updated_at();

alter table public.outfit_logs enable row level security;

create policy "outfit_logs_all_own" on public.outfit_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 상황
create table if not exists public.context_logs (
  id uuid primary key default gen_random_uuid(),
  outfit_log_id uuid not null unique references public.outfit_logs (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  transport_type text,
  activity_level text,
  indoor_outdoor_ratio text,
  situation_tags jsonb default '[]'::jsonb,
  created_at timestamptz default now() not null
);

alter table public.context_logs enable row level security;

create policy "context_logs_all_own" on public.context_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 감상 3단계
create table if not exists public.feedback_logs (
  id uuid primary key default gen_random_uuid(),
  outfit_log_id uuid not null references public.outfit_logs (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  timing_type text not null check (timing_type in ('first', 'middle', 'last')),
  feeling_type text,
  discomfort_tags jsonb default '[]'::jsonb,
  note text,
  created_at timestamptz default now() not null,
  unique (outfit_log_id, timing_type)
);

alter table public.feedback_logs enable row level security;

create policy "feedback_logs_all_own" on public.feedback_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 만족도
create table if not exists public.rating_logs (
  id uuid primary key default gen_random_uuid(),
  outfit_log_id uuid not null unique references public.outfit_logs (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  overall_rating smallint check (overall_rating between 1 and 5),
  temperature_rating smallint check (temperature_rating between 1 and 5),
  mobility_rating smallint check (mobility_rating between 1 and 5),
  context_fit_rating smallint check (context_fit_rating between 1 and 5),
  style_rating smallint check (style_rating between 1 and 5),
  would_wear_again boolean,
  improvement_tags jsonb default '[]'::jsonb,
  created_at timestamptz default now() not null
);

alter table public.rating_logs enable row level security;

create policy "rating_logs_all_own" on public.rating_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 즐겨찾기
create table if not exists public.favorite_outfits (
  user_id uuid not null references public.profiles (id) on delete cascade,
  outfit_log_id uuid not null references public.outfit_logs (id) on delete cascade,
  created_at timestamptz default now() not null,
  primary key (user_id, outfit_log_id)
);

alter table public.favorite_outfits enable row level security;

create policy "favorite_outfits_all_own" on public.favorite_outfits
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 추천 감사 로그
create table if not exists public.recommendation_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  log_date date not null,
  weather_log_id uuid references public.weather_logs (id) on delete set null,
  recommended_outfit_log_ids jsonb default '[]'::jsonb,
  selected_outfit_log_id uuid references public.outfit_logs (id) on delete set null,
  created_at timestamptz default now() not null
);

alter table public.recommendation_logs enable row level security;

create policy "recommendation_logs_all_own" on public.recommendation_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Storage 버킷은 대시보드에서 생성: outfit-photos (private)
-- 아래 정책은 버킷 생성 후 Storage > Policies에서 동일 의미로 설정
-- (SQL로 storage.objects 정책을 쓰려면 supabase 공식 예시 참고)
