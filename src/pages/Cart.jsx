import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Alert, Badge, Button, Card, Col, Form, InputGroup, ListGroup, Row } from 'react-bootstrap'
import PageHeader from '../components/PageHeader'
import { Empty, Loading } from '../components/Status'
import { useAppStore } from '../store/useAppStore'
import { discountPct, productOf, salePrice } from '../../server/products'
import { calcCheckout, pointsSummary } from '../lib/checkout'
import { couponState, couponText } from '../lib/coupon'
import { totalSpent } from '../lib/level'
import { won } from '../lib/format'

// 장바구니 + 결제 요약 (쿠폰 · 적립금 · 등급 혜택 · 배송비). 로그인 필요 — router 의 RequireAuth 가 막아 준다
export default function Cart() {
  const { cart, cartLoading, orders, coupons, setCartQty, checkout, productImages, loadProductImages, stockOf, maxQty } = useAppStore()
  const [couponId, setCouponId] = useState('')
  const [pointsInput, setPointsInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  useEffect(() => { loadProductImages() }, [loadProductImages])

  const lines = cart.map((c) => ({ ...c, p: productOf(c.product_id) })).filter((l) => l.p)
  const usable = coupons.filter((c) => couponState(c) === 'available')
  const coupon = usable.find((c) => String(c.id) === couponId) ?? null
  const pts = pointsSummary(orders)
  const calc = calcCheckout({ lines, spent: totalSpent(orders), coupon, pointsWanted: Number(pointsInput) || 0, pointsBalance: pts.balance })
  const L = calc.level

  async function order() {
    setBusy(true)
    const ok = await checkout({ couponId: coupon?.id ?? null, pointsUse: calc.pointsUsed })
    setDone(Boolean(ok))
    if (ok) { setCouponId(''); setPointsInput('') }
    setBusy(false)
  }

  return (
    <>
      <PageHeader icon="cart3" title="장바구니" subtitle="쿠폰과 적립금, 등급 혜택이 결제 금액에 반영돼요" />
      {done && <Alert variant="success" dismissible onClose={() => setDone(false)}><i className="bi bi-check-circle me-2" />주문이 접수됐어요. <Link to="/orders">주문 내역</Link>에서 배송 진행을 확인하세요.</Alert>}

      {cartLoading ? <Loading /> : lines.length === 0 ? (
        <Empty text="장바구니가 비어 있어요" />
      ) : (
        <Row className="g-4">
          <Col lg={8}>
            <Card>
              <ListGroup variant="flush">
                {lines.map(({ p, qty }) => {
                  const max = maxQty(p.id)                 // 재고와 1인 한도(20개) 중 작은 쪽
                  return (
                    <ListGroup.Item key={p.id} className="d-flex align-items-center gap-3 flex-wrap">
                      {productImages[p.id]
                        ? <img src={productImages[p.id].url} alt={p.name} className="cart-thumb" />
                        : <span className="fs-2">{p.emoji}</span>}
                      <div className="flex-grow-1">
                        <Link to={`/shop/${p.id}`} className="fw-bold text-reset text-decoration-none">{p.name}</Link>
                        <div className="small text-body-secondary">
                          {discountPct(p) > 0 && <><s className="me-1">{won(p.price)}</s><span className="text-danger fw-bold me-1">{discountPct(p)}%</span></>}{won(salePrice(p))}
                        </div>
                        {stockOf(p.id) <= 5 && <div className="small text-danger">남은 수량 {stockOf(p.id)}개</div>}{qty >= max && stockOf(p.id) > 5 && <div className="small text-body-secondary">최대 {max}개까지 담을 수 있어요</div>}
                      </div>
                      <div className="d-flex align-items-center gap-2">
                        <Button size="sm" variant="outline-secondary" aria-label="하나 빼기" onClick={() => setCartQty(p.id, qty - 1)}><i className="bi bi-dash" /></Button>
                        <span style={{ minWidth: 24, textAlign: 'center' }}>{qty}</span>
                        <Button size="sm" variant="outline-secondary" aria-label="하나 더하기" disabled={qty >= max} onClick={() => setCartQty(p.id, qty + 1)}><i className="bi bi-plus" /></Button>
                      </div>
                      <strong style={{ minWidth: 90, textAlign: 'right' }}>{won(salePrice(p) * qty)}</strong>
                      <Button size="sm" variant="outline-danger" aria-label="삭제" onClick={() => setCartQty(p.id, 0)}><i className="bi bi-trash" /></Button>
                    </ListGroup.Item>
                  )
                })}
              </ListGroup>
            </Card>
            <div className="d-flex gap-2 mt-3">
              <Link to="/shop" className="btn btn-outline-primary btn-sm"><i className="bi bi-bag-heart me-1" />쇼핑 계속하기</Link>
              <Link to="/orders" className="btn btn-outline-secondary btn-sm"><i className="bi bi-receipt me-1" />주문 내역 보기</Link>
            </div>
          </Col>

          <Col lg={4}>
            <Card className="sticky-lg-top" style={{ top: 80 }}>
              <Card.Body>
                <Form.Label className="small fw-bold mb-1"><i className="bi bi-ticket-perforated me-1" />쿠폰</Form.Label>
                <Form.Select size="sm" value={couponId} onChange={(e) => setCouponId(e.target.value)}>
                  <option value="">{usable.length ? '쿠폰을 선택하세요' : '사용할 수 있는 쿠폰이 없어요'}</option>
                  {usable.map((c) => <option key={c.id} value={c.id}>{c.title} · {couponText(c)}</option>)}
                </Form.Select>
                {calc.couponMinMiss && <div className="small text-danger mt-1">{won(coupon.min)} 이상 주문할 때 쓸 수 있어요</div>}

                <Form.Label className="small fw-bold mt-3 mb-1"><i className="bi bi-coin me-1" />적립금 <span className="text-body-secondary fw-normal">(보유 {won(pts.balance)})</span></Form.Label>
                <InputGroup size="sm">
                  <Form.Control type="number" min={0} step={100} value={pointsInput} placeholder="0" onChange={(e) => setPointsInput(e.target.value)} />
                  <Button variant="outline-secondary" onClick={() => setPointsInput(String(Math.min(pts.balance, calc.original)))}>전액 사용</Button>
                </InputGroup>
                {pts.pending > 0 && <div className="small text-body-secondary mt-1">배송완료되면 {won(pts.pending)}이 적립돼요</div>}

                <hr />
                <dl className="sum-rows mb-0">
                  <dt>원가</dt><dd>{won(calc.original)}</dd>
                  <dt>할인가</dt><dd className="small text-danger">{calc.productDiscount > 0 ? `-${won(calc.productDiscount)}` : '-'}</dd>
                  <dt><Badge bg={L.color} text={L.color === 'warning' || L.color === 'info' ? 'dark' : undefined}>LV.{L.lv} {L.name}</Badge> 등급 할인 {L.extra}%</dt>
                  <dd className="small text-danger">{calc.gradeDiscount > 0 ? `-${won(calc.gradeDiscount)}` : '-'}</dd>
                  <dt>쿠폰 할인</dt><dd className="small text-danger">{calc.couponOff > 0 ? `-${won(calc.couponOff)}` : '-'}</dd>
                  <dt>적립금 사용</dt><dd className="small text-danger">{calc.pointsUsed > 0 ? `-${won(calc.pointsUsed)}` : '-'}</dd>
                  <dt>배송비</dt><dd>{calc.shipping > 0 ? won(calc.shipping) : '무료'}</dd>
                </dl>
                {calc.shipping > 0 && L.freeShip > 0 && <div className="small text-body-secondary text-end">{won(L.freeShip - calc.subtotal)} 더 담으면 무료배송</div>}
                <div className="d-flex justify-content-between align-items-end mt-2">
                  <span className="fw-bold">합계</span>
                  <span className="price-now-sm">{won(calc.total)}</span>
                </div>
                <div className="small text-body-secondary text-end mb-3">적립 예정 {won(calc.earn)} ({L.earn}%)</div>
                <Button className="w-100" onClick={order} disabled={busy}>{busy ? '주문 중...' : `${won(calc.total)} 주문하기`}</Button>
                <p className="small text-body-secondary mt-2 mb-0">※ 실제 결제는 연동하지 않아요. 주문하면 주문 내역만 저장됩니다.</p>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}
    </>
  )
}
