export const won = (n) => `${n.toLocaleString('ko-KR')}원`
// 아주 큰 금액을 짧게: 1억 이상이면 '10억원' · '1억 2,500만원' 처럼 (좁은 칸용). 1억 미만은 그대로
export function wonCompact(n) {
  if (Math.abs(n) < 100000000) return won(n)
  const eok = Math.trunc(n / 100000000), man = Math.trunc((Math.abs(n) % 100000000) / 10000)
  return `${eok.toLocaleString('ko-KR')}억${man ? ` ${man.toLocaleString('ko-KR')}만` : ''}원`
}
