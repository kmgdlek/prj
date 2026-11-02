import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Alert, Button, Card, Form, Nav } from 'react-bootstrap'
import PageHeader from '../components/PageHeader'
import { isSupabaseReady } from '../lib/supabase'
import { useAppStore } from '../store/useAppStore'

// 로그인 · 회원가입 한 화면 (탭으로 전환). 성공하면 원래 가려던 페이지로 돌아간다
export default function Login() {
  const { user, signIn, signUp, toast } = useAppStore()
  const navigate = useNavigate()
  const from = useLocation().state?.from ?? '/'
  const [mode, setMode] = useState('login')            // 'login' | 'signup'
  const [form, setForm] = useState({ email: '', password: '', nickname: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  if (user) return <Navigate to={from} replace />

  async function onSubmit(e) {
    e.preventDefault()
    setBusy(true); setError('')
    try {
      if (mode === 'login') {
        await signIn(form)
        toast('로그인했어요')
        navigate(from, { replace: true })
      } else {
        const { needsConfirm } = await signUp(form)
        if (needsConfirm) {
          toast('가입 완료! 메일함의 인증 링크를 누른 뒤 로그인하세요', 'info')
          setMode('login')
        } else {
          toast('가입하고 로그인했어요')
          navigate(from, { replace: true })
        }
      }
    } catch (err) {
      setError(
        /Invalid login/i.test(err.message) ? '이메일이나 비밀번호가 맞지 않아요'
        : /already registered/i.test(err.message) ? '이미 가입된 이메일이에요'
        : /Email not confirmed/i.test(err.message) ? '메일함의 인증 링크를 먼저 눌러 주세요'
        : err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto" style={{ maxWidth: 440 }}>
      <PageHeader icon="person-circle" title={mode === 'login' ? '로그인' : '회원가입'}
        subtitle="별자리·장바구니·주문이 내 계정에 저장돼요" />
      {!isSupabaseReady && <Alert variant="warning">Supabase 설정(.env.local)이 없어 로그인할 수 없어요</Alert>}
      <Card>
        <Card.Body>
          <Nav variant="pills" fill className="mb-3" activeKey={mode} onSelect={(k) => { setMode(k); setError('') }}>
            <Nav.Item><Nav.Link eventKey="login">로그인</Nav.Link></Nav.Item>
            <Nav.Item><Nav.Link eventKey="signup">회원가입</Nav.Link></Nav.Item>
          </Nav>
          <Form onSubmit={onSubmit}>
            {mode === 'signup' && (
              <Form.Group className="mb-3">
                <Form.Label>닉네임</Form.Label>
                <Form.Control required maxLength={20} value={form.nickname} onChange={set('nickname')} placeholder="화면에 보일 이름" />
              </Form.Group>
            )}
            <Form.Group className="mb-3">
              <Form.Label>이메일</Form.Label>
              <Form.Control required type="email" autoComplete="email" value={form.email} onChange={set('email')} placeholder="you@example.com" />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>비밀번호</Form.Label>
              <Form.Control required type="password" minLength={6} autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                value={form.password} onChange={set('password')} placeholder="6자 이상" />
            </Form.Group>
            {error && <Alert variant="danger" className="py-2">{error}</Alert>}
            <Button type="submit" className="w-100" disabled={busy || !isSupabaseReady}>
              {busy ? '처리 중...' : mode === 'login' ? '로그인' : '가입하기'}
            </Button>
          </Form>
        </Card.Body>
      </Card>
    </div>
  )
}
