import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge, Button, Col, Modal, Row } from 'react-bootstrap'
import { fetchImages } from '../api/client'
import { useAppStore } from '../store/useAppStore'
import { MYTHS } from '../../server/myths'
import { ErrorAlert, Loading } from './Status'

const SOURCE = { myth: '신화', tour: '장소', heritage: '유산' }

// 내 별자리에서 별을 누르면 뜨는 상세 창 — 신화는 이야기, 모두 Pixabay 사진 갤러리
export default function FavDetail({ fav, onHide }) {
  const navigate = useNavigate()
  const selectMyth = useAppStore((s) => s.selectMyth)
  const myth = fav?.source === 'myth' ? MYTHS.find((m) => m.id === fav.item_id) : null
  const keyword = myth?.keyword ?? fav?.title
  const [images, setImages] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!fav) return
    let alive = true
    setLoading(true); setError(''); setImages([])
    fetchImages(keyword)
      .then((r) => alive && setImages(r))
      .catch((e) => alive && setError(e.message))
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [fav, keyword])

  return (
    <Modal show={Boolean(fav)} onHide={onHide} size="lg" centered scrollable>
      {fav && (
        <>
          <Modal.Header closeButton>
            <Modal.Title className="fw-bold">
              <i className="bi bi-star-fill text-warning me-2" />{fav.title}{' '}
              <Badge bg="primary" className="fs-6 align-middle">{SOURCE[fav.source] ?? fav.source}</Badge>
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {myth && (
              <>
                <p className="text-primary small mb-1"><i className="bi bi-geo-alt me-1" />{myth.place}</p>
                <p>{myth.story}</p>
                <Button size="sm" variant="outline-primary" className="mb-3"
                  onClick={() => { selectMyth(myth.id); navigate('/myths') }}>
                  <i className="bi bi-globe-asia-australia me-1" />3D 섬에서 보기
                </Button>
              </>
            )}
            <h6 className="fw-bold"><i className="bi bi-images me-2" />관련 사진 <small className="text-body-secondary">· Pixabay</small></h6>
            <ErrorAlert error={error} />
            {loading ? <Loading text="사진을 찾는 중..." /> : (
              <>
                {images[0]?.fallback && <p className="small text-body-secondary">정확히 일치하는 사진이 없어 ‘제주도’ 사진을 보여 드려요.</p>}
                <Row xs={2} md={3} className="g-2">
                  {images.map((img) => (
                    <Col key={img.id}>
                      <a href={img.page} target="_blank" rel="noreferrer">
                        <img src={img.thumb} alt={img.tags} className="img-fluid rounded" style={{ aspectRatio: '4 / 3', objectFit: 'cover', width: '100%' }} />
                      </a>
                    </Col>
                  ))}
                </Row>
              </>
            )}
          </Modal.Body>
        </>
      )}
    </Modal>
  )
}
