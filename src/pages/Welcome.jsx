import { Link } from 'react-router-dom'
import { Button, Card } from 'react-bootstrap'
import { Loading } from '../components/Status'
import { displayName, useAppStore } from '../store/useAppStore'

// 가입 완료 페이지 (/welcome). 이메일 인증 링크를 누르면 여기로 도착하고, 이메일 인증 없이 가입했을 때도 여기로 온다.
// 인증 링크로 들어오면 Supabase 가 로그인까지 처리해 주므로 로그인된 상태로 보인다. 아니면 로그인하라고 안내한다.
export default function Welcome() {
  const { user, authReady } = useAppStore()
  if (!authReady) return <Loading />
  return (
    <div className="mx-auto text-center" style={{ maxWidth: 480 }}>
      <Card><Card.Body className="py-5 px-4">
        <i className="bi bi-patch-check display-3 text-success" />
        <h3 className="fw-bold mt-3">{user ? `가입이 완료됐어요, ${displayName(user)}님!` : '가입이 완료됐어요!'}</h3>
        {user ? (
          <>
            <p className="text-body-secondary mb-4">이제 별자리·장바구니·주문이 내 계정에 저장돼요.</p>
            <div className="d-grid gap-2">
              <Button as={Link} to="/shop"><i className="bi bi-bag-heart me-1" />제주 장터 구경하기</Button>
              <Button as={Link} to="/map" variant="outline-primary"><i className="bi bi-map me-1" />3D 지도 보기</Button>
              <Button as={Link} to="/mypage" variant="link">마이페이지</Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-body-secondary mb-4">로그인하면 바로 시작할 수 있어요.</p>
            <div className="d-grid"><Button as={Link} to="/login">로그인하러 가기</Button></div>
          </>
        )}
      </Card.Body></Card>
    </div>
  )
}
