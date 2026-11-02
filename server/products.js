// 제주 특산품·기념품 카탈로그 — 쇼핑 화면과 AI 에이전트(search_products 도구)가 함께 쓴다.
// 가격·상품은 과제용 샘플이며 실제 판매 정보가 아니다. photo = Pixabay 사진 검색어(영어가 결과가 좋다), myth = 이어진 신화 id(상세 화면에 표시), discount = 할인율(%), tags = 태그(장터에서 걸러 보기), stock = 기본 재고(DB 의 stock 테이블이 있으면 그 값이 우선).
export const PRODUCTS = [
  { id: 'hallabong', tags: ['선물', '인기'], stock: 48, discount: 3, myth: 'seolmundae', photo: 'tangerine fruit', name: '한라봉 선물세트', category: '과일', price: 32000, emoji: '🍊', color: '#ff9f1c',
    desc: '한라산 이름을 딴 달콤한 감귤. 3kg 선물 박스.' },
  { id: 'choco', tags: ['선물', '가성비'], stock: 120, discount: 5, photo: 'chocolate bar', name: '제주 감귤 초콜릿', category: '간식', price: 9800, emoji: '🍫', color: '#8d5524',
    desc: '감귤 껍질을 넣은 초콜릿. 여행 선물로 인기.' },
  { id: 'omegi', tags: ['인기', '제주한정'], stock: 36, discount: 2, photo: 'rice cake dessert', name: '오메기떡 12개입', category: '간식', price: 15000, emoji: '🍡', color: '#b388eb',
    desc: '차조로 빚은 제주 전통 떡. 팥소가 가득.' },
  { id: 'dolharubang', tags: ['제주한정', '신화굿즈'], stock: 62, discount: 4, myth: 'samseonghyeol', photo: 'dol hareubang', name: '돌하르방 미니 기념품', category: '기념품', price: 12000, emoji: '🗿', color: '#6c757d',
    desc: '현무암 질감의 작은 돌하르방. 책상 위 수호신.' },
  { id: 'sora-magnet', tags: ['가성비', '신화굿즈'], stock: 150, discount: 0, myth: 'yeongdeung', photo: 'seashell', name: '해녀 소라 마그넷', category: '기념품', price: 6500, emoji: '🐚', color: '#4cc9f0',
    desc: '해녀의 바다를 담은 소라 모양 자석.' },
  { id: 'baengnyeoncho', tags: ['제주한정'], stock: 28, discount: 1, photo: 'prickly pear', name: '백년초 청', category: '차', price: 14000, emoji: '🌵', color: '#e5383b',
    desc: '제주 손바닥선인장 열매로 만든 분홍빛 차.' },
  { id: 'candle', tags: ['선물', '신상'], stock: 24, discount: 5, myth: 'ohbaek', photo: 'scented candle jar', name: '현무암 돌 캔들', category: '공예', price: 18000, emoji: '🕯️', color: '#495057',
    desc: '화산석 느낌의 소이 캔들. 오름 숲 향.' },
  { id: 'ecobag', tags: ['신화굿즈', '신상'], stock: 80, discount: 3, myth: 'seolmundae', photo: 'canvas tote bag', name: '설문대할망 오름 에코백', category: '굿즈', price: 16000, emoji: '👜', color: '#7b2cbf',
    desc: '368개의 오름이 그려진 설문대할망 신화 에코백.' },
  { id: 'greentea', tags: ['가성비'], stock: 95, discount: 2, photo: 'green tea', name: '제주 녹차 티백 20입', category: '차', price: 11000, emoji: '🍵', color: '#38b000',
    desc: '화산 토양에서 자란 제주 녹차.' },
  { id: 'cheonhyehyang', tags: ['선물', '인기'], discount: 4, stock: 40, photo: 'orange fruit basket', name: '천혜향 선물세트', category: '과일', price: 38000, emoji: '🍊', color: '#f77f00',
    desc: '향이 진하고 껍질이 얇은 천혜향. 2.5kg 선물 박스.' },
  { id: 'citrus-jam', tags: ['선물', '제주한정'], discount: 3, stock: 55, photo: 'orange marmalade jar', name: '제주 감귤청', category: '차', price: 13000, emoji: '🍯', color: '#fcbf49',
    desc: '감귤을 통째로 졸인 청. 따뜻한 물에 타 마시는 차로.' },
  { id: 'jerky', tags: ['가성비'], discount: 2, stock: 70, photo: 'beef jerky', name: '흑돼지 육포', category: '간식', price: 11000, emoji: '🥓', color: '#7f4f24',
    desc: '제주 흑돼지로 만든 쫄깃한 육포. 안주·간식으로.' },
  { id: 'barley-cookie', tags: ['가성비', '신상'], discount: 0, stock: 90, photo: 'cookies on plate', name: '보리 쿠키 10입', category: '간식', price: 8500, emoji: '🍪', color: '#c9a66b',
    desc: '제주 보리로 구운 고소한 쿠키.' },
  { id: 'dried-orange', tags: ['가성비', '인기'], discount: 5, stock: 85, photo: 'dried fruit chips', name: '한라봉 말랭이', category: '간식', price: 7500, emoji: '🧡', color: '#ff9e00',
    desc: '한라봉을 얇게 썰어 말린 상큼한 간식.' },
  { id: 'keychain', tags: ['가성비', '신화굿즈'], discount: 0, stock: 130, photo: 'cute keychain', name: '돌하르방 열쇠고리', category: '기념품', price: 5500, emoji: '🔑', color: '#8d99ae',
    desc: '가방에 달고 다니는 작은 돌하르방.' },
  { id: 'pouch', tags: ['신상', '신화굿즈'], myth: 'yeongdeung', discount: 3, stock: 60, photo: 'cosmetic pouch', name: '해녀 물질 파우치', category: '굿즈', price: 9000, emoji: '👝', color: '#0096c7',
    desc: '바다를 누비는 해녀가 그려진 방수 파우치.' },
  { id: 'soap', tags: ['선물', '제주한정'], discount: 4, stock: 45, photo: 'handmade soap', name: '동백꽃 수제 비누', category: '공예', price: 9500, emoji: '🌺', color: '#d62839',
    desc: '제주 동백기름을 넣은 순한 수제 비누.' },
  { id: 'postcard', tags: ['신상', '신화굿즈'], myth: 'seolmundae', discount: 0, stock: 100, photo: 'stationery cards', name: '탐라 신화 엽서 세트', category: '굿즈', price: 6000, emoji: '💌', color: '#9d4edd',
    desc: '설문대할망과 오백장군 이야기를 그린 엽서 8장.' },
  { id: 'mug', tags: ['선물', '신화굿즈'], myth: 'seolmundae', discount: 5, stock: 35, photo: 'ceramic mug', name: '설문대할망 머그컵', category: '굿즈', price: 14500, emoji: '☕', color: '#5e60ce',
    desc: '한라산을 닮은 곡선의 도자기 머그컵.' },
  { id: 'coaster', tags: ['선물', '제주한정'], myth: 'ohbaek', discount: 2, stock: 32, photo: 'stone coaster', name: '현무암 컵받침 2P', category: '공예', price: 12500, emoji: '🪨', color: '#343a40',
    desc: '구멍이 송송 뚫린 제주 현무암으로 만든 컵받침.' },
];

// 태그: 상품에 붙은 모든 태그 (많이 쓰인 순)
export const TAGS = Object.entries(PRODUCTS.flatMap((p) => p.tags ?? []).reduce((m, t) => ((m[t] = (m[t] ?? 0) + 1), m), {})).sort((a, b) => b[1] - a[1]).map(([t]) => t);

// 한 상품은 한 번에 최대 이만큼까지 (재고가 더 많아도)
export const MAX_PER_ITEM = 20;

export const CATEGORIES = ['전체', ...new Set(PRODUCTS.map((p) => p.category))];

export const productOf = (id) => PRODUCTS.find((p) => p.id === id);

// ── 시세(1분마다) · 재고(10분마다) 변동 ─────────────────────
// 시간을 일정한 '슬롯 번호'로 나누고, 상품·슬롯 번호로 값을 정한다. 서버 없이도 누가 언제 보든 같은 시세·재고가 나온다.
export const PRICE_SLOT_MS = 60 * 1000;          // 시세는 1분마다
export const STOCK_SLOT_MS = 10 * 60 * 1000;     // 재고는 10분마다
export const slotOf = (now = Date.now()) => Math.floor(now / PRICE_SLOT_MS);          // 시세 슬롯 번호
export const stockSlotOf = (now = Date.now()) => Math.floor(now / STOCK_SLOT_MS);     // 재고 슬롯 번호
export const secondsToNextSlot = (now = Date.now(), ms = PRICE_SLOT_MS) => Math.ceil((ms - (now % ms)) / 1000);

// 문자열 → 0 이상 1 미만의 고정된 수 (FNV 해시). 같은 입력이면 항상 같은 값
const unit = (str) => {
  let h = 2166136261;
  for (const ch of str) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 10000) / 10000;
};

// 평소 판매가 = 정가에서 고정 할인율만큼 뺀 값 (10원 단위 내림)
export const basePrice = (p) => (p.discount ? Math.floor((p.price * (100 - p.discount)) / 100 / 10) * 10 : p.price);

// 타임특가: 1분마다 상품의 절반쯤이 1~20% 더 내려간다 (평소 가격보다 오르지는 않는다)
export const flashRate = (p, slot = slotOf()) => {
  if (unit(`${p.id}:a:${slot}`) < 0.5) return 0;
  return Math.max(1, Math.round(unit(`${p.id}:b:${slot}`) * 20));
};

// 큰 시세 변동은 두 종류이고, 2시간을 한 구간으로 보고 상품·구간마다 확률로 일어난다 (둘 다 상품·시각으로 정해지는 고정된 값)
//  ① 서서히 오름/내림 (SURGE_CHANCE 1.2%): 20~40분에 걸쳐 천천히(폭이 클수록 더 천천히) 변하고 → 10분 유지 → 같은 시간에 걸쳐 천천히 돌아온다
//  ② 급등/급락 (SUDDEN_CHANCE 0.2%, ①의 1/6 — 가장 드물다): 2분 만에 확 변하고 → 10분 유지 → 10분에 걸쳐 돌아온다
//  ③ 약한 오름 (MILD_CHANCE 8%): 정가를 +3~15% 만 넘는 작은 오름. 15~25분에 걸쳐 천천히 오르고 → 10~20분 유지 → 천천히 돌아온다 (정가 위로 올라가는 모습이 자주 보이게)
// 폭은 오르면 +50~+300%(일반판매가를 훌쩍 넘길 수 있다), 내리면 -50~-95%. 방향은 반반
export const SURGE_CHANCE = 0.012, SUDDEN_CHANCE = 0.002, MILD_CHANCE = 0.08
const SURGE_EPOCH = 120, SURGE_HOLD = 10, SURGE_MIN = 0.5, SURGE_UP_MAX = 3, SURGE_DOWN_MAX = 0.95
const ease = (t) => t * t * (3 - 2 * t)          // 시작과 끝이 부드러운 곡선 (smoothstep)
const surgeEvent = (p, slot, sudden) => {
  const k = sudden ? 'x' : 'v', epoch = Math.floor(slot / SURGE_EPOCH)
  if (unit(`${p.id}:e${k}:${epoch}`) >= (sudden ? SUDDEN_CHANCE : SURGE_CHANCE)) return 1
  const up = unit(`${p.id}:d${k}:${epoch}`) >= 0.5
  const mag = SURGE_MIN + unit(`${p.id}:m${k}:${epoch}`) * ((up ? SURGE_UP_MAX : SURGE_DOWN_MAX) - SURGE_MIN)   // 변하는 폭 (0.5 = 50%)
  const ramp = sudden ? 2 : Math.round(20 + (20 * (mag - SURGE_MIN)) / (SURGE_UP_MAX - SURGE_MIN))                 // 오르는 데 걸리는 분
  const fall = sudden ? 10 : ramp                                                                                    // 돌아오는 데 걸리는 분
  const t = (slot % SURGE_EPOCH) - Math.floor(unit(`${p.id}:s${k}:${epoch}`) * 11)                                   // 이벤트 시작(구간 앞 10분 안)부터 지난 분
  const shape = t < 0 ? 0 : t < ramp ? ease(t / ramp) : t < ramp + SURGE_HOLD ? 1 : t < ramp + SURGE_HOLD + fall ? ease((ramp + SURGE_HOLD + fall - t) / fall) : 0
  return 1 + (up ? 1 : -1) * mag * shape
}
// ③ 약한 오름: 정점의 가격이 '정가의 1.03~1.15배'가 되도록 평소 가격(basePrice)에 곱할 비율을 정한다
const mildEvent = (p, slot) => {
  const epoch = Math.floor(slot / SURGE_EPOCH)
  if (unit(`${p.id}:em:${epoch}`) >= MILD_CHANCE) return 1
  const peak = (p.price * (1.03 + unit(`${p.id}:mm:${epoch}`) * 0.12)) / basePrice(p)     // 정점에서 평소 가격의 몇 배인지
  const ramp = 15 + Math.round(unit(`${p.id}:rm:${epoch}`) * 10), hold = 10 + Math.round(unit(`${p.id}:hm:${epoch}`) * 10)
  const t = (slot % SURGE_EPOCH) - Math.floor(unit(`${p.id}:sm:${epoch}`) * 21)
  const shape = t < 0 ? 0 : t < ramp ? ease(t / ramp) : t < ramp + hold ? 1 : t < 2 * ramp + hold ? ease((2 * ramp + hold - t) / ramp) : 0
  return 1 + (peak - 1) * shape
}
export const surgeFactor = (p, slot = slotOf()) => {
  // 두 이벤트가 겹쳐도 가격이 뚝 끊기지 않게 곱해서 잇는다 (너무 커지거나 작아지지 않게 +300%·-95% 안으로 묶음)
  return Math.min(1 + SURGE_UP_MAX, Math.max(1 - SURGE_DOWN_MAX, surgeEvent(p, slot, true) * surgeEvent(p, slot, false) * mildEvent(p, slot)))
}
export const isSudden = (p, slot = slotOf()) => surgeEvent(p, slot, true) !== 1
// 급등락으로 평소보다 몇 % 달라졌는지 (+면 급등, -면 급락, 0이면 평소)
export const surgePct = (p, slot = slotOf()) => Math.round((surgeFactor(p, slot) - 1) * 100)
// 화면에 붙일 말: 급등/급락(확 변함) 또는 서서히 상승/하락 (평소면 빈 문자열)
export const surgeLabel = (p, slot = slotOf()) => {
  const pct = surgePct(p, slot)
  if (!pct) return ''
  const t = `${pct > 0 ? '+' : ''}${pct}%`
  if (isSudden(p, slot)) return `${pct > 0 ? '🔥 급등' : '💧 급락'} ${t}`
  const over = Math.round((salePrice(p, slot) / p.price - 1) * 100)                  // 정가보다 몇 % 높은지
  if (pct > 0) return over > 0 ? `📈 서서히 상승 · 정가 +${over}%` : `📈 서서히 상승 ${t}`
  return `📉 서서히 하락 ${t}`
}

// 관리자가 정한 가격 기록(shop_price_override): { [상품 id]: [{ price, from, until(ms) }, ...] } (from 이 이른 순). 앱이 DB 에서 불러와 넣는다.
// 어떤 분의 가격이 정해진 가격인지는 그 분의 '기준 시각'으로 본다: 지나간 분은 그 분이 끝나는 때, 지금 분은 바로 지금.
// 그래서 되돌리면 지금 가격은 바로 원래대로 돌아오고, 이미 지나간 분의 가격(차트 과거)은 정한 가격 그대로 남는다
let overrides = {}
export const setPriceOverrides = (map) => { overrides = map ?? {} }
export const overrideOf = (p, slot = slotOf()) => {
  const rows = overrides[p.id]
  if (!rows) return null
  const at = Math.min(Date.now(), slot * PRICE_SLOT_MS + PRICE_SLOT_MS - 1)
  return rows.findLast((o) => o.from <= at && at < o.until) ?? null
}

// 지금 팔리는 가격 (장바구니·주문·화면 모두 이 값을 쓴다)
export const salePrice = (p, slot = slotOf()) => {
  const o = overrideOf(p, slot)
  if (o) return o.price
  const base = basePrice(p), r = flashRate(p, slot), f = surgeFactor(p, slot)
  const flash = r ? (base * (100 - r)) / 100 : base
  const w = Math.min(1, Math.abs(f - 1) / 0.1)                                // 큰 변동이 진행될수록 타임특가 잡음을 서서히 끈다 (10% 벗어나면 완전히 끔. 가격이 튀지 않게)
  return Math.max(10, Math.floor((flash * (1 - w) + base * f * w) / 10) * 10)
};

// 정가 대비 지금 가격이 몇 % 싼지(비싸면 음수), 직전 1분보다 얼마나 변했는지(음수 = 내려감)
export const discountPct = (p, slot = slotOf()) => Math.round((1 - salePrice(p, slot) / p.price) * 100);
export const trendOf = (p, slot = slotOf()) => salePrice(p, slot) - salePrice(p, slot - 1);

// 1분봉(캔들): 한 칸 = 1분. 시가 = 직전 분의 가격, 종가 = 그 분의 가격, 고가·저가 = 그 분 안에서 오르내린 폭(꼬리, 가격의 최대 1.2%).
// 가격은 분마다 한 번 정해지므로 꼬리는 상품·분으로 정해지는 고정된 값이다. 최근 n분, 오래된 순
export const candlesOf = (p, slot = slotOf(), n = 30) =>
  Array.from({ length: n }, (_, i) => {
    const s = slot - (n - 1 - i);
    const open = salePrice(p, s - 1), close = salePrice(p, s);
    const up = Math.floor((Math.max(open, close) * (1 + unit(`${p.id}:wu:${s}`) * 0.012)) / 10) * 10;
    const down = Math.floor((Math.min(open, close) * (1 - unit(`${p.id}:wl:${s}`) * 0.012)) / 10) * 10;
    return { slot: s, open, close, high: up, low: down };
  });

// 재고: 화면에 보이는 재고는 10분마다 실제(또는 기본) 재고의 40~100% (재고가 있으면 최소 3개). 실제보다 많이 보이지는 않는다
export const liveStock = (raw, id, slot = stockSlotOf()) =>
  raw <= 0 ? 0 : Math.max(Math.min(raw, 3), Math.floor(raw * (0.4 + unit(`${id}:s:${slot}`) * 0.6)));

// 에이전트 도구: 키워드·분류·최대 가격으로 상품을 찾는다 (가격은 지금 시세)
export const searchProducts = ({ keyword = '', category = '', maxPrice = 0 } = {}) =>
  PRODUCTS
    .filter((p) => !keyword || [p.name, p.desc, p.category].some((t) => t.includes(keyword)))
    .filter((p) => !category || p.category === category)
    .filter((p) => !maxPrice || salePrice(p) <= maxPrice)
    .map((p) => ({ id: p.id, name: p.name, category: p.category, price: p.price, discountPercent: discountPct(p), flashPercent: flashRate(p), salePrice: salePrice(p), stock: liveStock(p.stock, p.id), desc: p.desc }));
