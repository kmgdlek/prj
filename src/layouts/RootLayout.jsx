import { useEffect } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { Container, Nav, Navbar, Toast, ToastContainer } from 'react-bootstrap'
import { NAV_ITEMS } from '../router'
import { useAppStore } from '../store/useAppStore'

export default function RootLayout() {
  const toasts = useAppStore((s) => s.toasts)
  const nickname = useAppStore((s) => s.nickname)
  const loadFavorites = useAppStore((s) => s.loadFavorites)

  // 별 버튼이 어느 페이지에서든 저장 여부를 보여 주도록, 닉네임이 정해지면 즐겨찾기를 미리 불러온다
  useEffect(() => { loadFavorites({ quiet: true }) }, [nickname, loadFavorites])

  return (
    <div className="d-flex flex-column min-vh-100">
      <Navbar expand="lg" bg="dark" data-bs-theme="dark" collapseOnSelect sticky="top" className="border-bottom border-primary-subtle">
        <Container>
          <Navbar.Brand as={NavLink} to="/" className="fw-bold">
            <i className="bi bi-moon-stars-fill me-2 text-warning" />탐라신화 3D
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="main-nav" />
          <Navbar.Collapse id="main-nav">
            <Nav className="me-auto">
              {NAV_ITEMS.map((item) => (
                <Nav.Link key={item.to} as={NavLink} to={item.to} end={item.to === '/'} eventKey={item.to}>
                  <i className={`bi bi-${item.icon} me-1`} />{item.label}
                </Nav.Link>
              ))}
            </Nav>
            {nickname && <Navbar.Text><i className="bi bi-person-circle me-1" />{nickname}</Navbar.Text>}
          </Navbar.Collapse>
        </Container>
      </Navbar>

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

      <ToastContainer position="bottom-end" className="p-3 position-fixed">
        {toasts.map((t) => (
          <Toast key={t.id} bg={t.variant}>
            <Toast.Body className="text-white">{t.message}</Toast.Body>
          </Toast>
        ))}
      </ToastContainer>
    </div>
  )
}
