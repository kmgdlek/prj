-- Supabase SQL Editor 에 붙여넣고 Run. 여러 번 실행해도 안전합니다(이미 있으면 건너뜀).
-- 처음 만드는 경우와, 예전 닉네임 방식 favorites 테이블을 쓰던 경우 모두 이 파일 하나로 됩니다.

-- ① 즐겨찾기 — 로그인한 사용자(user_id)별
create table if not exists favorites (
  id         bigint generated always as identity primary key,
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  source     text not null,          -- 'myth' | 'tour' | 'heritage'
  item_id    text not null,
  title      text not null,
  created_at timestamptz not null default now()
);

-- 예전 닉네임 방식 테이블이면: 옛 데이터를 지우고 user_id 방식으로 바꾼다
alter table favorites add column if not exists user_id uuid default auth.uid() references auth.users(id) on delete cascade;
delete from favorites where user_id is null;
alter table favorites alter column user_id set not null;
alter table favorites drop column if exists nickname;
alter table favorites drop constraint if exists favorites_unique;
alter table favorites drop constraint if exists favorites_user_unique;
alter table favorites add constraint favorites_user_unique unique (user_id, source, item_id);

-- ② 장바구니 — 사용자별, 상품당 한 줄(수량)
create table if not exists cart_items (
  id         bigint generated always as identity primary key,
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  product_id text not null,
  qty        int  not null check (qty > 0),
  unique (user_id, product_id)
);

-- ③ 주문 — 주문 당시의 상품·가격을 items(JSON)에 그대로 저장 (결제 연동은 없음)
create table if not exists orders (
  id         bigint generated always as identity primary key,
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  total      int  not null,
  items      jsonb not null,
  status     text not null default '주문완료',   -- '주문완료' | '주문취소' | '반품·환불 접수'
  refund_reason text,
  created_at timestamptz not null default now()
);
-- 예전에 만든 orders 테이블이면 컬럼 추가
alter table orders add column if not exists status text not null default '주문완료';
alter table orders add column if not exists refund_reason text;

-- ④ 보안(RLS): 내 행만 보고·쓰고·지울 수 있다
alter table favorites  enable row level security;
alter table cart_items enable row level security;
alter table orders     enable row level security;

drop policy if exists "favorites public read"   on favorites;
drop policy if exists "favorites public insert" on favorites;
drop policy if exists "favorites public delete" on favorites;
drop policy if exists "favorites own"           on favorites;
drop policy if exists "cart own"                on cart_items;
drop policy if exists "orders own read"         on orders;
drop policy if exists "orders own insert"       on orders;
drop policy if exists "orders own update"       on orders;
drop policy if exists "orders own delete"       on orders;

create policy "favorites own"     on favorites  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "cart own"          on cart_items for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "orders own read"   on orders     for select using (auth.uid() = user_id);
create policy "orders own insert" on orders     for insert with check (auth.uid() = user_id);
create policy "orders own update" on orders     for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "orders own delete" on orders     for delete using (auth.uid() = user_id);

-- 새 컬럼·정책을 API 가 바로 인식하도록 스키마 캐시를 새로고침
notify pgrst, 'reload schema';
