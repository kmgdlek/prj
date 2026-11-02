import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge, Button, Card, Col, Form, InputGroup, ProgressBar, Row } from 'react-bootstrap'
import PageHeader from '../components/PageHeader'
import { useAppStore } from '../store/useAppStore'
import { FRIEND_COUPON, INVITEE_COUPON, MAX_REWARDED, THREE_COUPON, inviteCodeOf, inviteLinkOf } from '../lib/invite'
import { won } from '../lib/format'

// 친구 초대: 내 초대 링크와 QR 코드. 친구가 이 링크로 가입하면 친구는 환영 쿠폰, 나는 감사 쿠폰을 받는다
export default function Invite() {
  const { user, invites, loadInvites, toast } = useAppStore()
  const code = inviteCodeOf(user)
  const link = user ? inviteLinkOf(code) : `${window.location.origin}/`
  const [qr, setQr] = useState('')

  useEffect(() => { loadInvites() }, [loadInvites, user?.id])

  // 내 링크가 담긴 QR 을 이 화면에서 바로 만든다 (로그아웃 상태면 사이트 주소 QR 그림을 그대로 보여 준다)
  useEffect(() => {
    let alive = true
    if (!user) { setQr('/images/qr.png'); return }
    import('qrcode')
      .then(({ default: QR }) => QR.toDataURL(link, { width: 480, margin: 3, errorCorrectionLevel: 'M', color: { dark: '#000000', light: '#ffffff' } }))
      .then((url) => alive && setQr(url))
      .catch(() => alive && setQr('/images/qr.png'))
    return () => { alive = false }
  }, [user, link])

  async function copy() {
    try { await navigator.clipboard.writeText(link); toast('초대 링크를 복사했어요') }
    catch { window.prompt('아래 링크를 복사하세요', link) }
  }
  async function share() {
    try { await navigator.share({ title: '탐라신화 3D', text: '설문대할망의 섬, 탐라신화 3D에 놀러 와요! 이 링크로 가입하면 쿠폰을 받아요 🎁', url: link }) }
    catch { /* 공유 창을 닫은 경우 */ }
  }

  const n = invites.length
  const rewardedN = Math.min(n, MAX_REWARDED)

  return (
    <>
      <PageHeader icon="person-plus" title="친구 초대" subtitle="내 링크로 친구가 가입하면 친구는 환영 쿠폰, 나는 감사 쿠폰을 받아요" />
      <Row className="g-4">
        <Col md={5} lg={4}>
          <Card className="text-center h-100"><Card.Body className="d-flex flex-column align-items-center">
            <div className="invite-qr mb-2">{qr ? <img src={qr} alt="친구 초대 QR 코드" width="220" height="220" /> : <div className="text-body-secondary small p-5">QR 만드는 중…</div>}</div>
            <div className="small text-body-secondary mb-3">친구가 휴대폰 카메라로 스캔하면 가입 화면으로 와요</div>
            {user ? (
              <>
                <div className="small text-body-secondary">내 초대 코드</div>
                <div className="fs-4 fw-bold font-monospace mb-2">{code}</div>
                <a className="btn btn-outline-secondary btn-sm" href={qr} download={`tamra-invite-${code}.png`}><i className="bi bi-download me-1" />QR 저장</a>
              </>
            ) : <a className="btn btn-outline-secondary btn-sm" href="/images/qr.png" download="tamra-qr.png"><i className="bi bi-download me-1" />QR 저장</a>}
          </Card.Body></Card>
        </Col>

        <Col md={7} lg={8}>
          {user ? (
            <Card className="mb-3"><Card.Body>
              <h6 className="fw-bold mb-2"><i className="bi bi-link-45deg me-1 text-primary" />내 초대 링크</h6>
              <InputGroup className="mb-2">
                <Form.Control readOnly value={link} onFocus={(e) => e.target.select()} aria-label="초대 링크" />
                <Button onClick={copy}><i className="bi bi-clipboard me-1" />복사</Button>
              </InputGroup>
              {typeof navigator.share === 'function' && <Button variant="outline-primary" size="sm" onClick={share}><i className="bi bi-share me-1" />친구에게 공유하기</Button>}
            </Card.Body></Card>
          ) : (
            <Card className="mb-3"><Card.Body>
              <h6 className="fw-bold mb-1">로그인하면 내 초대 링크를 받아요</h6>
              <p className="small text-body-secondary mb-2">지금 보이는 QR 은 사이트 주소예요. 로그인하면 내 초대 코드가 들어간 링크와 QR 이 만들어져서, 친구가 가입하면 나도 쿠폰을 받아요.</p>
              <Button as={Link} to="/login" state={{ from: '/invite' }} size="sm">로그인하기</Button>
            </Card.Body></Card>
          )}

          <Card className="mb-3"><Card.Body>
            <h6 className="fw-bold mb-3"><i className="bi bi-gift me-1 text-primary" />받는 선물</h6>
            <div className="d-flex align-items-start gap-3 mb-3">
              <Badge bg="primary" className="mt-1">친구</Badge>
              <div><div className="fw-bold">{INVITEE_COUPON.title}</div><div className="small text-body-secondary">내 링크로 가입하고 처음 로그인하면 쿠폰함으로 와요 · {won(INVITEE_COUPON.min)} 이상 주문 시</div></div>
            </div>
            <div className="d-flex align-items-start gap-3 mb-3">
              <Badge bg="success" className="mt-1">나</Badge>
              <div><div className="fw-bold">{FRIEND_COUPON.title}</div><div className="small text-body-secondary">친구 1명이 가입할 때마다 · 최대 {MAX_REWARDED}명 · {won(FRIEND_COUPON.min)} 이상 주문 시</div></div>
            </div>
            <div className="d-flex align-items-start gap-3">
              <Badge bg="success" className="mt-1">나</Badge>
              <div><div className="fw-bold">{THREE_COUPON.title}</div><div className="small text-body-secondary">친구 3명이 가입하면 보너스 · {won(THREE_COUPON.min)} 이상 주문 시</div></div>
            </div>
          </Card.Body></Card>

          {user && (
            <Card><Card.Body>
              <div className="d-flex align-items-baseline justify-content-between mb-2">
                <h6 className="fw-bold mb-0"><i className="bi bi-people me-1 text-primary" />내가 초대한 친구</h6>
                <span className="fs-4 fw-bold">{n}<small className="fs-6 text-body-secondary fw-normal">명</small></span>
              </div>
              <ProgressBar now={(rewardedN / MAX_REWARDED) * 100} variant="success" className="mb-1" />
              <div className="small text-body-secondary">{rewardedN >= MAX_REWARDED ? '감사 쿠폰을 모두 받았어요!' : `${MAX_REWARDED - rewardedN}명 더 초대하면 감사 쿠폰을 더 받아요 (받은 쿠폰 ${rewardedN}장)`}</div>
              <Button as={Link} to="/mypage?tab=coupons" variant="link" size="sm" className="px-0 mt-1">쿠폰함 보기 <i className="bi bi-chevron-right" /></Button>
            </Card.Body></Card>
          )}
        </Col>
      </Row>
    </>
  )
}
