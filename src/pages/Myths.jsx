import { useEffect, useState } from 'react'
import { Col, ListGroup, Row } from 'react-bootstrap'
import PageHeader from '../components/PageHeader'
import ItemCard, { FavButton } from '../components/ItemCard'
import Scene from '../components/Scene'
import MapListLayout from '../components/MapListLayout'
import { Empty, ErrorAlert, Loading } from '../components/Status'
import { fetchPlaces } from '../api/client'
import { useAppStore } from '../store/useAppStore'
import { MYTHS } from '../../server/myths'

// 작은 지도에서는 이름표를 숨긴다 (마커가 많아 겹침). 선택한 마커의 이름표는 항상 보인다
const MARKERS = MYTHS.map((m) => ({ id: m.id, name: m.title, lat: m.lat, lng: m.lng, color: m.color, label: false }))

// 신화 도감 — 목록(왼쪽)과 3D 지도(오른쪽)가 store 의 selectedMythId 를 공유
export default function Myths() {
  const { selectedMythId, selectMyth } = useAppStore()
  const myth = MYTHS.find((m) => m.id === selectedMythId) ?? MYTHS[0]
  const [places, setPlaces] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { if (!selectedMythId) selectMyth(MYTHS[0].id) }, [selectedMythId, selectMyth])

  // 신화를 고를 때마다 그 신화의 장소를 TourAPI 로 찾아온다
  useEffect(() => {
    let alive = true
    setLoading(true); setError('')
    fetchPlaces(myth.keyword, '')
      .then((r) => alive && setPlaces(r.slice(0, 6)))
      .catch((e) => alive && (setError(e.message), setPlaces([])))
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [myth.keyword])

  return (
    <>
      <PageHeader icon="book" title="신화 도감" subtitle={`탐라 신화 ${MYTHS.length}편 — 이야기를 고르면 3D 섬이 그 장소로 날아갑니다`} />
      <MapListLayout height={620}
        map={<Scene height={340} items={MARKERS} selectedId={myth.id} onSelect={(m) => selectMyth(m.id)} />}
        below={(
          <div className="mt-3">
            <div className="d-flex align-items-center gap-2 mb-2">
              <h3 className="fw-bold mb-0">{myth.title}</h3>
              <FavButton fav={{ source: 'myth', id: myth.id, title: myth.title }} />
            </div>
            <p className="text-primary small mb-1"><i className="bi bi-geo-alt me-1" />{myth.place}</p>
            <p className="small text-body-secondary"><i className="bi bi-signpost me-1" />주소 · {myth.addr}</p>
            <p>{myth.story}</p>
          </div>
        )}
        list={(
          <ListGroup className="myth-list">
            {MYTHS.map((m) => (
              <ListGroup.Item key={m.id} action active={m.id === myth.id} onClick={() => selectMyth(m.id)}>
                <span className="myth-dot me-2" style={{ background: m.color, color: m.color }} />
                <strong>{m.title}</strong>
                <span className="badge text-bg-light border ms-2 fw-normal">{m.kind}</span>
                <div className="small opacity-75">{m.place}</div>
              </ListGroup.Item>
            ))}
          </ListGroup>
        )} />

      <h5 className="fw-bold mt-4 mb-3"><i className="bi bi-signpost-split me-2" />‘{myth.keyword}’ 에서 가 볼 만한 곳 <small className="text-body-secondary">· TourAPI</small></h5>
      <ErrorAlert error={error} />
      {loading ? <Loading /> : places.length === 0 ? <Empty text="관련 장소를 찾지 못했어요" /> : (
        <Row xs={1} sm={2} lg={3} className="g-3">
          {places.map((p) => (
            <Col key={p.id}>
              <ItemCard title={p.title} subtitle={p.addr} image={p.image}
                fav={{ source: 'tour', id: p.id, title: p.title }} />
            </Col>
          ))}
        </Row>
      )}
    </>
  )
}
