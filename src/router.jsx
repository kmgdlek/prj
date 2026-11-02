import { createBrowserRouter } from 'react-router-dom'
import RootLayout from './layouts/RootLayout'
import Home from './pages/Home'
import Myths from './pages/Myths'
import Places from './pages/Places'
import Heritage from './pages/Heritage'
import Agent from './pages/Agent'
import My from './pages/My'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Shop from './pages/Shop'
import Cart from './pages/Cart'
import Orders from './pages/Orders'
import RequireAuth from './components/RequireAuth'
import NotFound from './pages/NotFound'

// ── 메뉴 목록 ────────────────────────────────────────────
// 페이지를 추가할 때: ① pages/에 파일 만들기 ② 아래 NAV_ITEMS 에 한 줄 추가 ③ routes 에 한 줄 추가
// 아이콘 이름: https://icons.getbootstrap.com
export const NAV_ITEMS = [
  { to: '/', label: '신화의 섬', icon: 'moon-stars' },
  { to: '/myths', label: '신화 도감', icon: 'book' },
  { to: '/places', label: '신화 속 장소', icon: 'geo-alt' },
  { to: '/heritage', label: '국가유산', icon: 'bank' },
  { to: '/shop', label: '제주 장터', icon: 'bag-heart' },
  { to: '/agent', label: '이야기꾼 AI', icon: 'robot' },
  { to: '/my', label: '내 별자리', icon: 'star', auth: true },
  { to: '/orders', label: '주문 내역', icon: 'receipt', auth: true },
]

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <NotFound />,
    children: [
      { index: true, element: <Home /> },
      { path: 'myths', element: <Myths /> },
      { path: 'places', element: <Places /> },
      { path: 'heritage', element: <Heritage /> },
      { path: 'agent', element: <Agent /> },
      { path: 'shop', element: <Shop /> },
      { path: 'cart', element: <RequireAuth><Cart /></RequireAuth> },
      { path: 'orders', element: <RequireAuth><Orders /></RequireAuth> },
      { path: 'login', element: <Login /> },
      { path: 'signup', element: <Signup /> },
      { path: 'my', element: <RequireAuth><My /></RequireAuth> },
    ],
  },
])
