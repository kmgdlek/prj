import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { askAgent, fetchShopImages } from '../api/client'
import { productOf } from '../../server/products'
import { levelOf, totalSpent } from '../lib/level'

const pendingFav = new Set()   // 저장·삭제가 진행 중인 항목 키 (연타 방지)
let authStarted = false        // StrictMode 에서 구독이 두 번 걸리지 않게

// 화면에 보여 줄 이름: 가입 때 적은 닉네임, 없으면 이메일 앞부분
export const displayName = (user) => user?.user_metadata?.nickname || user?.email?.split('@')[0] || ''

// ── 앱 전체가 함께 쓰는 상태(store) ──────────────────────
// 여러 페이지에서 같이 쓰는 데이터는 여기에 둡니다. (한 페이지에서만 쓰면 useState)
export const useAppStore = create((set, get) => ({
  // ① 로그인 — Supabase Auth (이메일 + 비밀번호). 세션은 Supabase 가 브라우저에 보관
  user: null,
  authReady: false,       // 처음 로그인 상태를 확인하기 전에는 false (깜빡임·잘못된 리다이렉트 방지)
  initAuth: async () => {
    if (authStarted) return
    authStarted = true
    if (!supabase) return set({ authReady: true })
    const { data } = await supabase.auth.getSession()
    set({ user: data.session?.user ?? null, authReady: true })
    if (get().user) { get().loadFavorites({ quiet: true }); get().loadCart(); get().loadOrders() }
    supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user ?? null
      const changed = user?.id !== get().user?.id
      set({ user })
      if (!changed) return
      set({ favorites: [], cart: [], orders: [] })     // 다른 사람의 데이터가 남지 않게 비움
      if (user) { get().loadFavorites({ quiet: true }); get().loadCart(); get().loadOrders() }
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

  // ② 알림(토스트)
  toasts: [],
  toast: (message, variant = 'success') => {
    const id = Date.now() + Math.random()
    set({ toasts: [...get().toasts, { id, message, variant }] })
    setTimeout(() => set({ toasts: get().toasts.filter((t) => t.id !== id) }), 2500)
  },

  // ③ 선택한 신화 — 홈·신화 페이지의 3D 지도와 목록이 같은 선택을 공유
  selectedMythId: null,
  selectMyth: (id) => set({ selectedMythId: id }),

  // ④ 즐겨찾기 — 내 계정(user_id)의 favorites 행. RLS 가 내 것만 돌려준다
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
  // 별 버튼: 저장돼 있으면 취소, 없으면 저장. 화면에 먼저 반영하고 DB는 뒤따라 처리(실패하면 되돌림)
  toggleFavorite: async ({ source, id, title }) => {
    const { user } = get()
    if (!user) return get().toast('로그인하면 별을 저장할 수 있어요', 'warning')
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
        get().toast('즐겨찾기에서 뺐어요', 'secondary')
      } else {
        const temp = { id: `tmp-${key}`, user_id: user.id, source, item_id: itemId, title, created_at: new Date().toISOString() }
        set({ favorites: [temp, ...before] })
        const { data, error } = await supabase.from('favorites')
          .insert({ user_id: user.id, source, item_id: itemId, title }).select().single()
        if (error && error.code !== '23505') throw error      // 23505 = 이미 저장됨(유니크 제약)
        if (data) set({ favorites: get().favorites.map((f) => (f.id === temp.id ? data : f)) })
        get().toast('즐겨찾기에 저장했어요')
      }
    } catch (e) {
      set({ favorites: before })
      get().toast(e.message, 'danger')
    } finally {
      pendingFav.delete(key)
    }
  },

  // ⑤ 장바구니 — 내 계정의 cart_items. 담는 순간 화면에 먼저 반영하고 DB 에는 "이 수량"으로 덮어쓴다(upsert)
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
  setCartQty: async (productId, qty) => {
    const { user } = get()
    if (!user) return get().toast('로그인하면 장바구니를 쓸 수 있어요', 'warning')
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
  addToCart: async (productId) => {
    const { user, cart } = get()
    if (!user) return get().toast('로그인하면 장바구니에 담을 수 있어요', 'warning')
    const qty = (cart.find((c) => c.product_id === productId)?.qty ?? 0) + 1
    await get().setCartQty(productId, qty)
    get().toast(`${productOf(productId)?.name ?? '상품'}을(를) 담았어요`)
  },

  // 제주 장터 상품 사진(Pixabay) — 한 번만 불러와 장터·장바구니가 함께 쓴다. 실패하면 이모지 타일로 보인다
  productImages: {},
  loadProductImages: async () => {
    if (Object.keys(get().productImages).length) return
    try { set({ productImages: await fetchShopImages() }) } catch { /* 사진 없이도 동작 */ }
  },

  // ⑥ 주문 — 주문 당시의 상품·가격을 그대로 저장하고 장바구니를 비운다 (실제 결제는 연동하지 않음)
  orders: [],
  loadOrders: async () => {
    const { user } = get()
    if (!supabase || !user) return
    const { data, error } = await supabase.from('orders').select('*').eq('user_id', user.id)
      .order('created_at', { ascending: false }).limit(200)
    if (!error) set({ orders: data })
  },
  checkout: async () => {
    const { user, cart } = get()
    if (!user || cart.length === 0) return false
    const items = cart.map((c) => {
      const p = productOf(c.product_id)
      return { product_id: c.product_id, name: p?.name ?? c.product_id, price: p?.price ?? 0, qty: c.qty }
    })
    const total = items.reduce((sum, i) => sum + i.price * i.qty, 0)
    const { data, error } = await supabase.from('orders').insert({ user_id: user.id, total, items }).select().single()
    if (error) { get().toast(error.message, 'danger'); return false }
    await supabase.from('cart_items').delete().eq('user_id', user.id)
    const before = levelOf(totalSpent(get().orders)).lv
    set({ cart: [], orders: [data, ...get().orders] })
    const after = levelOf(totalSpent(get().orders))
    get().toast(after.lv > before ? `주문 완료! LV.${after.lv} ${after.name} 달성 🎉` : '주문이 접수됐어요')
    return true
  },

  // ⑦ 에이전트 대화 — 페이지를 옮겨도 대화가 남도록 store 에 둡니다
  messages: [],          // { role: 'user' | 'assistant', text, steps }
  chatLoading: false,
  sendMessage: async (text) => {
    const history = get().messages.map((m) => ({ role: m.role, content: m.text }))  // Claude 형식
    set({ messages: [...get().messages, { role: 'user', text }], chatLoading: true })
    try {
      const { answer, steps } = await askAgent(text, history)
      set({ messages: [...get().messages, { role: 'assistant', text: answer, steps }] })
    } catch (e) {
      get().toast(e.message, 'danger')
    } finally {
      set({ chatLoading: false })
    }
  },
}))
