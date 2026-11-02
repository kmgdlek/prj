import { useEffect } from 'react'

// 스크롤하면 한 박자 늦게 천천히 따라오는 효과.
// 스크롤한 만큼 반대로 밀렸다가(offset), 매 프레임 조금씩 제자리로 돌아온다. ease 가 1에 가까울수록 더 천천히.
export function useLagFollow(ref, ease = 0.95) {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let last = window.scrollY, offset = 0, raf
    const onScroll = () => {
      offset = Math.max(-160, Math.min(160, offset + (last - window.scrollY)))
      last = window.scrollY
    }
    const tick = () => {
      offset *= ease
      if (Math.abs(offset) < 0.1) offset = 0
      if (ref.current) ref.current.style.transform = `translateY(${offset.toFixed(1)}px)`
      raf = requestAnimationFrame(tick)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    raf = requestAnimationFrame(tick)
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf) }
  }, [ref, ease])
}
