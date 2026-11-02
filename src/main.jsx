import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'

// ── 디자인 ───────────────────────────────────────────────
// Bootstrap 5 + Bootswatch 'flatly'(깨끗한 흰색). 3D 섬만 밤하늘로 두어 대비를 줍니다.
// 'flatly' 한 단어만 바꾸면 전체 디자인이 바뀝니다 (lux · cosmo · journal · vapor(다크) ...)
import 'bootswatch/dist/flatly/bootstrap.min.css'
import 'bootstrap-icons/font/bootstrap-icons.css'
import './styles/theme.css'

import { router } from './router'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
