import { useState } from 'react'
import { Button, Card, Form, InputGroup, Spinner } from 'react-bootstrap'
import PageHeader from '../components/PageHeader'
import { useAppStore } from '../store/useAppStore'

const SUGGESTIONS = [
  '설문대할망 이야기가 깃든 곳을 알려줘',
  '내일 서귀포에 비 오면 오백장군 신화를 느낄 실내 장소는?',
  '삼성혈 근처 국가유산이랑 날씨도 같이 알려줘',
]

export default function Agent() {
  const messages = useAppStore((s) => s.messages)
  const loading = useAppStore((s) => s.chatLoading)
  const sendMessage = useAppStore((s) => s.sendMessage)
  const [input, setInput] = useState('')

  function send(text) {
    if (!text.trim() || loading) return
    sendMessage(text)
    setInput('')
  }

  return (
    <>
      <PageHeader icon="robot" title="이야기꾼 AI" subtitle="신화 · 관광 · 날씨 · 국가유산 도구를 스스로 골라 쓰는 에이전트" />
      <Card className="chat-box mb-3">
        <Card.Body>
          {messages.length === 0 && (
            <div className="d-flex flex-column gap-2 align-items-start">
              <div className="text-body-secondary">이렇게 물어보세요</div>
              {SUGGESTIONS.map((s) => (
                <Button key={s} size="sm" variant="outline-info" onClick={() => send(s)}>{s}</Button>
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
        </Card.Body>
      </Card>
      <Form onSubmit={(e) => { e.preventDefault(); send(input) }}>
        <InputGroup>
          <Form.Control value={input} onChange={(e) => setInput(e.target.value)} placeholder="질문을 입력하세요" />
          <Button type="submit" disabled={loading}><i className="bi bi-send" /></Button>
        </InputGroup>
      </Form>
    </>
  )
}
