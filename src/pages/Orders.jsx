import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Accordion, Badge, Button, Card, Col, Form, Modal, Row, Table } from 'react-bootstrap'
import PageHeader from '../components/PageHeader'
import LevelBadge from '../components/LevelBadge'
import OrderTracker from '../components/OrderTracker'
import ReviewModal from '../components/ReviewModal'
import { Empty } from '../components/Status'
import { useAppStore } from '../store/useAppStore'
import { totalSpent } from '../lib/level'
import { REFUND_REASONS, STATUS, STEPS, canCancel, canDelete, canRefund, stageOf, statusOf } from '../lib/order'
import { won, wonCompact } from '../lib/format'
import { productOf } from '../../server/products'

// 주문 내역 — 배송 진행 단계 · 결제 내역 · 상품 사진 · 후기 쓰기 · 주문 취소(배송 전) · 반품/환불(배송 후) · 삭제(끝난 주문)
export default function Orders() {
  const { user, orders, reviews, productImages, loadOrders, loadProductImages, cancelOrder, requestRefund, deleteOrder } = useAppStore()
  const [refundFor, setRefundFor] = useState(null)       // 반품/환불 사유를 고르는 중인 주문
  const [reason, setReason] = useState(REFUND_REASONS[0])
  const [reviewFor, setReviewFor] = useState(null)       // 후기를 쓰는 중인 { product_id, name, order_id }
  const [now, setNow] = useState(Date.now())             // 배송 단계가 시간에 따라 바뀌므로 주기적으로 갱신
  useEffect(() => { loadOrders(); loadProductImages() }, [loadOrders, loadProductImages])
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 15000); return () => clearInterval(t) }, [])

  const valid = orders.filter((o) => statusOf(o) === STATUS.placed)
  const count = valid.reduce((n, o) => n + o.items.reduce((m, i) => m + i.qty, 0), 0)
  const reviewed = (o, productId) => reviews.some((r) => r.order_id === o.id && r.product_id === productId && r.user_id === user?.id)

  const onCancel = (o) => window.confirm(`주문 #${o.id}을(를) 취소할까요? 쿠폰·적립금·재고가 되돌아가요.`) && cancelOrder(o)
  const onDelete = (o) => window.confirm(`주문 #${o.id} 내역을 삭제할까요? 삭제하면 되돌릴 수 없어요.`) && deleteOrder(o.id)
  async function submitRefund() {
    if (await requestRefund(refundFor, reason)) setRefundFor(null)
  }

  return (
    <>
      <PageHeader icon="receipt" title="주문 내역" subtitle="배송 진행 단계를 확인하고, 배송이 끝나면 후기를 남겨요" />
      <Row className="g-3 mb-4">
        <Col md={4}>
          <Card className="h-100"><Card.Body>
            <div className="small text-body-secondary mb-1">내 등급</div>
            <LevelBadge withProgress />
          </Card.Body></Card>
        </Col>
        <Col xs={6} md={2}><Stat label="주문" value={`${orders.length}건`} /></Col>
        <Col xs={6} md={2}><Stat label="산 물건" value={`${count}개`} /></Col>
        <Col xs={12} md={4}><Stat label="누적 구매액" value={won(totalSpent(orders))} note="취소·환불 제외" /></Col>
      </Row>

      {orders.length === 0 ? (
        <>
          <Empty text="아직 주문이 없어요" />
          <div className="text-center"><Link to="/shop" className="btn btn-primary btn-sm">제주 장터 가기</Link></div>
        </>
      ) : (
        <Accordion defaultActiveKey={String(orders[0].id)}>
          {orders.map((o) => {
            const status = statusOf(o)
            const stage = stageOf(o, now)
            const live = status === STATUS.placed
            return (
              <Accordion.Item key={o.id} eventKey={String(o.id)}>
                <Accordion.Header>
                  <div className="d-flex flex-column flex-sm-row gap-1 gap-sm-3 w-100 me-3 align-items-sm-center">
                    <strong>주문 #{o.id}</strong>
                    {live
                      ? <Badge bg={stage === 3 ? 'success' : 'primary'} className="align-self-start">{STEPS[stage]}</Badge>
                      : <Badge bg={status === STATUS.refund ? 'warning' : 'secondary'} text={status === STATUS.refund ? 'dark' : undefined} className="align-self-start">{status}</Badge>}
                    <span className="text-body-secondary small">{new Date(o.created_at).toLocaleString('ko-KR')}</span>
                    <div className={`ms-sm-auto text-sm-end lh-sm ${live ? '' : 'text-body-secondary'}`}>
                      <strong className={live ? '' : 'text-decoration-line-through'}>{won(o.total)}</strong>
                      {o.points_used > 0 && <div className="small text-body-secondary">{o.total === 0 ? '적립금으로 전액 결제' : '적립금'} {wonCompact(o.points_used)} 사용</div>}
                    </div>
                  </div>
                </Accordion.Header>
                <Accordion.Body>
                  {live && <div className="mb-4 px-sm-4"><OrderTracker stage={stage} /></div>}
                  {status === STATUS.refund && <p className="small text-body-secondary">반품·환불 사유: {o.refund_reason ?? '-'}</p>}

                  <Table size="sm" className="mb-3 align-middle">
                    <thead><tr><th>상품</th><th className="text-end">단가</th><th className="text-end">수량</th><th className="text-end">금액</th></tr></thead>
                    <tbody>
                      {o.items.map((i) => {
                        const p = productOf(i.product_id)
                        const img = productImages[i.product_id]
                        return (
                          <tr key={i.product_id}>
                            <td>
                              <div className="d-flex align-items-center gap-2">
                                {img ? <img src={img.url} alt={i.name} className="cart-thumb" /> : <span className="order-emoji">{p?.emoji ?? '📦'}</span>}
                                <div>
                                  {p ? <Link to={`/shop/${p.id}`} className="text-reset">{i.name}</Link> : i.name}
                                  {live && stage === 3 && (
                                    <div>
                                      {reviewed(o, i.product_id)
                                        ? <span className="small text-success"><i className="bi bi-check2-circle me-1" />후기 작성 완료</span>
                                        : <Button size="sm" variant="outline-primary" className="py-0 mt-1" onClick={() => setReviewFor({ product_id: i.product_id, name: i.name, order_id: o.id })}>
                                            <i className="bi bi-pencil me-1" />후기 쓰기
                                          </Button>}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="text-end">{won(i.price)}</td>
                            <td className="text-end">{i.qty}</td>
                            <td className="text-end">{won(i.price * i.qty)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </Table>

                  {/* 결제 내역: 이 주문에 적용된 할인·쿠폰·적립금·배송비 */}
                  {o.original > 0 && (
                    <dl className="sum-rows mb-3" style={{ maxWidth: 360 }}>
                      <dt>원가</dt><dd>{won(o.original)}</dd>
                      {(() => {
                        const gap = o.total - (o.shipping_fee ?? 0) + (o.points_used ?? 0) + (o.coupon_discount ?? 0) + (o.grade_discount ?? 0) - o.original     // 주문 때의 시세가 원가(정가 합계)와 얼마나 달랐는지
                        return gap !== 0 && <><dt>{gap > 0 ? '시세 반영' : '시세 할인'}</dt><dd className={`small ${gap > 0 ? 'text-body' : 'text-danger'}`}>{gap > 0 ? '+' : '-'}{won(Math.abs(gap))}</dd></>
                      })()}
                      {o.grade_discount > 0 && <><dt>등급 할인</dt><dd className="small text-danger">-{won(o.grade_discount)}</dd></>}
                      {o.coupon_discount > 0 && <><dt>쿠폰 할인</dt><dd className="small text-danger">-{won(o.coupon_discount)}</dd></>}
                      {o.points_used > 0 && <><dt>적립금 사용</dt><dd className="small text-danger">-{won(o.points_used)}</dd></>}
                      <dt>배송비</dt><dd>{o.shipping_fee > 0 ? won(o.shipping_fee) : '무료'}</dd>
                      <dt className="fw-bold text-body">결제 금액</dt><dd className="fw-bold">{won(o.total)}</dd>
                      {live && <><dt>적립{stage === 3 ? ' 완료' : ' 예정'}</dt><dd className="small">{won(o.points_earned)}</dd></>}
                    </dl>
                  )}

                  <div className="d-flex flex-wrap gap-2 align-items-center">
                    {canCancel(o, now) && <Button size="sm" variant="outline-danger" onClick={() => onCancel(o)}><i className="bi bi-x-circle me-1" />주문 취소</Button>}
                    {canRefund(o, now) && (
                      <Button size="sm" variant="outline-secondary" onClick={() => { setReason(REFUND_REASONS[0]); setRefundFor(o) }}>
                        <i className="bi bi-arrow-return-left me-1" />반품/환불
                      </Button>
                    )}
                    {live && stage === 2 && <span className="small text-body-secondary">배송이 시작돼서 취소할 수 없어요. 받은 뒤 반품/환불을 신청하세요.</span>}
                    {canDelete(o, now) && <Button size="sm" variant="outline-dark" className="ms-auto" onClick={() => onDelete(o)}><i className="bi bi-trash me-1" />삭제</Button>}
                  </div>
                </Accordion.Body>
              </Accordion.Item>
            )
          })}
        </Accordion>
      )}
      <p className="small text-body-secondary mt-3">※ 실제 결제·배송이 없는 과제용 주문이에요. 배송 단계는 시연을 위해 주문 후 시간이 지나면 저절로 넘어갑니다(결제완료 → 1분 후 준비중 → 3분 후 배송중 → 6분 후 배송완료).</p>

      <Modal show={Boolean(refundFor)} onHide={() => setRefundFor(null)} centered>
        <Modal.Header closeButton><Modal.Title className="fs-5 fw-bold">반품 / 환불 접수</Modal.Title></Modal.Header>
        <Modal.Body>
          {refundFor && <p className="small text-body-secondary">주문 #{refundFor.id} · {won(refundFor.total)}</p>}
          <Form.Label>사유를 골라 주세요</Form.Label>
          {REFUND_REASONS.map((r) => (
            <Form.Check key={r} type="radio" name="refund-reason" id={`r-${r}`} label={r} checked={reason === r} onChange={() => setReason(r)} />
          ))}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setRefundFor(null)}>닫기</Button>
          <Button onClick={submitRefund}>접수하기</Button>
        </Modal.Footer>
      </Modal>

      <ReviewModal target={reviewFor} onHide={() => setReviewFor(null)} />
    </>
  )
}

function Stat({ label, value, note }) {
  return (
    <Card className="h-100"><Card.Body>
      <div className="small text-body-secondary">{label}</div>
      <div className="fw-bold fs-5 text-nowrap">{value}</div>
      {note && <div className="small text-body-secondary">{note}</div>}
    </Card.Body></Card>
  )
}
