-- 감상별 전체 만족도(1~5) 및 개선 태그(착장 상세 종합 만족도는 감상들의 평균으로 표시)

alter table public.feedback_logs
  add column if not exists overall_satisfaction smallint
  check (overall_satisfaction is null or overall_satisfaction between 1 and 5);

alter table public.feedback_logs
  add column if not exists improvement_tags jsonb default '[]'::jsonb;

comment on column public.feedback_logs.overall_satisfaction is '해당 감상 시점 전체 만족도 1~5';
comment on column public.feedback_logs.improvement_tags is '감상 시 선택한 개선 태그(JSON 문자열 배열)';
