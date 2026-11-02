import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, ButtonGroup } from 'react-bootstrap'
import PageHeader from '../components/PageHeader'
import Scene from '../components/Scene'
import { FavButton } from '../components/ItemCard'
import { useAppStore } from '../store/useAppStore'
import { MYTHS } from '../../server/myths'
import { MODES, modeAt } from '../lib/timeOfDay'
import { WEATHER_ICON, WEATHER_LABEL, weatherKind } from '../lib/weather'

// 처음 8곳은 이름표를 늘 보여 주고, 나머지는 마우스를 올리거나 골랐을 때만 (제주시 쪽에 장소가 몰려 이름표가 겹치므로)
const ALWAYS_LABELED = new Set(['seolmundae', 'ohbaek', 'samseonghyeol', 'yongduam', 'sanbang', 'seongsan', 'yeongdeung', 'songdang'])
const MARKERS = MYTHS.map((m) => ({ id: m.id, name: m.title, lat: m.lat, lng: m.lng, color: m.color, label: ALWAYS_LABELED.has(m.id) ? undefined : false }))

// 탐라 지도 — 큰 3D 지도. 마커(또는 아래 칩)를 누르면 그 장소로 다가가고, X 로 전체 보기로 돌아온다
export default function MapPage() {
  const { selectedMythId, selectMyth } = useAppStore()
  const myth = MYTHS.find((m) => m.id === selectedMythId)
  const [sel, setSel] = useState('auto')                 // 'auto' = 지금 시각, 아니면 새벽·아침·밤을 직접 골라 보기
  const now = modeAt()
  const [wsel, setWsel] = useState('auto')               // 'auto' = 지금 제주시의 실제 예보, 아니면 맑음·흐림·비·눈을 직접 골라 보기
  const real = weatherKind(useAppStore((s) => s.weather.제주시))

  return (
    <>
      <PageHeader icon="map" title="탐라 지도" subtitle={`실제 제주 해안선 위에 올린 신화 ${MYTHS.length}곳 · 드래그로 회전 · 지도를 클릭한 뒤 휠로 확대`} />
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
        <ButtonGroup size="sm">
          <Button variant={wsel === 'auto' ? 'success' : 'outline-success'} onClick={() => setWsel('auto')}>
            <i className={`bi bi-${WEATHER_ICON[real]} me-1`} />실제 날씨 ({WEATHER_LABEL[real]})
          </Button>
          {['clear', 'overcast', 'rain', 'snow'].map((k) => (
            <Button key={k} variant={wsel === k ? 'success' : 'outline-success'} onClick={() => setWsel(k)}>
              <i className={`bi bi-${WEATHER_ICON[k]} me-1`} />{WEATHER_LABEL[k]}
            </Button>
          ))}
        </ButtonGroup>
      </div>
      <p className="small text-body-secondary mb-2">시간대와 제주의 실제 날씨(기상청)에 따라 하늘과 풍경이 달라져요. 버튼으로 다른 모습도 볼 수 있어요.</p>
      {/* 지도 안에 카드가 떠서 신화 내용이 나온다 (아래로 스크롤할 필요 없음) */}
      <div className="position-relative">
        <Scene height="64vh" items={MARKERS} selectedId={selectedMythId} onSelect={(m) => selectMyth(m.id)} autoRotate
          mode={sel === 'auto' ? undefined : sel} weather={wsel === 'auto' ? undefined : wsel} />
        {myth ? (
          <div className="scene-overlay map-card" key={myth.id}>
            <div className="d-flex align-items-start gap-2">
              <h5 className="fw-bold mb-1 flex-grow-1"><span className="myth-dot me-2" style={{ background: myth.color, color: myth.color }} />{myth.title}</h5>
              <Button size="sm" variant="link" className="p-0 text-white-50" aria-label="닫기 · 전체 보기" onClick={() => selectMyth(null)}><i className="bi bi-x-lg" /></Button>
            </div>
            <div className="small text-warning mb-2"><i className="bi bi-geo-alt me-1" />{myth.place}</div>
            <p className="small mb-2 map-card-story">{myth.story}</p>
            <div className="d-flex gap-2 flex-wrap">
              <FavButton fav={{ source: 'myth', id: myth.id, title: myth.title }} dark />
              <Button as={Link} to="/myths" size="sm" variant="outline-light">신화 도감 <i className="bi bi-arrow-right" /></Button>
            </div>
          </div>
        ) : (
          <span className="map-link-chip"><i className="bi bi-hand-index me-1" />빛나는 구슬을 눌러 보세요</span>
        )}
      </div>

      <div className="d-flex flex-wrap gap-2 my-3">
        {MYTHS.map((m) => (
          <Button key={m.id} size="sm" variant={m.id === selectedMythId ? 'primary' : 'outline-secondary'} onClick={() => selectMyth(m.id)}>
            <span className="myth-dot me-2" style={{ background: m.color, color: m.color }} />{m.title}
          </Button>
        ))}
      </div>
    </>
  )
}
