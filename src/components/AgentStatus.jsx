import { useEffect } from 'react'
import { useAppStore } from '../store/useAppStore'

// 이야기꾼 AI 이름 옆 상태: 서버 함수가 응답하고 Claude 키가 있으면 온라인, 아니면 오프라인
export function useAgentOnline() {
  const health = useAppStore((s) => s.health)
  if (health.api === 'wait') return null              // 아직 확인 중
  return health.api === 'ok' && health.hasClaudeKey
}

export default function AgentStatus({ poll = false }) {
  const checkHealth = useAppStore((s) => s.checkHealth)
  const health = useAppStore((s) => s.health)
  const online = useAgentOnline()
  const typing = useAppStore((s) => s.chatLoading)

  // 켜지면 한 번 확인하고, poll 이면(채팅창이 열려 있는 동안) 30초마다 다시 확인
  useEffect(() => {
    checkHealth()
    if (!poll) return
    const t = setInterval(checkHealth, 30000)
    return () => clearInterval(t)
  }, [checkHealth, poll])

  const reason = online === false
    ? (health.api !== 'ok' ? `서버 함수(/api)에 연결할 수 없어요 ${health.apiMsg}`.trim() : 'Claude API 키가 설정되지 않았어요')
    : ''
  return (
    <span className={`agent-status ${online === null ? 'wait' : online ? (typing ? 'on typing' : 'on') : 'off'}`} title={reason}>
      <i className="agent-dot" />{online === null ? '확인 중' : online ? (typing ? '입력 중…' : '온라인') : '오프라인'}
    </span>
  )
}
