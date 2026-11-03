import { useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Badge, Col, Row } from 'react-bootstrap'
import { useAppStore } from '../store/useAppStore'
import { MYTHS } from '../../server/myths'
import Scene from '../components/Scene'
import WeatherLine from '../components/WeatherLine'
import HeroArt from '../components/HeroArt'
import HomeExtras from '../components/HomeExtras'

// 지도 오른쪽 바로가기 — 제주 장터가 맨 위
const SHORTCUTS = [
  { to: '/shop', icon: 'bag-heart', label: '제주 장터', desc: '1분마다 오르내리는 시세 · 타임특가 · 특산품 20종', badge: 'LIVE' },
  { to: '/myths', icon: 'book', label: '신화 도감', desc: `탐라 신화 ${MYTHS.length}편의 이야기` },
  { to: '/benefits', icon: 'gift', label: '제주 혜택', desc: '탐나는전·쿠폰·등급별 혜택 모아 보기' },
  { to: '/my', icon: 'stars', label: '내 별자리', desc: '별표로 담아 둔 신화·장소·유산 모아 보기' },
]

// 홈 소개 아래의 기능 한눈에 보기 (누르면 그 기능으로)
const FEATURES = [
  { to: '/map', icon: 'map', label: '살아 있는 3D 섬' },
  { to: '/map', icon: 'cloud-sun', label: '실제 날씨·시간대' },
  { to: '/agent', icon: 'robot', label: '이야기꾼 AI' },
  { to: '/shop', icon: 'graph-up-arrow', label: '실시간 시세 장터' },
  { to: '/benefits', icon: 'gift', label: '제주 혜택' },
  { to: '/mypage?tab=notify', icon: 'bell', label: '맞춤 알림' },
]

// 작은 지도에서는 이름표를 숨긴다 (마커가 많아 겹침). 선택한 마커의 이름표는 항상 보인다
const MARKERS = MYTHS.map((m) => ({ id: m.id, name: m.title, lat: m.lat, lng: m.lng, color: m.color, label: false }))

// 홈 = 3D 신화 지도(누르면 지도 페이지) + 바로가기
export default function Home() {
  const selectMyth = useAppStore((s) => s.selectMyth)
  const navigate = useNavigate()
  const downAt = useRef(null)

  // 홈에 올 때마다 선택을 비워서, 항상 섬 전체가 보이는 처음 모습으로 시작한다
  useEffect(() => { selectMyth(null) }, [selectMyth])

  return (
    <>
      <section>
        <Row className="align-items-center g-4">
          <Col md={8}>
            <Badge bg="warning" text="dark" className="mb-2">제주 콘텐츠·문화 IP</Badge>
            <h1 className="fw-bold display-5 hero-title">설문대할망의 섬, 탐라신화 3D</h1>
            <p className="text-body-secondary hero-desc">
              치마폭의 흙으로 한라산을 쌓은 여신과 1만 8천 신의 이야기를, 날씨와 시간에 따라 숨 쉬는 3D 섬 위에서 만나 보세요.<br />
              신화 {MYTHS.length}곳을 눌러 보고, 이야기꾼 AI에게 물어보고, 제주 장터에서 오르내리는 시세로 쇼핑까지.
            </p>

            <div className="d-flex flex-wrap gap-2 mb-2">
              {FEATURES.map((f) => (
                <Link key={f.label} to={f.to} className="tag-chip text-decoration-none"><i className={`bi bi-${f.icon} me-1`} />{f.label}</Link>
              ))}
            </div>
            <WeatherLine />
          </Col>
          <Col md={4} className="d-none d-md-block"><HeroArt /></Col>
        </Row>
      </section>
      <hr className="hero-rule" />


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

      <HomeExtras />
    </>
  )
}
