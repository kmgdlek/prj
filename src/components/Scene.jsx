import { lazy, Suspense } from 'react'
import { Loading } from './Status'

// three.js 는 용량이 커서, 3D 가 필요한 순간에만 내려받도록 lazy 로 감쌉니다
const Jeju3D = lazy(() => import('./Jeju3D'))

export default function Scene({ height = 460, ...props }) {
  return (
    <div className="scene rounded-4 overflow-hidden" style={{ height }}>
      <Suspense fallback={<Loading text="3D 섬을 빚는 중..." />}>
        <Jeju3D height={height} {...props} />
      </Suspense>
    </div>
  )
}
