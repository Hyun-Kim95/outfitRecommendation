-- 관리자 고도화: 계정 비활성, 문의, 공지, 관리자 타인 프로필 UPDATE, is_admin API 변경 금지

-- 1) profiles.account_disabled
alter table public.profiles
  add column if not exists account_disabled boolean not null default false;

comment on column public.profiles.account_disabled is 'true면 앱 이용 제한. 본인은 API로 변경 불가.';

-- 2) is_admin: API 세션에서는 어떤 행에서도 변경 불가 (SQL Editor는 auth.uid() 없음)
create or replace function public.profiles_lock_is_admin_via_api()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null
     and coalesce(old.is_admin, false) is distinct from coalesce(new.is_admin, false) then
    raise exception 'is_admin은 API로 변경할 수 없습니다';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_prevent_admin_self_promote on public.profiles;
drop function if exists public.profiles_prevent_admin_self_promote();

create trigger profiles_lock_is_admin_via_api
  before update on public.profiles
  for each row
  execute function public.profiles_lock_is_admin_via_api();

-- 3) account_disabled: 본인 행은 API로 변경 불가
create or replace function public.profiles_guard_account_disabled_column()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null
     and new.id = auth.uid()
     and coalesce(old.account_disabled, false) is distinct from coalesce(new.account_disabled, false) then
    raise exception 'account_disabled는 본인이 API로 변경할 수 없습니다';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_account_disabled_column on public.profiles;
create trigger profiles_guard_account_disabled_column
  before update on public.profiles
  for each row
  execute function public.profiles_guard_account_disabled_column();

-- API 세션으로 INSERT 시 is_admin 항상 false (SQL Editor 등 auth.uid() 없으면 영향 없음)
create or replace function public.profiles_force_is_admin_false_on_api_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null then
    new.is_admin := false;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_force_is_admin_false_on_api_insert on public.profiles;
create trigger profiles_force_is_admin_false_on_api_insert
  before insert on public.profiles
  for each row
  execute function public.profiles_force_is_admin_false_on_api_insert();

-- 4) 관리자: 다른 사용자 profiles UPDATE
create policy "profiles_admin_update_others" on public.profiles
  for update to authenticated
  using (public.is_admin() and id <> auth.uid())
  with check (public.is_admin() and id <> auth.uid());

-- 5) support_tickets
create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  subject text not null,
  body text not null,
  status text not null default 'open'
    check (status in ('open', 'in_progress', 'answered', 'closed')),
  admin_reply text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.support_tickets is '앱 사용자 문의. 관리자 콘솔에서 처리.';

drop trigger if exists support_tickets_updated_at on public.support_tickets;
create trigger support_tickets_updated_at
  before update on public.support_tickets
  for each row execute function public.set_updated_at();

alter table public.support_tickets enable row level security;

create policy "support_tickets_insert_own" on public.support_tickets
  for insert to authenticated
  with check (auth.uid() = user_id);

create policy "support_tickets_select_own_or_admin" on public.support_tickets
  for select to authenticated
  using (auth.uid() = user_id or public.is_admin());

create policy "support_tickets_update_admin" on public.support_tickets
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- 6) app_notices
create table if not exists public.app_notices (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  is_active boolean not null default true,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.app_notices is '앱 공지. 로그인 사용자는 활성·기간 내 행만 조회.';

drop trigger if exists app_notices_updated_at on public.app_notices;
create trigger app_notices_updated_at
  before update on public.app_notices
  for each row execute function public.set_updated_at();

alter table public.app_notices enable row level security;

create policy "app_notices_select_active_or_admin" on public.app_notices
  for select to authenticated
  using (
    public.is_admin()
    or (
      is_active = true
      and starts_at <= now()
      and (ends_at is null or ends_at >= now())
    )
  );

create policy "app_notices_insert_admin" on public.app_notices
  for insert to authenticated
  with check (public.is_admin());

create policy "app_notices_update_admin" on public.app_notices
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "app_notices_delete_admin" on public.app_notices
  for delete to authenticated
  using (public.is_admin());
