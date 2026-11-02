import { useEffect, useState } from 'react'
import { PRICE_SLOT_MS, secondsToNextSlot } from '../../server/products'

// 다음 변동까지 남은 시간 (mm:ss). ms 로 간격을 고른다: 시세 1분(기본) · 재고 10분
export default function SlotTimer({ ms = PRICE_SLOT_MS, className = '' }) {
  const [sec, setSec] = useState(secondsToNextSlot(Date.now(), ms))
  useEffect(() => {
    const t = setInterval(() => setSec(secondsToNextSlot(Date.now(), ms)), 1000)
    return () => clearInterval(t)
  }, [ms])
  return <span className={`slot-timer ${className}`}>{String(Math.floor(sec / 60)).padStart(2, '0')}:{String(sec % 60).padStart(2, '0')}</span>
}
