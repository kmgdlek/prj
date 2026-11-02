import { useEffect } from 'react'
import { Button, Col, Form, Row } from 'react-bootstrap'
import PageHeader from '../components/PageHeader'
import ItemCard from '../components/ItemCard'
import { Empty, Loading } from '../components/Status'
import { useAppStore } from '../store/useAppStore'

const SOURCE = { myth: '신화', tour: '장소', heritage: '유산' }

// 내 별자리 — 즐겨찾기를 Supabase favorites 테이블에서 불러와 보여줍니다
export default function My() {
  const { nickname, setNickname, favorites, favLoading, loadFavorites, removeFavorite } = useAppStore()

  useEffect(() => { loadFavorites() }, [nickname, loadFavorites])

  return (
    <>
      <PageHeader icon="star" title="내 별자리" subtitle="별표를 누른 신화·장소·유산이 Supabase 에 저장됩니다" />
      <Form.Control className="mb-4" style={{ maxWidth: 320 }} placeholder="닉네임"
        value={nickname} onChange={(e) => setNickname(e.target.value)} />
      {favLoading ? <Loading /> : favorites.length === 0 ? <Empty text="아직 밤하늘에 박은 별이 없어요" /> : (
        <Row xs={1} sm={2} lg={3} className="g-3">
          {favorites.map((f) => (
            <Col key={f.id}>
              <div className="position-relative h-100">
                <ItemCard title={f.title} badge={SOURCE[f.source] ?? f.source} subtitle={new Date(f.created_at).toLocaleString('ko-KR')} />
                <Button size="sm" variant="danger" className="position-absolute top-0 end-0 m-2" onClick={() => removeFavorite(f.id)}>
                  <i className="bi bi-trash" />
                </Button>
              </div>
            </Col>
          ))}
        </Row>
      )}
    </>
  )
}
