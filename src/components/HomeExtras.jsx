import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Badge, Button, Card, Col, Row } from 'react-bootstrap'
import { MYTHS } from '../../server/myths'
import { PRODUCTS, salePrice } from '../../server/products'
import { useAppStore } from '../store/useAppStore'
import { won } from '../lib/format'

// 홈 맨 아래: 오늘의 신화(날짜마다 바뀜) + 오늘의 특가(할인율 높은 순)
export default function HomeExtras() {
  const navigate = useNavigate()
  const selectMyth = useAppStore((s) => s.selectMyth)
  const images = useAppStore((s) => s.productImages)
  const loadProductImages = useAppStore((s) => s.loadProductImages)
  useEffect(() => { loadProductImages() }, [loadProductImages])
  const day = Math.floor(Date.now() / 86400000)
  const myth = MYTHS[day % MYTHS.length]
  const deals = [...PRODUCTS].sort((a, b) => b.discount - a.discount).slice(0, 4)

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
            <div className="small text-body-secondary"><i className="bi bi-tags me-1" />오늘의 특가</div>
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
                  <div className="small"><Badge bg="danger" className="me-1">{p.discount}%</Badge>{won(salePrice(p))}</div>
                </Link>
              </Col>
            ))}
          </Row>
        </Card.Body></Card>
      </Col>
    </Row>
  )
}
