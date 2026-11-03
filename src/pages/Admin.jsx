import { useState } from 'react'
import { Alert, Badge, Button, Card, Col, Form, Row, Table } from 'react-bootstrap'
import PageHeader from '../components/PageHeader'
import { PRODUCTS, basePrice, isSudden, salePrice, surgePct } from '../../server/products'
import { won } from '../lib/format'
import { useAppStore } from '../store/useAppStore'

const TAPS = [1000, 5000, 10000]
const DURATIONS = [{ m: 10, label: '10분' }, { m: 30, label: '30분' }, { m: 60, label: '1시간' }, { m: 180, label: '3시간' }]
const hhmm = (t) => new Date(t).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })

// 관리자 전용 — 상품별 지금 시세를 직접 정한다. 정한 가격은 모든 접속자에게 15초 안에 반영되고, 정한 시간이 지나면 원래 시세로 돌아간다
export default function Admin() {
  const { overrideRows, setPriceOverride, clearPriceOverride, grantPoints, toast } = useAppStore()
  const [amount, setAmount] = useState('')               // 지급할 적립금
  const [taps, setTaps] = useState({})                   // 빠른 버튼을 누른 횟수 { 1000: 3 }
  const [toEmail, setToEmail] = useState('')
  const [reason, setReason] = useState('')
  const slot = useAppStore((s) => s.slot)
  useAppStore((s) => s.priceVer)
  const [input, setInput] = useState({})      // { [id]: { price, minutes } }
  const [busy, setBusy] = useState('')
  const rowOf = (id) => overrideRows.find((r) => r.product_id === id)
  const get = (id) => input[id] ?? { price: '', minutes: 30 }
  const set = (id, patch) => setInput((m) => ({ ...m, [id]: { ...get(id), ...patch } }))

  async function run(id, fn, okMsg) {
    setBusy(id)
    try { await fn(); toast(okMsg) } catch (e) { toast(e.message, 'danger') } finally { setBusy('') }
  }
  // 빠른 금액 버튼은 누를 때마다 금액에 더해진다 (연속으로 누르면 +1,000 × 3 처럼 쌓인다)
  const tap = (v) => { setAmount((a) => String((Number(a) || 0) + v)); setTaps((t) => ({ ...t, [v]: (t[v] ?? 0) + 1 })) }
  async function give() {
    const n = Math.round(Number(amount)), who = toEmail.trim()
    if (!Number.isFinite(n) || n === 0 || Math.abs(n) > 9e15) return toast('0이 아닌 금액을 넣어 주세요', 'warning')
    if (who && !window.confirm(`${who} 님에게 적립금 ${won(Math.abs(n))}을 ${n > 0 ? '지급' : '회수'}할까요?`)) return
    setBusy('points')
    try {
      const name = await grantPoints({ email: who, amount: n, reason: reason.trim() || '관리자 지급' })
      toast(`${name}님에게 적립금 ${won(Math.abs(n))}을 ${n > 0 ? '지급' : '회수'}했어요`)
      setAmount(''); setTaps({})
    } catch (e) { toast(e.message, 'danger') } finally { setBusy('') }
  }
  function apply(p) {
    const { price, minutes } = get(p.id), n = Math.round(Number(price))
    if (!Number.isFinite(n) || n < 10) return toast('10원 이상의 가격을 넣어 주세요', 'warning')
    run(p.id, () => setPriceOverride(p.id, n, minutes), `${p.name} 시세를 ${won(n)}으로 바꿨어요`)
  }

  return (
    <>
      <PageHeader icon="sliders" title="시세 관리" subtitle="관리자만 볼 수 있어요. 정한 가격은 모든 사용자에게 바로 적용돼요" />
      <Alert variant="info" className="small">
        가격을 넣고 <b>적용</b>을 누르면 그 가격이 <b>출발점</b>이 돼요. 그 뒤로는 시세가 움직이는 만큼 알아서 오르내리고(타임특가·급등락·구매 수요), 선택한 시간이 지나거나 <b>되돌리기</b>를 누르면 원래 시세로 돌아가요.
      </Alert>
      <Card className="mb-4"><Card.Body>
        <h6 className="fw-bold mb-1"><i className="bi bi-coin me-1 text-primary" />적립금 지급</h6>
        <p className="small text-body-secondary mb-3">관리자만 쓸 수 있어요. 받는 사람 이메일을 적으면 그 사람에게, 비워 두면 내 계정에 지급해요. 지급하면 그 사람의 적립금 내역에 남고 결제에 그대로 쓸 수 있어요.</p>
        <Row className="g-2 mb-2">
          <Col md={6}><Form.Control type="email" placeholder="받는 사람 이메일 (비우면 나)" value={toEmail} onChange={(e) => setToEmail(e.target.value)} aria-label="받는 사람 이메일" /></Col>
          <Col md={6}><Form.Control placeholder="사유 (선택, 기본: 관리자 지급)" maxLength={40} value={reason} onChange={(e) => setReason(e.target.value)} aria-label="지급 사유" /></Col>
        </Row>
        <div className="d-flex gap-2 flex-wrap align-items-center mb-2">
          <Form.Control type="number" step="100" min="0" style={{ maxWidth: 180 }} value={amount} placeholder="금액" onChange={(e) => { setAmount(e.target.value); setTaps({}) }} aria-label="지급할 적립금" />
          {TAPS.map((v) => <Button key={v} size="sm" variant="outline-primary" onClick={() => tap(v)}>+{v.toLocaleString('ko-KR')}</Button>)}
          <Button size="sm" variant="link" className="text-body-secondary" onClick={() => { setAmount(''); setTaps({}) }}>초기화</Button>
        </div>
        <div className="d-flex gap-2 flex-wrap align-items-center mb-3" style={{ minHeight: 28 }}>
          {Object.entries(taps).map(([v, n]) => <Badge key={v} bg="primary" className="fw-normal">+{Number(v).toLocaleString('ko-KR')} × {n}</Badge>)}
          <span className="fw-bold ms-1">{Number(amount) ? `= ${won(Number(amount))}` : ''}</span>
        </div>
        <Button disabled={busy === 'points'} onClick={give}><i className="bi bi-send me-1" />{toEmail.trim() ? `${toEmail.trim()} 님에게 지급` : '내 계정에 지급'}</Button>
      </Card.Body></Card>
      <div className="table-responsive">
        <Table hover align="middle" className="small">
          <thead><tr><th>상품</th><th className="text-end">일반판매가</th><th className="text-end">지금 시세</th><th style={{ minWidth: 330 }}>직접 정하기</th></tr></thead>
          <tbody>
            {PRODUCTS.map((p) => {
              const o = rowOf(p.id), s = surgePct(p, slot), cur = get(p.id)
              return (
                <tr key={p.id}>
                  <td className="fw-bold">{p.emoji} {p.name}</td>
                  <td className="text-end text-body-secondary">{won(p.price)}</td>
                  <td className="text-end">
                    <div className="fw-bold">{won(salePrice(p, slot))}</div>
                    {o ? <Badge bg="warning" text="dark">관리자 설정 · {hhmm(o.until)}까지</Badge>
                      : s !== 0 ? <Badge bg={s > 0 ? 'danger' : 'primary'}>{isSudden(p, slot) ? (s > 0 ? '급등' : '급락') : (s > 0 ? '서서히 상승' : '서서히 하락')} {s > 0 ? '+' : ''}{s}%</Badge> : null}
                  </td>
                  <td>
                    <div className="d-flex gap-1 flex-wrap">
                      <Form.Control size="sm" type="number" min="10" step="10" placeholder={`예) ${won(basePrice(p))}`} value={cur.price} style={{ width: 120 }}
                        onChange={(e) => set(p.id, { price: e.target.value })} />
                      <Form.Select size="sm" value={cur.minutes} style={{ width: 90 }} onChange={(e) => set(p.id, { minutes: Number(e.target.value) })}>
                        {DURATIONS.map((d) => <option key={d.m} value={d.m}>{d.label}</option>)}
                      </Form.Select>
                      <Button size="sm" disabled={busy === p.id} onClick={() => apply(p)}>적용</Button>
                      {o && <Button size="sm" variant="outline-secondary" disabled={busy === p.id} onClick={() => run(p.id, () => clearPriceOverride(p.id), '원래 시세로 되돌렸어요')}>되돌리기</Button>}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </Table>
      </div>
    </>
  )
}
