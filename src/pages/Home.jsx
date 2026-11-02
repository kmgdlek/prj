import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge, Button, Card, Col, Form, Row } from 'react-bootstrap'
import { ping } from '../api/client'
import { isSupabaseReady, supabase } from '../lib/supabase'
import { useAppStore } from '../store/useAppStore'
import { MYTHS } from '../../server/myths'
import Scene from '../components/Scene'
import WeatherBadge from '../components/WeatherBadge'

const MARKERS = MYTHS.map((m) => ({ id: m.id, name: m.title, lat: m.lat, lng: m.lng, color: m.color }))

// 홈 = 3D 신화 지도 + "동작 체크" 대시보드
export default function Home() {
  const { nickname, setNickname, selectedMythId, selectMyth } = useAppStore()
  const myth = MYTHS.find((m) => m.id === selectedMythId)
  const [db, setDb] = useState(isSupabaseReady
    ? { state: 'wait', msg: '확인 중...' }
    : { state: 'fail', msg: '.env.local 에 VITE_SUPABASE_URL / ANON_KEY 를 넣으세요' })
  const [api, setApi] = useState({ state: 'wait', msg: '확인 중...' })

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

      <div className="position-relative mb-4">
        <Scene height={520} items={MARKERS} selectedId={selectedMythId} onSelect={(m) => selectMyth(m.id)} autoRotate />
        {myth ? (
          <div className="scene-overlay">
            <div className="d-flex justify-content-between align-items-start">
              <h5 className="fw-bold mb-1"><span className="myth-dot me-2" style={{ background: myth.color, color: myth.color }} />{myth.title}</h5>
              <Button size="sm" variant="link" className="p-0 text-body-secondary" onClick={() => selectMyth(null)}><i className="bi bi-x-lg" /></Button>
            </div>
            <div className="small text-warning mb-1"><i className="bi bi-geo-alt me-1" />{myth.place}</div>
            <p className="small mb-2">{myth.summary}</p>
            <Button as={Link} to="/myths" size="sm" variant="outline-warning">이야기 전체 보기 <i className="bi bi-arrow-right" /></Button>
          </div>
        ) : (
          <div className="scene-overlay small"><i className="bi bi-hand-index me-2" />빛나는 구슬을 눌러 신화를 열어 보세요 · 드래그로 회전 · 휠로 확대</div>
        )}
      </div>

      <h5 className="fw-bold mb-3"><i className="bi bi-clipboard-check me-2" />동작 체크</h5>
      <Row xs={1} md={3} className="g-3">
        <Col><Check title="React · 라우터" state="ok" msg="이 화면이 보이면 OK" /></Col>
        <Col><Check title="Supabase" {...db} /></Col>
        <Col><Check title="서버 함수 /api" {...api} /></Col>
      </Row>

      <Card className="mt-4">
        <Card.Body>
          <Card.Title className="fs-6 fw-bold"><i className="bi bi-database me-2" />Store(Zustand) 확인</Card.Title>
          <Form.Control placeholder="닉네임을 입력하세요" value={nickname}
            onChange={(e) => setNickname(e.target.value)} style={{ maxWidth: 320 }} />
          <Form.Text>입력하면 오른쪽 위 메뉴에도 바로 보이고, 새로고침해도 남아 있습니다.</Form.Text>
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
