import { useState } from 'react'
import { Alert, Badge, Button, Card, Form, Table } from 'react-bootstrap'
import PageHeader from '../components/PageHeader'
import { PRODUCTS, basePrice, isSudden, salePrice, surgePct } from '../../server/products'
import { won, wonCompact } from '../lib/format'
import { useAppStore } from '../store/useAppStore'

const DURATIONS = [{ m: 10, label: '10분' }, { m: 30, label: '30분' }, { m: 60, label: '1시간' }, { m: 180, label: '3시간' }]
const hhmm = (t) => new Date(t).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })

// 관리자 전용 — 상품별 지금 시세를 직접 정한다. 정한 가격은 모든 접속자에게 15초 안에 반영되고, 정한 시간이 지나면 원래 시세로 돌아간다
export default function Admin() {
  const { overrideRows, setPriceOverride, clearPriceOverride, grantPoints, pointGrants, toast } = useAppStore()
  const [pts, setPts] = useState('1000000000')                // 지급할 적립금
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
  async function give(amount) {
    const n = Math.round(Number(amount))
    if (!Number.isFinite(n) || n === 0 || Math.abs(n) > 9e15) return toast('0이 아닌 금액을 넣어 주세요', 'warning')
    setBusy('points')
    try { await grantPoints(n); toast(`적립금 ${n > 0 ? '' : '-'}${wonCompact(Math.abs(n))}을 ${n > 0 ? '지급' : '회수'}했어요`) } catch (e) { toast(e.message, 'danger') } finally { setBusy('') }
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
        가격을 넣고 <b>적용</b>을 누르면 선택한 시간 동안 그 가격으로 팔려요. 시간이 지나거나 <b>되돌리기</b>를 누르면 원래 시세(타임특가·급등락)로 돌아가요.
      </Alert>
      <Card className="mb-4"><Card.Body>
        <h6 className="fw-bold mb-1"><i className="bi bi-coin me-1 text-primary" />내 적립금 지급</h6>
        <p className="small text-body-secondary mb-2">관리자만 쓸 수 있어요. 지급한 적립금은 마이페이지 적립금 내역에 남고, 결제할 때 그대로 쓸 수 있어요. (지금까지 지급 {pointGrants.length}번, 합계 {wonCompact(pointGrants.reduce((s, g) => s + Number(g.amount), 0))})</p>
        <div className="d-flex gap-2 flex-wrap align-items-center">
          <Form.Control type="number" step="1000" style={{ maxWidth: 220 }} value={pts} onChange={(e) => setPts(e.target.value)} aria-label="지급할 적립금" />
          {[['10억', 1000000000], ['1억', 100000000], ['100만', 1000000]].map(([label, v]) => <Button key={label} size="sm" variant="outline-secondary" onClick={() => setPts(String(v))}>{label}</Button>)}
          <Button disabled={busy === 'points'} onClick={() => give(pts)}>지급하기</Button>
        </div>
        <div className="small text-body-secondary mt-1">= {Number(pts) ? wonCompact(Number(pts)) : '-'} (마이너스 금액은 회수)</div>
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
