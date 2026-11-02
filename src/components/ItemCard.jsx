import { Badge, Button, Card } from 'react-bootstrap'
import { useAppStore } from '../store/useAppStore'

// 별 버튼 — 저장돼 있으면 채워진 별로 바뀌고, 다시 누르면 취소 (store 의 favorites 를 구독)
export function FavButton({ fav, size = 'sm', className = '', label = true }) {
  const toggle = useAppStore((s) => s.toggleFavorite)
  const saved = useAppStore((s) => s.favorites.some((f) => f.source === fav.source && f.item_id === String(fav.id)))
  return (
    <Button size={size} variant={saved ? 'warning' : 'outline-dark'} className={className}
      onClick={(e) => { e.stopPropagation(); toggle(fav) }}>
      <i className={`bi bi-star${saved ? '-fill' : ''} ${label ? 'me-1' : ''}`} />{label && (saved ? '저장됨' : '즐겨찾기')}
    </Button>
  )
}

// 신화·관광지·유산·즐겨찾기 등 "목록의 한 칸"을 모두 이 카드 하나로 표시합니다 (재사용 컴포넌트)
export default function ItemCard({ title, subtitle, image, badge, fav, onClick, active }) {
  return (
    <Card className={`h-100 item-card ${active ? 'active' : ''}`} onClick={onClick} role={onClick ? 'button' : undefined}>
      {image
        ? <Card.Img variant="top" src={image} alt={title} className="item-card-img" />
        : <div className="item-card-img placeholder-img"><i className="bi bi-moon-stars" /></div>}
      <Card.Body className="d-flex flex-column">
        {badge && <Badge bg="primary" className="align-self-start mb-2">{badge}</Badge>}
        <Card.Title className="fs-6 fw-bold">{title}</Card.Title>
        {subtitle && <Card.Text className="small text-body-secondary">{subtitle}</Card.Text>}
        {fav && <FavButton fav={fav} className="mt-auto" />}
      </Card.Body>
    </Card>
  )
}
