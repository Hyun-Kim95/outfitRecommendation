-- 공지: 관리자 고정 시 목록 최상단 노출

alter table public.app_notices
  add column if not exists is_pinned boolean not null default false;

comment on column public.app_notices.is_pinned is '고정 공지. 목록에서 최상단(최신순보다 우선)';

create index if not exists app_notices_pinned_created
  on public.app_notices (is_pinned desc, created_at desc);
