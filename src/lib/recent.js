// 최근 본 상품 — 이 브라우저(localStorage)에만 저장한다 (최대 12개, 최신이 앞)
const KEY = 'tamna-recent-products'
export function getRecent() {
  try { return JSON.parse(localStorage.getItem(KEY)) ?? [] } catch { return [] }
}
export function pushRecent(id) {
  try {
    const next = [id, ...getRecent().filter((x) => x !== id)].slice(0, 12)
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch { /* 저장소를 못 써도 앱은 동작 */ }
}
