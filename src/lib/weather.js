// 기상청 예보 한 칸({ sky, rain, pop, temp }) → 3D 지도가 쓰는 날씨 종류
//   'clear' 맑음 · 'cloudy' 구름많음 · 'overcast' 흐림 · 'rain' 비·소나기 · 'snow' 눈·비/눈
export function weatherKind(slot) {
  if (!slot) return 'clear'
  if (slot.rain === '비' || slot.rain === '소나기') return 'rain'
  if (slot.rain === '눈' || slot.rain === '비/눈') return 'snow'
  if (slot.sky === '흐림') return 'overcast'
  if (slot.sky === '구름많음') return 'cloudy'
  return 'clear'
}

export const WEATHER_LABEL = { clear: '맑음', cloudy: '구름 많음', overcast: '흐림', rain: '비', snow: '눈' }
export const WEATHER_ICON = { clear: 'sun', cloudy: 'cloud-sun', overcast: 'clouds', rain: 'cloud-rain', snow: 'snow' }
