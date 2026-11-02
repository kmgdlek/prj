import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Alert, Badge, Button, Card, Col, Row, Table } from 'react-bootstrap'
import { fetchImages } from '../api/client'
import { won } from '../lib/format'
import { useAppStore } from '../store/useAppStore'
import { MYTHS } from '../../server/myths'
import { MAX_PER_ITEM, PRODUCTS, STOCK_SLOT_MS, basePrice, discountPct, flashRate, liveStock, productOf, salePrice, trendOf } from '../../server/products'
import SlotTimer from '../components/SlotTimer'
import PriceChart from '../components/PriceChart'
import { Empty } from '../components/Status'
import { FavButton } from '../components/ItemCard'
import { Stars, ratingOf } from '../components/StarRating'
import { pushRecent } from '../lib/recent'

// 상품 상세 — 큰 사진(썸네일로 바꿔 보기) · 가격 · 수량 · 장바구니/바로구매 · 상품정보 · 이어진 신화 · 같은 분류 상품
export default function ProductDetail() {
  const { id } = useParams()
  const p = productOf(id)
  const navigate = useNavigate()
  const user = useAppStore((s) => s.user)
  const addToCart = useAppStore((s) => s.addToCart)
  const selectMyth = useAppStore((s) => s.selectMyth)
  const reviews = useAppStore((s) => s.reviews)
  const deleteReview = useAppStore((s) => s.deleteReview)
  const slot = useAppStore((s) => s.slot)               // 1분마다 바뀌는 시세 번호
  const stockSlot = useAppStore((s) => s.stockSlot)     // 10분마다 바뀌는 재고 번호
  const rawStock = useAppStore((s) => s.stock[id] ?? p?.stock ?? 0)
  const stock = liveStock(rawStock, id, stockSlot)
  const inCart = useAppStore((s) => s.cart.find((c) => c.product_id === id)?.qty ?? 0)
  const [images, setImages] = useState([])
  const [shown, setShown] = useState(0)
  const [qty, setQty] = useState(1)

  // 상품이 바뀌면 사진·수량을 처음으로 (같은 컴포넌트가 다른 상품으로 다시 쓰일 때)
  useEffect(() => {
    if (!p) return
    let alive = true
    pushRecent(p.id)                                 // 마이페이지 '최근 본 상품'에 기록
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
  const rating = ratingOf(reviews, p.id)
  const maxQty = Math.max(0, Math.min(stock, MAX_PER_ITEM) - inCart)       // 이미 담은 개수를 뺀, 더 담을 수 있는 개수

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
          <div className="d-flex flex-wrap gap-1 mb-2">
            <Badge bg="primary">{p.category}</Badge>
            {(p.tags ?? []).map((t) => <Link key={t} to={`/shop?tag=${encodeURIComponent(t)}`} className="tag-mini">#{t}</Link>)}
          </div>
          <h2 className="fw-bold mb-1">{p.name}</h2>
          <a href="#reviews" className="d-inline-flex align-items-center gap-2 text-decoration-none mb-2">
            <Stars value={rating.avg} />
            <span className="small text-body-secondary">{rating.count > 0 ? `${rating.avg.toFixed(1)} · 후기 ${rating.count}개` : '아직 후기가 없어요'}</span>
          </a>
          <p className="text-body-secondary">{p.desc}</p>
          {/* 왼쪽에 항목 이름을 붙인 가격 표: 일반판매가 → 할인가(깎인 금액) → 현재가(최종) */}
          <div className="price-wrap">
          <dl className="price-rows mb-3">
            {discountPct(p, slot) > 0 && (
              <>
                <dt>일반판매가</dt><dd className="text-body-secondary text-decoration-line-through">{won(p.price)}</dd>
                {p.discount > 0 && <><dt>할인가</dt><dd className="text-danger fw-bold">-{won(p.price - basePrice(p))} ({p.discount}%)</dd></>}
                {flashRate(p, slot) > 0 && <><dt>타임특가</dt><dd className="text-danger fw-bold">-{won(basePrice(p) - salePrice(p, slot))} (⚡ {flashRate(p, slot)}% 추가)</dd></>}
              </>
            )}
            <dt className="price-now-label">현재가</dt>
            <dd className="price-now">
              {won(salePrice(p, slot))}
              {trendOf(p, slot) < 0 && <div className="trend-down">▼ 1분 전보다 {won(-trendOf(p, slot))} 내림</div>}
              {trendOf(p, slot) > 0 && <div className="trend-up">▲ 1분 전보다 {won(trendOf(p, slot))} 오름</div>}
            </dd>
          </dl>
          {/* 가격 오른쪽 빈칸: 주식 1분봉 같은 가격 차트 (좁으면 아래로 내려간다) */}
          <PriceChart p={p} slot={slot} />
          </div>
          <div className="small text-body-secondary mb-3"><i className="bi bi-lightning-charge-fill text-danger me-1" />1분마다 시세가 바뀌어요 · 다음 변동까지 <SlotTimer /> <span className="ms-2">재고는 10분마다 (<SlotTimer ms={STOCK_SLOT_MS} />)</span></div>

          <Card className="mb-3"><Card.Body className="small">
            <div className="d-flex gap-2"><i className="bi bi-truck" /> 과제용 샘플 상품이라 실제 배송은 이루어지지 않아요</div>
            <div className="d-flex gap-2 mt-1"><i className="bi bi-geo-alt" /> 제주특별자치도</div>
            <div className={`d-flex gap-2 mt-1 ${stock <= 5 ? 'text-danger fw-bold' : ''}`}>
              <i className="bi bi-box-seam" /> {stock <= 0 ? '품절' : stock <= 5 ? `품절 임박 · 남은 수량 ${stock}개` : `재고 ${stock}개`}
            </div>
          </Card.Body></Card>

          <div className="d-flex align-items-center gap-3 mb-3">
            <span>수량</span>
            <div className="d-flex align-items-center gap-2">
              <Button size="sm" variant="outline-secondary" aria-label="하나 빼기" disabled={qty <= 1} onClick={() => setQty(qty - 1)}><i className="bi bi-dash" /></Button>
              <strong style={{ minWidth: 28, textAlign: 'center' }}>{qty}</strong>
              <Button size="sm" variant="outline-secondary" aria-label="하나 더하기" disabled={qty >= maxQty} onClick={() => setQty(qty + 1)}><i className="bi bi-plus" /></Button>
            </div>
            <span className="ms-auto">합계 <strong className="fs-5 ms-1">{won(salePrice(p, slot) * qty)}</strong></span>
          </div>

          {!user && <Alert variant="info" className="py-2 small"><Link to="/login" state={{ from: `/shop/${p.id}` }}>로그인</Link>하면 장바구니에 담을 수 있어요.</Alert>}
          <div className="d-flex gap-2">
            <FavButton fav={{ source: 'product', id: p.id, title: p.name }} icon="heart" size="md" label={false} />
            <Button variant="outline-primary" className="flex-fill" disabled={stock <= 0 || maxQty <= 0} onClick={() => addToCart(p.id, qty)}><i className="bi bi-cart-plus me-1" />장바구니 담기</Button>
            <Button className="flex-fill" disabled={stock <= 0 || maxQty <= 0} onClick={buyNow}><i className="bi bi-lightning-charge me-1" />{stock <= 0 ? '품절' : maxQty <= 0 ? '최대 수량' : '바로 구매'}</Button>
          </div>
        </Col>
      </Row>

      <h5 className="fw-bold mt-5 mb-3">상품정보</h5>
      <Table bordered size="sm" className="mb-4" style={{ maxWidth: 560 }}>
        <tbody>
          <tr><th style={{ width: 120 }} className="bg-body-tertiary">상품명</th><td>{p.name}</td></tr>
          <tr><th className="bg-body-tertiary">분류</th><td>{p.category}</td></tr>
          <tr><th className="bg-body-tertiary">판매가</th><td>{discountPct(p, slot) > 0 ? <><s className="text-body-secondary me-2">{won(p.price)}</s>{won(salePrice(p, slot))} <span className="text-danger small">-{won(p.price - salePrice(p, slot))} ({discountPct(p, slot)}%)</span></> : won(p.price)}</td></tr>
          <tr><th className="bg-body-tertiary">설명</th><td>{p.desc}</td></tr>
        </tbody>
      </Table>

      {/* 후기·별점 */}
      <h5 className="fw-bold mb-3" id="reviews">후기 <small className="text-body-secondary fw-normal">({rating.count})</small></h5>
      {rating.count > 0 && (
        <div className="d-flex align-items-center gap-3 mb-3">
          <span className="display-6 fw-bold">{rating.avg.toFixed(1)}</span>
          <div><Stars value={rating.avg} size="1.3rem" /><div className="small text-body-secondary">후기 {rating.count}개</div></div>
        </div>
      )}
      {rating.list.length === 0 ? (
        <p className="text-body-secondary">아직 후기가 없어요. 배송이 끝난 주문에서 첫 후기를 남겨 보세요. <Link to="/orders">주문 내역</Link></p>
      ) : (
        <div className="mb-4">
          {rating.list.slice(0, 10).map((r) => (
            <div key={r.id} className="review-item">
              <div className="d-flex align-items-center gap-2">
                <Stars value={r.rating} />
                <strong className="small">{r.nickname}</strong>
                <span className="small text-body-secondary">{new Date(r.created_at).toLocaleDateString('ko-KR')}</span>
                {r.user_id === user?.id && <Button size="sm" variant="link" className="ms-auto p-0 text-danger small" onClick={() => window.confirm('후기를 지울까요?') && deleteReview(r.id)}>삭제</Button>}
              </div>
              <p className="mb-0 mt-1" style={{ whiteSpace: 'pre-wrap' }}>{r.content}</p>
            </div>
          ))}
        </div>
      )}

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
                  <Card.Body className="p-2"><div className="small fw-bold">{r.name}</div><div className="small">{discountPct(r, slot) > 0 && <span className="text-danger fw-bold me-1">{discountPct(r, slot)}%</span>}{won(salePrice(r, slot))}</div></Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        </>
      )}
    </>
  )
}
