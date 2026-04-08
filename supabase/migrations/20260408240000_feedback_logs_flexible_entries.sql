-- 감상: 3단계 고정 제거, 상황(이동/한 장소) + 시간대 + 저장 시점 날씨 스냅샷

alter table public.feedback_logs drop constraint if exists feedback_logs_outfit_log_id_timing_type_key;

alter table public.feedback_logs alter column timing_type drop not null;

alter table public.feedback_logs add column if not exists context_mode text
  check (context_mode is null or context_mode in ('transit', 'place'));

alter table public.feedback_logs add column if not exists place_singular text;

alter table public.feedback_logs add column if not exists time_period text;

alter table public.feedback_logs add column if not exists weather_snapshot jsonb;

comment on column public.feedback_logs.timing_type is '레거시 3단계(first/middle/last). 신규 기록은 null';
comment on column public.feedback_logs.context_mode is 'transit=이동 중, place=한 장소';
comment on column public.feedback_logs.place_singular is '한 장소 모드일 때 단일 장소 라벨';
comment on column public.feedback_logs.time_period is '감상 시점 시간대(아침·점심 등)';
comment on column public.feedback_logs.weather_snapshot is '저장 시점 Open-Meteo 스냅샷(JSON)';
