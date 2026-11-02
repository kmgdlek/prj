// 주문 상태. DB 에 status 컬럼이 없던 옛 주문은 '주문완료' 로 본다
export const STATUS = { placed: '주문완료', cancelled: '주문취소', refund: '반품·환불 접수' }
export const statusOf = (order) => order.status ?? STATUS.placed
export const STATUS_COLOR = { [STATUS.placed]: 'success', [STATUS.cancelled]: 'secondary', [STATUS.refund]: 'warning' }
export const REFUND_REASONS = ['단순 변심', '상품 불량·파손', '오배송', '기타']

// 주문 진행 단계 — 실제 배송이 없으므로 주문 시각부터 지난 시간으로 단계를 정한다 (시연용으로 빠르게 흐름)
//   결제완료 0~1분 → 상품준비중 1~3분 → 배송중 3~6분 → 배송완료 6분~
export const STEPS = ['결제완료', '상품준비중', '배송중', '배송완료']
const STEP_AT_MIN = [0, 1, 3, 6]

// 진행 단계 번호(0~3). 취소·환불 접수한 주문은 null
export function stageOf(order, now = Date.now()) {
  if (statusOf(order) !== STATUS.placed) return null
  const min = (now - new Date(order.created_at).getTime()) / 60000
  let stage = 0
  STEP_AT_MIN.forEach((t, i) => { if (min >= t) stage = i })
  return stage
}

// 규칙: 취소는 배송 시작 전(결제완료·상품준비중), 반품/환불은 배송완료 후, 삭제는 끝난 주문(배송완료·취소·환불)만
export const canCancel = (o, now) => { const s = stageOf(o, now); return s !== null && s < 2 }
export const canRefund = (o, now) => stageOf(o, now) === 3
export const canDelete = (o, now) => { const s = stageOf(o, now); return s === null || s === 3 }
export const isDelivered = (o, now) => stageOf(o, now) === 3
