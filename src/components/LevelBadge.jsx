import { useState } from 'react'
import { Badge, Modal, ProgressBar, Table } from 'react-bootstrap'
import { LEVELS, levelOf, totalSpent } from '../lib/level'
import { won } from '../lib/format'
import { useAppStore } from '../store/useAppStore'

const textFor = (color) => (color === 'warning' || color === 'info' ? 'dark' : undefined)

// 등급 배지 (+ 다음 등급까지 진행 막대). 누르면 전체 등급표 창이 열린다.
// part: 'full' = LV.2 실버 · 'lv' = LV.2 만 · 'name' = 실버 만 (이름 왼쪽엔 'lv', 아래엔 'name' 처럼 나눠 쓴다)
export default function LevelBadge({ withProgress = false, part = 'full' }) {
  const orders = useAppStore((s) => s.orders)
  const [open, setOpen] = useState(false)
  const L = levelOf(totalSpent(orders))
  return (
    <>
      <Badge as="button" type="button" bg={L.color} text={textFor(L.color)} className="border-0" style={{ cursor: 'pointer' }}
        title="등급 안내 보기" onClick={(e) => { e.stopPropagation(); setOpen(true) }}>
        {part === 'lv' ? `LV.${L.lv}` : part === 'name' ? L.name : `LV.${L.lv} ${L.name}`}
      </Badge>
      {withProgress && (
        <div className="mt-2">
          <ProgressBar now={Math.round(L.progress * 100)} variant={L.color} style={{ height: 8 }} />
          <div className="small text-body-secondary mt-1">
            {L.next ? `다음 LV.${L.next.lv} ${L.next.name}까지 ${won(L.remain)}` : '최고 등급이에요!'}
          </div>
        </div>
      )}
      <LevelModal show={open} onHide={() => setOpen(false)} current={L} />
    </>
  )
}

// 전체 등급표 — 내 등급을 표시하고, 각 등급의 기준 금액을 보여 준다
function LevelModal({ show, onHide, current }) {
  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton><Modal.Title className="fw-bold fs-5">등급 안내</Modal.Title></Modal.Header>
      <Modal.Body>
        <div className="mb-3">
          <div className="small text-body-secondary">내 누적 구매액</div>
          <div className="fs-4 fw-bold">{won(current.spent)}</div>
          <ProgressBar now={Math.round(current.progress * 100)} variant={current.color} className="mt-2" style={{ height: 8 }} />
          <div className="small text-body-secondary mt-1">
            {current.next ? `다음 LV.${current.next.lv} ${current.next.name}까지 ${won(current.remain)}` : '최고 등급이에요!'}
          </div>
        </div>
        <Table size="sm" className="align-middle mb-2">
          <thead><tr><th>등급</th><th>누적 구매액</th><th className="text-end">상태</th></tr></thead>
          <tbody>
            {LEVELS.map((l) => {
              const mine = l.lv === current.lv
              return (
                <tr key={l.lv} className={mine ? 'table-active fw-bold' : ''}>
                  <td><Badge bg={l.color} text={textFor(l.color)}>LV.{l.lv}</Badge> {l.name}</td>
                  <td>{l.min === 0 ? '가입 즉시' : `${won(l.min)} 이상`}</td>
                  <td className="text-end small">{mine ? '내 등급' : l.lv < current.lv ? '달성' : ''}</td>
                </tr>
              )
            })}
          </tbody>
        </Table>
        <p className="small text-body-secondary mb-0">※ 취소하거나 반품·환불을 접수한 주문은 구매액에 포함되지 않아요.</p>
      </Modal.Body>
    </Modal>
  )
}
