-- 비슷한 날 조회·분석: 착장 시점 날씨+상황 스냅샷 + 체감 버킷(인덱스용)

alter table public.outfit_logs
  add column if not exists similarity_snapshot jsonb;

alter table public.outfit_logs
  add column if not exists feels_like_bucket smallint;

comment on column public.outfit_logs.similarity_snapshot is
  '착장 저장 시점 날씨·상황 스냅샷(JSON). weather_log_id 없어도 유사도 계산 가능';
comment on column public.outfit_logs.feels_like_bucket is
  '체감온도 2°C 단위 버킷(floor(feels/2) 등). 비슷한 날 필터·통계용';

create index if not exists outfit_logs_user_bucket_worn
  on public.outfit_logs (user_id, feels_like_bucket, worn_on desc);

create index if not exists outfit_logs_similarity_gin
  on public.outfit_logs using gin (similarity_snapshot jsonb_path_ops);
