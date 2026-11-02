import { STATUS, statusOf } from './order'

// 누적 구매액에 따른 등급 (쇼핑몰에서 흔히 쓰는 일반·실버·골드·VIP·VVIP). 주문 내역(orders)의 합계로 계산한다 (서버가 따로 검증하지는 않음)
//   extra = 등급 추가 할인(%), earn = 적립률(%), freeShip = 이 금액 이상이면 무료배송(0 = 항상 무료),
//   coupon = 이 등급에 도달하면 받는 쿠폰 (신규 가입 쿠폰은 LV.1)
export const LEVELS = [
  { lv: 1, name: '일반', min: 0, color: 'secondary', extra: 0, earn: 1, freeShip: 30000, coupon: { title: '신규 가입 3,000원 쿠폰', kind: 'amount', value: 3000, min: 20000 } },
  { lv: 2, name: '실버', min: 30000, color: 'info', extra: 1, earn: 2, freeShip: 20000, coupon: { title: '실버 달성 5% 쿠폰', kind: 'percent', value: 5, min: 15000 } },
  { lv: 3, name: '골드', min: 80000, color: 'warning', extra: 2, earn: 3, freeShip: 10000, coupon: { title: '골드 달성 7% 쿠폰', kind: 'percent', value: 7, min: 10000 } },
  { lv: 4, name: 'VIP', min: 150000, color: 'primary', extra: 3, earn: 4, freeShip: 0, coupon: { title: 'VIP 달성 10% 쿠폰', kind: 'percent', value: 10, min: 10000 } },
  { lv: 5, name: 'VVIP', min: 300000, color: 'danger', extra: 5, earn: 5, freeShip: 0, coupon: { title: 'VVIP 달성 15% 쿠폰', kind: 'percent', value: 15, min: 10000 } },
]

export const SHIPPING_FEE = 3000

export function levelOf(spent = 0) {
  const current = [...LEVELS].reverse().find((l) => spent >= l.min)
  const next = LEVELS.find((l) => l.min > spent) ?? null
  const progress = next ? (spent - current.min) / (next.min - current.min) : 1
  return { ...current, next, progress, spent, remain: next ? next.min - spent : 0 }
}

// 취소·반품/환불한 주문은 구매액에 넣지 않는다
export const totalSpent = (orders) =>
  orders.filter((o) => statusOf(o) === STATUS.placed).reduce((sum, o) => sum + o.total, 0)

// 등급 혜택을 한 줄 문구들로 (등급 안내 창에서 보여 줌)
export const benefitLines = (l) => [
  l.extra ? `추가 할인 ${l.extra}%` : '추가 할인 없음',
  `적립 ${l.earn}%`,
  l.freeShip === 0 ? '항상 무료배송' : `${(l.freeShip / 10000).toLocaleString('ko-KR')}만 원 이상 무료배송`,
  `달성 쿠폰: ${l.coupon.title}`,
]
