-- events 테이블
create table if not exists events (
  id         uuid primary key default gen_random_uuid(),
  user_id    text        not null,
  date       date        not null,
  label      text        not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_events_user_date on events (user_id, date);

-- confirmed 테이블
create table if not exists confirmed (
  id         uuid primary key default gen_random_uuid(),
  user_id    text        not null,
  date       date        not null,
  activity   text        not null,
  grade      text        not null check (grade in ('S', 'A', 'B', 'C', 'D')),
  created_at timestamptz not null default now()
);

create index if not exists idx_confirmed_user_date on confirmed (user_id, date);

-- Realtime 활성화
alter publication supabase_realtime add table events;
alter publication supabase_realtime add table confirmed;
