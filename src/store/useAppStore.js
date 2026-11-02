import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '../lib/supabase'
import { askAgent } from '../api/client'

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
      loadFavorites: async () => {
        if (!supabase) return get().toast('Supabase 설정(.env.local)이 필요해요', 'warning')
        set({ favLoading: true })
        const { data, error } = await supabase
          .from('favorites').select('*')
          .eq('nickname', get().nickname || '익명')
          .order('created_at', { ascending: false })
        set({ favLoading: false })
        if (error) return get().toast(error.message, 'danger')
        set({ favorites: data })
      },
      addFavorite: async ({ source, id, title }) => {
        if (!supabase) return get().toast('Supabase 설정(.env.local)이 필요해요', 'warning')
        const row = { nickname: get().nickname || '익명', source, item_id: String(id), title }
        const { data, error } = await supabase.from('favorites').insert(row).select().single()
        if (error) return get().toast(error.message, 'danger')
        set({ favorites: [data, ...get().favorites] })
        get().toast('즐겨찾기에 저장했어요')
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
