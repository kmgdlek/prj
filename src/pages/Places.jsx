import { useEffect, useState } from 'react'
import { Button, Col, Form, InputGroup, Row } from 'react-bootstrap'
import PageHeader from '../components/PageHeader'
import ItemCard from '../components/ItemCard'
import Scene from '../components/Scene'
import { Empty, ErrorAlert, Loading } from '../components/Status'
import { fetchPlaces } from '../api/client'

// 장소 종류마다 어울리는 아이콘과 3D 구슬 색
const TYPES = {
  12: { label: '관광지', icon: 'camera', color: '#00e5ff' },
  14: { label: '문화시설', icon: 'palette', color: '#b388ff' },
  15: { label: '축제·행사', icon: 'balloon-heart', color: '#ff7eb6' },
  39: { label: '음식점', icon: 'cup-hot', color: '#ffb347' },
}
const typeOf = (t) => TYPES[t] ?? { label: '장소', icon: 'geo-alt', color: '#00e5ff' }

export default function Places() {
  const [keyword, setKeyword] = useState('')       // 비워 두면 제주 전체
  const [type, setType] = useState('')             // '' = 전체 종류
  const [places, setPlaces] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function search(e) {
    e?.preventDefault()
    setLoading(true); setError('')
    try { setPlaces(await fetchPlaces(keyword.trim(), type, 30)); setSelected(null) }
    catch (err) { setError(err.message); setPlaces([]) }
    finally { setLoading(false) }
  }
  useEffect(() => { search() }, [])

  const pins = places.map((p) => ({ id: p.id, name: p.title, lat: p.lat, lng: p.lng, color: typeOf(p.type).color, size: 0.12, label: false }))

  return (
    <>
      <PageHeader icon="compass" title="신화 속 장소" subtitle="한국관광공사 TourAPI — 검색어를 비워 두면 제주 전체, 결과는 3D 섬 위에 구슬로 뜹니다" />
      <Form onSubmit={search} className="mb-3">
        <InputGroup>
          <Form.Select value={type} onChange={(e) => setType(e.target.value)} style={{ maxWidth: 150 }} aria-label="장소 종류">
            <option value="">전체 종류</option>
            {Object.entries(TYPES).map(([v, t]) => <option key={v} value={v}>{t.label}</option>)}
          </Form.Select>
          <Form.Control value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="검색어 (비워 두면 전체 · 예: 삼성혈, 용두암, 오름)" />
          <Button type="submit" aria-label="검색"><i className="bi bi-search" /></Button>
        </InputGroup>
      </Form>
      {/* 범례: 구슬 색 = 장소 종류 */}
      <div className="d-flex flex-wrap gap-3 small text-body-secondary mb-3">
        {Object.values(TYPES).map((t) => (
          <span key={t.label}><i className={`bi bi-${t.icon} me-1`} style={{ color: t.color, filter: 'brightness(.8)' }} />{t.label}</span>
        ))}
        {!loading && <span className="ms-auto">{places.length}곳</span>}
      </div>

      <ErrorAlert error={error} />
      <div className="mb-4 scene-half"><Scene height={300} items={pins} selectedId={selected} onSelect={(p) => setSelected(p.id)} /></div>
      {loading ? <Loading /> : places.length === 0 ? <Empty /> : (
        <Row xs={1} sm={2} lg={3} className="g-3">
          {places.map((p) => {
            const t = typeOf(p.type)
            return (
              <Col key={p.id}>
                <ItemCard title={p.title} subtitle={p.addr} image={p.image}
                  badge={<><i className={`bi bi-${t.icon} me-1`} />{t.label}</>}
                  active={p.id === selected} onClick={() => setSelected(p.id)}
                  fav={{ source: 'tour', id: p.id, title: p.title }} />
              </Col>
            )
          })}
        </Row>
      )}
    </>
  )
}
