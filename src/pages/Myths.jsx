import { useEffect, useState } from 'react'
import { Col, ListGroup, Row } from 'react-bootstrap'
import PageHeader from '../components/PageHeader'
import ItemCard, { FavButton } from '../components/ItemCard'
import Scene from '../components/Scene'
import { Empty, ErrorAlert, Loading } from '../components/Status'
import { fetchPlaces } from '../api/client'
import { useAppStore } from '../store/useAppStore'
import { MYTHS } from '../../server/myths'

const MARKERS = MYTHS.map((m) => ({ id: m.id, name: m.title, lat: m.lat, lng: m.lng, color: m.color }))

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
      <PageHeader icon="book" title="신화 도감" subtitle="탐라 신화 8편 — 이야기를 고르면 3D 섬이 그 장소로 날아갑니다" />
      <Row className="g-4">
        <Col lg={6}>
          <ListGroup>
            {MYTHS.map((m) => (
              <ListGroup.Item key={m.id} action active={m.id === myth.id} onClick={() => selectMyth(m.id)}>
                <span className="myth-dot me-2" style={{ background: m.color, color: m.color }} />
                <strong>{m.title}</strong>
                <div className="small opacity-75">{m.place}</div>
              </ListGroup.Item>
            ))}
          </ListGroup>
        </Col>
        <Col lg={6}>
          <Scene height={320} items={MARKERS} selectedId={myth.id} onSelect={(m) => selectMyth(m.id)} />
          <div className="mt-3">
            <div className="d-flex align-items-center gap-2 mb-2">
              <h3 className="fw-bold mb-0">{myth.title}</h3>
              <FavButton fav={{ source: 'myth', id: myth.id, title: myth.title }} />
            </div>
            <p className="text-primary small"><i className="bi bi-geo-alt me-1" />{myth.place}</p>
            <p>{myth.story}</p>
          </div>
        </Col>
      </Row>

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
