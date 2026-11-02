import { Badge, ProgressBar } from 'react-bootstrap'
import { levelOf, totalSpent } from '../lib/level'
import { won } from '../lib/format'
import { useAppStore } from '../store/useAppStore'

// 등급 배지 (+ 다음 등급까지 진행 막대). 프로필·홈·주문내역에서 함께 쓴다
export default function LevelBadge({ withProgress = false }) {
  const orders = useAppStore((s) => s.orders)
  const L = levelOf(totalSpent(orders))
  return (
    <>
      <Badge bg={L.color} text={L.color === 'warning' || L.color === 'info' ? 'dark' : undefined}>LV.{L.lv} {L.name}</Badge>
      {withProgress && (
        <div className="mt-2">
          <ProgressBar now={Math.round(L.progress * 100)} variant={L.color} style={{ height: 8 }} />
          <div className="small text-body-secondary mt-1">
            {L.next ? `다음 LV.${L.next.lv} ${L.next.name}까지 ${won(L.remain)}` : '최고 등급이에요!'}
          </div>
        </div>
      )}
    </>
  )
}
