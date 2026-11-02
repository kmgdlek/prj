// 제주 특산품·기념품 카탈로그 — 쇼핑 화면과 AI 에이전트(search_products 도구)가 함께 쓴다.
// 가격·상품은 과제용 샘플이며 실제 판매 정보가 아니다. photo = Pixabay 사진 검색어(영어가 결과가 좋다), myth = 이어진 신화 id(상세 화면에 표시), discount = 할인율(%).
export const PRODUCTS = [
  { id: 'hallabong', discount: 3, myth: 'seolmundae', photo: 'tangerine fruit', name: '한라봉 선물세트', category: '과일', price: 32000, emoji: '🍊', color: '#ff9f1c',
    desc: '한라산 이름을 딴 달콤한 감귤. 3kg 선물 박스.' },
  { id: 'choco', discount: 5, photo: 'chocolate bar', name: '제주 감귤 초콜릿', category: '간식', price: 9800, emoji: '🍫', color: '#8d5524',
    desc: '감귤 껍질을 넣은 초콜릿. 여행 선물로 인기.' },
  { id: 'omegi', discount: 2, photo: 'rice cake dessert', name: '오메기떡 12개입', category: '간식', price: 15000, emoji: '🍡', color: '#b388eb',
    desc: '차조로 빚은 제주 전통 떡. 팥소가 가득.' },
  { id: 'dolharubang', discount: 4, myth: 'samseonghyeol', photo: 'dol hareubang', name: '돌하르방 미니 기념품', category: '기념품', price: 12000, emoji: '🗿', color: '#6c757d',
    desc: '현무암 질감의 작은 돌하르방. 책상 위 수호신.' },
  { id: 'sora-magnet', discount: 0, myth: 'yeongdeung', photo: 'seashell', name: '해녀 소라 마그넷', category: '기념품', price: 6500, emoji: '🐚', color: '#4cc9f0',
    desc: '해녀의 바다를 담은 소라 모양 자석.' },
  { id: 'baengnyeoncho', discount: 1, photo: 'prickly pear', name: '백년초 청', category: '차', price: 14000, emoji: '🌵', color: '#e5383b',
    desc: '제주 손바닥선인장 열매로 만든 분홍빛 차.' },
  { id: 'candle', discount: 5, myth: 'ohbaek', photo: 'scented candle jar', name: '현무암 돌 캔들', category: '공예', price: 18000, emoji: '🕯️', color: '#495057',
    desc: '화산석 느낌의 소이 캔들. 오름 숲 향.' },
  { id: 'ecobag', discount: 3, myth: 'seolmundae', photo: 'canvas tote bag', name: '설문대할망 오름 에코백', category: '굿즈', price: 16000, emoji: '👜', color: '#7b2cbf',
    desc: '368개의 오름이 그려진 설문대할망 신화 에코백.' },
  { id: 'greentea', discount: 2, photo: 'green tea', name: '제주 녹차 티백 20입', category: '차', price: 11000, emoji: '🍵', color: '#38b000',
    desc: '화산 토양에서 자란 제주 녹차.' },
];

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
