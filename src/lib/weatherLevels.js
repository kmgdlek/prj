// 날씨별 바람·안개·파도 세기 — 3D 지도가 날씨에 맞춰 나무를 흔들고 안개를 짙게 하고 파도를 높이는 데 쓴다.
//   wind 나무·풍력발전기 흔들림 · fog 안개(1 = 그대로, 작을수록 짙음) · amp 파도 높이(거품·해안 물결 세기도 이걸 따른다)
const BY_KIND = {
  clear: { wind: 0.5, fog: 1, amp: 1 },
  cloudy: { wind: 0.7, fog: 0.95, amp: 1.2 },
  overcast: { wind: 1, fog: 0.8, amp: 1.4 },
  rain: { wind: 1.3, fog: 0.7, amp: 1.9 },
  snow: { wind: 0.6, fog: 0.6, amp: 1.1 },
}
const STORM = { wind: 2.4, fog: 0.5, amp: 2.8 }
export const levelsOf = (kind, storm = false) => (storm ? STORM : BY_KIND[kind] ?? BY_KIND.clear)
