-- NA2 Study 함께 공부(공부시간 공유) 설정
-- Supabase 대시보드 > SQL Editor에 전체를 붙여 넣고 Run을 한 번 누른다. 다시 실행해도 안전하다.

create table if not exists public.study_presence (
  client_id   uuid primary key,
  name        text not null check (char_length(name) between 1 and 16),
  day         date not null,
  seconds     integer not null check (seconds between 0 and 86400),
  is_studying boolean not null default false,
  updated_at  timestamptz not null default now()
);

-- 닉네임 길이 제한을 16자로 맞춘다(처음 만든 표는 12자였다).
alter table public.study_presence drop constraint if exists study_presence_name_check;
alter table public.study_presence add constraint study_presence_name_check check (char_length(name) between 1 and 16);

-- 스터디카페 좌석(1~10)과 멈춘 시각. 멈춘 지 10분이 지나면 자리를 반납한다.
alter table public.study_presence add column if not exists seat smallint;
alter table public.study_presence add column if not exists paused_at timestamptz;

-- 표에 직접 접근하는 길은 모두 막고, 아래 함수 하나로만 읽고 쓴다.
alter table public.study_presence enable row level security;
revoke all on public.study_presence from anon, authenticated;

-- 돌려주는 열이 늘었으므로 예전 함수를 지우고 다시 만든다.
drop function if exists public.study_beat(uuid, text, integer, boolean);
drop function if exists public.study_beat(uuid, text, integer, boolean, integer);

create function public.study_beat(
  p_client uuid, p_name text, p_seconds integer, p_studying boolean, p_seat integer default null
)
returns table (id text, nick text, secs integer, studying boolean, me boolean, seat integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
#variable_conflict use_column
declare
  v_now    timestamptz := now();
  v_today  date := (v_now at time zone 'Asia/Seoul')::date;
  -- 오늘 0시(한국 시간)부터 지금까지 흐른 초. 이보다 긴 공부시간은 받지 않는다.
  v_since  integer := extract(epoch from (v_now - (v_today::timestamp at time zone 'Asia/Seoul')))::integer;
  v_name   text := coalesce(p_name, '');
  v_study  boolean := coalesce(p_studying, false);
  v_secs   integer := greatest(0, least(coalesce(p_seconds, 0), v_since + 10, 86400));
  v_old    public.study_presence%rowtype;
  v_has    boolean := false;
  v_seated boolean := false;
  v_seat   integer;
  -- 스터디카페에서 눌러 고른 자리. 범위를 벗어나면 무시한다.
  v_want   integer := case when p_seat between 1 and 10 then p_seat end;
  v_paused timestamptz;
begin
  -- 닉네임은 앱이 자동으로 붙인 "N계층 용어 숫자" 형식만 받는다. 직접 지은 이름은 저장하지 않는다.
  if p_client is not null and v_name ~ '^(1계층 (허브|리피터|UTP|광케이블|동축케이블|RJ-45|트랜시버)|2계층 (스위치|브리지|MAC|프레임|이더넷|VLAN|PPP|HDLC|LLC)|3계층 (라우터|IP|ICMP|ARP|IGMP|패킷|RIP|OSPF|BGP|서브넷|NAT)|4계층 (TCP|UDP|세그먼트|포트번호|흐름제어|슬라이딩윈도우)|5계층 (세션|동기점|대화제어|RPC|NetBIOS)|6계층 (암호화|압축|인코딩|ASCII|JPEG|MPEG)|7계층 (HTTP|HTTPS|FTP|TFTP|SMTP|POP3|IMAP|DNS|DHCP|SNMP|Telnet|SSH|NTP)) [1-9][0-9]$' then
    -- 좌석을 한 번에 한 사람씩 배정한다.
    perform pg_advisory_xact_lock(74201);
    select s.* into v_old from public.study_presence s where s.client_id = p_client;
    v_has := found;
    v_seated := v_has and v_old.day = v_today and v_old.seat is not null
      and v_old.updated_at > v_now - interval '60 seconds'
      and (v_old.is_studying or v_old.paused_at > v_now - interval '10 minutes');

    if v_seated then
      v_seat := v_old.seat;
    end if;
    -- 고른 자리가 비어 있으면 그 자리에 앉거나 그 자리로 옮긴다.
    if v_want is not null and (v_seated or v_study) and v_want is distinct from v_seat
       and not exists (
             select 1 from public.study_presence o
              where o.client_id <> p_client and o.day = v_today and o.seat = v_want
                and o.updated_at > v_now - interval '60 seconds'
                and (o.is_studying or o.paused_at > v_now - interval '10 minutes')) then
      v_seat := v_want;
    end if;
    if v_seat is null and v_study then
      -- 빈 자리 가운데 가장 작은 번호. 10석이 모두 차 있으면 자리를 주지 않는다.
      select g.n into v_seat
        from generate_series(1, 10) as g(n)
       where not exists (
               select 1 from public.study_presence o
                where o.client_id <> p_client and o.day = v_today and o.seat = g.n
                  and o.updated_at > v_now - interval '60 seconds'
                  and (o.is_studying or o.paused_at > v_now - interval '10 minutes'))
       order by g.n
       limit 1;
    end if;

    if v_seat is not null then
      -- 같은 날에는 지난 보고 뒤로 실제 흐른 시간만큼만 늘어날 수 있다.
      if v_has and v_old.day = v_today then
        v_secs := least(v_secs, v_old.seconds + ceil(extract(epoch from (v_now - v_old.updated_at)))::integer + 10);
      end if;
      v_paused := case when v_study then null when v_seated then coalesce(v_old.paused_at, v_now) else v_now end;
      insert into public.study_presence (client_id, name, day, seconds, is_studying, updated_at, seat, paused_at)
      values (p_client, v_name, v_today, v_secs, v_study, v_now, v_seat, v_paused)
      on conflict (client_id) do update set
        name = excluded.name,
        day = excluded.day,
        seconds = excluded.seconds,
        is_studying = excluded.is_studying,
        updated_at = excluded.updated_at,
        seat = excluded.seat,
        paused_at = excluded.paused_at;
    end if;
  end if;

  delete from public.study_presence d where d.day < v_today - 7;

  return query
    select left(md5(s.client_id::text), 8),
           s.name,
           s.seconds,
           s.is_studying,
           coalesce(s.client_id = p_client, false),
           s.seat::integer
      from public.study_presence s
     where s.day = v_today
       and s.seat is not null
       and s.updated_at > v_now - interval '60 seconds'
       and (s.is_studying or s.paused_at > v_now - interval '10 minutes')
     order by s.seconds desc
     limit 10;
end;
$$;

revoke all on function public.study_beat(uuid, text, integer, boolean, integer) from public;
grant execute on function public.study_beat(uuid, text, integer, boolean, integer) to anon, authenticated;
