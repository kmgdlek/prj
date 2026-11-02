import { useEffect, useState } from 'react'
import { candlesOf } from '../../server/products'
import { won } from '../lib/format'

const W = 360, H = 170, PAD = { t: 10, r: 58, b: 22, l: 4 }
const UP = '#e03131', DOWN = '#1c7ed6', FLAT = '#868e96'      // 한국 주식 관례: 상승 빨강 · 하락 파랑
const hhmm = (slot) => new Date(slot * 60000).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })

// 주식 1분봉 느낌의 가격 차트: 최근 N분의 시가·고가·저가·종가를 캔들로, 마지막 종가(=현재가)는 점선과 태그로 보여 준다
export default function PriceChart({ p, slot, count = 30 }) {
  const [hover, setHover] = useState(null)
  const [tick, setTick] = useState(0)
  useEffect(() => { const t = setInterval(() => setTick((n) => n + 1), 1000); return () => clearInterval(t) }, [])   // 진행 중인 캔들이 자라도록 매초 갱신

  const progress = (Date.now() % 60000) / 60000           // 이번 1분이 얼마나 지났는지 (0~1)
  const raw = candlesOf(p, slot, count)
  const candles = raw.map((c, i) => i < count - 1 ? c : {
    ...c,                                               // 마지막(진행 중) 캔들: 꼬리가 시간에 따라 길어진다. 종가는 항상 현재가
    high: Math.round(Math.max(c.open, c.close) + (c.high - Math.max(c.open, c.close)) * progress),
    low: Math.round(Math.min(c.open, c.close) - (Math.min(c.open, c.close) - c.low) * progress),
  })
  const hi = Math.max(...candles.map((c) => c.high)), lo = Math.min(...candles.map((c) => c.low))
  const span = Math.max(hi - lo, 1)
  const y = (v) => PAD.t + ((hi - v) / span) * (H - PAD.t - PAD.b)
  const step = (W - PAD.l - PAD.r) / count, bw = Math.max(step * 0.62, 3)
  const x = (i) => PAD.l + step * i + step / 2

  const last = candles.at(-1), prev = candles.at(-2)
  const change = last.close - prev.close, pct = (change / prev.close) * 100
  const shown = hover ?? count - 1
  const c = candles[shown]
  const color = (k) => (k.close > k.open ? UP : k.close < k.open ? DOWN : FLAT)
  const grid = [0, 1, 2].map((i) => lo + (span * i) / 2)

  return (
    <div className="candle-box" data-tick={tick}>
      <div className="d-flex align-items-baseline gap-2 mb-1 flex-wrap">
        <strong className="small">1분봉</strong>
        <span className="small text-body-secondary">최근 {count}분</span>
        <span className="small fw-bold ms-auto" style={{ color: change > 0 ? UP : change < 0 ? DOWN : FLAT }}>
          {change > 0 ? '▲' : change < 0 ? '▼' : '–'} {won(Math.abs(change))} ({pct >= 0 ? '+' : ''}{pct.toFixed(1)}%)
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="candle-svg" role="img" aria-label={`${p.name} 1분봉 가격 차트`}
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect()
          const i = Math.floor(((e.clientX - r.left) / r.width * W - PAD.l) / step)
          setHover(Math.max(0, Math.min(count - 1, i)))
        }}>
        {grid.map((g) => (
          <g key={g}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(g)} y2={y(g)} stroke="currentColor" opacity="0.1" />
            <text x={W - PAD.r + 4} y={y(g) + 3} fontSize="9" fill="currentColor" opacity="0.55">{Math.round(g).toLocaleString('ko-KR')}</text>
          </g>
        ))}
        {candles.map((k, i) => (
          <g key={k.slot} opacity={hover === null || hover === i ? 1 : 0.55}>
            <line x1={x(i)} x2={x(i)} y1={y(k.high)} y2={y(k.low)} stroke={color(k)} strokeWidth="1.2" />
            <rect x={x(i) - bw / 2} y={Math.min(y(k.open), y(k.close))} width={bw} height={Math.max(Math.abs(y(k.open) - y(k.close)), 1.4)} fill={color(k)} />
          </g>
        ))}
        {/* 현재가 점선 + 태그 */}
        <line x1={PAD.l} x2={W - PAD.r} y1={y(last.close)} y2={y(last.close)} stroke={color(last)} strokeDasharray="3 3" opacity="0.8" />
        <rect x={W - PAD.r + 1} y={y(last.close) - 8} width={PAD.r - 2} height={16} rx="3" fill={color(last)} />
        <text x={W - PAD.r + PAD.r / 2} y={y(last.close) + 3.5} fontSize="9.5" fontWeight="700" fill="#fff" textAnchor="middle">{last.close.toLocaleString('ko-KR')}</text>
        {/* 가로축: 시각 */}
        {[0, Math.floor(count / 3), Math.floor((count * 2) / 3), count - 1].map((i) => (
          <text key={i} x={x(i)} y={H - 6} fontSize="9" fill="currentColor" opacity="0.55" textAnchor={i === 0 ? 'start' : i === count - 1 ? 'end' : 'middle'}>{hhmm(candles[i].slot)}</text>
        ))}
        {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={H - PAD.b} stroke="currentColor" opacity="0.25" />}
      </svg>
      <div className="candle-readout small">
        <span className="text-body-secondary">{hhmm(c.slot)}</span>
        <span>시 <b>{c.open.toLocaleString('ko-KR')}</b></span>
        <span>고 <b style={{ color: UP }}>{c.high.toLocaleString('ko-KR')}</b></span>
        <span>저 <b style={{ color: DOWN }}>{c.low.toLocaleString('ko-KR')}</b></span>
        <span>종 <b>{c.close.toLocaleString('ko-KR')}</b></span>
      </div>
    </div>
  )
}
