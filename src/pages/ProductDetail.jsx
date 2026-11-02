import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Alert, Badge, Button, Card, Col, Row, Table } from 'react-bootstrap'
import { fetchImages } from '../api/client'
import { won } from '../lib/format'
import { useAppStore } from '../store/useAppStore'
import { MYTHS } from '../../server/myths'
import { PRODUCTS, productOf, salePrice } from '../../server/products'
import { Empty } from '../components/Status'

// 상품 상세 — 큰 사진(썸네일로 바꿔 보기) · 가격 · 수량 · 장바구니/바로구매 · 상품정보 · 이어진 신화 · 같은 분류 상품
export default function ProductDetail() {
  const { id } = useParams()
  const p = productOf(id)
  const navigate = useNavigate()
  const user = useAppStore((s) => s.user)
  const addToCart = useAppStore((s) => s.addToCart)
  const selectMyth = useAppStore((s) => s.selectMyth)
  const [images, setImages] = useState([])
  const [shown, setShown] = useState(0)
  const [qty, setQty] = useState(1)

  // 상품이 바뀌면 사진·수량을 처음으로 (같은 컴포넌트가 다른 상품으로 다시 쓰일 때)
  useEffect(() => {
    if (!p) return
    let alive = true
    setImages([]); setShown(0); setQty(1)
    fetchImages(p.photo, { lang: 'en', fallback: false, rows: 5 }).then((r) => alive && setImages(r)).catch(() => {})
    return () => { alive = false }
  }, [p])

  if (!p) return (
    <>
      <Empty text="없는 상품이에요" />
      <div className="text-center"><Link to="/shop" className="btn btn-primary btn-sm">제주 장터로</Link></div>
    </>
  )

  const myth = MYTHS.find((m) => m.id === p.myth)
  const related = PRODUCTS.filter((x) => x.category === p.category && x.id !== p.id)
  const big = images[shown]

  async function buyNow() {
    if (!user) return navigate('/login', { state: { from: `/shop/${p.id}` } })
    if (await addToCart(p.id, qty)) navigate('/cart')
  }

  return (
    <>
      <nav className="small mb-3"><Link to="/shop">제주 장터</Link> <i className="bi bi-chevron-right" /> {p.category} <i className="bi bi-chevron-right" /> {p.name}</nav>

      <Row className="g-4">
        <Col md={6}>
          {big
            ? <a href={big.page} target="_blank" rel="noreferrer" title={`Pixabay · ${big.user}`}>
                <img src={big.large || big.thumb} alt={p.name} className="detail-photo" />
              </a>
            : <div className="detail-photo d-flex align-items-center justify-content-center display-1"
                style={{ background: `linear-gradient(135deg, ${p.color}, #1a0b3d)` }}>{p.emoji}</div>}
          {images.length > 1 && (
            <div className="d-flex gap-2 mt-2">
              {images.map((img, i) => (
                <img key={img.id} src={img.thumb} alt="" className={`detail-thumb ${i === shown ? 'on' : ''}`} onClick={() => setShown(i)} />
              ))}
            </div>
          )}
          {images.length > 0 && <div className="small text-body-secondary mt-1">사진 출처: Pixabay</div>}
        </Col>

        <Col md={6}>
          <Badge bg="primary" className="mb-2">{p.category}</Badge>
          <h2 className="fw-bold">{p.name}</h2>
          <p className="text-body-secondary">{p.desc}</p>
          {p.discount > 0 ? (
            <div className="mb-3">
              {/* 왼쪽에 항목 이름을 붙인 가격 표 */}
              <dl className="price-rows mb-2">
                <dt>일반판매가</dt><dd className="text-body-secondary text-decoration-line-through">{won(p.price)}</dd>
                <dt>할인가</dt><dd className="text-danger fw-bold">-{won(p.price - salePrice(p))} ({p.discount}%)</dd>
              </dl>
              <div className="display-6 fw-bold">{won(salePrice(p))}</div>
            </div>
          ) : (
            <div className="display-6 fw-bold mb-3">{won(p.price)}</div>
          )}

          <Card className="mb-3"><Card.Body className="small">
            <div className="d-flex gap-2"><i className="bi bi-truck" /> 과제용 샘플 상품이라 실제 배송은 이루어지지 않아요</div>
            <div className="d-flex gap-2 mt-1"><i className="bi bi-geo-alt" /> 제주특별자치도</div>
          </Card.Body></Card>

          <div className="d-flex align-items-center gap-3 mb-3">
            <span>수량</span>
            <div className="d-flex align-items-center gap-2">
              <Button size="sm" variant="outline-secondary" aria-label="하나 빼기" disabled={qty <= 1} onClick={() => setQty(qty - 1)}><i className="bi bi-dash" /></Button>
              <strong style={{ minWidth: 28, textAlign: 'center' }}>{qty}</strong>
              <Button size="sm" variant="outline-secondary" aria-label="하나 더하기" disabled={qty >= 20} onClick={() => setQty(qty + 1)}><i className="bi bi-plus" /></Button>
            </div>
            <span className="ms-auto">합계 <strong className="fs-5 ms-1">{won(salePrice(p) * qty)}</strong></span>
          </div>

          {!user && <Alert variant="info" className="py-2 small"><Link to="/login" state={{ from: `/shop/${p.id}` }}>로그인</Link>하면 장바구니에 담을 수 있어요.</Alert>}
          <div className="d-flex gap-2">
            <Button variant="outline-primary" className="flex-fill" onClick={() => addToCart(p.id, qty)}><i className="bi bi-cart-plus me-1" />장바구니 담기</Button>
            <Button className="flex-fill" onClick={buyNow}><i className="bi bi-lightning-charge me-1" />바로 구매</Button>
          </div>
        </Col>
      </Row>

      <h5 className="fw-bold mt-5 mb-3">상품정보</h5>
      <Table bordered size="sm" className="mb-4" style={{ maxWidth: 560 }}>
        <tbody>
          <tr><th style={{ width: 120 }} className="bg-body-tertiary">상품명</th><td>{p.name}</td></tr>
          <tr><th className="bg-body-tertiary">분류</th><td>{p.category}</td></tr>
          <tr><th className="bg-body-tertiary">판매가</th><td>{p.discount > 0 ? <><s className="text-body-secondary me-2">{won(p.price)}</s>{won(salePrice(p))} <span className="text-danger small">-{won(p.price - salePrice(p))} ({p.discount}%)</span></> : won(p.price)}</td></tr>
          <tr><th className="bg-body-tertiary">설명</th><td>{p.desc}</td></tr>
        </tbody>
      </Table>

      {myth && (
        <Card className="mb-4 border-primary-subtle">
          <Card.Body className="d-flex align-items-center gap-3 flex-wrap">
            <i className="bi bi-moon-stars fs-2 text-primary" />
            <div className="flex-grow-1">
              <div className="small text-body-secondary">이 상품과 이어진 탐라 신화</div>
              <strong>{myth.title}</strong> <span className="small text-body-secondary">· {myth.place}</span>
              <div className="small">{myth.summary}</div>
            </div>
            <Button as={Link} to="/myths" size="sm" variant="outline-primary" onClick={() => selectMyth(myth.id)}>신화 보러 가기</Button>
          </Card.Body>
        </Card>
      )}

      {related.length > 0 && (
        <>
          <h5 className="fw-bold mb-3">같은 분류 상품</h5>
          <Row xs={2} md={4} className="g-3">
            {related.map((r) => (
              <Col key={r.id}>
                <Card as={Link} to={`/shop/${r.id}`} className="h-100 item-card text-decoration-none">
                  <div className="product-tile" style={{ background: `linear-gradient(135deg, ${r.color}, #1a0b3d)`, height: 90, fontSize: '2.5rem' }}>{r.emoji}</div>
                  <Card.Body className="p-2"><div className="small fw-bold">{r.name}</div><div className="small">{r.discount > 0 && <span className="text-danger fw-bold me-1">{r.discount}%</span>}{won(salePrice(r))}</div></Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        </>
      )}
    </>
  )
}
