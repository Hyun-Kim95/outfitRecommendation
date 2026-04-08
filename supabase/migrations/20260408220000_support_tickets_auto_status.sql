-- 문의 상태: 관리자 답변 유무에 따라 자동 (open / answered). 클라이언트가 status를 바꿔도 트리거가 덮어씀.

create or replace function public.support_tickets_set_status_from_reply()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.admin_reply is not null and length(trim(new.admin_reply)) > 0 then
    new.status := 'answered';
  else
    new.status := 'open';
  end if;
  return new;
end;
$$;

drop trigger if exists support_tickets_set_status_from_reply on public.support_tickets;
create trigger support_tickets_set_status_from_reply
  before insert or update on public.support_tickets
  for each row
  execute function public.support_tickets_set_status_from_reply();

-- 기존 데이터 정합
update public.support_tickets
set status = case
  when admin_reply is not null and length(trim(admin_reply)) > 0 then 'answered'
  else 'open'
end;

comment on column public.support_tickets.status is '트리거로 자동: 답변 있음=answered, 없음=open';
