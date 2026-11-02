import { useEffect, useState } from 'react'
import { candlesOf } from '../../server/products'

const W = 360, H = 170, PAD = { t: 26, r: 58, b: 26, l: 4 }
const UP = '#e03131', DOWN = '#1c7ed6', FLAT = '#868e96'      // 한국 주식 관례: 상승 빨강 · 하락 파랑
const JUMP = 0.1                                              // 1분 만에 이만큼(10%) 이상 움직이면 '확 움직임'으로 보고 실선으로 잇는다
const won = (n) => n.toLocaleString('ko-KR')

// 1분봉 가격 차트: 최근 N분의 캔들 + 현재가(점선·태그) + 일반판매가(회색 선) + 최고가(빨간 화살표) + 최저가(파란 화살표)
// 최고가·최저가는 실제로 팔린 가격(각 분의 종가) 기준이다. 캔들 꼬리는 모양을 위한 값이라 쓰지 않는다.
export default function PriceChart({ p, slot, count = 30 }) {
  const [tick, setTick] = useState(0)
  useEffect(() => { const t = setInterval(() => setTick((n) => n + 1), 1000); return () => clearInterval(t) }, [])   // 진행 중인 캔들이 자라도록 매초 갱신

  const progress = (Date.now() % 60000) / 60000           // 이번 1분이 얼마나 지났는지 (0~1)
  const candles = candlesOf(p, slot, count).map((c, i) => i < count - 1 ? c : {
    ...c,                                               // 마지막(진행 중) 캔들: 꼬리가 시간에 따라 길어진다. 종가는 항상 현재가
    high: Math.round(Math.max(c.open, c.close) + (c.high - Math.max(c.open, c.close)) * progress),
    low: Math.round(Math.min(c.open, c.close) - (Math.min(c.open, c.close) - c.low) * progress),
  })
  // 세로 범위에 일반판매가(정가)도 넣어서 회색 선이 항상 보이게
  const hi = Math.max(...candles.map((c) => c.high), p.price), lo = Math.min(...candles.map((c) => c.low))
  const y = (v) => PAD.t + ((hi - v) / Math.max(hi - lo, 1)) * (H - PAD.t - PAD.b)
  const step = (W - PAD.l - PAD.r) / count, bw = Math.max(step * 0.62, 3)
  const x = (i) => PAD.l + step * i + step / 2
  const last = candles.at(-1)
  const color = (k) => (k.close > k.open ? UP : k.close < k.open ? DOWN : FLAT)

  // 최고가·최저가: 종가가 가장 높은/낮은 분 (같으면 가장 최근). 가격이 하나도 안 변했으면 표시하지 않는다
  const closes = candles.map((c) => c.close)
  const maxV = Math.max(...closes), minV = Math.min(...closes)
  const iMax = closes.lastIndexOf(maxV), iMin = closes.lastIndexOf(minV)
  const flat = maxV === minV
  // 글자가 차트 밖으로 나가지 않게 가장자리에서는 정렬을 바꾼다
  const anchorAt = (i) => (x(i) < 50 ? 'start' : x(i) > W - PAD.r - 50 ? 'end' : 'middle')
  const labelX = (i) => (anchorAt(i) === 'start' ? x(i) - 4 : anchorAt(i) === 'end' ? x(i) + 4 : x(i))
  const halo = { paintOrder: 'stroke', stroke: 'var(--bs-tertiary-bg)', strokeWidth: 3, strokeLinejoin: 'round' }

  return (
    <div className="candle-box" data-tick={tick}>
      <svg viewBox={`0 0 ${W} ${H}`} className="candle-svg" role="img" aria-label={`${p.name} 1분봉 가격 차트. 최고가 ${won(maxV)}원, 최저가 ${won(minV)}원, 일반판매가 ${won(p.price)}원`}>
        {/* 일반판매가: 회색 일자 선 */}
        <line x1={PAD.l} x2={W - PAD.r} y1={y(p.price)} y2={y(p.price)} stroke={FLAT} strokeWidth="1.3" />
        <text x={PAD.l + 2} y={y(p.price) - 4} fontSize="9.5" fontWeight="600" fill={FLAT} style={halo}>일반판매가 {won(p.price)}</text>

        {candles.map((k, i) => (
          <g key={k.slot}>
            <line x1={x(i)} x2={x(i)} y1={y(k.high)} y2={y(k.low)} stroke={color(k)} strokeWidth="1.2" />
            <rect x={x(i) - bw / 2} y={Math.min(y(k.open), y(k.close))} width={bw} height={Math.max(Math.abs(y(k.open) - y(k.close)), 1.4)} fill={color(k)} />
          </g>
        ))}

        {/* 확 오르거나 내린 구간: 직전 종가에서 이번 종가로 이어지는 굵은 실선 (주식 차트처럼) */}
        {candles.map((k, i) => {
          const prev = candles[i - 1]
          if (!prev || Math.abs(k.close / prev.close - 1) < JUMP) return null
          return <line key={`j${k.slot}`} x1={x(i - 1)} y1={y(prev.close)} x2={x(i)} y2={y(k.close)} stroke={k.close > prev.close ? UP : DOWN} strokeWidth="2.2" strokeLinecap="round" />
        })}

        {/* 현재가: 점선 + 오른쪽 태그 */}
        <line x1={PAD.l} x2={W - PAD.r} y1={y(last.close)} y2={y(last.close)} stroke={color(last)} strokeDasharray="3 3" opacity="0.8" />
        <rect x={W - PAD.r + 1} y={y(last.close) - 9} width={PAD.r - 2} height={18} rx="3" fill={color(last)} />
        <text x={W - PAD.r + PAD.r / 2} y={y(last.close) + 4} fontSize="10.5" fontWeight="700" fill="#fff" textAnchor="middle">{won(last.close)}</text>

        {!flat && (
          <>
            {/* 최고가: 빨간 화살표(아래를 가리킴) + 가격 */}
            <polygon points={`${x(iMax)},${y(candles[iMax].high) - 2} ${x(iMax) - 4.5},${y(candles[iMax].high) - 10} ${x(iMax) + 4.5},${y(candles[iMax].high) - 10}`} fill={UP} />
            <text x={labelX(iMax)} y={y(candles[iMax].high) - 13} fontSize="10" fontWeight="700" fill={UP} textAnchor={anchorAt(iMax)} style={halo}>최고 {won(maxV)}</text>
            {/* 최저가: 파란 화살표(위를 가리킴) + 가격 */}
            <polygon points={`${x(iMin)},${y(candles[iMin].low) + 2} ${x(iMin) - 4.5},${y(candles[iMin].low) + 10} ${x(iMin) + 4.5},${y(candles[iMin].low) + 10}`} fill={DOWN} />
            <text x={labelX(iMin)} y={y(candles[iMin].low) + 21} fontSize="10" fontWeight="700" fill={DOWN} textAnchor={anchorAt(iMin)} style={halo}>최저 {won(minV)}</text>
          </>
        )}
      </svg>
    </div>
  )
}
