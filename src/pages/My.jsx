import { useEffect, useState } from 'react'
import { Button, Col, Row } from 'react-bootstrap'
import PageHeader from '../components/PageHeader'
import ItemCard from '../components/ItemCard'
import FavDetail from '../components/FavDetail'
import { Empty, Loading } from '../components/Status'
import { fetchImages } from '../api/client'
import { useAppStore } from '../store/useAppStore'
import { MYTHS } from '../../server/myths'

const SOURCE = { myth: '신화', tour: '장소', heritage: '유산', product: '상품' }

// 카드 사진: 저장할 때 사진은 따로 저장하지 않으므로, 보여 줄 때 Pixabay 에서 가져와 이 접속 동안 기억해 둔다 (상품은 장터 사진을 그대로)
const photoCache = new Map()
function useFavPhoto(f) {
  const productPhoto = useAppStore((s) => (f.source === 'product' ? s.productImages[f.item_id]?.url : ''))
  const key = `${f.source}:${f.item_id}`
  const [url, setUrl] = useState(() => photoCache.get(key) ?? '')
  useEffect(() => {
    if (f.source === 'product' || photoCache.has(key)) { setUrl(photoCache.get(key) ?? ''); return }
    let alive = true
    const keyword = f.source === 'myth' ? (MYTHS.find((m) => m.id === f.item_id)?.keyword ?? f.title) : f.title
    fetchImages(keyword, { rows: 1 })
      .then((r) => { const u = r[0]?.thumb ?? ''; photoCache.set(key, u); if (alive) setUrl(u) })
      .catch(() => {})
    return () => { alive = false }
  }, [f.source, f.item_id, f.title, key])
  return f.source === 'product' ? productPhoto : url
}

function FavCard({ f, onOpen, onRemove }) {
  const image = useFavPhoto(f)
  return (
    <div className="position-relative h-100">
      <ItemCard title={f.title} image={image} badge={SOURCE[f.source] ?? f.source}
        subtitle={new Date(f.created_at).toLocaleString('ko-KR')} onClick={() => onOpen(f)} />
      <Button size="sm" variant="danger" className="position-absolute top-0 end-0 m-2" aria-label="별 지우기"
        onClick={(e) => { e.stopPropagation(); onRemove(f) }}>
        <i className="bi bi-trash" />
      </Button>
    </div>
  )
}

// 내 별자리 — 즐겨찾기를 Supabase 에서 불러와 사진과 함께 보여주고, 카드를 누르면 상세(사진·이야기)가 열립니다
export default function My() {
  const { favorites, favLoading, loadFavorites, loadProductImages, toggleFavorite } = useAppStore()
  const [open, setOpen] = useState(null)

  useEffect(() => { loadFavorites(); loadProductImages() }, [loadFavorites, loadProductImages])

  return (
    <>
      <PageHeader icon="stars" title="내 별자리" subtitle="별을 누르면 그 신화·장소·유산의 사진과 이야기가 열립니다" />
      {favLoading ? <Loading /> : favorites.length === 0 ? <Empty text="아직 밤하늘에 박은 별이 없어요" /> : (
        <Row xs={1} sm={2} lg={3} className="g-3">
          {favorites.map((f) => (
            <Col key={f.id}>
              <FavCard f={f} onOpen={setOpen} onRemove={(x) => toggleFavorite({ source: x.source, id: x.item_id, title: x.title })} />
            </Col>
          ))}
        </Row>
      )}
      <FavDetail fav={open} onHide={() => setOpen(null)} />
    </>
  )
}
