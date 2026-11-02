import { productImages } from '../server/pixabay.js';
import { PRODUCTS } from '../server/products.js';

// 상품 사진 일괄 조회. Pixabay 규정(결과를 24시간 캐시)에 맞춰 CDN 에 하루 캐시한다.
export default async function handler(req, res) {
  try {
    const images = await productImages(PRODUCTS);
    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=3600');
    res.status(200).json(images);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
