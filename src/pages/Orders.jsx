import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Accordion, Badge, Button, Card, Col, Form, Modal, Row, Table } from 'react-bootstrap'
import PageHeader from '../components/PageHeader'
import LevelBadge from '../components/LevelBadge'
import { Empty } from '../components/Status'
import { useAppStore } from '../store/useAppStore'
import { totalSpent } from '../lib/level'
import { REFUND_REASONS, STATUS, STATUS_COLOR, statusOf } from '../lib/order'
import { won } from '../lib/format'
import { productOf } from '../../server/products'

// 주문 내역 — 상품 사진과 함께 보여 주고, 주문 취소 · 반품/환불 · 삭제를 할 수 있다.
// 취소·환불 접수한 주문은 누적 구매액(등급)에서 빠진다.
export default function Orders() {
  const { orders, productImages, loadOrders, loadProductImages, cancelOrder, requestRefund, deleteOrder } = useAppStore()
  const [refundFor, setRefundFor] = useState(null)       // 반품/환불 사유를 고르는 중인 주문
  const [reason, setReason] = useState(REFUND_REASONS[0])
  useEffect(() => { loadOrders(); loadProductImages() }, [loadOrders, loadProductImages])

  const valid = orders.filter((o) => statusOf(o) === STATUS.placed)
  const count = valid.reduce((n, o) => n + o.items.reduce((m, i) => m + i.qty, 0), 0)

  const onCancel = (o) => window.confirm(`주문 #${o.id}을(를) 취소할까요?`) && cancelOrder(o.id)
  const onDelete = (o) => window.confirm(`주문 #${o.id} 내역을 삭제할까요? 삭제하면 되돌릴 수 없어요.`) && deleteOrder(o.id)
  async function submitRefund() {
    if (await requestRefund(refundFor.id, reason)) setRefundFor(null)
  }

  return (
    <>
      <PageHeader icon="receipt" title="주문 내역" subtitle="많이 살수록 등급이 올라가요 · 등급을 누르면 등급표가 열려요" />
      <Row className="g-3 mb-4">
        <Col md={5}>
          <Card className="h-100"><Card.Body>
            <div className="small text-body-secondary mb-1">내 등급</div>
            <LevelBadge withProgress />
          </Card.Body></Card>
        </Col>
        <Col xs={6} md={3}><Stat label="주문" value={`${orders.length}건`} /></Col>
        <Col xs={6} md={2}><Stat label="산 물건" value={`${count}개`} /></Col>
        <Col xs={12} md={2}><Stat label="누적 구매액" value={won(totalSpent(orders))} note="취소·환불 제외" /></Col>
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
            return (
              <Accordion.Item key={o.id} eventKey={String(o.id)}>
                <Accordion.Header>
                  <div className="d-flex flex-column flex-sm-row gap-1 gap-sm-3 w-100 me-3 align-items-sm-center">
                    <strong>주문 #{o.id}</strong>
                    <Badge bg={STATUS_COLOR[status]} text={status === STATUS.refund ? 'dark' : undefined} className="align-self-start">{status}</Badge>
                    <span className="text-body-secondary small">{new Date(o.created_at).toLocaleString('ko-KR')}</span>
                    <strong className={`ms-sm-auto ${status === STATUS.placed ? '' : 'text-decoration-line-through text-body-secondary'}`}>{won(o.total)}</strong>
                  </div>
                </Accordion.Header>
                <Accordion.Body>
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
                                {img ? <img src={img.url} alt={i.name} className="cart-thumb" />
                                  : <span className="order-emoji">{p?.emoji ?? '📦'}</span>}
                                {p ? <Link to={`/shop/${p.id}`} className="text-reset">{i.name}</Link> : i.name}
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

                  {status === STATUS.refund && <p className="small text-body-secondary mb-2">반품·환불 사유: {o.refund_reason ?? '-'}</p>}
                  <div className="d-flex flex-wrap gap-2">
                    {status === STATUS.placed && (
                      <>
                        <Button size="sm" variant="outline-danger" onClick={() => onCancel(o)}><i className="bi bi-x-circle me-1" />주문 취소</Button>
                        <Button size="sm" variant="outline-secondary" onClick={() => { setReason(REFUND_REASONS[0]); setRefundFor(o) }}>
                          <i className="bi bi-arrow-return-left me-1" />반품/환불
                        </Button>
                      </>
                    )}
                    <Button size="sm" variant="outline-dark" className="ms-auto" onClick={() => onDelete(o)}><i className="bi bi-trash me-1" />삭제</Button>
                  </div>
                </Accordion.Body>
              </Accordion.Item>
            )
          })}
        </Accordion>
      )}
      <p className="small text-body-secondary mt-3">※ 실제 결제·배송이 없는 과제용 주문이라, 취소와 반품/환불도 내역 상태만 바뀝니다.</p>

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
    </>
  )
}

function Stat({ label, value, note }) {
  return (
    <Card className="h-100"><Card.Body>
      <div className="small text-body-secondary">{label}</div>
      <div className="fw-bold fs-5">{value}</div>
      {note && <div className="small text-body-secondary">{note}</div>}
    </Card.Body></Card>
  )
}
