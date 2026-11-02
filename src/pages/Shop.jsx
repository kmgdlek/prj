import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Alert, Badge, Button, Card, Col, Form, Row } from 'react-bootstrap'
import PageHeader from '../components/PageHeader'
import { Empty } from '../components/Status'
import { useAppStore } from '../store/useAppStore'
import { won } from '../lib/format'
import { CATEGORIES, PRODUCTS, salePrice } from '../../server/products'

// 제주 특산품·기념품 — 담기 버튼은 store 의 장바구니에 연결
export default function Shop() {
  const user = useAppStore((s) => s.user)
  const addToCart = useAppStore((s) => s.addToCart)
  const cart = useAppStore((s) => s.cart)
  const images = useAppStore((s) => s.productImages)
  const loadProductImages = useAppStore((s) => s.loadProductImages)
  useEffect(() => { loadProductImages() }, [loadProductImages])
  const [category, setCategory] = useState('전체')
  const [keyword, setKeyword] = useState('')

  const list = PRODUCTS
    .filter((p) => category === '전체' || p.category === category)
    .filter((p) => !keyword || (p.name + p.desc).includes(keyword))

  return (
    <>
      <PageHeader icon="bag-heart" title="제주 장터" subtitle="신화의 섬에서 만난 제주의 맛과 기념품" />
      {!user && (
        <Alert variant="info" className="py-2">
          <i className="bi bi-info-circle me-2" />장바구니에 담으려면 <Link to="/login" state={{ from: '/shop' }}>로그인</Link>이 필요해요.
        </Alert>
      )}
      <div className="d-flex flex-wrap gap-2 align-items-center mb-4">
        {CATEGORIES.map((c) => (
          <Button key={c} size="sm" variant={c === category ? 'primary' : 'outline-secondary'} onClick={() => setCategory(c)}>{c}</Button>
        ))}
        <Form.Control size="sm" className="ms-auto" style={{ maxWidth: 220 }} placeholder="상품 검색"
          value={keyword} onChange={(e) => setKeyword(e.target.value)} />
      </div>

      {list.length === 0 ? <Empty text="찾는 상품이 없어요" /> : (
        <Row xs={1} sm={2} lg={3} className="g-3">
          {list.map((p) => {
            const qty = cart.find((c) => c.product_id === p.id)?.qty ?? 0
            return (
              <Col key={p.id}>
                <Card className="h-100 item-card">
                  <Link to={`/shop/${p.id}`} aria-label={`${p.name} 상세 보기`}>
                    {images[p.id]
                      ? <img src={images[p.id].url} alt={p.name} loading="lazy" className="product-photo" />
                      : <div className="product-tile" style={{ background: `linear-gradient(135deg, ${p.color}, #1a0b3d)` }}>{p.emoji}</div>}
                  </Link>
                  <Card.Body className="d-flex flex-column">
                    <Badge bg="primary" className="align-self-start mb-2">{p.category}</Badge>
                    <Card.Title className="fs-6 fw-bold"><Link to={`/shop/${p.id}`} className="text-reset text-decoration-none">{p.name}</Link></Card.Title>
                    <Card.Text className="small text-body-secondary">{p.desc}</Card.Text>
                    <div className="d-flex align-items-center justify-content-between mt-auto">
                      <div className="lh-sm">
                        {p.discount > 0 && <div className="small"><s className="text-body-secondary me-1">{won(p.price)}</s><span className="text-danger fw-bold">{p.discount}%</span></div>}
                        <strong>{won(salePrice(p))}</strong>
                      </div>
                      <Button size="sm" variant={qty ? 'success' : 'primary'} onClick={() => addToCart(p.id)}>
                        <i className={`bi bi-${qty ? 'cart-check' : 'cart-plus'} me-1`} />{qty ? `담김 ${qty}` : '담기'}
                      </Button>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            )
          })}
        </Row>
      )}
      <p className="small text-body-secondary mt-4 mb-0">※ 과제용 샘플 상품이며 실제 결제·배송은 이루어지지 않습니다. 사진 출처: Pixabay · 상품을 누르면 상세 정보가 열려요</p>
    </>
  )
}
