import { useEffect, useState } from 'react'
import { Button, Col, Form, InputGroup, Row } from 'react-bootstrap'
import PageHeader from '../components/PageHeader'
import ItemCard from '../components/ItemCard'
import Scene from '../components/Scene'
import { Empty, ErrorAlert, Loading } from '../components/Status'
import { fetchPlaces } from '../api/client'

const TYPES = { 12: '관광지', 14: '문화시설', 15: '축제·행사', 39: '음식점' }

export default function Places() {
  const [keyword, setKeyword] = useState('한라산')
  const [type, setType] = useState('12')
  const [places, setPlaces] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function search(e) {
    e?.preventDefault()
    setLoading(true); setError('')
    try { setPlaces(await fetchPlaces(keyword, type)); setSelected(null) }
    catch (err) { setError(err.message); setPlaces([]) }
    finally { setLoading(false) }
  }
  useEffect(() => { search() }, [])

  const pins = places.map((p) => ({ id: p.id, name: p.title, lat: p.lat, lng: p.lng, color: '#00e5ff', size: 0.12, label: false }))

  return (
    <>
      <PageHeader icon="geo-alt" title="신화 속 장소" subtitle="한국관광공사 TourAPI — 검색 결과가 3D 섬 위에 구슬로 뜹니다" />
      <Form onSubmit={search} className="mb-4">
        <InputGroup>
          <Form.Select value={type} onChange={(e) => setType(e.target.value)} style={{ maxWidth: 140 }}>
            {Object.entries(TYPES).map(([v, label]) => <option key={v} value={v}>{label}</option>)}
          </Form.Select>
          <Form.Control value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="검색어 (예: 삼성혈, 용두암, 오름)" />
          <Button type="submit"><i className="bi bi-search" /></Button>
        </InputGroup>
      </Form>

      <ErrorAlert error={error} />
      <div className="mb-4"><Scene height={380} items={pins} selectedId={selected} onSelect={(p) => setSelected(p.id)} /></div>
      {loading ? <Loading /> : places.length === 0 ? <Empty /> : (
        <Row xs={1} sm={2} lg={3} className="g-3">
          {places.map((p) => (
            <Col key={p.id}>
              <ItemCard title={p.title} subtitle={p.addr} image={p.image} badge={TYPES[p.type]}
                active={p.id === selected} onClick={() => setSelected(p.id)}
                fav={{ source: 'tour', id: p.id, title: p.title }} />
            </Col>
          ))}
        </Row>
      )}
    </>
  )
}
