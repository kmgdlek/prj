import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge, Button } from 'react-bootstrap'
import { fetchWeather } from '../api/client'
import { useLagFollow } from '../hooks/useLagFollow'
import { displayName, useAppStore } from '../store/useAppStore'
import LevelBadge from './LevelBadge'

const ICON = { 맑음: 'sun', 구름많음: 'cloud-sun', 흐림: 'clouds' }
const PLACES = ['제주시', '서귀포시']

// 위: 날씨 두 곳 한 줄씩
function WeatherMini() {
  const [rows, setRows] = useState(null)       // null = 불러오는 중, [] = 실패
  useEffect(() => {
    let alive = true
    Promise.all(PLACES.map((p) => fetchWeather(p).then((l) => l[0]).catch(() => null)))
      .then((r) => alive && setRows(r.filter(Boolean)))
    return () => { alive = false }
  }, [])
  if (rows === null) return <div className="small text-body-secondary">날씨 불러오는 중...</div>
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
                <i className="bi bi-person-circle fs-2 text-primary" />
                <div className="min-w-0">
                  <div className="d-flex align-items-center gap-2 min-w-0">
                    <span className="flex-shrink-0"><LevelBadge part="lv" /></span>
                    <span className="fw-bold text-truncate">{displayName(user)}</span>
                  </div>
                  <div className="small text-body-secondary text-truncate mb-1">{user.email}</div>
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
