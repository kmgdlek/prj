// 메인 소개 옆 그림: 밤하늘 아래 한라산과 오름, 일렁이는 바다 (가벼운 SVG라 3D 지도와 따로 GPU 를 쓰지 않는다)
const STARS = [[28, 24, 1.6], [70, 52, 1.2], [112, 18, 1.4], [150, 44, 1], [205, 22, 1.5], [248, 56, 1.2], [292, 30, 1.6], [330, 64, 1], [52, 84, 1], [318, 100, 1.2]]

export default function HeroArt() {
  return (
    <svg className="hero-art" viewBox="0 0 360 230" role="img" aria-label="밤하늘 아래 한라산과 바다">
      <defs>
        <linearGradient id="ha-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1a0b3d" /><stop offset=".65" stopColor="#4b2a9c" /><stop offset="1" stopColor="#d6336c" /></linearGradient>
        <linearGradient id="ha-sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2b6cb0" /><stop offset="1" stopColor="#12285e" /></linearGradient>
        <linearGradient id="ha-mt" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#5a3f9e" /><stop offset="1" stopColor="#2a1566" /></linearGradient>
      </defs>
      <rect width="360" height="230" fill="url(#ha-sky)" />
      {STARS.map(([x, y, r], i) => <circle key={i} className="ha-star" cx={x} cy={y} r={r} fill="#fff" style={{ animationDelay: `${(i % 5) * 0.5}s` }} />)}
      <circle cx="286" cy="62" r="20" fill="#ffd166" opacity=".95" />
      <circle cx="294" cy="56" r="18" fill="#4b2a9c" opacity=".55" />
      <path d="M-10 168 L74 124 L110 140 L150 108 Q180 56 210 108 L252 138 L296 120 L370 168 Z" fill="url(#ha-mt)" />
      <path d="M168 78 Q180 66 192 78 Q180 84 168 78 Z" fill="#9ad0ff" opacity=".85" />
      <path d="M150 108 Q180 56 210 108 Q180 96 150 108 Z" fill="#fff" opacity=".18" />
      <rect y="160" width="360" height="70" fill="url(#ha-sea)" />
      <g className="ha-wave a"><path d="M0 178 q22 -9 45 0 t45 0 t45 0 t45 0 t45 0 t45 0 t45 0 t45 0 v6 H0Z" fill="#fff" opacity=".18" /></g>
      <g className="ha-wave b"><path d="M0 198 q22 -9 45 0 t45 0 t45 0 t45 0 t45 0 t45 0 t45 0 t45 0 v6 H0Z" fill="#fff" opacity=".14" /></g>
      <g className="ha-wave c"><path d="M0 216 q22 -9 45 0 t45 0 t45 0 t45 0 t45 0 t45 0 t45 0 t45 0 v20 H0Z" fill="#fff" opacity=".1" /></g>
    </svg>
  )
}
