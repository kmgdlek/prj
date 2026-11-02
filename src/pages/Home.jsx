import { useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Badge, Button, Card, Col, Row } from 'react-bootstrap'
import { displayName, useAppStore } from '../store/useAppStore'
import { MYTHS } from '../../server/myths'
import Scene from '../components/Scene'
import WeatherBadge from '../components/WeatherBadge'
import LevelBadge from '../components/LevelBadge'

// 지도 오른쪽 바로가기 — 제주 장터가 맨 위
const SHORTCUTS = [
  { to: '/shop', icon: 'bag-heart', label: '제주 장터', desc: '한라봉·오메기떡·기념품 최대 5% 할인', badge: 'SALE' },
  { to: '/myths', icon: 'book', label: '신화 도감', desc: '탐라 신화 8편의 이야기' },
  { to: '/places', icon: 'geo-alt', label: '신화 속 장소', desc: '관광공사 데이터로 찾는 가 볼 만한 곳' },
  { to: '/heritage', icon: 'bank', label: '국가유산', desc: '신화와 이어진 제주의 문화유산' },
]

const MARKERS = MYTHS.map((m) => ({ id: m.id, name: m.title, lat: m.lat, lng: m.lng, color: m.color }))

// 홈 = 3D 신화 지도(누르면 지도 페이지) + 바로가기
export default function Home() {
  const { user, selectMyth } = useAppStore()
  const navigate = useNavigate()
  const downAt = useRef(null)

  // 홈에 올 때마다 선택을 비워서, 항상 섬 전체가 보이는 처음 모습으로 시작한다
  useEffect(() => { selectMyth(null) }, [selectMyth])

  return (
    <>
      <section className="mb-4">
        <Badge bg="warning" text="dark" className="mb-2">제주 콘텐츠·문화 IP</Badge>
        <h1 className="fw-bold display-5 hero-title">설문대할망의 섬, 탐라신화 3D</h1>
        <p className="lead text-body-secondary">
          치마폭의 흙으로 한라산을 쌓은 여신과 1만 8천 신의 이야기를, 돌려 보고 눌러 보는 3D 섬 위에서 만나 보세요.
        </p>
        <WeatherBadge place="서귀포시" /> <WeatherBadge place="제주시" />
      </section>

      <Row className="g-3 mb-4">
        <Col md={6}>
          {/* 지도를 누르면 큰 지도 페이지로. 드래그(회전)와 구분하려고 포인터가 거의 안 움직였을 때만 이동 */}
          <div className="map-link" role="link" tabIndex={0} aria-label="탐라 지도 크게 보기"
            onPointerDown={(e) => { downAt.current = [e.clientX, e.clientY] }}
            onClick={(e) => {
              const d = downAt.current && Math.hypot(e.clientX - downAt.current[0], e.clientY - downAt.current[1])
              downAt.current = null
              if (d === null || d < 6) navigate('/map')     // 누른 기록이 없거나 거의 안 움직였으면 클릭, 많이 움직였으면 드래그(회전)
            }}
            onKeyDown={(e) => { if (e.key === 'Enter') navigate('/map') }}>
            <Scene height={320} items={MARKERS} autoRotate />
            <span className="map-link-chip"><i className="bi bi-arrows-fullscreen me-1" />클릭하면 지도 크게 보기</span>
          </div>
        </Col>
        <Col md={6}>
          <div className="d-flex flex-column gap-2 h-100">
            {SHORTCUTS.map((s) => (
              <Link key={s.to} to={s.to} className="shortcut flex-fill">
                <i className={`bi bi-${s.icon} fs-3`} />
                <div className="flex-grow-1">
                  <div className="fw-bold">{s.label}</div>
                  <div className="small text-body-secondary">{s.desc}</div>
                </div>
                {s.badge && <Badge bg="danger">{s.badge}</Badge>}
                <i className="bi bi-chevron-right text-body-secondary" />
              </Link>
            ))}
          </div>
        </Col>
      </Row>

      <Card className="mt-4">
        <Card.Body className="d-flex align-items-center gap-3 flex-wrap">
          <i className="bi bi-person-circle fs-2 text-primary" />
          <div className="flex-grow-1">
            <Card.Title className="fs-6 fw-bold mb-0 d-flex align-items-center gap-2">
              {user && <LevelBadge part="lv" />}
              {user ? `${displayName(user)}님, 환영해요` : '로그인하고 별자리와 장바구니를 만들어 보세요'}
            </Card.Title>
            <small className="text-body-secondary">{user ? user.email : 'Supabase Auth · 이메일로 가입'}</small>
            {user && <div className="mt-1"><LevelBadge part="name" /></div>}
          </div>
          {!user && <Button as={Link} to="/login" size="sm">로그인 · 회원가입</Button>}
        </Card.Body>
      </Card>
    </>
  )
}
