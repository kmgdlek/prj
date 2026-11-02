// Pixabay 사진 중계: 브라우저가 pixabay.com 으로 직접 가면 요청이 몰릴 때 429(너무 많은 요청)로 사진이 깨진다.
// 서버가 대신 받아(429 면 잠깐 쉬고 다시) 하루 동안 CDN 에 캐시해 두면, 같은 사진은 Pixabay 를 다시 부르지 않는다 (Pixabay 규정: 결과를 24시간 캐시).
const ALLOWED = /^https:\/\/(cdn\.)?pixabay\.com\/(get|photo)\//;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export default async function handler(req, res) {
  const u = String(req.query.u ?? '');
  if (!ALLOWED.test(u)) return res.status(400).json({ error: 'Pixabay 사진 주소만 가져올 수 있어요' });
  for (let i = 0; i < 4; i++) {
    try {
      const r = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0 (tamra-shop image proxy)' } });
      if (r.ok) {
        const type = r.headers.get('content-type') ?? 'image/jpeg';
        if (!type.startsWith('image/')) break;
        res.setHeader('Content-Type', type);
        res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800');
        return res.status(200).send(Buffer.from(await r.arrayBuffer()));
      }
      if (r.status !== 429 && r.status < 500) break;   // 429·서버 오류만 다시 시도
    } catch { /* 네트워크 오류 → 다시 시도 */ }
    await sleep(500 * (i + 1));
  }
  res.setHeader('Cache-Control', 'no-store');           // 실패는 캐시하지 않는다 (화면이 다시 시도할 수 있게)
  res.status(502).json({ error: '사진을 가져오지 못했어요' });
}
