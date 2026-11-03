import { Alert } from 'react-bootstrap'

// 데이터·로딩·에러 3종 세트를 화면에 보여주는 공용 컴포넌트
export function Loading({ text = '불러오는 중...' }) {
  return <div className="state-box py-5" role="status"><span className="state-dots"><i /><i /><i /></span>{text}</div>
}
export function ErrorAlert({ error }) {
  if (!error) return null
  return <Alert variant="danger"><i className="bi bi-exclamation-triangle me-2" />{String(error)}</Alert>
}
export function Empty({ text = '결과가 없어요' }) {
  return <div className="state-box"><span className="state-icon"><i className="bi bi-moon-stars" /></span><div>{text}</div></div>
}
