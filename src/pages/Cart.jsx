import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Alert, Button, Card, ListGroup } from 'react-bootstrap'
import PageHeader from '../components/PageHeader'
import { Empty, Loading } from '../components/Status'
import { useAppStore } from '../store/useAppStore'
import { productOf } from '../../server/products'
import { won } from '../lib/format'

// 장바구니 + 주문 내역 (로그인 필요 — router 의 RequireAuth 가 막아 준다)
export default function Cart() {
  const { cart, cartLoading, orders, setCartQty, checkout } = useAppStore()
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  const lines = cart.map((c) => ({ ...c, p: productOf(c.product_id) })).filter((l) => l.p)
  const total = lines.reduce((sum, l) => sum + l.p.price * l.qty, 0)

  async function order() {
    setBusy(true)
    setDone(await checkout())
    setBusy(false)
  }

  return (
    <>
      <PageHeader icon="cart3" title="장바구니" subtitle="담은 상품은 내 계정에 저장돼요" />
      {done && <Alert variant="success" dismissible onClose={() => setDone(false)}><i className="bi bi-check-circle me-2" />주문이 접수됐어요. 아래 주문 내역에서 확인하세요.</Alert>}

      {cartLoading ? <Loading /> : lines.length === 0 ? (
        <Empty text="장바구니가 비어 있어요" />
      ) : (
        <Card className="mb-4">
          <ListGroup variant="flush">
            {lines.map(({ p, qty }) => (
              <ListGroup.Item key={p.id} className="d-flex align-items-center gap-3 flex-wrap">
                <span className="fs-2">{p.emoji}</span>
                <div className="flex-grow-1">
                  <div className="fw-bold">{p.name}</div>
                  <div className="small text-body-secondary">{won(p.price)}</div>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <Button size="sm" variant="outline-secondary" aria-label="하나 빼기" onClick={() => setCartQty(p.id, qty - 1)}><i className="bi bi-dash" /></Button>
                  <span style={{ minWidth: 24, textAlign: 'center' }}>{qty}</span>
                  <Button size="sm" variant="outline-secondary" aria-label="하나 더하기" onClick={() => setCartQty(p.id, qty + 1)}><i className="bi bi-plus" /></Button>
                </div>
                <strong style={{ minWidth: 90, textAlign: 'right' }}>{won(p.price * qty)}</strong>
                <Button size="sm" variant="outline-danger" aria-label="삭제" onClick={() => setCartQty(p.id, 0)}><i className="bi bi-trash" /></Button>
              </ListGroup.Item>
            ))}
          </ListGroup>
          <Card.Footer className="d-flex align-items-center justify-content-between">
            <span>합계 <strong className="fs-5 ms-2">{won(total)}</strong></span>
            <Button onClick={order} disabled={busy}>{busy ? '주문 중...' : '주문하기'}</Button>
          </Card.Footer>
        </Card>
      )}
      <p className="small text-body-secondary">※ 실제 결제는 연동하지 않아요. 주문하면 주문 내역만 저장됩니다.</p>
      <Link to="/shop" className="btn btn-outline-primary btn-sm mb-4"><i className="bi bi-bag-heart me-1" />쇼핑 계속하기</Link>

      <h5 className="fw-bold mb-3"><i className="bi bi-receipt me-2" />주문 내역</h5>
      {orders.length === 0 ? <Empty text="아직 주문이 없어요" /> : (
        <ListGroup>
          {orders.map((o) => (
            <ListGroup.Item key={o.id}>
              <div className="d-flex justify-content-between">
                <strong>{new Date(o.created_at).toLocaleString('ko-KR')}</strong>
                <strong>{won(o.total)}</strong>
              </div>
              <div className="small text-body-secondary">{o.items.map((i) => `${i.name} × ${i.qty}`).join(' · ')}</div>
            </ListGroup.Item>
          ))}
        </ListGroup>
      )}
    </>
  )
}
