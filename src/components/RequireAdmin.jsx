import { Navigate } from 'react-router-dom'
import { useAppStore } from '../store/useAppStore'
import { Loading } from './Status'

// 관리자만 볼 수 있는 페이지를 감싼다. 관리자가 아니면 장터로 돌려보낸다 (진짜 막는 건 DB 의 RLS — 이건 화면 안내)
export default function RequireAdmin({ children }) {
  const { user, authReady, isAdmin } = useAppStore()
  if (!authReady) return <Loading />
  if (!user) return <Navigate to="/login" replace state={{ from: '/admin' }} />
  if (!isAdmin) return <Navigate to="/shop" replace />
  return children
}
