import { Badge } from 'react-bootstrap'
import { useAppStore } from '../store/useAppStore'

// 관리자 계정에만 보이는 표시
export default function AdminBadge() {
  const isAdmin = useAppStore((s) => s.isAdmin)
  return isAdmin ? <Badge bg="danger" className="flex-shrink-0"><i className="bi bi-shield-check me-1" />관리자</Badge> : null
}
