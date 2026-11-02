import { useEffect } from 'react'
import { useAppStore } from '../store/useAppStore'
import { WEATHER_ICON, weatherKind } from '../lib/weather'

// 홈 제목 아래의 날씨 — 서귀포시·제주시를 작은 글씨 한 줄로 (3D 지도와 같은 예보 데이터)
export default function WeatherLine() {
  const weather = useAppStore((s) => s.weather)
  const loadWeather = useAppStore((s) => s.loadWeather)
  useEffect(() => { loadWeather() }, [loadWeather])
  const places = [['서귀포', weather.서귀포시], ['제주시', weather.제주시]].filter(([, w]) => w)
  if (places.length === 0) return <div className="weather-line"><i className="bi bi-cloud-slash" />날씨 연결 대기</div>
  return (
    <div className="weather-line">
      {places.map(([name, w]) => (
        <span key={name}><i className={`bi bi-${WEATHER_ICON[weatherKind(w)]}`} />{name} {w.temp}° {w.sky}{w.rain !== '없음' ? ` · ${w.rain}` : ''}</span>
      ))}
    </div>
  )
}
