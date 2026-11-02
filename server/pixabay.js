// Pixabay 이미지 검색 API (무료 키 필요: pixabay.com/api/docs → 로그인 후 키 확인)
const BASE = 'https://pixabay.com/api/';

async function query(q, rows, lang) {
  const params = new URLSearchParams({
    key: process.env.PIXABAY_KEY,
    q, lang, image_type: 'photo', safesearch: 'true', orientation: 'horizontal',
    per_page: String(Math.max(3, rows)),            // Pixabay 는 3 미만이면 오류("per_page is out of valid range")
  });
  const r = await fetch(`${BASE}?${params}`);
  const text = await r.text();
  let data;
  try { data = JSON.parse(text); }
  catch { throw new Error('Pixabay 응답이 JSON이 아님: ' + text.slice(0, 120)); }
  return (data.hits ?? []).slice(0, rows);
}

// 사진은 우리 서버(/api/img)를 거쳐 받는다 → 하루 캐시돼서 Pixabay 의 429 에 덜 걸린다
const viaProxy = (url) => (url ? `/api/img?u=${encodeURIComponent(url)}` : url);

// 검색어로 못 찾으면 '제주도'로 한 번 더 찾아, 상세 화면이 빈 칸이 되지 않게 한다
export async function searchImages({ keyword = '', rows = 6, lang = 'ko', fallbackJeju = true } = {}) {
  if (!process.env.PIXABAY_KEY) throw new Error('PIXABAY_KEY 가 설정되지 않았어요');
  let hits = keyword ? await query(keyword, rows, lang) : [];
  let fallback = false;
  if (hits.length === 0 && fallbackJeju) { hits = await query('제주도', rows, 'ko'); fallback = true; }
  return hits.map((h) => ({
    id: h.id, thumb: viaProxy(h.webformatURL), large: viaProxy(h.largeImageURL),
    tags: h.tags, user: h.user, page: h.pageURL, fallback,
  }));
}

// 제주 장터 상품마다 사진 한 장 → { 상품id: { url, page, user } }. 맞는 사진이 없으면 그 상품은 빠진다(화면은 이모지 타일 유지)
export async function productImages(products) {
  const entries = await Promise.all(products.map(async (p) => {
    try {
      const [hit] = await searchImages({ keyword: p.photo, rows: 3, lang: 'en', fallbackJeju: false });
      return hit ? [p.id, { url: hit.thumb, page: hit.page, user: hit.user }] : null;
    } catch { return null; }
  }));
  return Object.fromEntries(entries.filter(Boolean));
}
