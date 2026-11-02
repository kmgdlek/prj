import { STEPS } from '../lib/order'

// 주문 진행 단계: 결제완료 → 상품준비중 → 배송중 → 배송완료 (stage 는 0~3)
export default function OrderTracker({ stage, compact = false }) {
  return (
    <ol className={`order-tracker ${compact ? 'compact' : ''}`}>
      {STEPS.map((label, i) => (
        <li key={label} className={i < stage ? 'done' : i === stage ? 'now' : ''}>
          <span className="dot">{i < stage ? <i className="bi bi-check-lg" /> : i + 1}</span>
          <span className="label">{label}</span>
        </li>
      ))}
    </ol>
  )
}
