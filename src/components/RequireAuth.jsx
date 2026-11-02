import { Navigate, useLocation } from 'react-router-dom'
import { useAppStore } from '../store/useAppStore'
import { Loading } from './Status'

// 로그인한 사람만 볼 수 있는 페이지를 감싼다. 아니면 로그인 화면으로 보내고, 로그인 뒤 원래 페이지로 돌아온다
export default function RequireAuth({ children }) {
  const user = useAppStore((s) => s.user)
  const authReady = useAppStore((s) => s.authReady)
  const location = useLocation()
  if (!authReady) return <Loading />
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return children
}
