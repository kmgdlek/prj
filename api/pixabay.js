import { searchImages } from '../server/pixabay.js';

export default async function handler(req, res) {
  try {
    const { keyword = '' } = req.query;
    res.status(200).json(await searchImages({ keyword }));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
