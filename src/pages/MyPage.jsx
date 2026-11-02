import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Accordion, Alert, Badge, Button, Card, Col, Form, InputGroup, ListGroup, Nav, Row, Table } from 'react-bootstrap'
import PageHeader from '../components/PageHeader'
import Avatar from '../components/Avatar'
import LevelBadge from '../components/LevelBadge'
import OrderTracker from '../components/OrderTracker'
import { Stars } from '../components/StarRating'
import { FavButton } from '../components/ItemCard'
import { Empty } from '../components/Status'
import AdminBadge from '../components/AdminBadge'
import { displayName, useAppStore } from '../store/useAppStore'
import { discountPct, productOf, salePrice } from '../../server/products'
import { STATUS, STEPS, stageOf, statusOf } from '../lib/order'
import { couponState, couponText } from '../lib/coupon'
import { pointsSummary } from '../lib/checkout'
import { getRecent } from '../lib/recent'
import { won } from '../lib/format'
import { GAPS, PREF_GROUPS } from '../lib/notify'
import { KINDS } from '../../server/myths'

const TABS = [
  ['summary', 'house', '요약'], ['orders', 'truck', '주문·배송'], ['coupons', 'ticket-perforated', '쿠폰함'],
  ['points', 'coin', '적립금'], ['wish', 'heart', '찜한 상품'], ['recent', 'clock-history', '최근 본 상품'],
  ['reviews', 'chat-square-text', '내 후기'], ['notify', 'bell', '알림 설정'], ['settings', 'gear', '계정 설정'], ['help', 'question-circle', '고객센터'],
]

// 마이페이지 — 쇼핑몰의 "내 정보" 모음. ?tab=coupons 처럼 주소로 바로 열 수 있다
export default function MyPage() {
  const { user, orders, coupons, favorites, reviews, loadOrders, loadCoupons, loadProductImages } = useAppStore()
  const [params, setParams] = useSearchParams()
  const tab = TABS.some(([k]) => k === params.get('tab')) ? params.get('tab') : 'summary'
  const [now, setNow] = useState(Date.now())
  useEffect(() => { loadOrders(); loadCoupons(); loadProductImages() }, [loadOrders, loadCoupons, loadProductImages])
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 15000); return () => clearInterval(t) }, [])

  const pts = pointsSummary(orders, now)
  const available = coupons.filter((c) => couponState(c, now) === 'available').length
  const wish = favorites.filter((f) => f.source === 'product')

  return (
    <>
      <PageHeader icon="person-circle" title="마이페이지" subtitle="내 주문·쿠폰·적립금·계정을 한곳에서" />

      {/* 프로필 요약 */}
      <Card className="mb-3"><Card.Body>
        <Row className="align-items-center g-3">
          <Col xs="auto"><Avatar user={user} size={72} /></Col>
          <Col>
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <LevelBadge part="lv" /><AdminBadge /><h4 className="fw-bold mb-0">{displayName(user)}</h4>
            </div>
            <div className="small text-body-secondary mb-1">{user.email}</div>
            <div style={{ maxWidth: 320 }}><LevelBadge part="name" withProgress /></div>
          </Col>
          <Col md={6} lg={5}>
            <Row className="g-2 text-center">
              <Col xs={3}><Tile label="적립금" value={won(pts.balance)} onClick={() => setParams({ tab: 'points' })} /></Col>
              <Col xs={3}><Tile label="쿠폰" value={`${available}장`} onClick={() => setParams({ tab: 'coupons' })} /></Col>
              <Col xs={3}><Tile label="찜" value={`${wish.length}개`} onClick={() => setParams({ tab: 'wish' })} /></Col>
              <Col xs={3}><Tile label="후기" value={`${reviews.filter((r) => r.user_id === user.id).length}개`} onClick={() => setParams({ tab: 'reviews' })} /></Col>
            </Row>
          </Col>
        </Row>
      </Card.Body></Card>

      <Nav variant="pills" className="mypage-tabs mb-3" activeKey={tab} onSelect={(k) => setParams({ tab: k })}>
        {TABS.map(([k, icon, label]) => (
          <Nav.Item key={k}><Nav.Link eventKey={k}><i className={`bi bi-${icon} me-1`} />{label}</Nav.Link></Nav.Item>
        ))}
      </Nav>

      {tab === 'summary' && <Summary orders={orders} now={now} />}
      {tab === 'orders' && <Summary orders={orders} now={now} />}
      {tab === 'coupons' && <Coupons />}
      {tab === 'points' && <Points orders={orders} pts={pts} now={now} />}
      {tab === 'wish' && <ProductGrid ids={wish.map((f) => f.item_id)} empty="찜한 상품이 없어요. 장터에서 하트를 눌러 보세요." />}
      {tab === 'recent' && <ProductGrid ids={getRecent()} empty="최근 본 상품이 없어요." />}
      {tab === 'reviews' && <MyReviews />}
      {tab === 'notify' && <NotifySettings />}
      {tab === 'settings' && <Settings />}
      {tab === 'help' && <Help />}
    </>
  )
}

function Tile({ label, value, onClick }) {
  return (
    <button type="button" className="mypage-tile" onClick={onClick}>
      <div className="small text-body-secondary">{label}</div>
      <div className="fw-bold">{value}</div>
    </button>
  )
}

// 주문·배송 현황: 단계별 건수 + 최근 주문 3건
function Summary({ orders, now }) {
  const counts = [0, 0, 0, 0]
  let closed = 0
  orders.forEach((o) => { const s = stageOf(o, now); if (s === null) closed += 1; else counts[s] += 1 })
  const recent = orders.slice(0, 3)
  const productImages = useAppStore((s) => s.productImages)
  return (
    <>
      <Row className="g-2 mb-3">
        {STEPS.map((label, i) => (
          <Col key={label} xs={6} md={3}><Card as={Link} to="/orders" className="text-decoration-none text-center h-100"><Card.Body className="py-3">
            <div className="display-6 fw-bold">{counts[i]}</div><div className="small text-body-secondary">{label}</div>
          </Card.Body></Card></Col>
        ))}
      </Row>
      <p className="small text-body-secondary">취소·반품/환불 {closed}건 · <Link to="/orders">전체 주문 내역 보기</Link></p>
      {recent.length === 0 ? <Empty text="아직 주문이 없어요" /> : recent.map((o) => {
        const stage = stageOf(o, now)
        return (
          <Card key={o.id} className="mb-2"><Card.Body>
            <div className="d-flex align-items-center gap-2 mb-2 flex-wrap">
              <strong>주문 #{o.id}</strong>
              <span className="small text-body-secondary">{new Date(o.created_at).toLocaleString('ko-KR')}</span>
              <Badge bg={statusOf(o) === STATUS.placed ? 'primary' : 'secondary'}>{stage === null ? statusOf(o) : STEPS[stage]}</Badge>
              <strong className="ms-auto">{won(o.total)}</strong>
            </div>
            <div className="d-flex gap-2 mb-2">
              {o.items.map((i) => productImages[i.product_id]
                ? <img key={i.product_id} src={productImages[i.product_id].url} alt={i.name} className="cart-thumb" title={`${i.name} × ${i.qty}`} />
                : <span key={i.product_id} className="order-emoji" title={`${i.name} × ${i.qty}`}>{productOf(i.product_id)?.emoji ?? '📦'}</span>)}
            </div>
            {stage !== null && <OrderTracker stage={stage} compact />}
          </Card.Body></Card>
        )
      })}
    </>
  )
}

function Coupons() {
  const { coupons, registerCoupon, toast } = useAppStore()
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const order = { available: 0, used: 1, expired: 2 }
  const list = [...coupons].sort((a, b) => order[couponState(a)] - order[couponState(b)])

  async function register(e) {
    e.preventDefault()
    setBusy(true)
    try { await registerCoupon(code); setCode('') } catch (err) { toast(err.message, 'danger') } finally { setBusy(false) }
  }
  return (
    <>
      <Form onSubmit={register} className="mb-3" style={{ maxWidth: 420 }}>
        <Form.Label className="small fw-bold">쿠폰 코드 등록</Form.Label>
        <InputGroup>
          <Form.Control value={code} onChange={(e) => setCode(e.target.value)} placeholder="예) JEJU10" required />
          <Button type="submit" disabled={busy}>등록</Button>
        </InputGroup>
        <Form.Text>사용할 수 있는 코드: JEJU10 · TAMNA5000 · HALLASAN (코드마다 한 번)</Form.Text>
      </Form>
      {list.length === 0 ? <Empty text="쿠폰이 없어요" /> : (
        <Row xs={1} md={2} className="g-3">
          {list.map((c) => {
            const st = couponState(c)
            return (
              <Col key={c.id}>
                <Card className={`coupon ${st !== 'available' ? 'off' : ''}`}><Card.Body className="d-flex align-items-center gap-3">
                  <div className="coupon-value">{couponText(c).replace(' 할인', '')}</div>
                  <div className="flex-grow-1">
                    <div className="fw-bold">{c.title}</div>
                    <div className="small text-body-secondary">{c.min > 0 ? `${won(c.min)} 이상 주문 시` : '최소 주문금액 없음'} · {new Date(c.expires_at).toLocaleDateString('ko-KR')}까지</div>
                  </div>
                  <Badge bg={st === 'available' ? 'success' : 'secondary'}>{st === 'available' ? '사용 가능' : st === 'used' ? '사용 완료' : '기간 만료'}</Badge>
                </Card.Body></Card>
              </Col>
            )
          })}
        </Row>
      )}
    </>
  )
}

function Points({ orders, pts, now }) {
  const history = useMemo(() => {
    const rows = []
    orders.filter((o) => statusOf(o) === STATUS.placed).forEach((o) => {
      if (o.points_used > 0) rows.push({ at: o.created_at, label: `주문 #${o.id} 사용`, amount: -o.points_used })
      if (o.points_earned > 0) rows.push({ at: o.created_at, label: `주문 #${o.id} ${stageOf(o, now) === 3 ? '적립' : '적립 예정'}`, amount: o.points_earned, pending: stageOf(o, now) !== 3 })
    })
    return rows.sort((a, b) => new Date(b.at) - new Date(a.at))
  }, [orders, now])
  return (
    <>
      <Row className="g-3 mb-3">
        <Col xs={6} md={3}><Card><Card.Body><div className="small text-body-secondary">사용 가능</div><div className="fs-4 fw-bold">{won(pts.balance)}</div></Card.Body></Card></Col>
        <Col xs={6} md={3}><Card><Card.Body><div className="small text-body-secondary">적립 예정</div><div className="fs-4 fw-bold text-body-secondary">{won(pts.pending)}</div></Card.Body></Card></Col>
      </Row>
      <p className="small text-body-secondary">배송완료된 주문의 적립금이 사용 가능해져요. 취소·반품/환불한 주문은 적립도 사용도 없던 일로 돌아가요. 적립률은 등급에 따라 1~5%예요.</p>
      {history.length === 0 ? <Empty text="적립·사용 내역이 없어요" /> : (
        <Table size="sm" className="align-middle">
          <thead><tr><th>날짜</th><th>내용</th><th className="text-end">금액</th></tr></thead>
          <tbody>
            {history.map((h, i) => (
              <tr key={i}>
                <td className="small">{new Date(h.at).toLocaleDateString('ko-KR')}</td>
                <td>{h.label}</td>
                <td className={`text-end fw-bold ${h.amount < 0 ? 'text-danger' : h.pending ? 'text-body-secondary' : 'text-success'}`}>{h.amount > 0 ? '+' : ''}{won(h.amount)}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  )
}

function ProductGrid({ ids, empty }) {
  const { productImages, addToCart } = useAppStore()
  const list = ids.map((id) => productOf(id)).filter(Boolean)
  if (list.length === 0) return <Empty text={empty} />
  return (
    <Row xs={2} md={3} lg={4} className="g-3">
      {list.map((p) => (
        <Col key={p.id}>
          <Card className="h-100 item-card">
            <Link to={`/shop/${p.id}`}>
              {productImages[p.id]
                ? <img src={productImages[p.id].url} alt={p.name} className="product-photo" style={{ height: 110 }} />
                : <div className="product-tile" style={{ height: 110, background: `linear-gradient(135deg, ${p.color}, #1a0b3d)` }}>{p.emoji}</div>}
            </Link>
            <Card.Body className="d-flex flex-column p-2">
              <Link to={`/shop/${p.id}`} className="small fw-bold text-reset text-decoration-none">{p.name}</Link>
              <div className="small mb-2">{discountPct(p) > 0 && <span className="text-danger fw-bold me-1">{discountPct(p)}%</span>}{won(salePrice(p))}</div>
              <div className="d-flex gap-1 mt-auto">
                <FavButton fav={{ source: 'product', id: p.id, title: p.name }} icon="heart" label={false} />
                <Button size="sm" className="flex-fill" onClick={() => addToCart(p.id)}><i className="bi bi-cart-plus" /></Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      ))}
    </Row>
  )
}

function MyReviews() {
  const { user, reviews, deleteReview } = useAppStore()
  const mine = reviews.filter((r) => r.user_id === user.id)
  if (mine.length === 0) return <Empty text="작성한 후기가 없어요. 배송이 끝난 주문에서 후기를 남겨 보세요." />
  return (
    <ListGroup>
      {mine.map((r) => {
        const p = productOf(r.product_id)
        return (
          <ListGroup.Item key={r.id}>
            <div className="d-flex align-items-center gap-2 flex-wrap">
              {p ? <Link to={`/shop/${p.id}`} className="fw-bold text-reset">{p.name}</Link> : r.product_id}
              <Stars value={r.rating} />
              <span className="small text-body-secondary">{new Date(r.created_at).toLocaleDateString('ko-KR')}</span>
              <Button size="sm" variant="outline-danger" className="ms-auto py-0" onClick={() => window.confirm('후기를 지울까요?') && deleteReview(r.id)}>삭제</Button>
            </div>
            <p className="mb-0 mt-1" style={{ whiteSpace: 'pre-wrap' }}>{r.content}</p>
          </ListGroup.Item>
        )
      })}
    </ListGroup>
  )
}

// 계정 설정: 프로필 사진 · 닉네임 · 비밀번호 · 로그아웃
// 알림 설정: 맨 위 스위치로 알림 전체를 끄고 켜고, 그 아래에서 받고 싶은 알림만 고른다 (바꾸면 바로 저장)
function NotifySettings() {
  const { notifPrefs: p, setNotifPrefs, toast } = useAppStore()
  const save = (patch) => setNotifPrefs(patch).catch((e) => toast(e.message, 'danger'))
  const off = !p.enabled
  const toggleKind = (k) => {
    const kinds = p.kinds.includes(k) ? p.kinds.filter((x) => x !== k) : [...p.kinds, k]
    if (kinds.length) save({ kinds })                          // 분류는 최소 하나는 남긴다
  }
  return (
    <Row className="g-3">
      <Col lg={8}>
        <Card className="mb-3"><Card.Body className="d-flex align-items-center gap-3 flex-wrap">
          <i className={`bi bi-bell${off ? '-slash' : ''}-fill fs-2 ${off ? 'text-body-secondary' : 'text-primary'}`} />
          <div className="flex-grow-1" style={{ minWidth: 160 }}>
            <div className="fw-bold">{off ? '알림이 꺼져 있어요' : '알림이 켜져 있어요'}</div>
            <div className="small text-body-secondary">{off ? '새 알림이 오지 않고, 아래 설정은 다시 켜면 적용돼요' : '끄면 추천 물건·장소 알림을 모두 받지 않아요'}</div>
          </div>
          <Button variant={off ? 'primary' : 'outline-danger'} className="text-nowrap" onClick={() => save({ enabled: off })}>
            <i className={`bi bi-bell${off ? '' : '-slash'} me-1`} />{off ? '알림 켜기' : '알림 끄기'}
          </Button>
        </Card.Body></Card>

        <div style={off ? { opacity: .5, pointerEvents: 'none' } : undefined} aria-disabled={off}>
          {PREF_GROUPS.map((g) => (
            <Card key={g.title} className="mb-3"><Card.Body>
              <h6 className="fw-bold mb-3"><i className={`bi bi-${g.icon} me-2 text-primary`} />{g.title}</h6>
              {g.items.map(([k, title, desc]) => (
                <Form.Check key={k} type="switch" id={`np-${k}`} className="mb-3" label={<><span className="fw-bold">{title}</span><div className="small text-body-secondary">{desc}</div></>}
                  checked={!!p[k]} onChange={(e) => save({ [k]: e.target.checked })} />
              ))}
              {g.title === '추천 장소' && (
                <div className="ms-4">
                  <div className="small text-body-secondary mb-1">추천받을 분류</div>
                  <div className="d-flex gap-2 flex-wrap">
                    {KINDS.map((k) => (
                      <Form.Check key={k} inline type="checkbox" id={`nk-${k}`} label={k} checked={p.kinds.includes(k)} disabled={!p.place} onChange={() => toggleKind(k)} />
                    ))}
                  </div>
                </div>
              )}
            </Card.Body></Card>
          ))}

          <Card className="mb-3"><Card.Body>
            <h6 className="fw-bold mb-3"><i className="bi bi-sliders me-2 text-primary" />받는 방식</h6>
            <div className="mb-3">
              <div className="fw-bold">추천 물건 알림 간격</div>
              <div className="small text-body-secondary mb-2">타임특가 추천이 이 간격보다 자주 오지 않아요</div>
              <div className="d-flex gap-3 flex-wrap">
                {GAPS.map((g) => <Form.Check key={g.min} type="radio" name="gap" id={`gap-${g.min}`} label={g.label} checked={p.gap === g.min} onChange={() => save({ gap: g.min })} />)}
              </div>
            </div>
            <Form.Check type="switch" id="np-toast" label={<><span className="fw-bold">팝업으로도 알려 주기</span><div className="small text-body-secondary">새 알림이 오면 화면 아래에 잠깐 보여 줘요</div></>}
              checked={p.toast} onChange={(e) => save({ toast: e.target.checked })} />
          </Card.Body></Card>
        </div>
      </Col>
    </Row>
  )
}

function Settings() {
  const { user, uploadAvatar, removeAvatar, updateNickname, changePassword, signOut, toast } = useAppStore()
  const navigate = useNavigate()
  const fileRef = useRef(null)
  const [nick, setNick] = useState(displayName(user))
  const [pw, setPw] = useState({ current: '', next: '', again: '' })
  const [busy, setBusy] = useState('')
  const [pwError, setPwError] = useState('')

  async function run(key, fn, okMsg) {
    setBusy(key)
    try { await fn(); toast(okMsg) } catch (e) { toast(e.message, 'danger') } finally { setBusy('') }
  }
  async function submitPw(e) {
    e.preventDefault()
    setPwError('')
    if (pw.next.length < 6) return setPwError('새 비밀번호는 6자 이상이어야 해요')
    if (pw.next !== pw.again) return setPwError('새 비밀번호가 서로 달라요')
    if (pw.next === pw.current) return setPwError('현재 비밀번호와 다른 비밀번호를 쓰세요')
    setBusy('pw')
    try { await changePassword({ current: pw.current, next: pw.next }); setPw({ current: '', next: '', again: '' }); toast('비밀번호를 바꿨어요') }
    catch (err) { setPwError(err.message) } finally { setBusy('') }
  }

  return (
    <Row className="g-4">
      <Col md={6}>
        <Card className="mb-3"><Card.Body>
          <h6 className="fw-bold">프로필 사진</h6>
          <div className="d-flex align-items-center gap-3">
            <Avatar user={user} size={88} />
            <div className="d-flex flex-column gap-2">
              <input ref={fileRef} type="file" accept="image/*" hidden
                onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) run('avatar', () => uploadAvatar(f), '프로필 사진을 바꿨어요') }} />
              <Button size="sm" disabled={busy === 'avatar'} onClick={() => fileRef.current?.click()}><i className="bi bi-camera me-1" />{busy === 'avatar' ? '올리는 중...' : '사진 변경'}</Button>
              {user.user_metadata?.avatar_url && <Button size="sm" variant="outline-secondary" onClick={() => run('avatar', removeAvatar, '기본 이미지로 바꿨어요')}>기본 이미지로</Button>}
            </div>
          </div>
          <div className="small text-body-secondary mt-2">정사각형으로 잘라 저장돼요. 큰 사진도 자동으로 줄여요.</div>
        </Card.Body></Card>

        <Card><Card.Body>
          <h6 className="fw-bold">닉네임</h6>
          <Form onSubmit={(e) => { e.preventDefault(); run('nick', () => updateNickname(nick), '닉네임을 바꿨어요') }}>
            <InputGroup>
              <Form.Control required maxLength={20} value={nick} onChange={(e) => setNick(e.target.value)} />
              <Button type="submit" disabled={busy === 'nick' || nick.trim() === displayName(user)}>변경</Button>
            </InputGroup>
          </Form>
          <div className="small text-body-secondary mt-2">이메일: {user.email}</div>
        </Card.Body></Card>
      </Col>

      <Col md={6}>
        <Card className="mb-3"><Card.Body>
          <h6 className="fw-bold">비밀번호 변경</h6>
          <Form onSubmit={submitPw}>
            <Form.Group className="mb-2"><Form.Label className="small">현재 비밀번호</Form.Label>
              <Form.Control type="password" required autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} /></Form.Group>
            <Form.Group className="mb-2"><Form.Label className="small">새 비밀번호</Form.Label>
              <Form.Control type="password" required minLength={6} autoComplete="new-password" placeholder="6자 이상" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} /></Form.Group>
            <Form.Group className="mb-3"><Form.Label className="small">새 비밀번호 확인</Form.Label>
              <Form.Control type="password" required autoComplete="new-password" value={pw.again} onChange={(e) => setPw({ ...pw, again: e.target.value })} /></Form.Group>
            {pwError && <Alert variant="danger" className="py-2">{pwError}</Alert>}
            <Button type="submit" disabled={busy === 'pw'}>{busy === 'pw' ? '변경 중...' : '비밀번호 변경'}</Button>
          </Form>
        </Card.Body></Card>
        <Button variant="outline-secondary" onClick={() => { signOut(); navigate('/') }}><i className="bi bi-box-arrow-right me-1" />로그아웃</Button>
      </Col>
    </Row>
  )
}

const FAQ = [
  ['배송은 얼마나 걸리나요?', '이 앱은 과제용이라 실제 배송이 없어요. 대신 주문 후 시간이 지나면 결제완료 → 상품준비중 → 배송중 → 배송완료로 저절로 넘어갑니다.'],
  ['주문은 언제까지 취소할 수 있나요?', '배송이 시작되기 전(결제완료·상품준비중)까지 취소할 수 있어요. 취소하면 쿠폰·적립금·재고가 되돌아가요.'],
  ['반품/환불은 어떻게 하나요?', '배송완료 후 주문 내역에서 반품/환불을 신청하세요. 사유를 고르면 접수돼요.'],
  ['등급은 어떻게 오르나요?', '누적 구매액(취소·환불 제외)에 따라 일반 → 실버 → 골드 → VIP → VVIP로 올라요. 등급마다 추가 할인, 적립률, 무료배송 기준, 달성 쿠폰이 달라요.'],
  ['적립금은 언제 쓸 수 있나요?', '배송완료된 주문의 적립금이 사용 가능해져요. 결제할 때 상품 금액까지 쓸 수 있고 배송비는 제외예요.'],
  ['쿠폰은 어떻게 받나요?', '가입하면 신규 쿠폰, 등급이 오르면 달성 쿠폰이 자동으로 와요. 쿠폰함에서 코드를 입력해 받을 수도 있어요.'],
]
function Help() {
  return (
    <Accordion>
      {FAQ.map(([q, a], i) => (
        <Accordion.Item key={q} eventKey={String(i)}>
          <Accordion.Header>{q}</Accordion.Header>
          <Accordion.Body>{a}</Accordion.Body>
        </Accordion.Item>
      ))}
    </Accordion>
  )
}
