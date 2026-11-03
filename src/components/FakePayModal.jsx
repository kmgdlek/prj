import { useEffect, useState } from 'react'
import { Button, Form, Modal, Nav, ProgressBar, Spinner } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import { won } from '../lib/format'

// 가상 결제창 — 발표·시연용. 실제 결제는 되지 않고, 카드번호·비밀번호 같은 정보는 입력받지도 저장하지도 않는다 (입력칸이 아예 없다).
// 특정 결제 회사를 흉내 내지 않도록 이름·로고는 모두 이 서비스의 가상 표시를 쓴다.
// 흐름: 결제 수단 고르기 → 결제하기 → 승인 중(2단계) → 승인(주문 저장) 또는 실패
const METHODS = [
  { key: 'card', icon: 'credit-card-2-front', label: '카드' },
  { key: 'bank', icon: 'bank', label: '계좌이체' },
  { key: 'easy', icon: 'phone', label: '탐라페이' },
]

export default function FakePayModal({ show, amount, summary, onClose, onPay }) {
  const [method, setMethod] = useState('card')
  const [failTest, setFailTest] = useState(false)
  const [phase, setPhase] = useState('pick')      // pick → paying → done | failed
  const [step, setStep] = useState(0)             // 승인 중 단계 (0 결제 요청, 1 승인 확인)
  const [reason, setReason] = useState('')
  const [paid, setPaid] = useState(0)             // 결제를 시작한 순간의 금액 (주문이 저장되면 장바구니가 비어 amount 가 0 이 되므로)

  useEffect(() => { if (show) { setPhase('pick'); setStep(0); setReason(''); setFailTest(false) } }, [show])

  async function pay() {
    setPaid(amount); setPhase('paying'); setStep(0)
    const t = setTimeout(() => setStep(1), 900)
    const r = await onPay({ method, fail: failTest })
    clearTimeout(t)
    if (r.ok) setPhase('done'); else { setReason(r.reason ?? '결제가 승인되지 않았어요'); setPhase('failed') }
  }
  const paying = phase === 'paying'

  return (
    <Modal show={show} onHide={paying ? undefined : onClose} centered backdrop={paying ? 'static' : true} keyboard={!paying} className="pay-modal">
      <Modal.Header closeButton={!paying} className="border-0 pb-0">
        <Modal.Title className="fs-5 fw-bold">결제하기</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {phase === 'pick' && (
          <>
            <div className="pay-amount mb-3">
              <div className="small text-body-secondary text-truncate">{summary}</div>
              <div className="fs-2 fw-bold">{won(amount)}</div>
            </div>
            <Nav variant="pills" fill className="mb-3" activeKey={method} onSelect={setMethod}>
              {METHODS.map((m) => <Nav.Item key={m.key}><Nav.Link eventKey={m.key}><i className={`bi bi-${m.icon} me-1`} />{m.label}</Nav.Link></Nav.Item>)}
            </Nav>
            {method === 'card' && (
              <div className="pay-card mb-2" aria-label="테스트 카드">
                <div className="small opacity-75">탐라 테스트 카드</div>
                <div className="pay-card-no">•••• •••• •••• 0000</div>
                <div className="d-flex justify-content-between small opacity-75"><span>TAMRA DEMO</span><span>12 / 99</span></div>
              </div>
            )}
            {method === 'bank' && (
              <div className="pay-box mb-2"><i className="bi bi-bank fs-3" /><div><div className="fw-bold">가상 계좌로 이체</div><div className="small text-body-secondary">탐라은행(가상) 000-0000-0000 · 예금주 탐라신화</div></div></div>
            )}
            {method === 'easy' && (
              <div className="pay-box mb-2"><i className="bi bi-fingerprint fs-3" /><div><div className="fw-bold">탐라페이로 결제</div><div className="small text-body-secondary">생체 인증으로 승인한 것처럼 보여 줘요 (가상)</div></div></div>
            )}
            <Form.Check type="switch" id="pay-fail" className="small mt-3" label="결제 실패 상황 보여 주기 (발표용)" checked={failTest} onChange={(e) => setFailTest(e.target.checked)} />
            <Button className="w-100 mt-3" size="lg" onClick={pay}><i className="bi bi-lock-fill me-2" />{won(amount)} 결제하기</Button>
          </>
        )}

        {paying && (
          <div className="text-center py-4">
            <Spinner animation="border" variant="primary" />
            <div className="fw-bold mt-3">{step === 0 ? '결제를 요청하는 중…' : '승인을 확인하는 중…'}</div>
            <ProgressBar now={step === 0 ? 40 : 85} animated className="mt-3" style={{ height: 6 }} />
            <div className="small text-body-secondary mt-2">창을 닫지 말고 잠시만 기다려 주세요 (가상)</div>
          </div>
        )}

        {phase === 'done' && (
          <div className="text-center py-3">
            <i className="bi bi-check-circle-fill text-success" style={{ fontSize: '3.5rem' }} />
            <h5 className="fw-bold mt-2">결제가 승인됐어요</h5>
            <p className="text-body-secondary mb-3">{won(paid)} ·<br />주문이 접수됐고 배송이 곧 시작돼요.</p>
            <div className="d-grid gap-2">
              <Button as={Link} to="/orders" onClick={onClose}><i className="bi bi-receipt me-1" />주문 내역 보기</Button>
              <Button variant="outline-secondary" onClick={onClose}>계속 쇼핑하기</Button>
            </div>
          </div>
        )}

        {phase === 'failed' && (
          <div className="text-center py-3">
            <i className="bi bi-x-circle-fill text-danger" style={{ fontSize: '3.5rem' }} />
            <h5 className="fw-bold mt-2">결제가 완료되지 않았어요</h5>
            <p className="text-body-secondary mb-3">{reason}<br />주문은 만들어지지 않았고, 장바구니는 그대로예요.</p>
            <div className="d-grid gap-2">
              <Button onClick={() => { setFailTest(false); setPhase('pick') }}><i className="bi bi-arrow-repeat me-1" />다시 시도</Button>
              <Button variant="outline-secondary" onClick={onClose}>닫기</Button>
            </div>
          </div>
        )}
      </Modal.Body>
    </Modal>
  )
}
