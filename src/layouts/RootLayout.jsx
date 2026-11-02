import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, ScrollRestoration, useLocation, useNavigate } from 'react-router-dom'
import { Badge, Button, Container, Navbar, Offcanvas } from 'react-bootstrap'
import AdminBadge from '../components/AdminBadge'
import NotificationBell from '../components/NotificationBell'
import ChatPanel from '../components/ChatPanel'
import { useTheme } from '../lib/theme'
import { captureInvite } from '../lib/invite'
import { NAV_GROUPS, NAV_ITEMS } from '../router'
import LevelBadge from '../components/LevelBadge'
import SideCard from '../components/SideCard'
import AgentStatus from '../components/AgentStatus'
import HealthMini from '../components/HealthMini'
import Avatar from '../components/Avatar'
import { displayName, useAppStore } from '../store/useAppStore'

// 이야기꾼 AI: 오른쪽 아래 둥근 버튼을 누르면 채팅창이 부드럽게 열리고, 다시 누르면 부드럽게 닫힌다.
// 창은 계속 렌더해 두고 클래스(open)만 바꿔서 CSS transition 으로 여닫는다 (대화도 그대로 유지).
function AgentWindow() {
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const [wide, setWide] = useState(false)               // 확대: 창이 화면을 꽉 채운다

  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') { if (wide) setWide(false); else setOpen(false) } }   // Esc: 확대부터 풀고, 다음에 닫는다
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, wide])

  if (pathname === '/agent') return null            // 전체 화면 AI 페이지에서는 숨김
  return (
    <>
      <section className={`chat-window ${open ? 'open' : ''} ${wide ? 'wide' : ''}`} role="dialog" aria-label="이야기꾼 AI" aria-hidden={!open}>
        <header className="chat-window-head">
          <span className="fw-bold d-flex align-items-center gap-2"><i className="bi bi-robot text-primary" />이야기꾼 AI {open && <AgentStatus poll />}</span>
          <span className="d-flex align-items-center gap-3">
            <Button variant="link" className="p-0 text-body-secondary" aria-label={wide ? '작게' : '크게'} title={wide ? '작게' : '크게'} onClick={() => setWide((v) => !v)}>
              <i className={`bi bi-${wide ? 'fullscreen-exit' : 'arrows-fullscreen'}`} />
            </Button>
            <Button variant="link" className="p-0 text-body-secondary" aria-label="닫기" onClick={() => { setOpen(false); setWide(false) }}>
              <i className="bi bi-x-lg" />
            </Button>
          </span>
        </header>
        <div className="flex-grow-1 overflow-hidden"><ChatPanel /></div>
      </section>
      <button type="button" className={`agent-fab ${open ? 'is-open' : ''} ${wide ? 'd-none' : ''}`} aria-label={open ? '이야기꾼 AI 닫기' : '이야기꾼 AI 열기'}
        onClick={() => setOpen((v) => !v)}>
        {!open && <span className="fab-tip">이야기꾼 AI에게 물어보기</span>}
        <i className="bi bi-robot fab-icon-robot" />
        <i className="bi bi-chevron-down fab-icon-close" />
      </button>
    </>
  )
}

// 사이트 대표 이미지(돌하르방, 배경을 투명하게 만든 PNG). 파일을 못 불러오면 예전의 달 아이콘이 대신 보인다
function BrandLogo() {
  const [failed, setFailed] = useState(false)
  if (failed) return <i className="bi bi-moon-stars-fill me-2 text-warning" />
  return <img src="/logo.png" alt="" className="brand-logo" onError={() => setFailed(true)} />
}

const TOAST_ICON = { success: 'check-circle-fill', danger: 'exclamation-triangle-fill', warning: 'exclamation-circle-fill', info: 'info-circle-fill', secondary: 'bell-fill', primary: 'info-circle-fill' }

export default function RootLayout() {
  const [theme, toggleTheme] = useTheme()
  const toasts = useAppStore((s) => s.toasts)
  const dismissToast = useAppStore((s) => s.dismissToast)
  const user = useAppStore((s) => s.user)
  const isAdmin = useAppStore((s) => s.isAdmin)
  const cartCount = useAppStore((s) => s.cart.reduce((n, c) => n + c.qty, 0))
  const initAuth = useAppStore((s) => s.initAuth)
  const signOut = useAppStore((s) => s.signOut)
  const pendingMap = useAppStore((s) => s.pendingMap)
  const clearPendingMap = useAppStore((s) => s.clearPendingMap)
  const selectMyth = useAppStore((s) => s.selectMyth)
  const tickSlot = useAppStore((s) => s.tickSlot)
  const slot = useAppStore((s) => s.slot)
  const notifsReady = useAppStore((s) => s.notifsReady)
  const notifPrefs = useAppStore((s) => s.notifPrefs)
  const weatherLoaded = useAppStore((s) => s.weather.제주시)       // 날씨가 도착하면 추천 장소를 날씨에 맞춰 만든다
  const favCount = useAppStore((s) => s.favorites.length)
  const loadWeather = useAppStore((s) => s.loadWeather)
  const runNotifier = useAppStore((s) => s.runNotifier)
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const close = () => setMenuOpen(false)

  // 앱이 켜질 때 한 번: 로그인 상태를 확인하고, 로그인돼 있으면 별·장바구니·주문을 미리 불러온다
  useEffect(() => { initAuth() }, [initAuth])
  useEffect(() => { captureInvite() }, [])                    // 주소의 ?invite=코드 를 기억해 둔다 (친구 초대 링크로 들어온 경우)

  // 알림: 시세가 바뀌거나(1분) 설정·찜·날씨가 바뀔 때 새 알림이 있는지 본다. 추천 장소는 날씨가 필요해서 먼저 불러온다
  useEffect(() => { if (user && notifPrefs.enabled && notifPrefs.place) loadWeather() }, [user, notifPrefs.enabled, notifPrefs.place, loadWeather])
  useEffect(() => { runNotifier() }, [runNotifier, slot, notifsReady, notifPrefs, weatherLoaded, favCount, user?.id])

  // 시세(1분)·재고(10분)가 바뀌는 시각을 넘겼는지 2초마다 확인
  useEffect(() => { const t = setInterval(tickSlot, 2000); return () => clearInterval(t) }, [tickSlot])

  // AI 가 "지도에서 보여 줘" 도구를 쓰면: 그 신화를 선택하고 탐라 지도로 이동 (지도가 그 장소로 다가간다)
  useEffect(() => {
    if (!pendingMap) return
    selectMyth(pendingMap)
    navigate('/map')
    clearPendingMap()
  }, [pendingMap, selectMyth, navigate, clearPendingMap])

  return (
    <div className="d-flex flex-column min-vh-100">
      <Navbar bg="primary" data-bs-theme="dark" sticky="top">
        <Container>
          {/* 일반 링크(href)라서 누르면 메인으로 가면서 페이지 전체를 새로 불러온다 (앱 상태도 처음으로) */}
          <Navbar.Brand href="/" className="fw-bold d-flex align-items-center">
            <BrandLogo />탐라신화 3D
          </Navbar.Brand>
          <div className="d-flex align-items-center gap-1">
            {user && <NotificationBell />}
            <Button as={Link} to="/cart" variant="outline-light" className="border-0 fs-4 py-0 px-2 position-relative" aria-label={`장바구니 ${cartCount}개`}>
              <i className="bi bi-cart3" />
              {cartCount > 0 && <Badge bg="warning" text="dark" pill className="position-absolute top-0 start-100 translate-middle fs-6">{cartCount}</Badge>}
            </Button>
            <Button variant="outline-light" className="border-0 fs-5 py-0 px-2" aria-label={theme === 'dark' ? '라이트 모드로' : '다크 모드로'} title={theme === 'dark' ? '라이트 모드' : '다크 모드'} onClick={toggleTheme}>
              <i className={`bi bi-${theme === 'dark' ? 'sun' : 'moon-stars'}`} />
            </Button>
            <Button variant="outline-light" className="border-0 fs-3 py-0 px-2" aria-label="메뉴 열기" onClick={() => setMenuOpen(true)}>
              <i className="bi bi-list" />
            </Button>
          </div>
        </Container>
      </Navbar>

      <Offcanvas show={menuOpen} onHide={close} placement="end">
        <Offcanvas.Header closeButton>
          <Offcanvas.Title className="fw-bold">메뉴</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body className="d-flex flex-column">
          {/* 프로필: 로그인 상태면 내 정보와 로그아웃, 아니면 로그인 안내 */}
          <div className="p-3 mb-3 rounded-3 bg-body-secondary">
            {user ? (
              <>
                <div className="d-flex align-items-center gap-3">
                  <Link to="/mypage" onClick={close} aria-label="마이페이지"><Avatar user={user} size={52} /></Link>
                  <div className="flex-grow-1 min-w-0">
                    <div className="d-flex align-items-center gap-2 min-w-0">
                      <span className="flex-shrink-0"><LevelBadge part="lv" /></span><AdminBadge />
                      <span className="fw-bold text-truncate">{displayName(user)}</span>
                    </div>
                    <div className="small text-body-secondary text-truncate">{user.email}</div>
                    <Button as={Link} to="/mypage" size="sm" variant="outline-primary" className="mt-1 py-0 text-nowrap" onClick={close}>
                      <i className="bi bi-person-circle me-1" />마이페이지
                    </Button>
                  </div>
                  <Button size="sm" variant="outline-secondary" className="text-nowrap flex-shrink-0"
                    onClick={() => { close(); signOut(); navigate('/') }}>로그아웃</Button>
                </div>
                {/* 등급은 카드 전체 폭을 써서 설명이 잘리지 않게 */}
                <div className="mt-3"><LevelBadge part="name" withProgress /></div>
              </>
            ) : (
              <div className="d-flex align-items-center gap-3">
                <i className="bi bi-person-circle fs-1 text-primary" />
                <div className="flex-grow-1">
                  <div className="small text-body-secondary mb-2">로그인하면 별자리·장바구니가 저장돼요</div>
                  <div className="d-flex gap-2">
                    <Button as={Link} to="/login" size="sm" className="text-nowrap" onClick={close}>로그인</Button>
                    <Button as={Link} to="/signup" size="sm" variant="outline-primary" className="text-nowrap" onClick={close}>회원가입</Button>
                  </div>
                </div>
              </div>
            )}
          </div>
          {/* 메뉴 목록: 카테고리(EXPLORE·SHOP·MY)로 묶고, 칸마다 구분선 */}
          <nav className="menu-list">
            {NAV_GROUPS.map((g) => (
              <div key={g.key} className="menu-group">
                <div className="menu-group-title">
                  <i className={`bi bi-${g.icon}`} /><span className="en">{g.en}</span><span className="ko">{g.label}</span>
                </div>
                {NAV_ITEMS.filter((item) => item.group === g.key && (!item.admin || isAdmin)).map((item) => (
                  <NavLink key={item.to} to={item.to} end={item.to === '/'} onClick={close} className="menu-row">
                    <i className={`bi bi-${item.icon}`} />
                    <span className="flex-grow-1">{item.label}</span>
                    {item.to === '/cart' && cartCount > 0 && <Badge bg="warning" text="dark" pill>{cartCount}</Badge>}
                    <i className="bi bi-chevron-right chev" />
                  </NavLink>
                ))}
              </div>
            ))}
          </nav>
          {menuOpen && <HealthMini />}
        </Offcanvas.Body>
      </Offcanvas>

      {/* 새 화면으로 가면 맨 위에서 시작하고, 뒤로 가기를 하면 원래 스크롤 위치로 돌아간다 */}
      <ScrollRestoration />

      <main className="flex-grow-1 py-4">
        <Container>
          <Outlet />
        </Container>
      </main>

      <footer className="py-3 border-top">
        <Container className="small text-body-secondary">
          제주대 청년도약 부트캠프 1기 · 탐라신화 3D · 데이터 출처: 한국관광공사 · 기상청 · 국가유산청 (공공데이터포털)
          · 로고 사진: <a href="https://pixabay.com/photos/figurine-souvenir-jeju-sculpture-6334639/" target="_blank" rel="noreferrer">Pixabay · jonleong64</a>
        </Container>
      </footer>

      <SideCard />
      <AgentWindow />

      {/* 알림: 맥북처럼 오른쪽 위에서 미끄러져 들어왔다가 나간다. 누르면 바로 닫힘 */}
      <div className="toast-stack" aria-live="polite">
        {toasts.map((t) => (
          <button type="button" key={t.id} className={`notif-toast ${t.variant} ${t.leaving ? 'leaving' : ''}`} onClick={() => dismissToast(t.id)}>
            <i className={`bi bi-${TOAST_ICON[t.variant] ?? 'info-circle-fill'}`} />
            <span className="flex-grow-1 text-start"><span key={t.count} className="toast-msg">{t.message}</span></span>
            {t.count > 1 && <span className="toast-count">×{t.count}</span>}
          </button>
        ))}
      </div>
    </div>
  )
}
