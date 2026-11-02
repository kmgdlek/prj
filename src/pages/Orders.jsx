import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Accordion, Card, Col, Row, Table } from 'react-bootstrap'
import PageHeader from '../components/PageHeader'
import LevelBadge from '../components/LevelBadge'
import { Empty } from '../components/Status'
import { useAppStore } from '../store/useAppStore'
import { totalSpent } from '../lib/level'
import { won } from '../lib/format'

// 주문 내역 — 주문 당시의 상품·가격이 그대로 남아 있다. 누적 구매액이 등급(LV)이 된다
export default function Orders() {
  const orders = useAppStore((s) => s.orders)
  const loadOrders = useAppStore((s) => s.loadOrders)
  useEffect(() => { loadOrders() }, [loadOrders])

  const spent = totalSpent(orders)
  const count = orders.reduce((n, o) => n + o.items.reduce((m, i) => m + i.qty, 0), 0)

  return (
    <>
      <PageHeader icon="receipt" title="주문 내역" subtitle="많이 살수록 등급이 올라가요" />
      <Row className="g-3 mb-4">
        <Col md={5}>
          <Card className="h-100"><Card.Body>
            <div className="small text-body-secondary mb-1">내 등급</div>
            <LevelBadge withProgress />
          </Card.Body></Card>
        </Col>
        <Col xs={6} md={3}><Stat label="주문" value={`${orders.length}건`} /></Col>
        <Col xs={6} md={2}><Stat label="산 물건" value={`${count}개`} /></Col>
        <Col xs={12} md={2}><Stat label="누적 구매액" value={won(spent)} /></Col>
      </Row>

      {orders.length === 0 ? (
        <>
          <Empty text="아직 주문이 없어요" />
          <div className="text-center"><Link to="/shop" className="btn btn-primary btn-sm">제주 장터 가기</Link></div>
        </>
      ) : (
        <Accordion defaultActiveKey={String(orders[0].id)}>
          {orders.map((o) => (
            <Accordion.Item key={o.id} eventKey={String(o.id)}>
              <Accordion.Header>
                <div className="d-flex flex-column flex-sm-row gap-1 gap-sm-3 w-100 me-3">
                  <strong>주문 #{o.id}</strong>
                  <span className="text-body-secondary small align-self-sm-center">{new Date(o.created_at).toLocaleString('ko-KR')}</span>
                  <strong className="ms-sm-auto">{won(o.total)}</strong>
                </div>
              </Accordion.Header>
              <Accordion.Body>
                <Table size="sm" className="mb-0 align-middle">
                  <thead><tr><th>상품</th><th className="text-end">단가</th><th className="text-end">수량</th><th className="text-end">금액</th></tr></thead>
                  <tbody>
                    {o.items.map((i) => (
                      <tr key={i.product_id}>
                        <td>{i.name}</td>
                        <td className="text-end">{won(i.price)}</td>
                        <td className="text-end">{i.qty}</td>
                        <td className="text-end">{won(i.price * i.qty)}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Accordion.Body>
            </Accordion.Item>
          ))}
        </Accordion>
      )}
      <p className="small text-body-secondary mt-3">※ 실제 결제는 연동하지 않은 과제용 주문입니다.</p>
    </>
  )
}

function Stat({ label, value }) {
  return (
    <Card className="h-100"><Card.Body>
      <div className="small text-body-secondary">{label}</div>
      <div className="fw-bold fs-5">{value}</div>
    </Card.Body></Card>
  )
}
