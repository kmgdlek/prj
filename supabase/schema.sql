-- Supabase SQL Editor 에 붙여넣고 실행하세요.
create table if not exists favorites (
  id         bigint generated always as identity primary key,
  nickname   text not null,
  source     text not null,          -- 'myth' | 'tour' | 'heritage'
  item_id    text not null,
  title      text not null,
  created_at timestamptz not null default now()
);

-- 같은 사람이 같은 항목을 두 번 저장하지 못하게 (이미 중복이 있으면 아래 '중복 정리'를 먼저 실행)
alter table favorites add constraint favorites_unique unique (nickname, source, item_id);

alter table favorites enable row level security;

-- 수업용: 누구나 읽기·쓰기·삭제 (실서비스에서는 로그인 기반 정책으로 바꾸세요)
create policy "favorites public read"   on favorites for select using (true);
create policy "favorites public insert" on favorites for insert with check (true);
create policy "favorites public delete" on favorites for delete using (true);

-- ── 중복 정리 + 제약 추가 (이미 테이블을 만들고 중복이 생긴 경우 이것만 실행) ──
-- delete from favorites a using favorites b
--   where a.id > b.id and a.nickname = b.nickname and a.source = b.source and a.item_id = b.item_id;
-- alter table favorites add constraint favorites_unique unique (nickname, source, item_id);
