import { useState } from 'react'

// 사진이 깨지면 잠깐 뒤에 다시 불러온다 (최대 2번). 계속 안 되면 깨진 채로 둔다 (alt 글자가 보임)
export default function RetryImg({ src, ...rest }) {
  const [n, setN] = useState(0)
  const retry = () => { if (n < 2) setTimeout(() => setN((v) => v + 1), 1500 * (n + 1)) }
  const url = n && src ? `${src}${src.includes('?') ? '&' : '?'}retry=${n}` : src
  return <img {...rest} src={url} onError={retry} />
}
