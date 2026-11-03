import { useEffect, useState } from 'react'
import { Button, Form, Modal, ProgressBar, Spinner } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import { won } from '../lib/format'

// 가상 결제창 — 발표·시연용. 실제 결제는 되지 않고, 카드번호·비밀번호 같은 정보는 입력받지도 저장하지도 않는다 (입력칸이 아예 없다).
// 특정 결제 회사를 흉내 내지 않도록 이름·로고는 모두 이 서비스의 가상 표시를 쓴다.
// 흐름: 결제 수단 고르기 → 결제하기 → 승인 중(2단계) → 승인(주문 저장) 또는 실패
const METHODS = [
  { key: 'card', icon: 'credit-card', label: '신용카드' },
  { key: 'bank', icon: 'bank', label: '계좌이체' },
  { key: 'easy', icon: 'phone', label: '간편결제' },
]
// 실제 회사 이름은 쓰지 않고 이 서비스의 가상 이름만 쓴다
const CHOICES = {
  card: ['한라카드', '오름카드', '바당카드', '감귤카드', '동백카드', '유채카드', '올레카드', '해녀카드', '별빛카드', '설문대카드', '돌담카드', '그 외 카드'],
  bank: ['탐라은행', '한라은행', '오름은행', '바당은행', '감귤은행', '동백은행', '올레은행', '유채은행'],
  easy: ['탐라페이', '오름페이', '바당페이', '감귤페이', '한라페이', '별빛페이'],
}

export default function FakePayModal({ show, amount, summary, onClose, onPay }) {
  const [method, setMethod] = useState('card')
  const [choice, setChoice] = useState('')        // 고른 카드사·은행·간편결제
  const [agree, setAgree] = useState({ a: false, b: false })
  const [failTest, setFailTest] = useState(false)
  const [phase, setPhase] = useState('pick')      // pick → paying → done | failed
  const [step, setStep] = useState(0)             // 승인 중 단계 (0 결제 요청, 1 승인 확인)
  const [reason, setReason] = useState('')
  const [paid, setPaid] = useState(0)             // 결제를 시작한 순간의 금액 (주문이 저장되면 장바구니가 비어 amount 가 0 이 되므로)

  useEffect(() => { if (show) { setPhase('pick'); setStep(0); setReason(''); setFailTest(false); setChoice(''); setAgree({ a: false, b: false }) } }, [show])

  async function pay() {
    setPaid(amount); setPhase('paying'); setStep(0)
    const t = setTimeout(() => setStep(1), 900)
    const r = await onPay({ method, choice, fail: failTest })
    clearTimeout(t)
    if (r.ok) setPhase('done'); else { setReason(r.reason ?? '결제가 승인되지 않았어요'); setPhase('failed') }
  }
  const paying = phase === 'paying'
  const allAgree = agree.a && agree.b
  const ready = allAgree && Boolean(choice)
  const pickMethod = (k) => { setMethod(k); setChoice('') }

  return (
    <Modal show={show} onHide={paying ? undefined : onClose} centered backdrop={paying ? 'static' : true} keyboard={!paying} className="pay-modal" dialogClassName="pay-dialog">
      <Modal.Body className="p-0">
        {phase === 'pick' && (
          <div className="pay-win">
            <nav className="pay-side" aria-label="결제 수단">
              {METHODS.map((m) => (
                <button key={m.key} type="button" className={method === m.key ? 'on' : ''} aria-current={method === m.key} onClick={() => pickMethod(m.key)}>
                  <i className={`bi bi-${m.icon}`} />{m.label}
                </button>
              ))}
            </nav>

            <section className="pay-main">
              <div className="pay-brand"><i className="bi bi-shield-check me-1" />탐라결제 <span>안전하고 편리한 결제입니다.</span></div>

              <div className="pay-terms">
                <Form.Check type="checkbox" id="pay-all" label="전체동의" checked={allAgree} onChange={(e) => setAgree({ a: e.target.checked, b: e.target.checked })} className="fw-bold" />
                <Form.Check type="checkbox" id="pay-a" label="전자금융거래 이용약관 동의" checked={agree.a} onChange={(e) => setAgree((g) => ({ ...g, a: e.target.checked }))} />
                <Form.Check type="checkbox" id="pay-b" label="개인정보 수집 및 이용 동의" checked={agree.b} onChange={(e) => setAgree((g) => ({ ...g, b: e.target.checked }))} />
              </div>

              <div className="pay-grid" role="radiogroup" aria-label={METHODS.find((m) => m.key === method).label}>
                {CHOICES[method].map((n) => (
                  <button key={n} type="button" role="radio" aria-checked={choice === n} className={choice === n ? 'on' : ''} onClick={() => setChoice(n)}>{n}</button>
                ))}
              </div>
            </section>

            <aside className="pay-info">
              <button type="button" className="pay-x" onClick={onClose} aria-label="닫기"><i className="bi bi-x-lg" /></button>
              <div className="pay-brand-r">탐라신화 3D</div>
              <dl>
                <dt>상품명</dt><dd className="text-truncate">{summary}</dd>
                <dt>결제수단</dt><dd>{choice || METHODS.find((m) => m.key === method).label}</dd>
                <dt>결제금액</dt><dd className="pay-won">{won(amount)}</dd>
              </dl>
              <div className="mt-auto">
                <button type="button" className="pay-go" disabled={!ready} onClick={pay}>결제하기</button>
                <button type="button" className="pay-close" onClick={onClose}>닫기</button>
                <Form.Check type="switch" id="pay-fail" className="small mt-3 pay-fail" label="결제 실패 보여 주기" checked={failTest} onChange={(e) => setFailTest(e.target.checked)} />
              </div>
            </aside>
          </div>
        )}

        {paying && (
          <div className="text-center p-5">
            <Spinner animation="border" variant="primary" />
            <div className="fw-bold mt-3">{step === 0 ? '결제를 요청하는 중…' : '승인을 확인하는 중…'}</div>
            <ProgressBar now={step === 0 ? 40 : 85} animated className="mt-3" style={{ height: 6 }} />
          </div>
        )}

        {phase === 'done' && (
          <div className="text-center p-5">
            <i className="bi bi-check-circle-fill text-success" style={{ fontSize: '3.5rem' }} />
            <h5 className="fw-bold mt-2">결제가 승인됐어요</h5>
            <p className="text-body-secondary mb-3">{won(paid)}<br />주문이 접수됐고 배송이 곧 시작돼요.</p>
            <div className="d-grid gap-2">
              <Button as={Link} to="/orders" onClick={onClose}><i className="bi bi-receipt me-1" />주문 내역 보기</Button>
              <Button variant="outline-secondary" onClick={onClose}>계속 쇼핑하기</Button>
            </div>
          </div>
        )}

        {phase === 'failed' && (
          <div className="text-center p-5">
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
