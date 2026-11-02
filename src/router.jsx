import { createBrowserRouter } from 'react-router-dom'
import RootLayout from './layouts/RootLayout'
import Home from './pages/Home'
import Myths from './pages/Myths'
import MapPage from './pages/MapPage'
import Places from './pages/Places'
import Heritage from './pages/Heritage'
import Agent from './pages/Agent'
import My from './pages/My'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Shop from './pages/Shop'
import ProductDetail from './pages/ProductDetail'
import Cart from './pages/Cart'
import Orders from './pages/Orders'
import MyPage from './pages/MyPage'
import RequireAuth from './components/RequireAuth'
import NotFound from './pages/NotFound'

// ── 메뉴 목록 ────────────────────────────────────────────
// 페이지를 추가할 때: ① pages/에 파일 만들기 ② 아래 NAV_ITEMS 에 한 줄 추가 ③ routes 에 한 줄 추가
// 아이콘 이름: https://icons.getbootstrap.com
// group = 메뉴의 카테고리 (아래 NAV_GROUPS). group 이 없는 항목(이야기꾼 AI)은 메뉴 대신 오른쪽 아래 둥근 버튼으로 연다
export const NAV_GROUPS = [
  { key: 'explore', en: 'EXPLORE', label: '탐험', icon: 'compass' },
  { key: 'shop', en: 'SHOP', label: '쇼핑', icon: 'bag-heart' },
  { key: 'my', en: 'MY', label: '내 정보', icon: 'person-circle' },
]
export const NAV_ITEMS = [
  { to: '/', label: '신화의 섬', icon: 'moon-stars', group: 'explore' },
  { to: '/map', label: '탐라 지도', icon: 'map', group: 'explore' },
  { to: '/myths', label: '신화 도감', icon: 'book', group: 'explore' },
  { to: '/places', label: '신화 속 장소', icon: 'compass', group: 'explore' },
  { to: '/heritage', label: '국가유산', icon: 'bank', group: 'explore' },
  { to: '/shop', label: '제주 장터', icon: 'bag-heart', group: 'shop' },
  { to: '/cart', label: '장바구니', icon: 'cart3', group: 'shop', auth: true },
  { to: '/orders', label: '주문 내역', icon: 'receipt', group: 'shop', auth: true },
  { to: '/agent', label: '이야기꾼 AI', icon: 'robot' },
  { to: '/mypage', label: '마이페이지', icon: 'person-circle', group: 'my', auth: true },
  { to: '/my', label: '내 별자리', icon: 'stars', group: 'my', auth: true },
]

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <NotFound />,
    children: [
      { index: true, element: <Home /> },
      { path: 'map', element: <MapPage /> },
      { path: 'myths', element: <Myths /> },
      { path: 'places', element: <Places /> },
      { path: 'heritage', element: <Heritage /> },
      { path: 'agent', element: <Agent /> },
      { path: 'shop', element: <Shop /> },
      { path: 'shop/:id', element: <ProductDetail /> },
      { path: 'cart', element: <RequireAuth><Cart /></RequireAuth> },
      { path: 'orders', element: <RequireAuth><Orders /></RequireAuth> },
      { path: 'mypage', element: <RequireAuth><MyPage /></RequireAuth> },
      { path: 'login', element: <Login /> },
      { path: 'signup', element: <Signup /> },
      { path: 'my', element: <RequireAuth><My /></RequireAuth> },
    ],
  },
])
