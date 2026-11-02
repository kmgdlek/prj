import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Alert, Button, Card, ListGroup } from 'react-bootstrap'
import PageHeader from '../components/PageHeader'
import { Empty, Loading } from '../components/Status'
import { useAppStore } from '../store/useAppStore'
import { productOf, salePrice } from '../../server/products'
import { won } from '../lib/format'

// 장바구니 + 주문 내역 (로그인 필요 — router 의 RequireAuth 가 막아 준다)
export default function Cart() {
  const { cart, cartLoading, setCartQty, checkout, productImages, loadProductImages } = useAppStore()
  useEffect(() => { loadProductImages() }, [loadProductImages])
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  const lines = cart.map((c) => ({ ...c, p: productOf(c.product_id) })).filter((l) => l.p)
  const original = lines.reduce((sum, l) => sum + l.p.price * l.qty, 0)        // 원가 합계 (할인 전)
  const total = lines.reduce((sum, l) => sum + salePrice(l.p) * l.qty, 0)      // 결제 금액 (할인 적용)
  const discount = original - total

  async function order() {
    setBusy(true)
    setDone(await checkout())
    setBusy(false)
  }

  return (
    <>
      <PageHeader icon="cart3" title="장바구니" subtitle="담은 상품은 내 계정에 저장돼요" />
      {done && <Alert variant="success" dismissible onClose={() => setDone(false)}><i className="bi bi-check-circle me-2" />주문이 접수됐어요. <Link to="/orders">주문 내역</Link>에서 확인하세요.</Alert>}

      {cartLoading ? <Loading /> : lines.length === 0 ? (
        <Empty text="장바구니가 비어 있어요" />
      ) : (
        <Card className="mb-4">
          <ListGroup variant="flush">
            {lines.map(({ p, qty }) => (
              <ListGroup.Item key={p.id} className="d-flex align-items-center gap-3 flex-wrap">
                {productImages[p.id]
                  ? <img src={productImages[p.id].url} alt={p.name} className="cart-thumb" />
                  : <span className="fs-2">{p.emoji}</span>}
                <div className="flex-grow-1">
                  <Link to={`/shop/${p.id}`} className="fw-bold text-reset text-decoration-none">{p.name}</Link>
                  <div className="small text-body-secondary">
                    {p.discount > 0 && <><s className="me-1">{won(p.price)}</s><span className="text-danger fw-bold me-1">{p.discount}%</span></>}{won(salePrice(p))}
                  </div>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <Button size="sm" variant="outline-secondary" aria-label="하나 빼기" onClick={() => setCartQty(p.id, qty - 1)}><i className="bi bi-dash" /></Button>
                  <span style={{ minWidth: 24, textAlign: 'center' }}>{qty}</span>
                  <Button size="sm" variant="outline-secondary" aria-label="하나 더하기" onClick={() => setCartQty(p.id, qty + 1)}><i className="bi bi-plus" /></Button>
                </div>
                <strong style={{ minWidth: 90, textAlign: 'right' }}>{won(salePrice(p) * qty)}</strong>
                <Button size="sm" variant="outline-danger" aria-label="삭제" onClick={() => setCartQty(p.id, 0)}><i className="bi bi-trash" /></Button>
              </ListGroup.Item>
            ))}
          </ListGroup>
          <Card.Footer className="d-flex align-items-end justify-content-between gap-3 flex-wrap">
            {/* 원가 → 할인가(깎인 금액) → 합계(결제 금액) */}
            <dl className="price-rows mb-0">
              <dt>원가</dt><dd>{won(original)}</dd>
              <dt>할인가</dt><dd className={`small ${discount > 0 ? 'text-danger' : 'text-body-secondary'}`}>{discount > 0 ? `-${won(discount)} (${Math.round((discount / original) * 100)}%)` : '-'}</dd>
              <dt className="price-now-label">합계</dt><dd className="price-now-sm">{won(total)}</dd>
            </dl>
            <Button onClick={order} disabled={busy}>{busy ? '주문 중...' : '주문하기'}</Button>
          </Card.Footer>
        </Card>
      )}
      <p className="small text-body-secondary">※ 실제 결제는 연동하지 않아요. 주문하면 주문 내역만 저장됩니다.</p>
      <div className="d-flex gap-2">
        <Link to="/shop" className="btn btn-outline-primary btn-sm"><i className="bi bi-bag-heart me-1" />쇼핑 계속하기</Link>
        <Link to="/orders" className="btn btn-outline-secondary btn-sm"><i className="bi bi-receipt me-1" />주문 내역 보기</Link>
      </div>

    </>
  )
}
