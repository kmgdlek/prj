import { useEffect, useRef, useState } from 'react'
import { Button } from 'react-bootstrap'
import { useAppStore } from '../store/useAppStore'
import { useAgentOnline } from './AgentStatus'

// 입력창 바로 위에 놓이는 추천 질문
const SUGGESTIONS = [
  '설문대할망 이야기가 깃든 곳은?',
  '지금 제주 날씨 어때?',
  '비 오면 갈 만한 실내 장소는?',
  '제주 선물로 뭐 사면 좋아?',
  '삼성혈 근처 국가유산 알려줘',
]

const clock = (t) => new Date(t).toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' })

// 이야기꾼 AI 채팅 — 떠 있는 창과 /agent 페이지가 같은 store 대화를 함께 쓴다
export default function ChatPanel() {
  const messages = useAppStore((s) => s.messages)
  const loading = useAppStore((s) => s.chatLoading)
  const sendMessage = useAppStore((s) => s.sendMessage)
  const checkHealth = useAppStore((s) => s.checkHealth)
  const online = useAgentOnline()
  const [input, setInput] = useState('')
  const bottom = useRef(null)
  const box = useRef(null)
  const canSend = online !== false && !loading

  // 새 메시지가 오면 맨 아래로
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }) }, [messages, loading])

  function send(text) {
    if (!text.trim() || !canSend) return
    sendMessage(text.trim())
    setInput('')
    if (box.current) box.current.style.height = 'auto'
  }

  // Enter = 보내기, Shift+Enter = 줄바꿈 (한글 입력 중 Enter 는 글자 확정이므로 무시)
  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(input) }
  }
  function onChange(e) {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = `${Math.min(e.target.scrollHeight, 110)}px`     // 입력 줄 수에 따라 늘어남
  }

  return (
    <div className="chat-panel d-flex flex-column h-100">
      {online === false && (
        <div className="chat-offline">
          <i className="bi bi-wifi-off me-2" />AI가 오프라인이에요. 서버나 Claude 키를 확인해 주세요.
          <Button size="sm" variant="link" className="p-0 ms-2" onClick={checkHealth}>다시 확인</Button>
        </div>
      )}

      <div className="chat-box flex-grow-1 overflow-auto p-3">
        <Bubble role="assistant" at={null}>안녕하세요, 탐라 신화 이야기꾼이에요. 신화·장소·날씨·국가유산·제주 특산품까지 물어보세요.</Bubble>
        {messages.map((m, i) => (
          <Bubble key={i} role={m.role} at={m.at}>
            {m.steps?.length > 0 && (
              <div className="small text-info mb-1">
                <i className="bi bi-tools me-1" />
                {m.steps.map((s) => `${s.tool}(${JSON.stringify(s.args)}) → ${s.count}건`).join(' · ')}
              </div>
            )}
            {m.text}
          </Bubble>
        ))}
        {loading && (
          <Bubble role="assistant" at={null}>
            <span className="typing-dots"><i /><i /><i /></span>
          </Bubble>
        )}
        <div ref={bottom} />
      </div>

      <div className="chat-footer">
        {/* 추천 질문: 입력창 바로 위, 옆으로 밀어 볼 수 있는 한 줄 */}
        <div className="chat-chips">
          {SUGGESTIONS.map((s) => (
            <button key={s} type="button" className="chat-chip" disabled={!canSend} onClick={() => send(s)}>{s}</button>
          ))}
        </div>
        <form className="chat-input" onSubmit={(e) => { e.preventDefault(); send(input) }}>
          <textarea ref={box} rows={1} value={input} onChange={onChange} onKeyDown={onKeyDown}
            disabled={online === false} placeholder={online === false ? '오프라인 상태예요' : '메시지를 입력하세요'} />
          <Button type="submit" disabled={!canSend || !input.trim()} aria-label="보내기"><i className="bi bi-send-fill" /></Button>
        </form>
      </div>
    </div>
  )
}

// 말풍선: 이야기꾼은 왼쪽(로봇 아이콘), 나는 오른쪽
function Bubble({ role, at, children }) {
  const mine = role === 'user'
  return (
    <div className={`chat-row ${mine ? 'user' : 'assistant'}`}>
      {!mine && <span className="chat-avatar"><i className="bi bi-robot" /></span>}
      <div className="chat-col">
        <div className="chat-bubble">{children}</div>
        {at && <div className="chat-time">{clock(at)}</div>}
      </div>
    </div>
  )
}
