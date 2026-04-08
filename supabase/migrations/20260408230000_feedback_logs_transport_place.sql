-- 감상(feedback) 단계별 이동·장소 태그 (착장 저장 시점과 분리)

alter table public.feedback_logs
  add column if not exists transport_type text;

alter table public.feedback_logs
  add column if not exists place_tags jsonb;

comment on column public.feedback_logs.transport_type is '감상 단계별 이동 수단(선택)';
comment on column public.feedback_logs.place_tags is '감상 단계별 장소·상황 태그(JSON 문자열 배열)';
