import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge, Button, ButtonGroup, Card } from 'react-bootstrap'
import PageHeader from '../components/PageHeader'
import Scene from '../components/Scene'
import { FavButton } from '../components/ItemCard'
import { useAppStore } from '../store/useAppStore'
import { MYTHS } from '../../server/myths'
import { MODES, modeAt } from '../lib/timeOfDay'

const MARKERS = MYTHS.map((m) => ({ id: m.id, name: m.title, lat: m.lat, lng: m.lng, color: m.color }))

// 탐라 지도 — 큰 3D 지도. 마커(또는 아래 칩)를 누르면 그 장소로 다가가고, X 로 전체 보기로 돌아온다
export default function MapPage() {
  const { selectedMythId, selectMyth } = useAppStore()
  const myth = MYTHS.find((m) => m.id === selectedMythId)
  const [sel, setSel] = useState('auto')                 // 'auto' = 지금 시각, 아니면 새벽·아침·밤을 직접 골라 보기
  const now = modeAt()

  return (
    <>
      <PageHeader icon="map" title="탐라 지도" subtitle="실제 제주 해안선 위에 올린 신화 8곳 · 드래그로 회전 · 지도를 클릭한 뒤 휠로 확대" />
      <div className="d-flex align-items-center gap-2 mb-2 flex-wrap">
        <ButtonGroup size="sm">
          <Button variant={sel === 'auto' ? 'primary' : 'outline-primary'} onClick={() => setSel('auto')}>
            <i className="bi bi-clock me-1" />지금 ({MODES[now].label})
          </Button>
          {Object.entries(MODES).map(([k, v]) => (
            <Button key={k} variant={sel === k ? 'primary' : 'outline-primary'} onClick={() => setSel(k)}>
              <i className={`bi bi-${v.icon} me-1`} />{v.label}
            </Button>
          ))}
        </ButtonGroup>
        <span className="small text-body-secondary">시간대에 따라 하늘과 풍경이 달라져요</span>
      </div>
      <Scene height="64vh" items={MARKERS} selectedId={selectedMythId} onSelect={(m) => selectMyth(m.id)} autoRotate
        mode={sel === 'auto' ? undefined : sel} />

      <div className="d-flex flex-wrap gap-2 my-3">
        {MYTHS.map((m) => (
          <Button key={m.id} size="sm" variant={m.id === selectedMythId ? 'primary' : 'outline-secondary'} onClick={() => selectMyth(m.id)}>
            <span className="myth-dot me-2" style={{ background: m.color, color: m.color }} />{m.title}
          </Button>
        ))}
      </div>

      <Card className="scene-info border-0">
        <Card.Body>
          {myth ? (
            <>
              <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                <h4 className="fw-bold mb-0">{myth.title}</h4>
                <Badge bg="primary">{myth.place}</Badge>
                <FavButton fav={{ source: 'myth', id: myth.id, title: myth.title }} />
                <Button size="sm" variant="link" className="ms-auto text-body-secondary" onClick={() => selectMyth(null)}>
                  <i className="bi bi-x-lg me-1" />전체 보기
                </Button>
              </div>
              <p className="mb-2">{myth.story}</p>
              <Button as={Link} to="/myths" size="sm" variant="outline-primary">신화 도감에서 보기 <i className="bi bi-arrow-right" /></Button>
            </>
          ) : (
            <p className="mb-0 text-body-secondary"><i className="bi bi-hand-index me-2" />빛나는 구슬이나 위의 이름을 눌러 신화를 열어 보세요.</p>
          )}
        </Card.Body>
      </Card>
    </>
  )
}
