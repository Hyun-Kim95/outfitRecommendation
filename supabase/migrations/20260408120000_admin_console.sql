-- 관리자 콘솔: profiles.is_admin + RLS 읽기 확장 + 스스로 승격 방지

alter table public.profiles
  add column if not exists is_admin boolean not null default false;

comment on column public.profiles.is_admin is '관리자 웹 콘솔 접근. SQL Editor에서만 true로 승격 권장.';

-- RLS 재귀 없이 관리자 여부 확인 (SECURITY DEFINER로 profiles 읽기)
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.is_admin from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

-- API로 is_admin 스스로 승격 방지 (SQL Editor에서는 auth.uid() 없음 → 승격 가능)
create or replace function public.profiles_prevent_admin_self_promote()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'update' and auth.uid() is not null then
    if new.id = auth.uid()
       and coalesce(old.is_admin, false) = false
       and coalesce(new.is_admin, false) = true then
      raise exception 'Cannot promote self to admin via API';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_prevent_admin_self_promote on public.profiles;
create trigger profiles_prevent_admin_self_promote
  before update on public.profiles
  for each row
  execute function public.profiles_prevent_admin_self_promote();

-- 관리자: 전역 읽기 (기존 본인 정책과 OR)
create policy "profiles_admin_select_all" on public.profiles
  for select to authenticated
  using (public.is_admin());

create policy "weather_logs_admin_select_all" on public.weather_logs
  for select to authenticated
  using (public.is_admin());

create policy "outfit_logs_admin_select_all" on public.outfit_logs
  for select to authenticated
  using (public.is_admin());

create policy "context_logs_admin_select_all" on public.context_logs
  for select to authenticated
  using (public.is_admin());

create policy "feedback_logs_admin_select_all" on public.feedback_logs
  for select to authenticated
  using (public.is_admin());

create policy "rating_logs_admin_select_all" on public.rating_logs
  for select to authenticated
  using (public.is_admin());

create policy "favorite_outfits_admin_select_all" on public.favorite_outfits
  for select to authenticated
  using (public.is_admin());

create policy "recommendation_logs_admin_select_all" on public.recommendation_logs
  for select to authenticated
  using (public.is_admin());
