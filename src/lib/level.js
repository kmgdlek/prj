// 누적 구매액에 따른 등급 — 주문 내역(orders)의 합계로 계산한다 (화면용 게임 요소, 서버가 검증하지는 않음)
export const LEVELS = [
  { lv: 1, name: '탐라 나그네', min: 0, color: 'secondary' },
  { lv: 2, name: '오름 탐험가', min: 30000, color: 'success' },
  { lv: 3, name: '해녀의 친구', min: 80000, color: 'info' },
  { lv: 4, name: '한라산 수호자', min: 150000, color: 'primary' },
  { lv: 5, name: '설문대할망의 벗', min: 300000, color: 'warning' },
]

export function levelOf(spent = 0) {
  const current = [...LEVELS].reverse().find((l) => spent >= l.min)
  const next = LEVELS.find((l) => l.min > spent) ?? null
  const progress = next ? (spent - current.min) / (next.min - current.min) : 1
  return { ...current, next, progress, spent, remain: next ? next.min - spent : 0 }
}

export const totalSpent = (orders) => orders.reduce((sum, o) => sum + o.total, 0)
