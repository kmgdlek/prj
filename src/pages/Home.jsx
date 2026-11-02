import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge, Button, Card, Col, Row } from 'react-bootstrap'
import { ping } from '../api/client'
import { isSupabaseReady, supabase } from '../lib/supabase'
import { displayName, useAppStore } from '../store/useAppStore'
import { MYTHS } from '../../server/myths'
import Scene from '../components/Scene'
import WeatherBadge from '../components/WeatherBadge'
import LevelBadge from '../components/LevelBadge'

const MARKERS = MYTHS.map((m) => ({ id: m.id, name: m.title, lat: m.lat, lng: m.lng, color: m.color }))

// 홈 = 3D 신화 지도 + "동작 체크" 대시보드
export default function Home() {
  const { user, selectedMythId, selectMyth } = useAppStore()
  const myth = MYTHS.find((m) => m.id === selectedMythId)
  const [db, setDb] = useState(isSupabaseReady
    ? { state: 'wait', msg: '확인 중...' }
    : { state: 'fail', msg: '.env.local 에 VITE_SUPABASE_URL / ANON_KEY 를 넣으세요' })
  const [api, setApi] = useState({ state: 'wait', msg: '확인 중...' })

  // 홈에 올 때마다 선택을 비워서, 항상 섬 전체가 보이는 처음 모습으로 시작한다
  useEffect(() => { selectMyth(null) }, [selectMyth])

  useEffect(() => {
    if (isSupabaseReady) supabase.from('favorites').select('id').limit(1).then(({ error }) =>
      setDb(error ? { state: 'fail', msg: error.message } : { state: 'ok', msg: '연결 OK' }))
    ping()
      .then((d) => setApi({ state: 'ok', msg: `OK · 공공데이터 키 ${d.hasDataKey ? '있음' : '없음'} · Claude 키 ${d.hasClaudeKey ? '있음' : '없음'}` }))
      .catch(() => setApi({ state: 'fail', msg: 'npm run dev 가 아니라 vercel dev 로 실행했는지 확인' }))
  }, [])

  return (
    <>
      <section className="mb-4">
        <Badge bg="warning" text="dark" className="mb-2">제주 콘텐츠·문화 IP</Badge>
        <h1 className="fw-bold display-5 hero-title">설문대할망의 섬, 탐라신화 3D</h1>
        <p className="lead text-body-secondary">
          치마폭의 흙으로 한라산을 쌓은 여신과 1만 8천 신의 이야기를, 돌려 보고 눌러 보는 3D 섬 위에서 만나 보세요.
        </p>
        <WeatherBadge place="서귀포시" /> <WeatherBadge place="제주시" />
      </section>

      <Row className="g-3 mb-4">
        <Col md={6}>
          <Scene height={320} items={MARKERS} selectedId={selectedMythId} onSelect={(m) => selectMyth(m.id)} autoRotate />
        </Col>
        <Col md={6}>
          <div className="scene-info rounded-4 p-3 h-100">
            {myth ? (
              <>
                <div className="d-flex justify-content-between align-items-start">
                  <h5 className="fw-bold mb-1"><span className="myth-dot me-2" style={{ background: myth.color, color: myth.color }} />{myth.title}</h5>
                  <Button size="sm" variant="link" className="p-0 text-body-secondary" aria-label="선택 해제 · 전체 보기" onClick={() => selectMyth(null)}><i className="bi bi-x-lg" /></Button>
                </div>
                <div className="small text-primary mb-2"><i className="bi bi-geo-alt me-1" />{myth.place}</div>
                <p className="mb-2">{myth.summary}</p>
                <Button as={Link} to="/myths" size="sm" variant="outline-primary">이야기 전체 보기 <i className="bi bi-arrow-right" /></Button>
              </>
            ) : (
              <div className="d-flex flex-column justify-content-center h-100">
                <h5 className="fw-bold"><i className="bi bi-hand-index me-2" />빛나는 구슬을 눌러 보세요</h5>
                <p className="text-body-secondary mb-0">구슬을 누르면 그 신화가 열리고 지도가 그쪽으로 다가갑니다. 드래그로 회전하고, 지도를 클릭한 뒤 휠로 확대할 수 있어요. X를 누르면 전체 보기로 돌아옵니다.</p>
              </div>
            )}
          </div>
        </Col>
      </Row>

      <h5 className="fw-bold mb-3"><i className="bi bi-clipboard-check me-2" />동작 체크</h5>
      <Row xs={1} md={3} className="g-3">
        <Col><Check title="React · 라우터" state="ok" msg="이 화면이 보이면 OK" /></Col>
        <Col><Check title="Supabase" {...db} /></Col>
        <Col><Check title="서버 함수 /api" {...api} /></Col>
      </Row>

      <Card className="mt-4">
        <Card.Body className="d-flex align-items-center gap-3 flex-wrap">
          <i className="bi bi-person-circle fs-2 text-primary" />
          <div className="flex-grow-1">
            <Card.Title className="fs-6 fw-bold mb-0 d-flex align-items-center gap-2">
              {user && <LevelBadge part="lv" />}
              {user ? `${displayName(user)}님, 환영해요` : '로그인하고 별자리와 장바구니를 만들어 보세요'}
            </Card.Title>
            <small className="text-body-secondary">{user ? user.email : 'Supabase Auth · 이메일로 가입'}</small>
            {user && <div className="mt-1"><LevelBadge part="name" /></div>}
          </div>
          {!user && <Button as={Link} to="/login" size="sm">로그인 · 회원가입</Button>}
        </Card.Body>
      </Card>
    </>
  )
}

function Check({ title, state, msg }) {
  const icon = { ok: 'check-circle-fill text-success', fail: 'x-circle-fill text-danger', wait: 'hourglass-split text-muted' }[state]
  return (
    <Card className="h-100">
      <Card.Body>
        <div className="fw-bold mb-1"><i className={`bi bi-${icon} me-2`} />{title}</div>
        <div className="small text-body-secondary">{msg}</div>
      </Card.Body>
    </Card>
  )
}
