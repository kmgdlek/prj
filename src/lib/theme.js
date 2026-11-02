import { useEffect, useState } from 'react'

// 라이트/다크 모드. 저장된 선택이 없으면 기기 설정(prefers-color-scheme)을 따른다.
// <html data-bs-theme="dark"> 로 Bootstrap 5.3 이 전체 색을 바꿔 준다.
const KEY = 'tamra-theme'
const read = () => { try { return localStorage.getItem(KEY) } catch { return null } }
const systemDark = () => window.matchMedia?.('(prefers-color-scheme: dark)').matches
export const currentTheme = () => read() ?? (systemDark() ? 'dark' : 'light')
export const applyTheme = (t) => document.documentElement.setAttribute('data-bs-theme', t)

export function useTheme() {
  const [theme, setTheme] = useState(currentTheme)
  useEffect(() => { applyTheme(theme) }, [theme])
  const toggle = () => setTheme((t) => {
    const next = t === 'dark' ? 'light' : 'dark'
    try { localStorage.setItem(KEY, next) } catch { /* 저장 못 해도 이번 접속엔 적용됨 */ }
    return next
  })
  return [theme, toggle]
}
