-- NA2 Study 함께 공부(공부시간 공유) 설정
-- Supabase 대시보드 > SQL Editor에 전체를 붙여 넣고 Run을 한 번 누른다. 다시 실행해도 안전하다.

create table if not exists public.study_presence (
  client_id   uuid primary key,
  name        text not null check (char_length(name) between 1 and 12),
  day         date not null,
  seconds     integer not null check (seconds between 0 and 86400),
  is_studying boolean not null default false,
  updated_at  timestamptz not null default now()
);

-- 표에 직접 접근하는 길은 모두 막고, 아래 함수 하나로만 읽고 쓴다.
alter table public.study_presence enable row level security;
revoke all on public.study_presence from anon, authenticated;

create or replace function public.study_beat(
  p_client uuid, p_name text, p_seconds integer, p_studying boolean
)
returns table (id text, nick text, secs integer, studying boolean, me boolean)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_now   timestamptz := now();
  v_today date := (v_now at time zone 'Asia/Seoul')::date;
  -- 오늘 0시(한국 시간)부터 지금까지 흐른 초. 이보다 긴 공부시간은 받지 않는다.
  v_since integer := extract(epoch from (v_now - (v_today::timestamp at time zone 'Asia/Seoul')))::integer;
  v_name  text := left(btrim(regexp_replace(coalesce(p_name, ''), '[[:cntrl:]]', '', 'g')), 12);
  v_secs  integer := greatest(0, least(coalesce(p_seconds, 0), v_since + 10, 86400));
begin
  if p_client is not null and v_name <> '' then
    insert into public.study_presence as p (client_id, name, day, seconds, is_studying, updated_at)
    values (p_client, v_name, v_today, v_secs, coalesce(p_studying, false), v_now)
    on conflict (client_id) do update set
      name = excluded.name,
      -- 같은 날에는 지난 보고 뒤로 실제 흐른 시간만큼만 늘어날 수 있다.
      seconds = case
        when p.day = excluded.day then
          least(excluded.seconds, p.seconds + ceil(extract(epoch from (v_now - p.updated_at)))::integer + 10)
        else excluded.seconds
      end,
      day = excluded.day,
      is_studying = excluded.is_studying,
      updated_at = v_now;
  end if;

  delete from public.study_presence d where d.day < v_today - 7;

  return query
    select left(md5(s.client_id::text), 8),
           s.name,
           s.seconds,
           s.is_studying,
           coalesce(s.client_id = p_client, false)
      from public.study_presence s
     where s.day = v_today
       and s.updated_at > v_now - interval '60 seconds'
     order by s.seconds desc
     limit 100;
end;
$$;

revoke all on function public.study_beat(uuid, text, integer, boolean) from public;
grant execute on function public.study_beat(uuid, text, integer, boolean) to anon, authenticated;
