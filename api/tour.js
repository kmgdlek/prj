import { searchTour } from '../server/tour.js';

export default async function handler(req, res) {
  try {
    // type 을 비우면(전체) 관광지·문화시설·축제·음식점을 모두. rows 는 한 번에 가져올 개수(최대 50)
    const { keyword = '', type = '12', rows = '10' } = req.query;
    res.status(200).json(await searchTour({ keyword, contentTypeId: type, rows: Math.min(Number(rows) || 10, 50) }));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
