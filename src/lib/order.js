// 주문 상태. DB 에 status 컬럼이 없던 옛 주문은 '주문완료' 로 본다
export const STATUS = { placed: '주문완료', cancelled: '주문취소', refund: '반품·환불 접수' }
export const statusOf = (order) => order.status ?? STATUS.placed
export const STATUS_COLOR = { [STATUS.placed]: 'success', [STATUS.cancelled]: 'secondary', [STATUS.refund]: 'warning' }
export const REFUND_REASONS = ['단순 변심', '상품 불량·파손', '오배송', '기타']
