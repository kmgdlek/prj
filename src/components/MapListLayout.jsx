import { Col, Row } from 'react-bootstrap'

// 왼쪽 3D 지도(+ 지도 아래 설명), 오른쪽 목록. 목록 칸만 따로 스크롤된다 (넓은 화면에서는 높이를 지도에 맞춘다).
// 좁은 화면에서는 지도가 위, 목록이 아래로 쌓이고 목록은 화면의 70% 높이까지만 보이며 스크롤된다.
export default function MapListLayout({ map, below, list, height = 460 }) {
  return (
    <Row className="g-4">
      <Col lg={7}>
        {map}
        {below}
      </Col>
      <Col lg={5}>
        <div className="side-scroll" style={{ '--side-h': `${height}px` }}>{list}</div>
      </Col>
    </Row>
  )
}
