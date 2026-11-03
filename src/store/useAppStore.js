import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { askAgent, fetchShopImages, fetchWeather, ping } from '../api/client'
import { MAX_PER_ITEM, liveStock, productOf, salePrice, setDemandEvents, setPriceOverrides, slotOf, stockSlotOf } from '../../server/products'
import { levelOf, totalSpent } from '../lib/level'
import { STATUS } from '../lib/order'
import { DAY, PROMO_CODES, gradeCouponsFor } from '../lib/coupon'
import { calcCheckout, pointsSummary } from '../lib/checkout'
import { DEFAULT_PREFS, buildNotifications, mergeNotifs } from '../lib/notify'
import { FRIEND_COUPON, INVITEE_COUPON, MAX_REWARDED, THREE_COUPON, inviteCodeOf } from '../lib/invite'
import { resizeToJpeg } from '../lib/image'

const pendingFav = new Set()   // 저장·삭제가 진행 중인 항목 키 (연타 방지)
const safeLS = {
  get: (k) => { try { return JSON.parse(localStorage.getItem(k)) } catch { return null } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* 저장 못 해도 이번 접속엔 동작 */ } },
}
const toastTimers = new Map()   // 알림 id → 사라질 때까지의 타이머 (같은 알림이 또 오면 시간을 다시 잰다)
function armToast(id, fn) { clearTimeout(toastTimers.get(id)); toastTimers.set(id, setTimeout(() => { toastTimers.delete(id); fn() }, 2800)) }
const notifKey = (user) => `tamra-notifs:${user?.id ?? 'guest'}`
const seenKey = (user) => `tamra-notif-seen:${user?.id ?? 'guest'}`     // 지금까지 보낸 알림 id 기록 (지워도 다시 안 오게)
const SEEN_MAX = 600
let lastOverrideLoad = 0
let lastGrantLoad = 0
let lastDemandLoad = 0
let demandMissing = false     // 수요 기록 테이블이 아직 없으면(SQL 미실행) 이번 접속에서는 다시 묻지 않는다 (콘솔에 404 가 계속 쌓이지 않게)
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
    get().loadChat()
    get().loadAdmin()
    get().loadPointGrants()
    get().claimInvite().then(() => get().loadInvites())
  },
  initAuth: async () => {
    if (authStarted) return
    authStarted = true
    get().loadStock(); get().loadReviews(); get().loadOverrides(); get().loadDemand()               // 재고·후기는 누구나 볼 수 있어서 로그인 전에도
    if (!supabase) { get().loadNotifs(); return set({ authReady: true }) }
    const { data } = await supabase.auth.getSession()
    set({ user: data.session?.user ?? null, authReady: true })
    if (get().user) get().loadUserData()
    get().loadNotifs()
    supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user ?? null
      const changed = user?.id !== get().user?.id
      set({ user })
      if (!changed) return
      set({ favorites: [], cart: [], orders: [], coupons: [], messages: [], invites: [], pointGrants: [], isAdmin: false })
      get().loadNotifs()     // 다른 사람의 데이터가 남지 않게 비움
      if (user) get().loadUserData()
    })
  },
  signUp: async ({ email, password, nickname, invite = '' }) => {
    if (!supabase) throw new Error('Supabase 설정(.env.local)이 필요해요')
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { nickname: nickname.trim(), ...(invite ? { invited_by: invite } : {}) }, emailRedirectTo: `${window.location.origin}/welcome` } })   // 인증 메일의 링크가 지금 접속한 사이트의 가입 완료 페이지(/welcome)로 오게 (Supabase 의 Redirect URLs 에 등록돼 있어야 함)
    if (error) throw error
    return { needsConfirm: !data.session }              // 이메일 인증을 켜 둔 프로젝트면 세션이 바로 안 생긴다
  },
  // 인증 메일 다시 보내기 (가입 완료 화면의 버튼)
  resendConfirm: async (email) => {
    if (!supabase) throw new Error('Supabase 설정(.env.local)이 필요해요')
    const { error } = await supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo: `${window.location.origin}/welcome` } })
    if (error) throw error
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
  health: { api: 'wait', apiMsg: '', db: supabase ? 'wait' : 'fail', dbMsg: supabase ? '' : '.env.local 에 Supabase 값이 없어요', hasAiKey: false, hasDataKey: false, hasPixabayKey: false },
  checkHealth: async () => {
    let api = 'fail', apiMsg = '', info = {}
    try { info = await ping(); api = 'ok' } catch (e) { apiMsg = e.message }
    let db = 'fail', dbMsg = '.env.local 에 Supabase 값이 없어요'
    if (supabase) {
      const { error } = await supabase.from('favorites').select('id').limit(1)
      db = error ? 'fail' : 'ok'; dbMsg = error ? error.message : ''
    }
    set({ health: { api, apiMsg, db, dbMsg, hasAiKey: Boolean(info.hasAiKey), hasDataKey: Boolean(info.hasDataKey), hasPixabayKey: Boolean(info.hasPixabayKey) } })
  },

  // ② 알림(토스트)
  // 알림(토스트): 오른쪽 위에서 미끄러져 들어왔다가 잠시 뒤 오른쪽으로 나간다.
  // 같은 문장이 이미 떠 있으면 새로 쌓지 않고 ×N 으로 세면서 시간만 늘린다 (장바구니를 연타해도 한 장). 한 번에 최대 3장
  toasts: [],
  toast: (message, variant = 'success') => {
    const live = get().toasts.find((t) => !t.leaving && t.message === message && t.variant === variant)
    if (live) {
      set({ toasts: get().toasts.map((t) => (t === live ? { ...t, count: t.count + 1 } : t)) })
      armToast(live.id, () => get().dismissToast(live.id))
      return
    }
    const id = Date.now() + Math.random()
    let list = [...get().toasts, { id, message, variant, count: 1, leaving: false }]
    const shown = list.filter((t) => !t.leaving)
    if (shown.length > 3) { const oldest = shown[0].id; list = list.map((t) => (t.id === oldest ? { ...t, leaving: true } : t)); setTimeout(() => set({ toasts: get().toasts.filter((t) => t.id !== oldest) }), 350) }
    set({ toasts: list })
    armToast(id, () => get().dismissToast(id))
  },
  // 오른쪽으로 나가는 애니메이션(0.3초)을 보여 준 뒤 지운다
  dismissToast: (id) => {
    if (!get().toasts.some((t) => t.id === id && !t.leaving)) return
    set({ toasts: get().toasts.map((t) => (t.id === id ? { ...t, leaving: true } : t)) })
    setTimeout(() => set({ toasts: get().toasts.filter((t) => t.id !== id) }), 350)
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
  // ⑮ 알림 — 추천 물건·장소·찜한 상품 소식. 목록은 이 브라우저에(계정별로) 저장하고, 설정은 로그인했다면 계정(user_metadata)에도 저장해 다른 기기에서도 같게 보인다
  notifs: [],
  notifSeen: { ids: [], dealAt: 0 },   // 지금까지 보낸 알림 id 와 마지막 추천 물건 알림 시각 — 알림을 지워도 같은 알림이 다시 만들어지지 않게
  notifsReady: false,         // 저장된 알림을 불러오기 전에 새 알림을 만들면 덮어쓰므로, 불러온 뒤에만 만든다
  notifPrefs: { ...DEFAULT_PREFS, ...(safeLS.get('tamra-notif-prefs') ?? {}) },
  loadNotifs: () => {
    const { user } = get()
    const meta = user?.user_metadata?.notif_prefs
    const list = user ? (safeLS.get(notifKey(user)) ?? []) : []
    const saved = user ? (safeLS.get(seenKey(user)) ?? {}) : {}
    const ids = [...new Set([...(saved.ids ?? []), ...list.map((n) => n.id)])].slice(0, SEEN_MAX)     // 예전에 쌓인 알림도 기록에 넣는다
    set({ notifsReady: true, notifs: list, notifSeen: { ids, dealAt: saved.dealAt ?? list.find((n) => n.topic === 'deal')?.at ?? 0 }, ...(meta ? { notifPrefs: { ...DEFAULT_PREFS, ...meta } } : {}) })
  },
  setNotifPrefs: async (patch) => {
    const notifPrefs = { ...get().notifPrefs, ...patch }
    set({ notifPrefs })
    safeLS.set('tamra-notif-prefs', notifPrefs)
    if (supabase && get().user) await supabase.auth.updateUser({ data: { notif_prefs: notifPrefs } })
  },
  // 지금 상황을 보고 새 알림을 만든다 (RootLayout 이 시세가 바뀔 때마다 부른다)
  runNotifier: () => {
    const { notifPrefs: prefs, notifs, user } = get()
    if (!user || !prefs.enabled || !get().notifsReady) return          // 알림은 로그인했을 때만
    const now = Date.now()
    const fresh = buildNotifications({ now, slot: get().slot, stockSlot: get().stockSlot, favorites: get().favorites, weather: get().weather, prefs, notifs, stockOf: get().stockOf, orders: get().orders, grants: get().pointGrants, seen: get().notifSeen.ids, lastDealAt: get().notifSeen.dealAt })
    if (!notifs.some((n) => n.id === 'welcome') && !get().notifSeen.ids.includes('welcome')) {
      fresh.push({ id: 'welcome', topic: 'welcome', tag: '안내', emoji: '🔔', title: '알림이 켜져 있어요', body: '추천 물건과 장소, 찜한 상품 소식이 여기에 모여요. 마이페이지에서 끄거나 고를 수 있어요', to: '/mypage?tab=notify', at: now, read: false })
    }
    if (!fresh.length) return
    const next = mergeNotifs(fresh, notifs)
    const seen = { ids: [...fresh.map((n) => n.id), ...get().notifSeen.ids].slice(0, SEEN_MAX), dealAt: fresh.some((n) => n.topic === 'deal') ? now : get().notifSeen.dealAt }
    set({ notifs: next, notifSeen: seen })
    safeLS.set(notifKey(user), next)
    safeLS.set(seenKey(user), seen)
    if (prefs.toast) get().toast(fresh[0].title, 'secondary')
  },
  markNotifRead: (id) => {
    const next = get().notifs.map((n) => (n.id === id ? { ...n, read: true } : n))
    set({ notifs: next }); safeLS.set(notifKey(get().user), next)
  },
  markAllNotifsRead: () => {
    const next = get().notifs.map((n) => ({ ...n, read: true }))
    set({ notifs: next }); safeLS.set(notifKey(get().user), next)
  },
  clearNotifs: () => { set({ notifs: [] }); safeLS.set(notifKey(get().user), []) },       // 보낸 기록(notifSeen)은 남아서 같은 알림이 다시 오지 않는다
  deleteNotif: (id) => {
    const next = get().notifs.filter((n) => n.id !== id)
    set({ notifs: next }); safeLS.set(notifKey(get().user), next)
  },

  // ⑰ 적립금 지급 — 관리자가 주는 적립금(shop_point_grants). 잔액 = 주문 적립 + 지급 − 사용. 테이블이 아직 없으면 조용히 건너뜀
  pointGrants: [],
  loadPointGrants: async () => {
    const { user } = get()
    if (!supabase || !user) return
    const { data, error } = await supabase.from('shop_point_grants').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    if (!error) set({ pointGrants: data })
  },
  // 적립금 지급: email 을 비우면 내 계정에, 적으면 그 사람에게 (이메일 → 계정 찾기는 DB 함수가 한다). 받은 사람 닉네임을 돌려준다
  grantPoints: async ({ email = '', amount, reason = '관리자 지급' }) => {
    const { user, isAdmin } = get()
    if (!isAdmin) throw new Error('관리자만 지급할 수 있어요')
    const who = email.trim()
    if (!who || who.toLowerCase() === (user.email ?? '').toLowerCase()) {
      const { error } = await supabase.from('shop_point_grants').insert({ user_id: user.id, amount, reason })
      if (error) throw error
      await get().loadPointGrants()
      return displayName(user)
    }
    const { data, error } = await supabase.rpc('grant_points_by_email', { p_email: who, p_amount: amount, p_reason: reason })
    if (error) throw new Error(error.code === 'PGRST202' ? 'schema.sql 을 다시 실행해 주세요 (지급 함수가 아직 없어요)' : error.message)
    return data?.[0]?.nickname ?? who
  },

  // ⑱ 수요(주식처럼) — 최근 6시간의 구매·취소·환불 기록(shop_demand)을 불러와 시세 계산에 넣는다. 테이블이 아직 없으면 조용히 건너뜀
  loadDemand: async () => {
    if (!supabase || demandMissing) return
    lastDemandLoad = Date.now()
    const since = new Date(Date.now() - 6 * 3600000).toISOString()
    const { data, error } = await supabase.from('shop_demand').select('product_id, qty, created_at').gte('created_at', since).order('created_at', { ascending: true })
    if (error) { if (error.code === 'PGRST205' || error.code === '42P01' || /could not find|does not exist/i.test(error.message)) demandMissing = true; return }
    const map = {}
    for (const r of data) (map[r.product_id] ??= []).push({ qty: r.qty, t: new Date(r.created_at).getTime() })
    setDemandEvents(map)
    set({ priceVer: get().priceVer + 1 })
  },

  // ⑭ 관리자 — shop_admins 에 내 id 가 있으면 관리자. 관리자만 시세를 직접 정할 수 있다 (RLS 가 DB 에서 막음)
  isAdmin: false,
  priceVer: 0,                 // 관리자가 정한 가격이 바뀌면 올라가서 화면을 다시 그리게 한다
  overrideRows: [],
  loadAdmin: async () => {
    if (!supabase || !get().user) return
    const { data } = await supabase.from('shop_admins').select('user_id').eq('user_id', get().user.id).maybeSingle()
    set({ isAdmin: !!data })
  },
  loadOverrides: async () => {
    if (!supabase) return
    lastOverrideLoad = Date.now()
    // 차트(최근 30분)가 과거 가격을 그대로 보여 주도록, 끝난 지 오래되지 않은 기록까지 불러온다
    const since = new Date(Date.now() - 3 * 3600000).toISOString()
    const { data, error } = await supabase.from('shop_price_override').select('*').gt('until', since).order('starts_at', { ascending: true })
    if (error) return                                           // 테이블이 아직 없으면 조용히 건너뜀
    const now = Date.now()
    const rows = data.map((r) => ({ ...r, price: r.price, from: new Date(r.starts_at).getTime(), to: new Date(r.until).getTime() }))
    const map = {}
    for (const r of rows) (map[r.product_id] ??= []).push({ price: r.price, from: r.from, until: r.to })
    setPriceOverrides(map)
    set({ overrideRows: rows.filter((r) => r.from <= now && now < r.to), priceVer: get().priceVer + 1 })
  },
  setPriceOverride: async (productId, price, minutes) => {
    if (!get().isAdmin) throw new Error('관리자만 바꿀 수 있어요')
    const now = Date.now()
    const closeOld = await supabase.from('shop_price_override').update({ until: new Date(now).toISOString() }).eq('product_id', productId).gt('until', new Date(now).toISOString())
    if (closeOld.error) throw closeOld.error                    // 이전에 정한 가격이 있으면 지금 끝낸다 (기록은 남김)
    const { error } = await supabase.from('shop_price_override').insert({ product_id: productId, price, starts_at: new Date(now).toISOString(), until: new Date(now + minutes * 60000).toISOString() })
    if (error) throw error
    await get().loadOverrides()
  },
  clearPriceOverride: async (productId) => {
    if (!get().isAdmin) throw new Error('관리자만 바꿀 수 있어요')
    const nowIso = new Date().toISOString()
    const { error } = await supabase.from('shop_price_override').update({ until: nowIso }).eq('product_id', productId).gt('until', nowIso)   // 지우지 않고 지금 끝낸다
    if (error) throw error
    await get().loadOverrides()
  },
  slot: slotOf(),
  stockSlot: stockSlotOf(),
  tickSlot: () => {
    const price = slotOf(), stock = stockSlotOf()
    if (Date.now() - lastOverrideLoad > 15000) get().loadOverrides()   // 다른 사람(관리자)이 바꾼 시세를 15초 안에 따라온다
    if (Date.now() - lastDemandLoad > 20000) get().loadDemand()          // 다른 사람의 구매·환불이 20초 안에 시세에 반영된다
    if (get().user && Date.now() - lastGrantLoad > 30000) { lastGrantLoad = Date.now(); get().loadPointGrants() }   // 다른 관리자가 준 적립금도 30초 안에 따라온다
    if (price !== get().slot) set({ slot: price })
    if (stock !== get().stockSlot) set({ stockSlot: stock })        // 알림 없이 조용히 갱신
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
  // ⑯ 친구 초대 — 쿠폰을 내 쿠폰함에 넣는다 (이미 받은 쿠폰은 (사용자, source) 가 유일해서 다시 안 생긴다). 새로 받은 쿠폰 목록을 돌려준다
  giveCoupons: async (list) => {
    const { user } = get()
    if (!supabase || !user || !list.length) return []
    const { data } = await supabase.from('shop_coupons').upsert(
      list.map((c) => ({ user_id: user.id, source: c.source, title: c.title, kind: c.kind, value: c.value, min: c.min, expires_at: new Date(Date.now() + c.expiresDays * DAY).toISOString() })),
      { onConflict: 'user_id,source', ignoreDuplicates: true },
    ).select()
    if (data?.length) { get().toast(`쿠폰 ${data.length}장이 도착했어요 🎁`, 'info'); await get().loadCoupons() }     // 쿠폰함을 다시 불러와 로그인 직후에 겹쳐 돈 다른 불러오기 결과에 덮이지 않게
    return data ?? []
  },
  invites: [],              // 내 초대 코드로 가입한 친구들 [{ invitee, created_at }]
  // 초대 링크로 가입한 새 계정이 처음 로그인했을 때: 초대 기록을 남기고 환영 쿠폰을 받는다
  claimInvite: async () => {
    const { user } = get()
    const code = user?.user_metadata?.invited_by
    if (!supabase || !code || code === inviteCodeOf(user)) return
    const { data: mine, error } = await supabase.from('shop_invites').select('id').eq('invitee', user.id).maybeSingle()
    if (error) return                                                      // 테이블이 아직 없으면 조용히 건너뜀
    if (!mine) { const { error: e2 } = await supabase.from('shop_invites').insert({ inviter_code: code }); if (e2) return }
    await get().giveCoupons([INVITEE_COUPON])
  },
  // 내가 초대한 친구 수를 세고, 늘어난 만큼 감사 쿠폰(친구 1명당, 5명까지)과 3명 달성 쿠폰을 받는다
  loadInvites: async () => {
    const { user } = get()
    if (!supabase || !user) return
    const { data, error } = await supabase.from('shop_invites').select('invitee, created_at').eq('inviter_code', inviteCodeOf(user)).order('created_at', { ascending: true })
    if (error) return
    set({ invites: data })
    const rewards = data.slice(0, MAX_REWARDED).map((_, i) => ({ ...FRIEND_COUPON, source: `invite:friend:${i + 1}` }))
    if (data.length >= 3) rewards.push(THREE_COUPON)
    await get().giveCoupons(rewards)
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
    get().loadDemand()                                       // 취소·환불이면 시세가 바로 내려가도록
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
    const calc = calcCheckout({ lines, spent: totalSpent(orders), coupon, pointsWanted: pointsUse, pointsBalance: pointsSummary(orders, Date.now(), get().pointGrants).balance })

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
    get().loadDemand()                                       // 내 구매가 시세에 반영돼 오르는 모습을 바로 보여 준다
    return data
  },

  // ⑪ 에이전트 대화 — 페이지를 옮겨도 대화가 남도록 store 에 둡니다
  messages: [],          // { role: 'user' | 'assistant', text, steps, actions }
  chatLoading: false,
  // 로그인했으면 대화를 Supabase(shop_chat_messages)에 저장해 두고, 다음에 로그인하면 이어서 본다. 테이블이 없으면 조용히 건너뜀
  loadChat: async () => {
    if (!supabase || !get().user) return
    const { data, error } = await supabase.from('shop_chat_messages').select('*').order('created_at', { ascending: true }).limit(200)
    if (error) return
    const saved = data.map((r) => ({ role: r.role, text: r.text, steps: r.steps ?? undefined, actions: r.actions ?? [], at: new Date(r.created_at).getTime() }))
    set({ messages: [...saved, ...get().messages.filter((m) => !saved.some((x) => x.at === m.at))] })
  },
  saveChat: async (m) => {
    if (!supabase || !get().user) return
    await supabase.from('shop_chat_messages').insert({ role: m.role, text: m.text, steps: m.steps ?? null, actions: m.actions ?? null })
  },
  clearChat: async () => {
    set({ messages: [] })
    if (supabase && get().user) await supabase.from('shop_chat_messages').delete().eq('user_id', get().user.id)
  },
  sendMessage: async (text) => {
    const history = get().messages.map((m) => ({ role: m.role, content: m.text }))  // 모델에 보낼 형식
    const mine = { role: 'user', text, at: Date.now() }
    set({ messages: [...get().messages, mine], chatLoading: true })
    get().saveChat(mine)
    try {
      const { answer, steps, actions = [] } = await askAgent(text, history)
      const reply = { role: 'assistant', text: answer, steps, actions, at: Date.now() }
      set({ messages: [...get().messages, reply] })
      get().saveChat(reply)
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

