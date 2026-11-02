import { Badge, ProgressBar } from 'react-bootstrap'
import { levelOf, totalSpent } from '../lib/level'
import { won } from '../lib/format'
import { useAppStore } from '../store/useAppStore'

// 등급 배지 (+ 다음 등급까지 진행 막대). 프로필·홈·주문내역에서 함께 쓴다
// part: 'full' = LV.2 실버 · 'lv' = LV.2 만 · 'name' = 실버 만 (이름 왼쪽엔 'lv', 아래엔 'name' 처럼 나눠 쓴다)
export default function LevelBadge({ withProgress = false, part = 'full' }) {
  const orders = useAppStore((s) => s.orders)
  const L = levelOf(totalSpent(orders))
  return (
    <>
      <Badge bg={L.color} text={L.color === 'warning' || L.color === 'info' ? 'dark' : undefined}>
        {part === 'lv' ? `LV.${L.lv}` : part === 'name' ? L.name : `LV.${L.lv} ${L.name}`}
      </Badge>
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
