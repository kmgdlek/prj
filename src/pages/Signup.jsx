import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Alert, Button, Card, Form } from 'react-bootstrap'
import PageHeader from '../components/PageHeader'
import { isSupabaseReady } from '../lib/supabase'
import { authErrorMessage } from '../lib/authError'
import { useAppStore } from '../store/useAppStore'

// 회원가입 전용 화면 (로그인은 /login). 이메일 인증을 켜 둔 프로젝트면 가입 뒤 로그인 화면으로 보낸다
export default function Signup() {
  const { user, signUp, toast } = useAppStore()
  const navigate = useNavigate()
  const from = useLocation().state?.from ?? '/'
  const [form, setForm] = useState({ nickname: '', email: '', password: '', password2: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  if (user) return <Navigate to={from} replace />

  async function onSubmit(e) {
    e.preventDefault()
    if (form.password !== form.password2) return setError('비밀번호가 서로 달라요')
    setBusy(true); setError('')
    try {
      const { needsConfirm } = await signUp(form)
      if (needsConfirm) {
        toast('가입 완료! 메일함의 인증 링크를 누른 뒤 로그인하세요', 'info')
        navigate('/login', { replace: true, state: { from } })
      } else {
        toast('가입하고 로그인했어요')
        navigate(from, { replace: true })
      }
    } catch (err) {
      setError(authErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto" style={{ maxWidth: 440 }}>
      <PageHeader icon="person-plus" title="회원가입" subtitle="가입하면 별자리·장바구니·주문을 저장할 수 있어요" />
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
