import { MYTHS } from '../../server/myths'
import { PRODUCTS, basePrice, dropPct, flashRate, isSudden, salePrice, surgePct } from '../../server/products'
import { weatherKind, WEATHER_LABEL } from './weather'
import { won } from './format'
import { stageOf } from './order'

// ── 알림 설정 ─────────────────────────────────────────────
// enabled = 알림 끄기/켜기(전체). 그 밑에 세부 항목. 세부 항목은 전체가 꺼져 있으면 의미가 없다.
export const DEFAULT_PREFS = {
  enabled: true,
  deal: true,          // 추천 물건: 타임특가·급락 상품
  favPrice: true,      // 찜한 상품 가격이 내려갔을 때
  favStock: true,      // 찜한 상품 재고가 얼마 안 남았을 때
  order: true,         // 주문한 상품의 상품준비중·배송중·배송완료
  points: true,        // 관리자가 적립금을 지급했을 때
  surge: true,         // 시세가 크게 오르거나 내렸을 때
  place: true,         // 추천 장소: 날씨에 맞춘 신화 장소
  kinds: ['신화', '전설', '문화·자연'],   // 추천받을 장소 분류
  gap: 10,             // 추천 물건 알림 사이 최소 간격(분)
  toast: true,         // 새 알림이 오면 화면 아래에 잠깐 알려 주기
}
export const GAPS = [{ min: 3, label: '자주 (3분)' }, { min: 10, label: '보통 (10분)' }, { min: 30, label: '가끔 (30분)' }]
// 설정 화면이 그리는 세부 항목 목록 [키, 제목, 설명]
export const PREF_GROUPS = [
  { title: '추천 물건', icon: 'bag-heart', items: [
    ['deal', '타임특가·급락 상품 추천', '지금 많이 싸진 상품을 골라 알려 줘요'],
    ['favPrice', '찜한 상품 가격 하락', '하트를 누른 상품이 평소보다 싸지면 알려 줘요'],
    ['favStock', '찜한 상품 재고 부족', '남은 수량이 5개 이하가 되면 알려 줘요'],
    ['surge', '시세 급등·급락', '가격이 50% 넘게 움직이는 상품이 생기면 알려 줘요'],
  ] },
  { title: '주문·배송', icon: 'truck', items: [
    ['order', '주문 진행 상태', '상품 준비 중, 배송 시작, 배송 완료가 되면 알려 줘요'],
    ['points', '적립금 지급', '관리자가 적립금을 지급하면 알려 줘요'],
  ] },
  { title: '추천 장소', icon: 'geo-alt', items: [
    ['place', '날씨 맞춤 장소 추천', '지금 제주 날씨에 어울리는 신화 장소를 6시간마다 한 곳 추천해요'],
  ] },
]

// ── 알림 만들기 ───────────────────────────────────────────
const MAX = 50
const HOUR = 3600000
const hash = (str) => { let h = 2166136261; for (const ch of str) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) } return h >>> 0 }

// 지금 상황(시세·찜·재고·날씨)을 보고 새로 보낼 알림을 돌려준다. 이미 보낸 알림(같은 id)은 다시 만들지 않는다.
// 한 번에 너무 많이 쏟아지지 않도록 종류마다 개수를 제한한다.
export function buildNotifications({ now, slot, stockSlot, favorites, weather, prefs, notifs, stockOf, orders = [], grants = [], seen = [], lastDealAt = 0 }) {
  const have = new Set([...notifs.map((n) => n.id), ...seen])          // 지워서 목록에서 사라진 알림도 '이미 보낸 것'으로 쳐서 다시 만들지 않는다
  const out = []
  const add = (n) => { if (!have.has(n.id)) { have.add(n.id); out.push({ ...n, at: now, read: false }) } }
  const favIds = favorites.filter((f) => f.source === 'product').map((f) => f.item_id)
  const favProducts = PRODUCTS.filter((p) => favIds.includes(p.id))

  // 적립금 지급: 최근 7일 안에 받은 지급 기록 (지급마다 한 번)
  if (prefs.points) {
    for (const g of grants) {
      if (now - new Date(g.created_at).getTime() > 7 * 24 * HOUR) continue
      const amt = Number(g.amount)
      add({ id: `grant:${g.id}`, topic: 'points', tag: '적립금', emoji: '🪙', title: `적립금 ${won(Math.abs(amt))}이 ${amt > 0 ? '지급' : '회수'}됐어요`, body: g.reason ?? '관리자 지급', to: '/mypage?tab=points' })
    }
  }

  // 주문·배송: 주문한 지 1시간 안의 주문이 상품준비중·배송중·배송완료 단계가 되면 한 번씩 (현재 단계만 알려서, 앱을 닫아 둔 사이 지나간 단계는 쏟아내지 않는다)
  if (prefs.order) {
    const MSG = {
      1: { emoji: '📦', title: '상품 준비 중이에요', body: (l) => `${l} 주문을 포장하고 있어요` },
      2: { emoji: '🚚', title: '배송이 시작됐어요', body: (l) => `${l} 주문이 배송 중이에요` },
      3: { emoji: '✅', title: '배송이 완료됐어요', body: (l) => `${l}이(가) 도착했어요. 후기를 남겨 보세요` },
    }
    for (const o of orders) {
      if (now - new Date(o.created_at).getTime() > HOUR) continue
      const stage = stageOf(o, now), m = MSG[stage]
      if (!m) continue                                              // 취소·환불 접수, 또는 아직 결제완료 단계
      const first = o.items?.[0]?.name ?? '주문한 상품', label = o.items?.length > 1 ? `${first} 외 ${o.items.length - 1}건` : first
      add({ id: `order:${o.id}:${stage}`, topic: 'order', tag: '주문·배송', emoji: m.emoji, title: m.title, body: m.body(label), to: '/orders' })
    }
  }

  // 추천 물건: 지금 가장 싼 상품 한 개 (최근 알림과 gap 분 이상 떨어져 있을 때만)
  if (prefs.deal) {
    if (!lastDealAt || now - lastDealAt >= prefs.gap * 60000) {
      const best = PRODUCTS
        .filter((p) => flashRate(p, slot) >= 10 || surgePct(p, slot) <= -30)
        .sort((a, b) => dropPct(b, slot) - dropPct(a, slot))[0]
      if (best) {
        const pct = dropPct(best, slot)
        add({ id: `deal:${best.id}:${Math.floor(slot / 30)}`, topic: 'deal', tag: '추천 물건', emoji: best.emoji,
          title: `${best.name}, 평소보다 ${pct}% 싸요`, body: `평소 ${won(basePrice(best))} → 지금 ${won(salePrice(best, slot))}`, to: `/shop/${best.id}` })
      }
    }
  }
  // 찜한 상품: 가격 하락 · 재고 부족
  if (prefs.favPrice) {
    for (const p of favProducts) {
      if (salePrice(p, slot) <= basePrice(p) * 0.92) {
        add({ id: `fav:${p.id}:${Math.floor(slot / 30)}`, topic: 'fav', tag: '찜한 상품', emoji: '💝',
          title: `찜한 ${p.name} 가격이 내려갔어요`, body: `지금 ${won(salePrice(p, slot))} (평소 ${won(basePrice(p))})`, to: `/shop/${p.id}` })
      }
    }
  }
  if (prefs.favStock) {
    for (const p of favProducts) {
      const left = stockOf(p.id)
      if (left > 0 && left <= 5) {
        add({ id: `stock:${p.id}:${stockSlot}`, topic: 'stock', tag: '재고', emoji: '📦',
          title: `찜한 ${p.name}이(가) ${left}개 남았어요`, body: '품절되기 전에 확인해 보세요', to: `/shop/${p.id}` })
      }
    }
  }
  // 시세 급등·급락: 사건 하나(2시간 구간)당 한 번, 한 번에 최대 2개
  if (prefs.surge) {
    PRODUCTS.filter((p) => Math.abs(surgePct(p, slot)) >= 50).slice(0, 2).forEach((p) => {
      const pct = surgePct(p, slot), up = pct > 0
      add({ id: `surge:${p.id}:${Math.floor(slot / 120)}`, topic: 'surge', tag: '시세', emoji: up ? '🔥' : '💧',
        title: `${p.name} 가격이 ${Math.abs(pct)}% ${up ? (isSudden(p, slot) ? '급등' : '오르는 중') : (isSudden(p, slot) ? '급락' : '내리는 중')}이에요`,
        body: `지금 ${won(salePrice(p, slot))}`, to: `/shop/${p.id}` })
    })
  }
  // 추천 장소: 6시간마다 한 곳. 장소는 시간 구간 번호로 정해지는 고정된 선택 (날씨에 맞춰 문구만 달라진다)
  if (prefs.place) {
    const pool = MYTHS.filter((m) => prefs.kinds.includes(m.kind))
    if (pool.length && weather?.제주시) {                       // 날씨 맞춤이라 날씨가 도착한 뒤에 만든다
      const block = Math.floor(now / (6 * HOUR)), m = pool[hash(`place:${block}`) % pool.length]
      const kind = weatherKind(weather?.제주시), label = WEATHER_LABEL[kind]
      const outdoor = kind === 'clear' || kind === 'cloudy'
      add({ id: `place:${block}`, topic: 'place', tag: '추천 장소', emoji: outdoor ? '🌿' : '📖', mythId: m.id,
        title: outdoor ? `오늘 제주는 ${label}, ${m.title}에 가 볼까요?` : `${label} 오는 날엔 ${m.title} 이야기부터 읽어 봐요`,
        body: `${m.place} · ${m.summary}`, to: outdoor ? '/map' : '/myths' })
    }
  }
  return out.slice(0, 5)
}

export const mergeNotifs = (fresh, notifs) => [...fresh, ...notifs].slice(0, MAX)

// 방금 · N분 전 · N시간 전 · 날짜
export function ago(t, now = Date.now()) {
  const m = Math.floor((now - t) / 60000)
  if (m < 1) return '방금'
  if (m < 60) return `${m}분 전`
  if (m < 1440) return `${Math.floor(m / 60)}시간 전`
  return new Date(t).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })
}
