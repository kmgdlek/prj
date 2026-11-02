import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Badge, Button, Card, Col, Row } from 'react-bootstrap'
import { MYTHS } from '../../server/myths'
import { PRODUCTS, dropPct, salePrice } from '../../server/products'
import { useAppStore } from '../store/useAppStore'
import { won } from '../lib/format'

// 홈 맨 아래: 오늘의 신화(날짜마다 바뀜) + 오늘의 특가(할인율 높은 순)
export default function HomeExtras() {
  const navigate = useNavigate()
  const selectMyth = useAppStore((s) => s.selectMyth)
  const images = useAppStore((s) => s.productImages)
  useAppStore((s) => s.priceVer)                        // 관리자가 시세를 바꾸면 다시 그린다
  const slot = useAppStore((s) => s.slot)               // 1분마다 특가 상품이 바뀐다
  const loadProductImages = useAppStore((s) => s.loadProductImages)
  useEffect(() => { loadProductImages() }, [loadProductImages])
  const day = Math.floor(Date.now() / 86400000)
  const myth = MYTHS[day % MYTHS.length]
  const deals = [...PRODUCTS].sort((a, b) => dropPct(b, slot) - dropPct(a, slot)).slice(0, 4)

  return (
    <Row className="g-3 mt-2">
      <Col lg={5}>
        <Card className="h-100"><Card.Body className="d-flex flex-column">
          <div className="small text-body-secondary mb-1"><i className="bi bi-moon-stars me-1" />오늘의 신화</div>
          <h5 className="fw-bold d-flex align-items-center gap-2"><span className="myth-dot" style={{ background: myth.color, color: myth.color }} />{myth.title}</h5>
          <div className="small text-primary mb-2"><i className="bi bi-geo-alt me-1" />{myth.place}</div>
          <p className="mb-3">{myth.summary}</p>
          <Button size="sm" variant="outline-primary" className="mt-auto align-self-start" onClick={() => { selectMyth(myth.id); navigate('/map') }}>
            지도에서 보기 <i className="bi bi-arrow-right" />
          </Button>
        </Card.Body></Card>
      </Col>
      <Col lg={7}>
        <Card className="h-100"><Card.Body>
          <div className="d-flex align-items-center mb-2">
            <div className="small text-body-secondary"><i className="bi bi-lightning-charge-fill text-danger me-1" />지금의 특가</div>
            <Link to="/shop" className="ms-auto small">전체 보기</Link>
          </div>
          <Row xs={2} md={4} className="g-2">
            {deals.map((p) => (
              <Col key={p.id}>
                <Link to={`/shop/${p.id}`} className="deal text-decoration-none text-reset">
                  {images[p.id]
                    ? <img src={images[p.id].url} alt={p.name} loading="lazy" className="deal-img" />
                    : <div className="deal-img d-flex align-items-center justify-content-center fs-2" style={{ background: `linear-gradient(135deg, ${p.color}, #1a0b3d)` }}>{p.emoji}</div>}
                  <div className="small fw-bold mt-1 text-truncate">{p.name}</div>
                  <div className="small">{dropPct(p, slot) > 0 && <Badge bg="danger" className="me-1">{dropPct(p, slot)}%↓</Badge>}{won(salePrice(p, slot))}</div>
                </Link>
              </Col>
            ))}
          </Row>
        </Card.Body></Card>
      </Col>
    </Row>
  )
}
