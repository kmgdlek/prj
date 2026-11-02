import { useState } from 'react'

// 별점 표시 (value 는 소수 가능, 0.5 단위로 반올림해 반쪽 별까지)
export function Stars({ value = 0, size = '1rem', className = '' }) {
  const v = Math.round(value * 2) / 2
  return (
    <span className={`stars ${className}`} style={{ fontSize: size }} aria-label={`별점 ${value.toFixed(1)}점`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <i key={i} className={`bi bi-star${v >= i ? '-fill' : v >= i - 0.5 ? '-half' : ''}`} />
      ))}
    </span>
  )
}

// 별점 입력 (눌러서 1~5점, 마우스를 올리면 미리보기)
export function StarInput({ value, onChange, size = '2rem' }) {
  const [hover, setHover] = useState(0)
  const shown = hover || value
  return (
    <span className="stars star-input" style={{ fontSize: size }} onMouseLeave={() => setHover(0)} role="radiogroup" aria-label="별점 선택">
      {[1, 2, 3, 4, 5].map((i) => (
        <button key={i} type="button" role="radio" aria-checked={value === i} aria-label={`${i}점`}
          onMouseEnter={() => setHover(i)} onClick={() => onChange(i)}>
          <i className={`bi bi-star${shown >= i ? '-fill' : ''}`} />
        </button>
      ))}
    </span>
  )
}

// 후기 목록에서 상품별 평균·개수를 구한다
export function ratingOf(reviews, productId) {
  const list = reviews.filter((r) => r.product_id === productId)
  const avg = list.length ? list.reduce((s, r) => s + r.rating, 0) / list.length : 0
  return { avg, count: list.length, list }
}
