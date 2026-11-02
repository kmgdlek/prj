import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Alert, Button, Card, Form } from 'react-bootstrap'
import PageHeader from '../components/PageHeader'
import { isSupabaseReady } from '../lib/supabase'
import { authErrorMessage } from '../lib/authError'
import { useAppStore } from '../store/useAppStore'
import { INVITEE_COUPON, getSavedInvite } from '../lib/invite'

// 회원가입 전용 화면 (로그인은 /login). 가입하면 '가입 완료' 화면을 보여 준다:
// 이메일 인증을 켜 둔 프로젝트면 인증 메일 안내(다시 보내기 포함), 꺼 둔 프로젝트면 바로 환영 + 갈 곳 안내
export default function Signup() {
  const { user, signUp, resendConfirm, toast } = useAppStore()
  const navigate = useNavigate()
  const from = useLocation().state?.from ?? '/'
  const [form, setForm] = useState({ nickname: '', email: '', password: '', password2: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(null)             // 가입 완료 정보 { needsConfirm, email, nickname }
  const [wait, setWait] = useState(0)                // 인증 메일 다시 보내기 대기 초
  useEffect(() => {
    if (wait <= 0) return
    const t = setTimeout(() => setWait((w) => w - 1), 1000)
    return () => clearTimeout(t)
  }, [wait])
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  if (done) return <Done done={done} from={from} wait={wait} onResend={resend} />
  if (user && !busy) return <Navigate to={from} replace />          // 가입 처리 중에는 로그인 상태가 먼저 바뀌어도 이동하지 않는다 (완료 화면을 보여 주려고)

  async function onSubmit(e) {
    e.preventDefault()
    if (form.password !== form.password2) return setError('비밀번호가 서로 달라요')
    setBusy(true); setError('')
    try {
      const { needsConfirm } = await signUp(form)
      if (!needsConfirm) { navigate('/welcome', { replace: true }); return }       // 인증 없이 바로 가입 → 가입 완료 페이지
      setDone({ needsConfirm, email: form.email.trim(), nickname: form.nickname.trim() })
      setWait(60)
    } catch (err) {
      setError(authErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function resend() {
    try { await resendConfirm(done.email); setWait(60); toast('인증 메일을 다시 보냈어요', 'info') }
    catch (err) { toast(authErrorMessage(err), 'danger') }
  }

  return (
    <div className="mx-auto" style={{ maxWidth: 440 }}>
      <PageHeader icon="person-plus" title="회원가입" subtitle="가입하면 별자리·장바구니·주문을 저장할 수 있어요" />
      {getSavedInvite() && <Alert variant="success" className="py-2 small"><i className="bi bi-gift me-1" />친구 초대로 오셨네요! 가입하고 처음 로그인하면 <b>{INVITEE_COUPON.title}</b>을 드려요.</Alert>}
      {!isSupabaseReady && <Alert variant="warning">Supabase 설정(.env.local)이 없어 가입할 수 없어요</Alert>}
      <Card>
        <Card.Body>
          <Form onSubmit={onSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>닉네임</Form.Label>
              <Form.Control required maxLength={20} value={form.nickname} onChange={set('nickname')} placeholder="화면에 보일 이름" />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>이메일</Form.Label>
              <Form.Control required type="email" autoComplete="email" value={form.email} onChange={set('email')} placeholder="you@example.com" />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>비밀번호</Form.Label>
              <Form.Control required type="password" minLength={6} autoComplete="new-password" value={form.password} onChange={set('password')} placeholder="6자 이상" />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>비밀번호 확인</Form.Label>
              <Form.Control required type="password" minLength={6} autoComplete="new-password" value={form.password2} onChange={set('password2')} />
            </Form.Group>
            {error && <Alert variant="danger" className="py-2">{error}</Alert>}
            <Button type="submit" className="w-100" disabled={busy || !isSupabaseReady}>{busy ? '가입 중...' : '가입하기'}</Button>
          </Form>
        </Card.Body>
      </Card>
      <p className="text-center mt-3 mb-0 small">
        이미 계정이 있나요? <Link to="/login" state={{ from }}>로그인</Link>
      </p>
    </div>
  )
}

// 가입 완료 화면
function Done({ done, from, wait, onResend }) {
  return (
    <div className="mx-auto text-center" style={{ maxWidth: 480 }}>
      <Card><Card.Body className="py-5 px-4">
        <i className="bi bi-envelope-check display-3 text-success" />
        <h3 className="fw-bold mt-3">가입 신청 완료! 메일을 확인해 주세요</h3>
        <p className="text-body-secondary mb-3"><b>{done.email}</b> 로 인증 메일을 보냈어요.</p>
            <ol className="text-start small mx-auto mb-4" style={{ maxWidth: 340 }}>
              <li>메일함을 열어요 (안 보이면 스팸함도 확인)</li>
              <li>메일 안의 <b>인증 링크</b>를 눌러요</li>
              <li>가입 완료 페이지가 열리면 끝!</li>
            </ol>
            <div className="d-grid gap-2">
              <Button as={Link} to="/login" state={{ from }}>로그인하러 가기</Button>
              <Button variant="outline-secondary" disabled={wait > 0} onClick={onResend}>{wait > 0 ? `인증 메일 다시 보내기 (${wait}초 뒤)` : '인증 메일 다시 보내기'}</Button>
            </div>
      </Card.Body></Card>
    </div>
  )
}
