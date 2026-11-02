import { SHIPPING_FEE, levelOf } from './level'
import { couponDiscount } from './coupon'
import { STATUS, isDelivered, statusOf } from './order'
import { salePrice } from '../../server/products'

const floor10 = (n) => Math.floor(n / 10) * 10

// 결제 금액 계산 (장바구니·주문이 같은 식을 쓴다)
//   원가 → 상품 할인 → 등급 추가 할인 → 쿠폰 → 적립금 → 배송비 → 최종 결제금액, 그리고 적립 예정 포인트
export function calcCheckout({ lines, spent, coupon, pointsWanted = 0, pointsBalance = 0 }) {
  const L = levelOf(spent)
  const original = lines.reduce((s, l) => s + l.p.price * l.qty, 0)
  const afterSale = lines.reduce((s, l) => s + salePrice(l.p) * l.qty, 0)
  const productDiscount = original - afterSale
  const gradeDiscount = floor10((afterSale * L.extra) / 100)
  const subtotal = afterSale - gradeDiscount
  const couponOff = couponDiscount(coupon, subtotal)
  const goods = subtotal - couponOff
  const pointsUsed = Math.max(0, Math.min(pointsWanted, pointsBalance, goods))     // 적립금은 상품금액까지만 (배송비 제외)
  const shipping = lines.length === 0 || subtotal >= L.freeShip ? 0 : SHIPPING_FEE
  const paidGoods = goods - pointsUsed
  return {
    level: L, original, productDiscount, gradeDiscount, subtotal, couponOff, pointsUsed, shipping,
    total: paidGoods + shipping,
    earn: Math.floor((paidGoods * L.earn) / 100),
    couponMinMiss: Boolean(coupon) && couponOff === 0,
  }
}

// 적립금: 배송완료된 주문의 적립분 − 취소·환불하지 않은 주문에서 쓴 적립금. 아직 배송 전인 적립분은 '적립 예정'
export function pointsSummary(orders, now = Date.now()) {
  let earned = 0, pending = 0, used = 0
  for (const o of orders) {
    if (statusOf(o) !== STATUS.placed) continue          // 취소·환불 주문은 적립도 사용도 없던 일로
    used += o.points_used ?? 0
    if (isDelivered(o, now)) earned += o.points_earned ?? 0
    else pending += o.points_earned ?? 0
  }
  return { balance: Math.max(0, earned - used), pending, earned, used }
}
