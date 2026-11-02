import { Badge, Card, Col, Row } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import { LEVELS, benefitLines } from '../lib/level'
import { won } from '../lib/format'

// 제주 혜택 안내 — 탐나는전(제주 지역사랑상품권) 같은 지역 혜택을 한눈에 모아 보는 페이지.
// 아래 지역 혜택은 이해를 돕는 예시 안내입니다. 금액·조건은 바뀔 수 있으니 신청 전 공식 안내를 꼭 확인하세요.
const LOCAL = [
  { icon: 'wallet2', color: 'primary', title: '탐나는전 (지역사랑상품권)', tag: '모바일·카드',
    lines: ['제주 도내 가맹점에서 쓰는 지역화폐', '충전할 때 할인·캐시백 혜택이 붙는 경우가 많아요', '대형마트·유흥업소 등 일부 업종은 사용 제한'] },
  { icon: 'shop', color: 'success', title: '전통시장·동네 가게', tag: '지역 상권',
    lines: ['동문시장·서문시장 같은 전통시장 이용 시 환급 행사', '지역 가맹점 우선 이용으로 지역 경제에 보탬'] },
  { icon: 'bus-front', color: 'info', title: '대중교통·관광 할인', tag: '이동',
    lines: ['도민·관광객 대상 교통·입장 할인 프로그램', '시기별로 달라지니 출발 전에 확인'] },
  { icon: 'balloon-heart', color: 'danger', title: '도민·청년·가족 지원', tag: '복지',
    lines: ['연령·가구 조건에 따른 지원 사업', '신청 기간이 정해진 경우가 많아요'] },
]

const IN_APP = [
  { icon: 'lightning-charge', title: '타임 특가', text: '1분마다 바뀌는 특가로 장터 상품을 더 싸게', to: '/shop' },
  { icon: 'ticket-perforated', title: '쿠폰함', text: '등급 쿠폰과 프로모션 코드를 주문할 때 적용', to: '/mypage' },
  { icon: 'heart', title: '찜한 상품', text: '내 별자리에 담아 두고 가격 변동을 지켜보기', to: '/my' },
]

export default function Benefits() {
  return (
    <>
      <PageHeader icon="gift" title="제주 혜택" subtitle="탐나는전 같은 제주 지역 혜택과, 탐라신화 장터에서 받을 수 있는 혜택을 모았어요" />

      <h5 className="fw-bold mb-3">제주 지역 혜택</h5>
      <Row xs={1} md={2} className="g-3 mb-2">
        {LOCAL.map((b) => (
          <Col key={b.title}>
            <Card className="h-100 shadow-sm">
              <Card.Body>
                <div className="d-flex align-items-center gap-2 mb-2">
                  <span className={`text-bg-${b.color} rounded-circle d-inline-flex align-items-center justify-content-center`} style={{ width: 40, height: 40 }}>
                    <i className={`bi bi-${b.icon} fs-5`} />
                  </span>
                  <Card.Title className="mb-0 fs-6 fw-bold">{b.title}</Card.Title>
                  <Badge bg="light" text="dark" className="ms-auto border">{b.tag}</Badge>
                </div>
                <ul className="small text-body-secondary mb-0 ps-3">{b.lines.map((l) => <li key={l}>{l}</li>)}</ul>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
      <p className="small text-body-secondary mb-4"><i className="bi bi-info-circle me-1" />예시 안내입니다. 실제 혜택 내용·조건은 제주도 공식 안내에서 확인해 주세요.</p>

      <h5 className="fw-bold mb-3">장터 혜택</h5>
      <Row xs={1} md={3} className="g-3 mb-4">
        {IN_APP.map((b) => (
          <Col key={b.title}>
            <Card as={Link} to={b.to} className="h-100 text-decoration-none shadow-sm">
              <Card.Body>
                <i className={`bi bi-${b.icon} fs-3 text-primary`} />
                <div className="fw-bold mt-2">{b.title}</div>
                <div className="small text-body-secondary">{b.text}</div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      <h5 className="fw-bold mb-3">등급별 혜택</h5>
      <Row xs={1} md={2} lg={5} className="g-3">
        {LEVELS.map((l) => (
          <Col key={l.lv}>
            <Card className="h-100">
              <Card.Body>
                <Badge bg={l.color} text={l.color === 'warning' || l.color === 'info' ? 'dark' : undefined}>LV.{l.lv} {l.name}</Badge>
                <div className="small text-body-secondary my-2">{l.min === 0 ? '가입 즉시' : `누적 ${won(l.min)} 이상`}</div>
                <ul className="small mb-0 ps-3">{benefitLines(l).map((t) => <li key={t}>{t}</li>)}</ul>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
    </>
  )
}
