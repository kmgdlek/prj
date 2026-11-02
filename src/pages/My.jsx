import { useEffect, useState } from 'react'
import { Button, Col, Row } from 'react-bootstrap'
import PageHeader from '../components/PageHeader'
import ItemCard from '../components/ItemCard'
import FavDetail from '../components/FavDetail'
import { Empty, Loading } from '../components/Status'
import { useAppStore } from '../store/useAppStore'

const SOURCE = { myth: '신화', tour: '장소', heritage: '유산' }

// 내 별자리 — 즐겨찾기를 Supabase 에서 불러와 보여주고, 별을 누르면 상세(사진·이야기)가 열립니다
export default function My() {
  const { favorites, favLoading, loadFavorites, toggleFavorite } = useAppStore()
  const [open, setOpen] = useState(null)

  useEffect(() => { loadFavorites() }, [loadFavorites])

  return (
    <>
      <PageHeader icon="star" title="내 별자리" subtitle="별을 누르면 그 신화·장소·유산의 사진과 이야기가 열립니다" />
      {favLoading ? <Loading /> : favorites.length === 0 ? <Empty text="아직 밤하늘에 박은 별이 없어요" /> : (
        <Row xs={1} sm={2} lg={3} className="g-3">
          {favorites.map((f) => (
            <Col key={f.id}>
              <div className="position-relative h-100">
                <ItemCard title={f.title} badge={SOURCE[f.source] ?? f.source}
                  subtitle={new Date(f.created_at).toLocaleString('ko-KR')} onClick={() => setOpen(f)} />
                <Button size="sm" variant="danger" className="position-absolute top-0 end-0 m-2" aria-label="별 지우기"
                  onClick={() => toggleFavorite({ source: f.source, id: f.item_id, title: f.title })}>
                  <i className="bi bi-trash" />
                </Button>
              </div>
            </Col>
          ))}
        </Row>
      )}
      <FavDetail fav={open} onHide={() => setOpen(null)} />
    </>
  )
}
