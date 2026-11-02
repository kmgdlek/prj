import { useEffect, useState } from 'react'
import { Button, Col, Form, InputGroup, Row } from 'react-bootstrap'
import PageHeader from '../components/PageHeader'
import ItemCard from '../components/ItemCard'
import Scene from '../components/Scene'
import MapListLayout from '../components/MapListLayout'
import { Empty, ErrorAlert, Loading } from '../components/Status'
import { fetchHeritage } from '../api/client'

export default function Heritage() {
  const [keyword, setKeyword] = useState('')
  const [list, setList] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function search(e) {
    e?.preventDefault()
    setLoading(true); setError('')
    try { setList(await fetchHeritage(keyword)); setSelected(null) }
    catch (err) { setError(err.message); setList([]) }
    finally { setLoading(false) }
  }
  useEffect(() => { search() }, [])

  const pins = list.map((h, i) => ({ id: `${h.name}-${i}`, name: h.name, lat: h.lat, lng: h.lng, color: '#ff4fa3', size: 0.12, label: false }))

  return (
    <>
      <PageHeader icon="bank" title="국가유산" subtitle="국가유산청 오픈API — 신화와 이어진 제주의 문화유산" />
      <Form onSubmit={search} className="mb-4">
        <InputGroup>
          <Form.Control value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="유산 이름 (예: 삼성혈, 산방산, 해녀)" />
          <Button type="submit"><i className="bi bi-search" /></Button>
        </InputGroup>
      </Form>

      <ErrorAlert error={error} />
      <MapListLayout height={460}
        map={<Scene height={460} items={pins} selectedId={selected} onSelect={(p) => setSelected(p.id)} />}
        list={loading ? <Loading /> : list.length === 0 ? <Empty /> : (
          <Row xs={1} sm={2} lg={1} xl={2} className="g-3">
            {list.map((h, i) => (
              <Col key={`${h.name}-${i}`}>
                <ItemCard title={h.name} subtitle={`${h.city ?? ''}`} image={h.image} badge={h.kind}
                  active={selected === `${h.name}-${i}`} onClick={() => setSelected(`${h.name}-${i}`)}
                  fav={{ source: 'heritage', id: h.name, title: h.name }} />
              </Col>
            ))}
          </Row>
        )} />
    </>
  )
}
