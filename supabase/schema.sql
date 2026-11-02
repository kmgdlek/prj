-- Supabase SQL Editor 에 붙여넣고 실행하세요.
create table if not exists favorites (
  id         bigint generated always as identity primary key,
  nickname   text not null,
  source     text not null,          -- 'myth' | 'tour' | 'heritage'
  item_id    text not null,
  title      text not null,
  created_at timestamptz not null default now()
);

alter table favorites enable row level security;

-- 수업용: 누구나 읽기·쓰기·삭제 (실서비스에서는 로그인 기반 정책으로 바꾸세요)
create policy "favorites public read"   on favorites for select using (true);
create policy "favorites public insert" on favorites for insert with check (true);
create policy "favorites public delete" on favorites for delete using (true);
