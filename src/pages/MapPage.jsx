import { Link } from 'react-router-dom'
import { Badge, Button, Card } from 'react-bootstrap'
import PageHeader from '../components/PageHeader'
import Scene from '../components/Scene'
import { FavButton } from '../components/ItemCard'
import { useAppStore } from '../store/useAppStore'
import { MYTHS } from '../../server/myths'

const MARKERS = MYTHS.map((m) => ({ id: m.id, name: m.title, lat: m.lat, lng: m.lng, color: m.color }))

// 탐라 지도 — 큰 3D 지도. 마커(또는 아래 칩)를 누르면 그 장소로 다가가고, X 로 전체 보기로 돌아온다
export default function MapPage() {
  const { selectedMythId, selectMyth } = useAppStore()
  const myth = MYTHS.find((m) => m.id === selectedMythId)

  return (
    <>
      <PageHeader icon="map" title="탐라 지도" subtitle="실제 제주 해안선 위에 올린 신화 8곳 · 드래그로 회전 · 지도를 클릭한 뒤 휠로 확대" />
      <Scene height="68vh" items={MARKERS} selectedId={selectedMythId} onSelect={(m) => selectMyth(m.id)} autoRotate />

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
