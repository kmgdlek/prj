import { useEffect, useRef, useState } from 'react'
import { Button, Form, InputGroup, Spinner } from 'react-bootstrap'
import { useAppStore } from '../store/useAppStore'

const SUGGESTIONS = [
  '설문대할망 이야기가 깃든 곳을 알려줘',
  '내일 서귀포에 비 오면 오백장군 신화를 느낄 실내 장소는?',
  '삼성혈 근처 국가유산이랑 날씨도 같이 알려줘',
]

// 이야기꾼 AI 채팅 — 떠 있는 창과 /agent 페이지가 같은 store 대화를 함께 쓴다
export default function ChatPanel() {
  const messages = useAppStore((s) => s.messages)
  const loading = useAppStore((s) => s.chatLoading)
  const sendMessage = useAppStore((s) => s.sendMessage)
  const [input, setInput] = useState('')
  const bottom = useRef(null)

  // 새 메시지가 오면 맨 아래로
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }) }, [messages, loading])

  function send(text) {
    if (!text.trim() || loading) return
    sendMessage(text)
    setInput('')
  }

  return (
    <div className="chat-panel d-flex flex-column h-100">
      <div className="chat-box flex-grow-1 overflow-auto p-3">
        {messages.length === 0 && (
          <div className="d-flex flex-column gap-2 align-items-start">
            <div className="text-body-secondary">이렇게 물어보세요</div>
            {SUGGESTIONS.map((s) => (
              <Button key={s} size="sm" variant="outline-info" className="text-start" onClick={() => send(s)}>{s}</Button>
            ))}
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`msg ${m.role}`}>
            {m.steps?.length > 0 && (
              <div className="small text-info mb-1">
                <i className="bi bi-tools me-1" />
                {m.steps.map((s) => `${s.tool}(${JSON.stringify(s.args)}) → ${s.count}건`).join(' · ')}
              </div>
            )}
            {m.text}
          </div>
        ))}
        {loading && <div className="small text-body-secondary"><Spinner size="sm" className="me-2" />에이전트가 도구를 사용하는 중...</div>}
        <div ref={bottom} />
      </div>
      <Form className="p-3 border-top border-secondary-subtle" onSubmit={(e) => { e.preventDefault(); send(input) }}>
        <InputGroup>
          <Form.Control value={input} onChange={(e) => setInput(e.target.value)} placeholder="질문을 입력하세요" />
          <Button type="submit" disabled={loading} aria-label="보내기"><i className="bi bi-send" /></Button>
        </InputGroup>
      </Form>
    </div>
  )
}
