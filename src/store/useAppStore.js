import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { askAgent, fetchShopImages, fetchWeather, ping } from '../api/client'
import { MAX_PER_ITEM, liveStock, productOf, salePrice, slotOf, stockSlotOf } from '../../server/products'
import { levelOf, totalSpent } from '../lib/level'
import { STATUS } from '../lib/order'
import { DAY, PROMO_CODES, gradeCouponsFor } from '../lib/coupon'
import { calcCheckout, pointsSummary } from '../lib/checkout'
import { resizeToJpeg } from '../lib/image'

const pendingFav = new Set()   // 저장·삭제가 진행 중인 항목 키 (연타 방지)
let authStarted = false        // StrictMode 에서 구독이 두 번 걸리지 않게

// 화면에 보여 줄 이름: 가입 때 적은 닉네임, 없으면 이메일 앞부분
export const displayName = (user) => user?.user_metadata?.nickname || user?.email?.split('@')[0] || ''

// DB 함수(rpc) 호출. SQL 을 아직 실행하지 않아 함수가 없으면 { missing: true } — 그때는 재고 처리를 건너뛴다
async function rpcSafe(name, args) {
  const { data, error } = await supabase.rpc(name, args)
  if (error) {
    const missing = error.code === 'PGRST202' || error.code === '42883' || /could not find the function/i.test(error.message)
    return missing ? { missing: true } : { error }
  }
  return { data }
}

// ── 앱 전체가 함께 쓰는 상태(store) ──────────────────────
// 여러 페이지에서 같이 쓰는 데이터는 여기에 둡니다. (한 페이지에서만 쓰면 useState)
export const useAppStore = create((set, get) => ({
  // ① 로그인 — Supabase Auth (이메일 + 비밀번호). 세션은 Supabase 가 브라우저에 보관
  user: null,
  authReady: false,       // 처음 로그인 상태를 확인하기 전에는 false (깜빡임·잘못된 리다이렉트 방지)
  // 로그인된 사용자의 데이터를 불러온다 (쿠폰 발급이 구매액(주문)에 달려 있어 주문을 먼저)
  loadUserData: async () => {
    await get().loadOrders()
    get().loadCoupons()
    get().loadFavorites({ quiet: true })
    get().loadCart()
  },
  initAuth: async () => {
    if (authStarted) return
    authStarted = true
    get().loadStock(); get().loadReviews()               // 재고·후기는 누구나 볼 수 있어서 로그인 전에도
    if (!supabase) return set({ authReady: true })
    const { data } = await supabase.auth.getSession()
    set({ user: data.session?.user ?? null, authReady: true })
    if (get().user) get().loadUserData()
    supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user ?? null
      const changed = user?.id !== get().user?.id
      set({ user })
      if (!changed) return
      set({ favorites: [], cart: [], orders: [], coupons: [] })     // 다른 사람의 데이터가 남지 않게 비움
      if (user) get().loadUserData()
    })
  },
  signUp: async ({ email, password, nickname }) => {
    if (!supabase) throw new Error('Supabase 설정(.env.local)이 필요해요')
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { nickname: nickname.trim() } } })
    if (error) throw error
    return { needsConfirm: !data.session }              // 이메일 인증을 켜 둔 프로젝트면 세션이 바로 안 생긴다
  },
  signIn: async ({ email, password }) => {
    if (!supabase) throw new Error('Supabase 설정(.env.local)이 필요해요')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  },
  signOut: async () => {
    await supabase?.auth.signOut()
    get().toast('로그아웃했어요', 'secondary')
  },
  // 마이페이지: 닉네임·비밀번호·프로필 사진 (변경되면 Supabase 가 알려 줘서 user 가 자동 갱신된다)
  updateNickname: async (nickname) => {
    const { error } = await supabase.auth.updateUser({ data: { nickname: nickname.trim() } })
    if (error) throw error
  },
  changePassword: async ({ current, next }) => {
    const { error: e1 } = await supabase.auth.signInWithPassword({ email: get().user.email, password: current })
    if (e1) throw new Error('현재 비밀번호가 맞지 않아요')
    const { error } = await supabase.auth.updateUser({ password: next })
    if (error) throw error
  },
  uploadAvatar: async (file) => {
    const blob = await resizeToJpeg(file, 256)
    const path = `${get().user.id}/avatar.jpg`
    const { error } = await supabase.storage.from('avatars').upload(path, blob, { upsert: true, contentType: 'image/jpeg' })
    if (error) throw new Error(/bucket/i.test(error.message) ? '프로필 사진 저장소가 아직 없어요 (supabase/schema.sql 을 실행하세요)' : error.message)
    const url = `${supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl}?v=${Date.now()}`   // v= 는 캐시 우회
    const { error: e2 } = await supabase.auth.updateUser({ data: { avatar_url: url } })
    if (e2) throw e2
  },
  removeAvatar: async () => {
    await supabase.storage.from('avatars').remove([`${get().user.id}/avatar.jpg`])
    const { error } = await supabase.auth.updateUser({ data: { avatar_url: null } })
    if (error) throw error
  },

  // 서버·DB 상태 — 메뉴 맨 아래 '동작 체크'와 이야기꾼 AI 의 온라인/오프라인 표시가 함께 쓴다
  health: { api: 'wait', apiMsg: '', db: supabase ? 'wait' : 'fail', dbMsg: supabase ? '' : '.env.local 에 Supabase 값이 없어요', hasClaudeKey: false, hasDataKey: false, hasPixabayKey: false },
  checkHealth: async () => {
    let api = 'fail', apiMsg = '', info = {}
    try { info = await ping(); api = 'ok' } catch (e) { apiMsg = e.message }
    let db = 'fail', dbMsg = '.env.local 에 Supabase 값이 없어요'
    if (supabase) {
      const { error } = await supabase.from('favorites').select('id').limit(1)
      db = error ? 'fail' : 'ok'; dbMsg = error ? error.message : ''
    }
    set({ health: { api, apiMsg, db, dbMsg, hasClaudeKey: Boolean(info.hasClaudeKey), hasDataKey: Boolean(info.hasDataKey), hasPixabayKey: Boolean(info.hasPixabayKey) } })
  },

  // ② 알림(토스트)
  toasts: [],
  toast: (message, variant = 'success') => {
    const id = Date.now() + Math.random()
    set({ toasts: [...get().toasts, { id, message, variant }] })
    setTimeout(() => set({ toasts: get().toasts.filter((t) => t.id !== id) }), 2500)
  },

  // ③ 선택한 신화 — 홈·지도·신화 페이지의 3D 지도와 목록이 같은 선택을 공유
  selectedMythId: null,
  selectMyth: (id) => set({ selectedMythId: id }),
  pendingMap: null,        // AI 가 "지도에서 보여 줘" 도구를 쓰면 여기에 신화 id 가 들어오고, 레이아웃이 /map 으로 이동시킨다
  clearPendingMap: () => set({ pendingMap: null }),

  // ④ 제주 날씨 (기상청) — 3D 지도의 하늘·비·눈, 홈의 날씨 한 줄, 정보 창이 함께 쓴다
  weather: { 제주시: null, 서귀포시: null, loaded: false },
  loadWeather: async () => {
    if (get().weather.loaded) return
    set({ weather: { ...get().weather, loaded: true } })      // 중복 호출 방지
    const r = await Promise.all(['제주시', '서귀포시'].map((p) => fetchWeather(p).then((l) => l[0]).catch(() => null)))
    set({ weather: { 제주시: r[0], 서귀포시: r[1], loaded: true } })
  },

  // ⑤ 즐겨찾기 — 내 계정(user_id)의 favorites 행. RLS 가 내 것만 돌려준다 (별자리 + 찜한 상품)
  favorites: [],
  favLoading: false,
  loadFavorites: async ({ quiet = false } = {}) => {
    const { user } = get()
    if (!supabase || !user) return
    if (!quiet) set({ favLoading: true })
    const { data, error } = await supabase
      .from('favorites').select('*').eq('user_id', user.id)
      .order('created_at', { ascending: false })
    set({ favLoading: false })
    if (error) return quiet ? undefined : get().toast(error.message, 'danger')
    set({ favorites: data })
  },
  // 별/하트 버튼: 저장돼 있으면 취소, 없으면 저장. 화면에 먼저 반영하고 DB는 뒤따라 처리(실패하면 되돌림)
  toggleFavorite: async ({ source, id, title }) => {
    const { user } = get()
    if (!user) return get().toast('로그인하면 저장할 수 있어요', 'warning')
    const itemId = String(id)
    const key = `${source}:${itemId}`
    if (pendingFav.has(key)) return            // 처리 중 연타 → 중복 저장 방지
    pendingFav.add(key)
    const before = get().favorites
    const existing = before.find((f) => f.source === source && f.item_id === itemId)
    try {
      if (existing) {
        set({ favorites: before.filter((f) => f !== existing) })
        if (!String(existing.id).startsWith('tmp-')) {
          const { error } = await supabase.from('favorites').delete().eq('id', existing.id)
          if (error) throw error
        }
        get().toast('저장 목록에서 뺐어요', 'secondary')
      } else {
        const temp = { id: `tmp-${key}`, user_id: user.id, source, item_id: itemId, title, created_at: new Date().toISOString() }
        set({ favorites: [temp, ...before] })
        const { data, error } = await supabase.from('favorites')
          .insert({ user_id: user.id, source, item_id: itemId, title }).select().single()
        if (error && error.code !== '23505') throw error      // 23505 = 이미 저장됨(유니크 제약)
        if (data) set({ favorites: get().favorites.map((f) => (f.id === temp.id ? data : f)) })
        get().toast(source === 'product' ? '찜했어요' : '즐겨찾기에 저장했어요')
      }
    } catch (e) {
      set({ favorites: before })
      get().toast(e.message, 'danger')
    } finally {
      pendingFav.delete(key)
    }
  },

  // ⑥ 재고 — shop_stock 테이블(없으면 상품 데이터의 기본 재고). 주문하면 줄고, 취소·환불하면 돌아온다
  stock: {},
  loadStock: async () => {
    if (!supabase) return
    const { data, error } = await supabase.from('shop_stock').select('product_id, qty')
    if (!error && data) set({ stock: Object.fromEntries(data.map((r) => [r.product_id, r.qty])) })
  },
  rawStockOf: (id) => get().stock[id] ?? productOf(id)?.stock ?? 0,                  // DB(또는 기본) 재고
  stockOf: (id) => liveStock(get().rawStockOf(id), id, get().stockSlot),              // 화면에 보이는 재고 (10분마다 변동)
  // 시세는 1분마다, 재고는 10분마다 바뀐다: 슬롯 번호가 바뀌면 값을 갱신해 화면을 다시 그린다 (RootLayout 이 2초마다 확인)
  slot: slotOf(),
  stockSlot: stockSlotOf(),
  tickSlot: () => {
    const price = slotOf(), stock = stockSlotOf()
    if (price !== get().slot) set({ slot: price })
    if (stock !== get().stockSlot) {
      set({ stockSlot: stock })
      get().toast('📦 10분이 지나 재고가 바뀌었어요', 'info')     // 시세는 1분마다라 알림 없이 조용히 바뀐다
    }
  },

  // ⑦ 장바구니 — 내 계정의 cart_items. 담는 순간 화면에 먼저 반영하고 DB 에는 "이 수량"으로 덮어쓴다(upsert)
  cart: [],            // { product_id, qty }
  cartLoading: false,
  loadCart: async () => {
    const { user } = get()
    if (!supabase || !user) return
    set({ cartLoading: true })
    const { data, error } = await supabase.from('cart_items').select('product_id, qty').eq('user_id', user.id).order('id')
    set({ cartLoading: false })
    if (!error) set({ cart: data })
  },
  // 한 상품을 담을 수 있는 최대 개수: 재고와 1인 한도(20개) 중 작은 쪽
  maxQty: (id) => Math.min(get().stockOf(id), MAX_PER_ITEM),
  limitMessage: (id) => {
    const stock = get().stockOf(id)
    return stock <= 0 ? '품절된 상품이에요' : stock < MAX_PER_ITEM ? `재고가 ${stock}개뿐이에요` : `한 상품은 최대 ${MAX_PER_ITEM}개까지 담을 수 있어요`
  },
  setCartQty: async (productId, wanted) => {
    const { user } = get()
    if (!user) return get().toast('로그인하면 장바구니를 쓸 수 있어요', 'warning')
    const max = get().maxQty(productId)
    if (wanted > max) get().toast(get().limitMessage(productId), 'warning')
    const qty = Math.min(wanted, max)
    const before = get().cart
    const rest = before.filter((c) => c.product_id !== productId)
    const next = qty > 0 ? [...rest, { product_id: productId, qty }] : rest
    // 담긴 순서를 유지
    const order = new Map(before.map((c, i) => [c.product_id, i]))
    next.sort((a, b) => (order.get(a.product_id) ?? 1e9) - (order.get(b.product_id) ?? 1e9))
    set({ cart: next })
    const { error } = qty > 0
      ? await supabase.from('cart_items').upsert({ user_id: user.id, product_id: productId, qty }, { onConflict: 'user_id,product_id' })
      : await supabase.from('cart_items').delete().eq('user_id', user.id).eq('product_id', productId)
    if (error) { set({ cart: before }); get().toast(error.message, 'danger') }
  },
  addToCart: async (productId, n = 1) => {
    const { user, cart } = get()
    if (!user) { get().toast('로그인하면 장바구니에 담을 수 있어요', 'warning'); return false }
    const current = cart.find((c) => c.product_id === productId)?.qty ?? 0
    const max = get().maxQty(productId)
    if (current >= max) { get().toast(get().limitMessage(productId), 'warning'); return false }   // 이미 한도까지 담았다
    const qty = Math.min(current + n, max)
    await get().setCartQty(productId, qty)
    if (current + n > max) get().toast(`${get().limitMessage(productId)} (${qty}개로 담았어요)`, 'warning')
    else get().toast(`${productOf(productId)?.name ?? '상품'}을(를) 담았어요`)
    return true
  },

  // 제주 장터 상품 사진(Pixabay) — 한 번만 불러와 장터·장바구니가 함께 쓴다. 실패하면 이모지 타일로 보인다
  productImages: {},
  loadProductImages: async () => {
    if (Object.keys(get().productImages).length) return
    try { set({ productImages: await fetchShopImages() }) } catch { /* 사진 없이도 동작 */ }
  },

  // ⑧ 쿠폰함 — 등급 쿠폰은 등급에 도달한 순간 자동으로 들어온다 (이미 받은 건 다시 안 받음)
  coupons: [],
  loadCoupons: async () => {
    const { user } = get()
    if (!supabase || !user) return
    const { data: rows, error } = await supabase.from('shop_coupons').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    if (error) return                               // 쿠폰 테이블이 아직 없으면 조용히 건너뜀
    let list = rows
    const have = new Set(rows.map((c) => c.source))
    const missing = gradeCouponsFor(levelOf(totalSpent(get().orders)).lv).filter((c) => !have.has(c.source))
    if (missing.length) {
      const { data: added } = await supabase.from('shop_coupons').upsert(
        missing.map((c) => ({ user_id: user.id, source: c.source, title: c.title, kind: c.kind, value: c.value, min: c.min, expires_at: new Date(Date.now() + c.expiresDays * DAY).toISOString() })),
        { onConflict: 'user_id,source', ignoreDuplicates: true },
      ).select()
      if (added?.length) { list = [...added, ...rows]; get().toast(`쿠폰 ${added.length}장이 도착했어요 🎁`, 'info') }
    }
    set({ coupons: list })
  },
  registerCoupon: async (code) => {
    const key = code.trim().toUpperCase()
    const promo = PROMO_CODES[key]
    if (!promo) throw new Error('없는 쿠폰 코드예요')
    const { user } = get()
    const { data, error } = await supabase.from('shop_coupons').insert({
      user_id: user.id, source: `code:${key}`, title: promo.title, kind: promo.kind, value: promo.value, min: promo.min,
      expires_at: new Date(Date.now() + promo.expiresDays * DAY).toISOString(),
    }).select().single()
    if (error) throw new Error(error.code === '23505' ? '이미 등록한 코드예요' : error.message)
    set({ coupons: [data, ...get().coupons] })
    get().toast(`${promo.title}을(를) 받았어요`)
  },

  // ⑨ 후기·별점 — 모두가 읽을 수 있다. 쓰기는 배송완료된 내 주문의 상품에만 (화면에서 확인, DB 는 내 행만 허용)
  reviews: [],
  loadReviews: async () => {
    if (!supabase) return
    const { data, error } = await supabase.from('shop_reviews').select('*').order('created_at', { ascending: false }).limit(500)
    if (!error) set({ reviews: data })
  },
  addReview: async ({ product_id, order_id, rating, content }) => {
    const { user } = get()
    const { data, error } = await supabase.from('shop_reviews')
      .insert({ user_id: user.id, product_id, order_id, rating, content: content.trim(), nickname: displayName(user) }).select().single()
    if (error) throw new Error(error.code === '23505' ? '이미 후기를 남긴 상품이에요' : error.message)
    set({ reviews: [data, ...get().reviews] })
    get().toast('후기를 남겼어요. 고마워요!')
  },
  deleteReview: async (id) => {
    const before = get().reviews
    set({ reviews: before.filter((r) => r.id !== id) })
    const { error } = await supabase.from('shop_reviews').delete().eq('id', id)
    if (error) { set({ reviews: before }); get().toast(error.message, 'danger') } else get().toast('후기를 지웠어요', 'secondary')
  },

  // ⑩ 주문 — 주문 당시의 상품·가격·할인·쿠폰·적립금·배송비를 그대로 저장하고 장바구니를 비운다 (실제 결제는 연동하지 않음)
  orders: [],
  loadOrders: async () => {
    const { user } = get()
    if (!supabase || !user) return
    const { data, error } = await supabase.from('orders').select('*').eq('user_id', user.id)
      .order('created_at', { ascending: false }).limit(200)
    if (!error) set({ orders: data })
  },
  // 주문을 취소·환불하면 재고와 쿠폰을 되돌린다 (적립금은 주문 상태로 계산해서 자동으로 돌아간다)
  restoreOrder: async (order) => {
    for (const i of order.items) {
      if (get().stock[i.product_id] === undefined) continue          // DB 재고 행이 없는 상품은 되돌릴 것도 없다
      const r = await rpcSafe('shop_give_stock', { p_id: i.product_id, p_qty: i.qty })
      if (!r.missing && !r.error) set({ stock: { ...get().stock, [i.product_id]: get().rawStockOf(i.product_id) + i.qty } })
    }
    if (order.coupon_id) {
      await supabase.from('shop_coupons').update({ used_at: null }).eq('id', order.coupon_id)
      set({ coupons: get().coupons.map((c) => (c.id === order.coupon_id ? { ...c, used_at: null } : c)) })
    }
  },
  // 주문 상태 변경 — 화면에 먼저 반영하고 DB 가 거절하면 되돌린다
  updateOrder: async (id, patch, doneMessage) => {
    const before = get().orders
    set({ orders: before.map((o) => (o.id === id ? { ...o, ...patch } : o)) })
    const { error } = await supabase.from('orders').update(patch).eq('id', id)
    if (error) { set({ orders: before }); get().toast(error.message, 'danger'); return false }
    get().toast(doneMessage)
    return true
  },
  cancelOrder: async (order) => {
    const ok = await get().updateOrder(order.id, { status: STATUS.cancelled }, '주문을 취소했어요')
    if (ok) await get().restoreOrder(order)
    return ok
  },
  requestRefund: async (order, reason) => {
    const ok = await get().updateOrder(order.id, { status: STATUS.refund, refund_reason: reason }, '반품·환불을 접수했어요')
    if (ok) await get().restoreOrder(order)
    return ok
  },
  deleteOrder: async (id) => {
    const before = get().orders
    set({ orders: before.filter((o) => o.id !== id) })
    const { error } = await supabase.from('orders').delete().eq('id', id)
    if (error) { set({ orders: before }); get().toast(error.message, 'danger'); return false }
    get().toast('주문 내역을 삭제했어요', 'secondary')
    return true
  },
  // 주문하기: 금액 계산 → 재고 차감 → 주문 저장 → 쿠폰 사용 처리 → 장바구니 비우기 → 등급·쿠폰 갱신
  checkout: async ({ couponId = null, pointsUse = 0 } = {}) => {
    const { user, cart, orders } = get()
    if (!user || cart.length === 0) return false
    await get().loadStock()
    const lines = cart.map((c) => ({ p: productOf(c.product_id), qty: c.qty })).filter((l) => l.p)
    const short = lines.find((l) => l.qty > get().maxQty(l.p.id))
    if (short) { get().toast(`${short.p.name}: ${get().limitMessage(short.p.id)}`, 'warning'); return false }

    const coupon = get().coupons.find((c) => c.id === couponId) ?? null
    const calc = calcCheckout({ lines, spent: totalSpent(orders), coupon, pointsWanted: pointsUse, pointsBalance: pointsSummary(orders).balance })

    // 재고 차감 — 하나라도 실패하면 이미 차감한 것을 되돌린다 (함수가 아직 없으면 건너뜀)
    const taken = []
    for (const l of lines) {
      if (get().stock[l.p.id] === undefined) continue                 // DB 재고 행이 없는 상품(SQL 미실행)은 기본 재고만 쓴다
      const r = await rpcSafe('shop_take_stock', { p_id: l.p.id, p_qty: l.qty })
      if (r.missing) break
      if (r.error || r.data === false) {
        for (const t of taken) await rpcSafe('shop_give_stock', { p_id: t.p.id, p_qty: t.qty })
        get().toast(r.error ? r.error.message : `${l.p.name} 재고가 부족해요`, 'danger')
        await get().loadStock()
        return false
      }
      taken.push(l)
    }

    const items = lines.map((l) => ({ product_id: l.p.id, name: l.p.name, price: salePrice(l.p), qty: l.qty }))
    const full = {
      user_id: user.id, total: calc.total, items, original: calc.original, grade_discount: calc.gradeDiscount,
      coupon_id: coupon && calc.couponOff > 0 ? coupon.id : null, coupon_discount: calc.couponOff,
      points_used: calc.pointsUsed, points_earned: calc.earn, shipping_fee: calc.shipping,
    }
    let { data, error } = await supabase.from('orders').insert(full).select().single()
    if (error && /column/i.test(error.message)) {            // 새 컬럼이 아직 없으면(SQL 미실행) 기본 정보만 저장
      ;({ data, error } = await supabase.from('orders').insert({ user_id: user.id, total: calc.total, items }).select().single())
    }
    if (error) {
      for (const t of taken) await rpcSafe('shop_give_stock', { p_id: t.p.id, p_qty: t.qty })
      get().toast(error.message, 'danger')
      return false
    }
    await supabase.from('cart_items').delete().eq('user_id', user.id)
    if (data.coupon_id) {
      await supabase.from('shop_coupons').update({ used_at: new Date().toISOString() }).eq('id', data.coupon_id)
      set({ coupons: get().coupons.map((c) => (c.id === data.coupon_id ? { ...c, used_at: new Date().toISOString() } : c)) })
    }
    const stockNow = { ...get().stock }
    for (const t of taken) stockNow[t.p.id] = get().rawStockOf(t.p.id) - t.qty
    const before = levelOf(totalSpent(orders)).lv
    set({ cart: [], orders: [data, ...orders], stock: stockNow })
    const after = levelOf(totalSpent(get().orders))
    get().toast(after.lv > before ? `주문 완료! LV.${after.lv} ${after.name} 달성 🎉` : '주문이 접수됐어요')
    if (after.lv > before) get().loadCoupons()               // 새 등급 쿠폰 받기
    return data
  },

  // ⑪ 에이전트 대화 — 페이지를 옮겨도 대화가 남도록 store 에 둡니다
  messages: [],          // { role: 'user' | 'assistant', text, steps, actions }
  chatLoading: false,
  sendMessage: async (text) => {
    const history = get().messages.map((m) => ({ role: m.role, content: m.text }))  // Claude 형식
    set({ messages: [...get().messages, { role: 'user', text, at: Date.now() }], chatLoading: true })
    try {
      const { answer, steps, actions = [] } = await askAgent(text, history)
      set({ messages: [...get().messages, { role: 'assistant', text: answer, steps, actions, at: Date.now() }] })
      const map = actions.find((a) => a.type === 'map')
      if (map) set({ pendingMap: map.mythId })             // AI 가 지도를 움직이라고 했다 → 레이아웃이 /map 으로 이동
    } catch (e) {
      get().toast(e.message, 'danger')
      get().checkHealth()                     // 실패하면 서버 상태를 다시 확인해 온라인/오프라인 표시를 갱신
    } finally {
      set({ chatLoading: false })
    }
  },
}))

