// Supabase Auth 의 영어 오류를 화면용 한국어로
export const authErrorMessage = (err) =>
  /Invalid login/i.test(err.message) ? '이메일이나 비밀번호가 맞지 않아요'
  : /already registered/i.test(err.message) ? '이미 가입된 이메일이에요'
  : /Email not confirmed/i.test(err.message) ? '메일함의 인증 링크를 먼저 눌러 주세요'
  : /rate limit/i.test(err.message) ? '요청이 많아요. 잠시 뒤 다시 시도하세요'
  : err.message
