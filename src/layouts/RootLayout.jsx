import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { Button, Container, Form, Nav, Navbar, Offcanvas, Toast, ToastContainer } from 'react-bootstrap'
import ChatPanel from '../components/ChatPanel'
import { NAV_ITEMS } from '../router'
import { useAppStore } from '../store/useAppStore'

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
          <span className="fw-bold"><i className="bi bi-robot me-2 text-primary" />이야기꾼 AI</span>
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
  const nickname = useAppStore((s) => s.nickname)
  const setNickname = useAppStore((s) => s.setNickname)
  const loadFavorites = useAppStore((s) => s.loadFavorites)
  const [menuOpen, setMenuOpen] = useState(false)
  const close = () => setMenuOpen(false)

  // 별 버튼이 어느 페이지에서든 저장 여부를 보여 주도록, 닉네임이 정해지면 즐겨찾기를 미리 불러온다
  useEffect(() => { loadFavorites({ quiet: true }) }, [nickname, loadFavorites])

  return (
    <div className="d-flex flex-column min-vh-100">
      <Navbar bg="primary" data-bs-theme="dark" sticky="top">
        <Container>
          <Navbar.Brand as={NavLink} to="/" className="fw-bold">
            <i className="bi bi-moon-stars-fill me-2 text-warning" />탐라신화 3D
          </Navbar.Brand>
          {/* 모든 화면에서 오른쪽 세 줄 버튼 하나로 메뉴를 연다 */}
          <Button variant="outline-light" className="border-0 fs-3 py-0 px-2" aria-label="메뉴 열기" onClick={() => setMenuOpen(true)}>
            <i className="bi bi-list" />
          </Button>
        </Container>
      </Navbar>

      <Offcanvas show={menuOpen} onHide={close} placement="end">
        <Offcanvas.Header closeButton>
          <Offcanvas.Title className="fw-bold">메뉴</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body className="d-flex flex-column">
          {/* 프로필: 닉네임이 메뉴 안에 있다 (즐겨찾기를 구분하는 이름) */}
          <div className="d-flex align-items-center gap-3 p-3 mb-3 rounded-3 bg-body-secondary">
            <i className="bi bi-person-circle fs-1 text-primary" />
            <div className="flex-grow-1">
              <div className="small text-body-secondary">{nickname ? '내 닉네임' : '닉네임을 정해 주세요'}</div>
              <Form.Control size="sm" placeholder="닉네임" value={nickname} onChange={(e) => setNickname(e.target.value)} />
            </div>
          </div>
          <Nav className="flex-column">
            {NAV_ITEMS.filter((item) => item.to !== '/agent').map((item) => (
              <Nav.Link key={item.to} as={NavLink} to={item.to} end={item.to === '/'} onClick={close} className="fs-5 py-2">
                <i className={`bi bi-${item.icon} me-2`} />{item.label}
              </Nav.Link>
            ))}
          </Nav>
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
