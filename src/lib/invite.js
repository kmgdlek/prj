// 친구 초대: 내 초대 코드 = 계정 id 의 앞 8글자(대문자). 초대 링크로 가입한 친구는 가입할 때 이 코드를 계정(user_metadata.invited_by)에 적는다.
// 친구가 처음 로그인하면 shop_invites 에 한 줄이 남고, 둘 다 쿠폰을 받는다 (쿠폰 지급은 앱이 내 계정의 쿠폰함에 직접 넣는다).
export const inviteCodeOf = (user) => (user?.id ? user.id.replace(/-/g, '').slice(0, 8).toUpperCase() : '')
export const inviteLinkOf = (code) => `${window.location.origin}/signup?invite=${code}`

const KEY = 'tamra-invite'
const VALID = /^[0-9A-F]{8}$/
export const getSavedInvite = () => { try { const c = localStorage.getItem(KEY); return VALID.test(c ?? '') ? c : null } catch { return null } }
// 주소의 ?invite=코드 를 기억해 둔다 (가입 화면까지 따라가도록). 올바른 형식이 아니면 무시
export function captureInvite() {
  try {
    const c = (new URLSearchParams(window.location.search).get('invite') ?? '').toUpperCase()
    if (VALID.test(c)) { localStorage.setItem(KEY, c); return c }
  } catch { /* 저장 못 해도 이번 접속엔 동작 */ }
  return null
}

// 보상 (모두 쿠폰함으로)
export const INVITEE_COUPON = { source: 'invite:joined', title: '친구 초대 환영 5,000원 쿠폰', kind: 'amount', value: 5000, min: 30000, expiresDays: 60 }
export const FRIEND_COUPON = { title: '친구 초대 감사 3,000원 쿠폰', kind: 'amount', value: 3000, min: 20000, expiresDays: 60 }
export const THREE_COUPON = { source: 'invite:three', title: '친구 3명 초대 10% 쿠폰', kind: 'percent', value: 10, min: 30000, expiresDays: 60 }
export const MAX_REWARDED = 5          // 친구 수 보상은 5명까지
