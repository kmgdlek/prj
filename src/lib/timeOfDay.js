import { useEffect, useState } from 'react'

// 시간대: 새벽 04~07시 · 아침(낮) 07~18시 · 밤 18~04시
export const MODES = {
  dawn: { label: '새벽', icon: 'sunrise' },
  morning: { label: '아침', icon: 'brightness-high' },
  night: { label: '밤', icon: 'moon-stars' },
}

export function modeAt(date = new Date()) {
  const h = date.getHours()
  if (h >= 4 && h < 7) return 'dawn'
  if (h >= 7 && h < 18) return 'morning'
  return 'night'
}

// 지금 시각의 시간대 (1분마다 갱신)
export function useTimeMode() {
  const [mode, setMode] = useState(modeAt())
  useEffect(() => {
    const t = setInterval(() => setMode(modeAt()), 60000)
    return () => clearInterval(t)
  }, [])
  return mode
}
