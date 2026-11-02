import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Badge, Button, Container, Navbar, Offcanvas, Toast, ToastContainer } from 'react-bootstrap'
import ChatPanel from '../components/ChatPanel'
import { NAV_ITEMS } from '../router'
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

  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  if (pathname === '/agent') return null            // 전체 화면 AI 페이지에서는 숨김
  return (
    <>
      <section className={`chat-window ${open ? 'open' : ''}`} role="dialog" aria-label="이야기꾼 AI" aria-hidden={!open}>
        <header className="chat-window-head">
          <span className="fw-bold d-flex align-items-center gap-2"><i className="bi bi-robot text-primary" />이야기꾼 AI {open && <AgentStatus poll />}</span>
          <Button variant="link" className="p-0 text-body-secondary" aria-label="닫기" onClick={() => setOpen(false)}>
            <i className="bi bi-x-lg" />
          </Button>
        </header>
        <div className="flex-grow-1 overflow-hidden"><ChatPanel /></div>
      </section>
      <button type="button" className={`agent-fab ${open ? 'is-open' : ''}`} aria-label={open ? '이야기꾼 AI 닫기' : '이야기꾼 AI 열기'}
        onClick={() => setOpen((v) => !v)}>
        {!open && <span className="fab-tip">이야기꾼 AI에게 물어보기</span>}
        <i className="bi bi-robot fab-icon-robot" />
        <i className="bi bi-chevron-down fab-icon-close" />
      </button>
    </>
  )
}

export default function RootLayout() {
  const toasts = useAppStore((s) => s.toasts)
  const user = useAppStore((s) => s.user)
  const cartCount = useAppStore((s) => s.cart.reduce((n, c) => n + c.qty, 0))
  const initAuth = useAppStore((s) => s.initAuth)
  const signOut = useAppStore((s) => s.signOut)
  const pendingMap = useAppStore((s) => s.pendingMap)
  const clearPendingMap = useAppStore((s) => s.clearPendingMap)
  const selectMyth = useAppStore((s) => s.selectMyth)
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const close = () => setMenuOpen(false)

  // 앱이 켜질 때 한 번: 로그인 상태를 확인하고, 로그인돼 있으면 별·장바구니·주문을 미리 불러온다
  useEffect(() => { initAuth() }, [initAuth])

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
          <Navbar.Brand as={NavLink} to="/" className="fw-bold">
            <i className="bi bi-moon-stars-fill me-2 text-warning" />탐라신화 3D
          </Navbar.Brand>
          <div className="d-flex align-items-center gap-1">
            <Button as={Link} to="/cart" variant="outline-light" className="border-0 fs-4 py-0 px-2 position-relative" aria-label={`장바구니 ${cartCount}개`}>
              <i className="bi bi-cart3" />
              {cartCount > 0 && <Badge bg="warning" text="dark" pill className="position-absolute top-0 start-100 translate-middle fs-6">{cartCount}</Badge>}
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
                      <span className="flex-shrink-0"><LevelBadge part="lv" /></span>
                      <span className="fw-bold text-truncate">{displayName(user)}</span>
                    </div>
                    <div className="small text-body-secondary text-truncate">{user.email}</div>
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
          {/* 메뉴 목록: 칸마다 구분선 */}
          <nav className="menu-list">
            {[...NAV_ITEMS.filter((item) => item.to !== '/agent'), { to: '/cart', label: '장바구니', icon: 'cart3' }].map((item) => (
              <NavLink key={item.to} to={item.to} end={item.to === '/'} onClick={close} className="menu-row">
                <i className={`bi bi-${item.icon}`} />
                <span className="flex-grow-1">{item.label}</span>
                {item.to === '/cart' && cartCount > 0 && <Badge bg="warning" text="dark" pill>{cartCount}</Badge>}
                <i className="bi bi-chevron-right chev" />
              </NavLink>
            ))}
          </nav>
          {menuOpen && <HealthMini />}
        </Offcanvas.Body>
      </Offcanvas>

      <main className="flex-grow-1 py-4">
        <Container>
          <Outlet />
        </Container>
      </main>

      <footer className="py-3 border-top">
        <Container className="small text-body-secondary">
          제주대 청년도약 부트캠프 1기 · 탐라신화 3D · 데이터 출처: 한국관광공사 · 기상청 · 국가유산청 (공공데이터포털)
        </Container>
      </footer>

      <SideCard />
      <AgentWindow />

      {/* 오른쪽 아래 AI 버튼과 겹치지 않도록 알림은 아래 가운데에 */}
      <ToastContainer position="bottom-center" className="p-3 position-fixed">
        {toasts.map((t) => (
          <Toast key={t.id} bg={t.variant}>
            <Toast.Body className="text-white">{t.message}</Toast.Body>
          </Toast>
        ))}
      </ToastContainer>
    </div>
  )
}
