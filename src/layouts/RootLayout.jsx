import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { Button, Container, Form, Nav, Navbar, Offcanvas, Toast, ToastContainer } from 'react-bootstrap'
import { NAV_ITEMS } from '../router'
import { useAppStore } from '../store/useAppStore'

// 이야기꾼 AI 는 메뉴가 아니라 오른쪽 아래 둥근 버튼으로 (AI 화면에서는 숨김)
function AgentFab() {
  const { pathname } = useLocation()
  if (pathname === '/agent') return null
  return (
    <Link to="/agent" className="agent-fab" aria-label="이야기꾼 AI">
      <span className="fab-tip">이야기꾼 AI에게 물어보기</span>
      <i className="bi bi-robot" />
    </Link>
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
      <Navbar bg="dark" data-bs-theme="dark" sticky="top" className="border-bottom border-primary-subtle">
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

      <Offcanvas show={menuOpen} onHide={close} placement="end" data-bs-theme="dark">
        <Offcanvas.Header closeButton>
          <Offcanvas.Title className="fw-bold">메뉴</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body className="d-flex flex-column">
          {/* 프로필: 닉네임이 메뉴 안에 있다 (즐겨찾기를 구분하는 이름) */}
          <div className="d-flex align-items-center gap-3 p-3 mb-3 rounded-3 bg-body-secondary">
            <i className="bi bi-person-circle fs-1 text-warning" />
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

      <footer className="py-3 border-top border-secondary-subtle">
        <Container className="small text-body-secondary">
          제주대 청년도약 부트캠프 1기 · 탐라신화 3D · 데이터 출처: 한국관광공사 · 기상청 · 국가유산청 (공공데이터포털)
        </Container>
      </footer>

      <AgentFab />

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
