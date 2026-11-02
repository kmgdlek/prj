import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'

// ── 디자인 ───────────────────────────────────────────────
// Bootstrap 5 + Bootswatch 'vapor'(네온 다크). 신화의 밤하늘 분위기에 맞춰 골랐습니다.
// 'vapor' 한 단어만 바꾸면 전체 디자인이 바뀝니다 (darkly · slate · cyborg · lux ...)
import 'bootswatch/dist/vapor/bootstrap.min.css'
import 'bootstrap-icons/font/bootstrap-icons.css'
import './styles/theme.css'

import { router } from './router'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
