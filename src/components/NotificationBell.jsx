import { useState } from 'react'
import { Badge, Button, Offcanvas } from 'react-bootstrap'
import { Link, useNavigate } from 'react-router-dom'
import { ago } from '../lib/notify'
import { useAppStore } from '../store/useAppStore'

// 메뉴 막대의 종 모양 버튼 + 알림창. 추천 물건·장소·찜한 상품 소식을 모아서 보여준다
export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const { notifs, notifPrefs, setNotifPrefs, markNotifRead, markAllNotifsRead, clearNotifs, selectMyth } = useAppStore()
  const unread = notifs.filter((n) => !n.read).length
  const on = notifPrefs.enabled

  function openItem(n) {
    markNotifRead(n.id)
    if (n.mythId && n.to === '/map') selectMyth(n.mythId)          // 추천 장소 → 지도가 그 장소로 날아간다
    setOpen(false)
    navigate(n.to)
  }

  return (
    <>
      <Button variant="outline-light" className="border-0 fs-5 py-0 px-2 position-relative" aria-label={`알림 ${unread}개`} title="알림" onClick={() => setOpen(true)}>
        <i className={`bi bi-${on ? 'bell' : 'bell-slash'}`} />
        {on && unread > 0 && <Badge bg="danger" pill className="position-absolute top-0 start-100 translate-middle" style={{ fontSize: '.65rem' }}>{unread > 9 ? '9+' : unread}</Badge>}
      </Button>

      <Offcanvas show={open} onHide={() => setOpen(false)} placement="end" className="notif-panel">
        <Offcanvas.Header closeButton>
          <Offcanvas.Title className="fw-bold"><i className="bi bi-bell me-2" />알림</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body className="pt-0">
          <div className="d-flex align-items-center gap-2 mb-2 small">
            <Button size="sm" variant="link" className="p-0" disabled={!unread} onClick={markAllNotifsRead}>모두 읽음</Button>
            <span className="text-body-secondary">·</span>
            <Button size="sm" variant="link" className="p-0 text-danger" disabled={!notifs.length} onClick={clearNotifs}>비우기</Button>
            <Link to="/mypage?tab=notify" className="ms-auto text-decoration-none" onClick={() => setOpen(false)}><i className="bi bi-gear me-1" />알림 설정</Link>
          </div>

          {!on ? (
            <div className="text-center text-body-secondary py-5">
              <i className="bi bi-bell-slash fs-1" />
              <p className="mt-2">알림이 꺼져 있어요</p>
              <Button size="sm" onClick={() => setNotifPrefs({ enabled: true })}>알림 켜기</Button>
            </div>
          ) : notifs.length === 0 ? (
            <p className="text-center text-body-secondary py-5">아직 알림이 없어요. 곧 추천이 도착해요</p>
          ) : (
            <ul className="notif-list">
              {notifs.map((n) => (
                <li key={n.id}>
                  <button type="button" className={`notif-item ${n.read ? '' : 'unread'}`} onClick={() => openItem(n)}>
                    <span className="notif-emoji">{n.emoji}</span>
                    <span className="flex-grow-1 text-start">
                      <span className="d-flex align-items-center gap-2 mb-1">
                        <Badge bg={n.topic === 'place' ? 'success' : n.topic === 'surge' ? 'danger' : n.topic === 'order' ? 'warning' : 'primary'} text={n.topic === 'order' ? 'dark' : undefined} className="fw-normal">{n.tag}</Badge>
                        <span className="small text-body-secondary ms-auto">{ago(n.at)}</span>
                      </span>
                      <span className="d-block fw-bold lh-sm">{n.title}</span>
                      <span className="d-block small text-body-secondary">{n.body}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Offcanvas.Body>
      </Offcanvas>
    </>
  )
}
