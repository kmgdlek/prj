// 프로필 사진 (없으면 사람 아이콘)
export default function Avatar({ user, size = 40, className = '' }) {
  const url = user?.user_metadata?.avatar_url
  const style = { width: size, height: size }
  return url
    ? <img src={url} alt="프로필 사진" className={`avatar-img ${className}`} style={style} />
    : <span className={`avatar-img avatar-empty ${className}`} style={{ ...style, fontSize: size * 0.62 }}><i className="bi bi-person-fill" /></span>
}
