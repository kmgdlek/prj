import RetryImg from '../components/RetryImg'
import RollingNumber from '../components/RollingNumber'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Alert, Badge, Button, Card, Col, Form, Row } from 'react-bootstrap'
import PageHeader from '../components/PageHeader'
import { Empty } from '../components/Status'
import { FavButton } from '../components/ItemCard'
import { Stars, ratingOf } from '../components/StarRating'
import { useAppStore } from '../store/useAppStore'
import { won } from '../lib/format'
import { CATEGORIES, MAX_PER_ITEM, PRODUCTS, TAGS, demandLabel, demandPct, discountPct, dropPct, flashRate, isSudden, liveStock, salePrice, surgeLabel, surgePct, trendOf } from '../../server/products'

// 제주 특산품·기념품 — 담기 버튼은 store 의 장바구니에 연결
export default function Shop() {
  const user = useAppStore((s) => s.user)
  const addToCart = useAppStore((s) => s.addToCart)
  const cart = useAppStore((s) => s.cart)
  const reviews = useAppStore((s) => s.reviews)
  const stock = useAppStore((s) => s.stock)
  useAppStore((s) => s.priceVer)                        // 관리자가 시세를 바꾸면 다시 그린다
  const slot = useAppStore((s) => s.slot)               // 1분마다 바뀌는 시세 번호 (바뀌면 화면이 다시 그려진다)
  const stockSlot = useAppStore((s) => s.stockSlot)     // 10분마다 바뀌는 재고 번호
  const images = useAppStore((s) => s.productImages)
  const loadProductImages = useAppStore((s) => s.loadProductImages)
  useEffect(() => { loadProductImages() }, [loadProductImages])
  const [category, setCategory] = useState('전체')
  const [keyword, setKeyword] = useState('')
  const [params] = useSearchParams()
  const [tags, setTags] = useState(() => params.getAll('tag').filter((t) => TAGS.includes(t)))   // 상세 화면의 태그를 누르면 /shop?tag=선물 로 들어온다
  const toggleTag = (t) => setTags((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]))
  const [sort, setSort] = useState('basic')
  const stockOf = (p) => liveStock(stock[p.id] ?? p.stock, p.id, stockSlot)

  const SORTS = {
    basic: () => 0,
    low: (a, b) => salePrice(a, slot) - salePrice(b, slot),
    high: (a, b) => salePrice(b, slot) - salePrice(a, slot),
    discount: (a, b) => dropPct(b, slot) - dropPct(a, slot),                 // 특가순: 평소 시세보다 많이 싸진 순
    rating: (a, b) => ratingOf(reviews, b.id).avg - ratingOf(reviews, a.id).avg,
  }
  const list = PRODUCTS
    .filter((p) => category === '전체' || p.category === category)
    .filter((p) => !keyword || (p.name + p.desc + (p.tags ?? []).join(' ')).includes(keyword.replace(/^#/, '')))
    .filter((p) => tags.every((t) => p.tags?.includes(t)))
    .sort(SORTS[sort])

  return (
    <>
      <PageHeader icon="bag-heart" title="제주 장터" subtitle="신화의 섬에서 만난 제주의 맛과 기념품" />
      {!user && (
        <Alert variant="info" className="py-2">
          <i className="bi bi-info-circle me-2" />장바구니에 담으려면 <Link to="/login" state={{ from: '/shop' }}>로그인</Link>이 필요해요.
        </Alert>
      )}
      {/* 시세는 1분마다, 재고는 10분마다 바뀐다 */}
      <div className="flash-banner mb-3">
        <i className="bi bi-lightning-charge-fill text-danger" /><strong>타임특가</strong>
        <span>지금 {PRODUCTS.filter((p) => flashRate(p, slot) > 0).length}개 상품이 더 싸졌어요</span>
      </div>
      <div className="d-flex flex-wrap gap-2 align-items-center mb-4">
        {CATEGORIES.map((c) => (
          <Button key={c} size="sm" variant={c === category ? 'primary' : 'outline-secondary'} onClick={() => setCategory(c)}>{c}</Button>
        ))}
        <Form.Select size="sm" className="ms-auto" style={{ maxWidth: 140 }} value={sort} onChange={(e) => setSort(e.target.value)} aria-label="정렬">
          <option value="basic">기본순</option><option value="low">낮은 가격순</option><option value="high">높은 가격순</option>
          <option value="discount">특가순</option><option value="rating">별점순</option>
        </Form.Select>
        <Form.Control size="sm" style={{ maxWidth: 200 }} placeholder="상품·태그 검색" value={keyword} onChange={(e) => setKeyword(e.target.value)} />
      </div>

      {/* 태그: 눌러서 걸러 보기 (여러 개 고르면 모두 가진 상품만) */}
      <div className="d-flex flex-wrap gap-2 align-items-center mb-4 tag-row">
        <span className="small text-body-secondary"><i className="bi bi-tags me-1" />태그</span>
        {TAGS.map((t) => (
          <button key={t} type="button" className={`tag-chip ${tags.includes(t) ? 'on' : ''}`} onClick={() => toggleTag(t)}>#{t}</button>
        ))}
        {tags.length > 0 && <button type="button" className="btn btn-link btn-sm p-0" onClick={() => setTags([])}>태그 지우기</button>}
        <span className="ms-auto small text-body-secondary">{list.length}개 상품</span>
      </div>

      {list.length === 0 ? <Empty text="찾는 상품이 없어요" /> : (
        <Row xs={1} sm={2} lg={3} className="g-3">
          {list.map((p) => {
            const qty = cart.find((c) => c.product_id === p.id)?.qty ?? 0
            const left = stockOf(p)
            const full = left > 0 && qty >= Math.min(left, MAX_PER_ITEM)     // 담을 수 있는 한도까지 담음
            const rate = ratingOf(reviews, p.id)
            return (
              <Col key={p.id}>
                <Card className="h-100 item-card">
                  <div className="position-relative">
                    <Link to={`/shop/${p.id}`} aria-label={`${p.name} 상세 보기`}>
                      {images[p.id]
                        ? <RetryImg src={images[p.id].url} alt={p.name} loading="lazy" className="product-photo" />
                        : <div className="product-tile" style={{ background: `linear-gradient(135deg, ${p.color}, #1a0b3d)` }}>{p.emoji}</div>}
                    </Link>
                    <FavButton fav={{ source: 'product', id: p.id, title: p.name }} icon="heart" label={false} className="wish-btn" />
                    {left <= 0 && <span className="soldout">품절</span>}
                  </div>
                  <Card.Body className="d-flex flex-column">
                    <div className="d-flex flex-wrap gap-1 mb-2">
                      <Badge bg="primary">{p.category}</Badge>
                      {(p.tags ?? []).map((t) => <span key={t} className={`tag-mini ${tags.includes(t) ? 'on' : ''}`}>#{t}</span>)}
                    </div>
                    <Card.Title className="fs-6 fw-bold"><Link to={`/shop/${p.id}`} className="text-reset text-decoration-none">{p.name}</Link></Card.Title>
                    <Card.Text className="small text-body-secondary mb-1">{p.desc}</Card.Text>
                    <div className="small mb-2 d-flex align-items-center gap-2 flex-wrap">
                      {rate.count > 0 ? <><Stars value={rate.avg} /><span className="text-body-secondary">{rate.avg.toFixed(1)} ({rate.count})</span></> : <span className="text-body-secondary">후기 없음</span>}
                      {left > 0 && left <= 5 && <span className="text-danger fw-bold">남은 수량 {left}개</span>}
                    </div>
                    <div className="d-flex align-items-center justify-content-between mt-auto">
                      <div className="lh-sm">
                        {(discountPct(p, slot) > 0 || flashRate(p, slot) > 0) && (
                          <div className="small">
                            {discountPct(p, slot) > 0 && <><s className="text-body-secondary me-1">{won(p.price)}</s><span className="text-danger fw-bold">{discountPct(p, slot)}%</span></>}
                            {surgePct(p, slot) === 0 && flashRate(p, slot) > 0 && <span className="flash-badge ms-1">⚡ {flashRate(p, slot)}%↓</span>}
                          </div>
                        )}
                        {demandPct(p, slot) !== 0 && surgePct(p, slot) === 0 && <div><span className={`mkt-pill ${demandPct(p, slot) > 0 ? 'up' : 'down'}`}>{demandLabel(p, slot)}</span></div>}
                        {discountPct(p, slot) <= 0 && surgePct(p, slot) === 0 && <div className="small text-body-secondary">정가 {won(p.price)}{discountPct(p, slot) < 0 && <span className="text-danger fw-bold ms-1">+{-discountPct(p, slot)}%</span>}</div>}
                        {surgePct(p, slot) !== 0 && <div><span className={`mkt-pill ${surgePct(p, slot) > 0 ? 'up' : 'down'} ${isSudden(p, slot) ? 'hot' : ''}`}>{surgeLabel(p, slot)}</span></div>}
                        <strong><RollingNumber text={won(salePrice(p, slot))} /></strong>
                        {trendOf(p, slot) < 0 && <span className="trend-down ms-1">▼{won(-trendOf(p, slot))}</span>}
                        {trendOf(p, slot) > 0 && <span className="trend-up ms-1">▲{won(trendOf(p, slot))}</span>}
                      </div>
                      <Button size="sm" variant={qty ? 'success' : 'primary'} disabled={left <= 0 || full} onClick={() => addToCart(p.id)}>
                        <i className={`bi bi-${qty ? 'cart-check' : 'cart-plus'} me-1`} />{left <= 0 ? '품절' : full ? `최대 ${qty}개` : qty ? `담김 ${qty}` : '담기'}
                      </Button>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            )
          })}
        </Row>
      )}
      <p className="small text-body-secondary mt-4 mb-0">※ 한 상품은 최대 20개까지 담을 수 있어요. 과제용 샘플 상품이며 실제 결제·배송은 이루어지지 않습니다. 사진 출처: Pixabay · 상품을 누르면 상세 정보가 열려요</p>
    </>
  )
}
