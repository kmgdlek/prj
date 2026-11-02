import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge, Button } from 'react-bootstrap'
import { useLagFollow } from '../hooks/useLagFollow'
import { displayName, useAppStore } from '../store/useAppStore'
import AdminBadge from './AdminBadge'
import LevelBadge from './LevelBadge'
import Avatar from './Avatar'
import { pointsSummary } from '../lib/checkout'
import { won } from '../lib/format'

const ICON = { 맑음: 'sun', 구름많음: 'cloud-sun', 흐림: 'clouds' }
const PLACES = ['제주시', '서귀포시']

// 위: 날씨 두 곳 한 줄씩 (store 의 예보를 함께 쓴다)
function WeatherMini() {
  const weather = useAppStore((s) => s.weather)
  const loadWeather = useAppStore((s) => s.loadWeather)
  useEffect(() => { loadWeather() }, [loadWeather])
  const rows = PLACES.map((p) => weather[p]).filter(Boolean)
  if (!weather.loaded) return <div className="small text-body-secondary">날씨 불러오는 중...</div>
  if (rows.length === 0) return <div className="small text-body-secondary"><i className="bi bi-cloud-slash me-1" />날씨 연결 대기</div>
  return rows.map((w) => (
    <div key={w.place} className="d-flex justify-content-between small">
      <span><i className={`bi bi-${w.rain !== '없음' ? 'cloud-rain' : ICON[w.sky] ?? 'cloud'} me-1`} />{w.place}</span>
      <span>{w.temp}℃ {w.sky} · {w.pop}%</span>
    </div>
  ))
}

// 오른쪽에서 스크롤을 천천히 따라오는 사각형 창: 프로필 → 날씨 → 주문 내역·장바구니
export default function SideCard() {
  const ref = useRef(null)
  useLagFollow(ref)
  const user = useAppStore((s) => s.user)
  const cartCount = useAppStore((s) => s.cart.reduce((n, c) => n + c.qty, 0))
  const orders = useAppStore((s) => s.orders)
  useAppStore((s) => s.slot)                             // 1분마다 다시 그려서, 배송이 끝나 적립금이 생기는 순간을 따라간다
  const pts = pointsSummary(orders)
  const [open, setOpen] = useState(true)

  return (
    <div className="side-card-wrap">
    <aside ref={ref} className="side-card" aria-label="내 정보">
      <div className="side-card-head">
        <span className="fw-bold small">내 정보</span>
        <Button variant="link" className="p-0 text-body-secondary" aria-label={open ? '접기' : '펼치기'} onClick={() => setOpen(!open)}>
          <i className={`bi bi-chevron-${open ? 'up' : 'down'}`} />
        </Button>
      </div>
      {open && (
        <div className="side-card-body">
          <section className="mb-3">
            {user ? (
              <div className="d-flex gap-2">
                <Link to="/mypage" aria-label="마이페이지"><Avatar user={user} size={40} /></Link>
                <div className="min-w-0">
                  <div className="d-flex align-items-center gap-2 min-w-0">
                    <span className="flex-shrink-0"><LevelBadge part="lv" /></span><AdminBadge />
                    <span className="fw-bold text-truncate">{displayName(user)}</span>
                  </div>
                  <div className="small text-body-secondary text-truncate">{user.email}</div>
                  <Link to="/mypage?tab=points" className="d-block text-body-secondary text-decoration-none mb-1" style={{ fontSize: '.72rem' }} title="적립금 내역 보기">
                    <i className="bi bi-coin me-1" />적립금 <b className="text-body">{won(pts.balance)}</b>{pts.pending > 0 && <span> · 예정 {won(pts.pending)}</span>}
                  </Link>
                  <LevelBadge part="name" withProgress />
                </div>
              </div>
            ) : (
              <>
                <div className="small text-body-secondary mb-2"><i className="bi bi-person-circle me-1" />로그인하면 별자리·장바구니가 저장돼요</div>
                <div className="d-flex gap-2">
                  <Button as={Link} to="/login" size="sm" className="text-nowrap">로그인</Button>
                  <Button as={Link} to="/signup" size="sm" variant="outline-primary" className="text-nowrap">회원가입</Button>
                </div>
              </>
            )}
          </section>
          <section className="mb-3 pt-3 border-top"><WeatherMini /></section>
          <section className="pt-3 border-top d-flex flex-column gap-2">
            <Button as={Link} to="/mypage" size="sm" variant="outline-secondary" className="text-start"><i className="bi bi-person-circle me-2" />마이페이지</Button>
            <Button as={Link} to="/orders" size="sm" variant="outline-secondary" className="text-start"><i className="bi bi-receipt me-2" />주문 내역</Button>
            <Button as={Link} to="/cart" size="sm" variant="outline-secondary" className="text-start">
              <i className="bi bi-cart3 me-2" />장바구니{cartCount > 0 && <Badge bg="warning" text="dark" pill className="ms-2">{cartCount}</Badge>}
            </Button>
          </section>
        </div>
      )}
    </aside>
    </div>
  )
}
