import { searchImages } from '../server/pixabay.js';

// /api/pixabay?keyword=한라산            → 한국어 검색, 없으면 '제주도' 사진
// /api/pixabay?keyword=candle&lang=en&fallback=0&rows=5  → 영어 검색, 없으면 빈 목록 (장터 상품용)
export default async function handler(req, res) {
  try {
    const { keyword = '', lang = 'ko', fallback = '1', rows = '6' } = req.query;
    res.status(200).json(await searchImages({
      keyword, lang: lang === 'en' ? 'en' : 'ko', fallbackJeju: fallback !== '0',
      rows: Math.min(Number(rows) || 6, 12),
    }));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
