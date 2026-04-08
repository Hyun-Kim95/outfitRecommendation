-- 다중 활동 지역 날씨(하루·지역별 1행) + 프로필 activity_regions / default_transports

-- 1) weather_logs: (user_id, snapshot_date) → (user_id, snapshot_date, region_slug)
alter table public.weather_logs drop constraint if exists weather_logs_user_id_snapshot_date_key;

alter table public.weather_logs
  add column if not exists region_slug text not null default 'primary';

update public.weather_logs set region_slug = 'primary' where region_slug is null or region_slug = '';

alter table public.weather_logs alter column region_slug drop default;

alter table public.weather_logs
  add constraint weather_logs_user_date_region unique (user_id, snapshot_date, region_slug);

-- 2) profiles: JSON 배열 지역(최대 3개는 앱에서 검증), 이동 수단 복수
alter table public.profiles
  add column if not exists activity_regions jsonb not null default '[]'::jsonb;

alter table public.profiles
  add column if not exists default_transports text[] not null default '{}'::text[];

comment on column public.profiles.activity_regions is '선택 활동 지역 [{slug,label,lat,lng}, ...] 최대 3개(앱 검증)';
comment on column public.profiles.default_transports is '주 이동 수단 복수 선택';

-- 기존 단일 수단 → 배열로 이관
update public.profiles
set default_transports = array[default_transport]::text[]
where default_transport is not null
  and default_transport <> ''
  and (default_transports is null or cardinality(default_transports) = 0);
