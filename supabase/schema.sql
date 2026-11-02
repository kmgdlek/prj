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

-- ═══════════════════════════════════════════════════════════
-- ⑤ 쇼핑 확장: 재고 · 쿠폰 · 후기 · 주문 상세 컬럼 · 프로필 사진 저장소
--    (다른 실습과 이름이 겹치지 않도록 새 테이블·함수에는 shop_ 를 붙였습니다)
-- ═══════════════════════════════════════════════════════════

-- 재고: 모두가 읽을 수 있고, 증감은 아래 함수로만 한다 (주문하면 shop_take_stock, 취소·환불하면 shop_give_stock)
create table if not exists shop_stock (
  product_id text primary key,
  qty        int  not null check (qty >= 0)
);
alter table shop_stock enable row level security;
drop policy if exists "shop_stock read" on shop_stock;
create policy "shop_stock read" on shop_stock for select using (true);

create or replace function shop_take_stock(p_id text, p_qty int) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  update shop_stock set qty = qty - p_qty where product_id = p_id and qty >= p_qty;
  return found;
end $$;

create or replace function shop_give_stock(p_id text, p_qty int) returns void
language plpgsql security definer set search_path = public as $$
begin
  update shop_stock set qty = qty + p_qty where product_id = p_id;
end $$;

grant execute on function shop_take_stock(text, int) to authenticated;
grant execute on function shop_give_stock(text, int) to authenticated;

insert into shop_stock (product_id, qty) values
  ('hallabong', 48), ('choco', 120), ('omegi', 36), ('dolharubang', 62), ('sora-magnet', 150),
  ('baengnyeoncho', 28), ('candle', 24), ('ecobag', 80), ('greentea', 95),
  ('cheonhyehyang', 40), ('citrus-jam', 55), ('jerky', 70), ('barley-cookie', 90), ('dried-orange', 85),
  ('keychain', 130), ('pouch', 60), ('soap', 45), ('postcard', 100), ('mug', 35), ('coaster', 32)
on conflict (product_id) do nothing;

-- 쿠폰함: 사용자별. (user_id, source) 가 유일해서 같은 쿠폰이 두 번 발급되지 않는다
create table if not exists shop_coupons (
  id         bigint generated always as identity primary key,
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  source     text not null,                 -- 'welcome' | 'lv2'..'lv5' | 'code:JEJU10' ...
  title      text not null,
  kind       text not null check (kind in ('amount', 'percent')),
  value      int  not null,
  min        int  not null default 0,       -- 최소 주문금액
  expires_at timestamptz not null,
  used_at    timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, source)
);
alter table shop_coupons enable row level security;
drop policy if exists "shop_coupons own" on shop_coupons;
create policy "shop_coupons own" on shop_coupons for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 후기·별점: 누구나 읽고, 내 것만 쓰고 지운다. 같은 주문의 같은 상품에는 한 번만
create table if not exists shop_reviews (
  id         bigint generated always as identity primary key,
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  product_id text not null,
  order_id   bigint not null,
  rating     int  not null check (rating between 1 and 5),
  content    text not null,
  nickname   text not null default '익명',
  created_at timestamptz not null default now(),
  unique (user_id, order_id, product_id)
);
alter table shop_reviews enable row level security;
drop policy if exists "shop_reviews read" on shop_reviews;
drop policy if exists "shop_reviews own insert" on shop_reviews;
drop policy if exists "shop_reviews own update" on shop_reviews;
drop policy if exists "shop_reviews own delete" on shop_reviews;
create policy "shop_reviews read"       on shop_reviews for select using (true);
create policy "shop_reviews own insert" on shop_reviews for insert with check (auth.uid() = user_id);
create policy "shop_reviews own update" on shop_reviews for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "shop_reviews own delete" on shop_reviews for delete using (auth.uid() = user_id);

-- 주문 상세: 할인·쿠폰·적립금·배송비 내역 (예전 주문은 0)
alter table orders add column if not exists original        int not null default 0;
alter table orders add column if not exists grade_discount  int not null default 0;
alter table orders add column if not exists coupon_id       bigint;
alter table orders add column if not exists coupon_discount int not null default 0;
alter table orders add column if not exists points_used     int not null default 0;
alter table orders add column if not exists points_earned   int not null default 0;
alter table orders add column if not exists shipping_fee    int not null default 0;

-- 프로필 사진 저장소 (공개 읽기, 내 폴더(사용자 id)에만 쓰기)
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true) on conflict (id) do nothing;
drop policy if exists "avatars read" on storage.objects;
drop policy if exists "avatars insert own" on storage.objects;
drop policy if exists "avatars update own" on storage.objects;
drop policy if exists "avatars delete own" on storage.objects;
create policy "avatars read" on storage.objects for select using (bucket_id = 'avatars');
create policy "avatars insert own" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars update own" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- ⑫ 이야기꾼 AI 대화 기록 (내 대화만 보고·쓰고·지울 수 있다)
create table if not exists shop_chat_messages (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  text text not null,
  steps jsonb,
  actions jsonb,
  created_at timestamptz not null default now()
);
create index if not exists shop_chat_user_time on shop_chat_messages (user_id, created_at);
alter table shop_chat_messages enable row level security;
drop policy if exists "shop_chat own" on shop_chat_messages;
create policy "shop_chat own" on shop_chat_messages for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ⑬ 관리자 · 관리자가 직접 정하는 시세
-- 관리자 지정은 SQL Editor 에서만 가능 (앱에서는 누구도 관리자로 올릴 수 없다):
--   insert into shop_admins (user_id) select id from auth.users where email = '내 이메일';
create table if not exists shop_admins (user_id uuid primary key references auth.users(id) on delete cascade);
alter table shop_admins enable row level security;
drop policy if exists "shop_admins read self" on shop_admins;
create policy "shop_admins read self" on shop_admins for select using (auth.uid() = user_id);   -- 내가 관리자인지만 볼 수 있다

create or replace function is_shop_admin() returns boolean
language sql security definer stable set search_path = public as
$$ select exists (select 1 from shop_admins where user_id = auth.uid()) $$;

-- 기록으로 남긴다: 되돌리기·새로 정하기는 행을 지우지 않고 until 을 '지금'으로 줄인다 (그래야 지나간 시간의 차트가 그대로 남는다)
create table if not exists shop_price_override (
  id bigint generated always as identity primary key,
  product_id text not null,
  price int not null check (price > 0),
  starts_at timestamptz not null default now(),
  until timestamptz not null,
  set_by uuid default auth.uid()
);
-- 예전(상품당 한 행) 형태로 만들어 둔 경우 기록형으로 바꾼다
do $$ begin
  if not exists (select 1 from information_schema.columns where table_name = 'shop_price_override' and column_name = 'id') then
    alter table shop_price_override drop constraint if exists shop_price_override_pkey;
    alter table shop_price_override add column id bigint generated always as identity primary key;
  end if;
end $$;
create index if not exists shop_price_override_lookup on shop_price_override (product_id, starts_at);
alter table shop_price_override enable row level security;
drop policy if exists "price_override read" on shop_price_override;
drop policy if exists "price_override admin insert" on shop_price_override;
drop policy if exists "price_override admin update" on shop_price_override;
drop policy if exists "price_override admin delete" on shop_price_override;
create policy "price_override read"         on shop_price_override for select using (true);
create policy "price_override admin insert" on shop_price_override for insert with check (is_shop_admin());
create policy "price_override admin update" on shop_price_override for update using (is_shop_admin()) with check (is_shop_admin());
create policy "price_override admin delete" on shop_price_override for delete using (is_shop_admin());

-- ⑭ 친구 초대: 친구가 처음 로그인할 때 한 줄이 생긴다 (친구 1명당 한 번, 초대 코드 = 초대한 사람 id 의 앞 8글자 대문자)
-- 초대한 사람은 자기 코드로 들어온 줄만 읽어 '초대한 친구 수'를 세고, 초대받은 사람은 자기 줄만 읽는다. 자기 자신을 초대할 수는 없다
create table if not exists shop_invites (
  id           bigint generated always as identity primary key,
  invitee      uuid not null unique default auth.uid() references auth.users(id) on delete cascade,
  inviter_code text not null check (inviter_code ~ '^[0-9A-F]{8}$' and inviter_code <> upper(substr(invitee::text, 1, 8))),
  created_at   timestamptz not null default now()
);
alter table shop_invites enable row level security;
drop policy if exists "shop_invites insert own" on shop_invites;
drop policy if exists "shop_invites read" on shop_invites;
create policy "shop_invites insert own" on shop_invites for insert with check (auth.uid() = invitee);
create policy "shop_invites read" on shop_invites for select using (auth.uid() = invitee or inviter_code = upper(substr(auth.uid()::text, 1, 8)));

-- ⑮ 적립금 지급(관리자가 주는 적립금): 내 것만 읽고, 쓰기는 관리자만 (is_shop_admin). 주문 적립·사용과 합쳐 적립금 잔액이 된다
--   SQL Editor 에서 직접 줄 수도 있다:
--   insert into shop_point_grants (user_id, amount, reason) select id, 1000000000, '관리자 지급' from auth.users where email = '내 이메일';
create table if not exists shop_point_grants (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  amount     bigint not null check (amount <> 0),
  reason     text not null default '관리자 지급',
  created_at timestamptz not null default now()
);
alter table shop_point_grants enable row level security;
drop policy if exists "point_grants read own" on shop_point_grants;
drop policy if exists "point_grants admin insert" on shop_point_grants;
create policy "point_grants read own"     on shop_point_grants for select using (auth.uid() = user_id);
create policy "point_grants admin insert" on shop_point_grants for insert with check (is_shop_admin());

-- 새 컬럼·정책을 API 가 바로 인식하도록 스키마 캐시를 새로고침
notify pgrst, 'reload schema';
