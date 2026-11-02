import { useEffect, useState } from 'react'
import { candlesOf } from '../../server/products'

const W = 360, H = 130, PAD = { t: 8, r: 58, b: 8, l: 4 }
const UP = '#e03131', DOWN = '#1c7ed6', FLAT = '#868e96'      // 한국 주식 관례: 상승 빨강 · 하락 파랑

// 1분봉 가격 차트 (봉과 현재가만): 최근 N분의 캔들, 현재가는 점선과 오른쪽 가격 태그로
export default function PriceChart({ p, slot, count = 30 }) {
  const [tick, setTick] = useState(0)
  useEffect(() => { const t = setInterval(() => setTick((n) => n + 1), 1000); return () => clearInterval(t) }, [])   // 진행 중인 캔들이 자라도록 매초 갱신

  const progress = (Date.now() % 60000) / 60000           // 이번 1분이 얼마나 지났는지 (0~1)
  const candles = candlesOf(p, slot, count).map((c, i) => i < count - 1 ? c : {
    ...c,                                               // 마지막(진행 중) 캔들: 꼬리가 시간에 따라 길어진다. 종가는 항상 현재가
    high: Math.round(Math.max(c.open, c.close) + (c.high - Math.max(c.open, c.close)) * progress),
    low: Math.round(Math.min(c.open, c.close) - (Math.min(c.open, c.close) - c.low) * progress),
  })
  const hi = Math.max(...candles.map((c) => c.high)), lo = Math.min(...candles.map((c) => c.low))
  const y = (v) => PAD.t + ((hi - v) / Math.max(hi - lo, 1)) * (H - PAD.t - PAD.b)
  const step = (W - PAD.l - PAD.r) / count, bw = Math.max(step * 0.62, 3)
  const x = (i) => PAD.l + step * i + step / 2
  const last = candles.at(-1)
  const color = (k) => (k.close > k.open ? UP : k.close < k.open ? DOWN : FLAT)

  return (
    <div className="candle-box" data-tick={tick}>
      <svg viewBox={`0 0 ${W} ${H}`} className="candle-svg" role="img" aria-label={`${p.name} 1분봉 가격 차트`}>
        {candles.map((k, i) => (
          <g key={k.slot}>
            <line x1={x(i)} x2={x(i)} y1={y(k.high)} y2={y(k.low)} stroke={color(k)} strokeWidth="1.2" />
            <rect x={x(i) - bw / 2} y={Math.min(y(k.open), y(k.close))} width={bw} height={Math.max(Math.abs(y(k.open) - y(k.close)), 1.4)} fill={color(k)} />
          </g>
        ))}
        <line x1={PAD.l} x2={W - PAD.r} y1={y(last.close)} y2={y(last.close)} stroke={color(last)} strokeDasharray="3 3" opacity="0.8" />
        <rect x={W - PAD.r + 1} y={y(last.close) - 9} width={PAD.r - 2} height={18} rx="3" fill={color(last)} />
        <text x={W - PAD.r + PAD.r / 2} y={y(last.close) + 4} fontSize="10.5" fontWeight="700" fill="#fff" textAnchor="middle">{last.close.toLocaleString('ko-KR')}</text>
      </svg>
    </div>
  )
}
