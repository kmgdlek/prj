import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '../lib/supabase'
import { askAgent } from '../api/client'

const pendingFav = new Set()   // 저장·삭제가 진행 중인 항목 키 (연타 방지)

// ── 앱 전체가 함께 쓰는 상태(store) ──────────────────────
// 여러 페이지에서 같이 쓰는 데이터는 여기에 둡니다. (한 페이지에서만 쓰면 useState)
export const useAppStore = create(
  persist(
    (set, get) => ({
      // ① 사용자 — localStorage 에 저장되어 새로고침해도 유지
      nickname: '',
      setNickname: (nickname) => set({ nickname: nickname.trim() }),

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

      // ④ 즐겨찾기 — Supabase favorites 테이블과 동기화
      favorites: [],
      favLoading: false,
      loadFavorites: async ({ quiet = false } = {}) => {
        if (!supabase) return quiet ? undefined : get().toast('Supabase 설정(.env.local)이 필요해요', 'warning')
        set({ favLoading: true })
        const { data, error } = await supabase
          .from('favorites').select('*')
          .eq('nickname', get().nickname || '익명')
          .order('created_at', { ascending: false })
        set({ favLoading: false })
        if (error) return get().toast(error.message, 'danger')
        set({ favorites: data })
      },
      // 별 버튼: 저장돼 있으면 취소, 없으면 저장. 화면에 먼저 반영하고 DB는 뒤따라 처리(실패하면 되돌림)
      toggleFavorite: async ({ source, id, title }) => {
        if (!supabase) return get().toast('Supabase 설정(.env.local)이 필요해요', 'warning')
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
            const temp = { id: `tmp-${key}`, nickname: get().nickname || '익명', source, item_id: itemId, title, created_at: new Date().toISOString() }
            set({ favorites: [temp, ...before] })
            const { data, error } = await supabase.from('favorites')
              .insert({ nickname: temp.nickname, source, item_id: itemId, title }).select().single()
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
      removeFavorite: async (id) => {
        if (!supabase) return
        const { error } = await supabase.from('favorites').delete().eq('id', id)
        if (error) return get().toast(error.message, 'danger')
        set({ favorites: get().favorites.filter((f) => f.id !== id) })
      },

      // ⑤ 에이전트 대화 — 페이지를 옮겨도 대화가 남도록 store 에 둡니다
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
    }),
    {
      name: 'tamna-myth-store',
      partialize: (s) => ({ nickname: s.nickname }),
    },
  ),
)
