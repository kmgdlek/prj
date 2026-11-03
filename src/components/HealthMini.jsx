import { useEffect } from 'react'
import { useAppStore } from '../store/useAppStore'

// 동작 체크 — 메뉴 맨 아래에 작게. 점 색으로 상태를 보고, 마우스를 올리면 자세한 내용(오류 문구)이 보인다
export default function HealthMini() {
  const health = useAppStore((s) => s.health)
  const checkHealth = useAppStore((s) => s.checkHealth)
  useEffect(() => { checkHealth() }, [checkHealth])      // 메뉴가 열릴 때마다 다시 확인

  const rows = [
    { label: 'React·라우터', state: 'ok', msg: '이 화면이 보이면 OK' },
    { label: 'Supabase', state: health.db, msg: health.db === 'ok' ? '연결 OK' : health.dbMsg },
    { label: '서버 /api', state: health.api,
      msg: health.api === 'ok'
        ? `OK · 공공데이터 키 ${health.hasDataKey ? '있음' : '없음'} · AI(OpenAI) 키 ${health.hasAiKey ? '있음' : '없음'} · Pixabay 키 ${health.hasPixabayKey ? '있음' : '없음'}`
        : health.apiMsg || 'vercel dev 로 실행했는지 확인' },
  ]
  return (
    <div className="health-mini" aria-label="동작 체크">
      <span className="health-title">동작 체크</span>
      {rows.map((r) => (
        <span key={r.label} className="health-item" title={r.msg}>
          <i className={`health-dot ${r.state}`} />{r.label}
        </span>
      ))}
    </div>
  )
}
