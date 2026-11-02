import { useEffect, useState } from 'react'
import { secondsToNextSlot } from '../../server/products'

// 다음 시세·재고 변동까지 남은 시간 (mm:ss)
export default function SlotTimer({ className = '' }) {
  const [sec, setSec] = useState(secondsToNextSlot())
  useEffect(() => {
    const t = setInterval(() => setSec(secondsToNextSlot()), 1000)
    return () => clearInterval(t)
  }, [])
  return <span className={`slot-timer ${className}`}>{String(Math.floor(sec / 60)).padStart(2, '0')}:{String(sec % 60).padStart(2, '0')}</span>
}
