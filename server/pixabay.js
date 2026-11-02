// Pixabay 이미지 검색 API (무료 키 필요: pixabay.com/api/docs → 로그인 후 키 확인)
const BASE = 'https://pixabay.com/api/';

async function query(q, rows) {
  const params = new URLSearchParams({
    key: process.env.PIXABAY_KEY,
    q, lang: 'ko', image_type: 'photo', safesearch: 'true', orientation: 'horizontal',
    per_page: String(rows),
  });
  const r = await fetch(`${BASE}?${params}`);
  const text = await r.text();
  let data;
  try { data = JSON.parse(text); }
  catch { throw new Error('Pixabay 응답이 JSON이 아님: ' + text.slice(0, 120)); }
  return data.hits ?? [];
}

// 검색어로 못 찾으면 '제주도'로 한 번 더 찾아, 상세 화면이 빈 칸이 되지 않게 한다
export async function searchImages({ keyword = '', rows = 6 } = {}) {
  if (!process.env.PIXABAY_KEY) throw new Error('PIXABAY_KEY 가 설정되지 않았어요');
  let hits = keyword ? await query(keyword, rows) : [];
  let fallback = false;
  if (hits.length === 0) { hits = await query('제주도', rows); fallback = true; }
  return hits.map((h) => ({
    id: h.id, thumb: h.webformatURL, large: h.largeImageURL,
    tags: h.tags, user: h.user, page: h.pageURL, fallback,
  }));
}
