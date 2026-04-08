-- 회원 탈퇴: 본인 계정 비활성화 (SECURITY DEFINER + 트리거 예외)

create or replace function public.profiles_guard_account_disabled_column()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(current_setting('app.allow_self_account_disable', true), '') = 'true' then
    return new;
  end if;
  if auth.uid() is not null
     and new.id = auth.uid()
     and coalesce(old.account_disabled, false) is distinct from coalesce(new.account_disabled, false) then
    raise exception 'account_disabled는 본인이 API로 변경할 수 없습니다';
  end if;
  return new;
end;
$$;

create or replace function public.withdraw_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform set_config('app.allow_self_account_disable', 'true', true);
  update public.profiles
  set account_disabled = true,
      updated_at = now()
  where id = auth.uid();
  perform set_config('app.allow_self_account_disable', '', true);
end;
$$;

grant execute on function public.withdraw_account() to authenticated;

comment on function public.withdraw_account() is '회원 탈퇴 시 본인 프로필 account_disabled=true';
