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

export const CATEGORIES = ['전체', ...new Set(PRODUCTS.map((p) => p.category))];

export const productOf = (id) => PRODUCTS.find((p) => p.id === id);

// 할인가 = 정가에서 할인율만큼 뺀 값 (10원 단위 내림). 할인이 없으면 정가
export const salePrice = (p) => (p.discount ? Math.floor((p.price * (100 - p.discount)) / 100 / 10) * 10 : p.price);

// 에이전트 도구: 키워드·분류·최대 가격으로 상품을 찾는다
export const searchProducts = ({ keyword = '', category = '', maxPrice = 0 } = {}) =>
  PRODUCTS
    .filter((p) => !keyword || [p.name, p.desc, p.category].some((t) => t.includes(keyword)))
    .filter((p) => !category || p.category === category)
    .filter((p) => !maxPrice || salePrice(p) <= maxPrice)
    .map((p) => ({ id: p.id, name: p.name, category: p.category, price: p.price, discountPercent: p.discount, salePrice: salePrice(p), desc: p.desc }));
