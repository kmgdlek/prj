import { LEVELS } from './level'

// 쿠폰: 쿠폰함(coupons 테이블)의 한 줄. kind = 'amount'(원 할인) | 'percent'(% 할인), min = 최소 주문금액
export const DAY = 24 * 3600 * 1000

export const couponState = (c, now = Date.now()) =>
  c.used_at ? 'used' : new Date(c.expires_at).getTime() < now ? 'expired' : 'available'

export const couponText = (c) => (c.kind === 'percent' ? `${c.value}% 할인` : `${c.value.toLocaleString('ko-KR')}원 할인`)

// 쿠폰이 base 금액에서 깎아 주는 금액 (최소 주문금액 미달이면 0)
export function couponDiscount(c, base) {
  if (!c || base < c.min) return 0
  const d = c.kind === 'percent' ? Math.floor((base * c.value) / 100 / 10) * 10 : c.value
  return Math.min(d, base)
}

// 등급에 도달하면 받는 쿠폰 목록: source 는 (사용자, source) 가 유일해서 여러 번 발급되지 않는다
export function gradeCouponsFor(lv) {
  return LEVELS.filter((l) => l.lv <= lv).map((l) => ({
    source: l.lv === 1 ? 'welcome' : `lv${l.lv}`,
    ...l.coupon, expiresDays: 60,
  }))
}

// 쿠폰 코드 등록 (마이페이지 쿠폰함에서 입력). 코드마다 한 번만 쓸 수 있다
export const PROMO_CODES = {
  JEJU10: { title: '제주 사랑 10% 쿠폰', kind: 'percent', value: 10, min: 30000, expiresDays: 30 },
  TAMNA5000: { title: '탐라신화 5,000원 쿠폰', kind: 'amount', value: 5000, min: 40000, expiresDays: 30 },
  HALLASAN: { title: '한라산 8% 쿠폰', kind: 'percent', value: 8, min: 20000, expiresDays: 30 },
}
