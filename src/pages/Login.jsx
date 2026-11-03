import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Alert, Button, Card, Form } from 'react-bootstrap'
import PageHeader from '../components/PageHeader'
import { isSupabaseReady } from '../lib/supabase'
import { authErrorMessage } from '../lib/authError'
import { useAppStore } from '../store/useAppStore'

// 로그인 전용 화면. 성공하면 원래 가려던 페이지로 돌아간다 (회원가입은 /signup 에서)
export default function Login() {
  const { user, signIn, toast } = useAppStore()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from ?? '/'
  const [form, setForm] = useState({ email: '', password: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  if (user) return <Navigate to={from} replace />

  async function onSubmit(e) {
    e.preventDefault()
    setBusy(true); setError('')
    try {
      await signIn(form)
      toast('로그인했어요')
      navigate(from, { replace: true })
    } catch (err) {
      setError(authErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto auth-wrap" style={{ maxWidth: 440 }}>
      <PageHeader icon="box-arrow-in-right" title="로그인" subtitle="별자리·장바구니·주문이 내 계정에 저장돼요" />
      {!isSupabaseReady && <Alert variant="warning">Supabase 설정(.env.local)이 없어 로그인할 수 없어요</Alert>}
      <Card className="auth-card">
        <Card.Body>
          <Form onSubmit={onSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>이메일</Form.Label>
              <Form.Control required type="email" autoComplete="email" value={form.email} onChange={set('email')} placeholder="you@example.com" />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>비밀번호</Form.Label>
              <Form.Control required type="password" autoComplete="current-password" value={form.password} onChange={set('password')} />
            </Form.Group>
            {error && <Alert variant="danger" className="py-2">{error}</Alert>}
            <Button type="submit" className="w-100" disabled={busy || !isSupabaseReady}>{busy ? '로그인 중...' : '로그인'}</Button>
          </Form>
        </Card.Body>
      </Card>
      <p className="text-center mt-3 mb-0 small">
        아직 계정이 없나요? <Link to="/signup" state={{ from }}>회원가입</Link>
      </p>
    </div>
  )
}
