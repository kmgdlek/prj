import { useState } from 'react'

// 글자 하나: 값이 바뀌면 옛 글자는 아래로 밀려 내려가고, 새 글자가 위에서 내려온다
function RollChar({ ch }) {
  const [cur, setCur] = useState(ch)
  const [prev, setPrev] = useState(ch)
  const [n, setN] = useState(0)
  if (ch !== cur) { setPrev(cur); setCur(ch); setN(n + 1) }          // 렌더 중에 값이 바뀐 것을 알아챈다
  if (n === 0) return <span>{ch}</span>
  return (
    <span className="roll">
      <span className="roll-size">{ch}</span>                         {/* 자리(너비·높이)만 잡는 투명 글자 */}
      <span className="roll-inner" key={n}><span>{cur}</span><span>{prev}</span></span>
    </span>
  )
}

// 시세 숫자: 바뀐 자리만 위에서 아래로 굴러 바뀐다 (처음 보일 땐 그냥 표시). text 예) "31,040원"
export default function RollingNumber({ text }) {
  const chars = [...text]
  return (
    <span className="rolling" aria-label={text}>
      {chars.map((c, i) => <RollChar key={chars.length - i} ch={c} />)}   {/* 오른쪽 끝 기준으로 자리를 맞춘다 */}
    </span>
  )
}
