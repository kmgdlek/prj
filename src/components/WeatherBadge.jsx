import { useEffect, useState } from 'react'
import { Badge, Spinner } from 'react-bootstrap'
import { fetchWeather } from '../api/client'

const ICON = { 맑음: 'sun', 구름많음: 'cloud-sun', 흐림: 'clouds' }

export default function WeatherBadge({ place = '제주시' }) {
  const [w, setW] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchWeather(place).then((list) => setW(list[0])).catch((e) => setError(e.message))
  }, [place])

  if (error) return <Badge bg="secondary" title={error}><i className="bi bi-cloud-slash me-1" />날씨 연결 대기</Badge>
  if (!w) return <Spinner size="sm" />
  const icon = w.rain !== '없음' ? 'cloud-rain' : ICON[w.sky] ?? 'cloud'
  return (
    <Badge bg="dark" className="fs-6 fw-normal border border-secondary">
      <i className={`bi bi-${icon} me-1`} />{place} {w.temp}℃ {w.sky} · 강수 {w.pop}%
    </Badge>
  )
}
