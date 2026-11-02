import { useState } from 'react'
import { Badge, Modal, ProgressBar } from 'react-bootstrap'
import { LEVELS, benefitLines, levelOf, totalSpent } from '../lib/level'
import { won } from '../lib/format'
import { useAppStore } from '../store/useAppStore'

const lightText = (color) => (color === 'warning' || color === 'info' ? 'dark' : undefined)

// 등급 배지. 누르면 전체 등급표 창이 열린다.
// part: 'full' = LV.2 실버 · 'lv' = LV.2 만 · 'name' = 실버 만 (이름 왼쪽엔 'lv', 아래엔 'name' 처럼 나눠 쓴다)
// withProgress: 배지 바로 아래에 "다음 LV.N …까지 금액"(이것도 누르면 등급표) + 그 밑줄 진행 막대
export default function LevelBadge({ withProgress = false, part = 'full' }) {
  const orders = useAppStore((s) => s.orders)
  const [open, setOpen] = useState(false)
  const isAdmin = useAppStore((s) => s.isAdmin)
  const L = levelOf(totalSpent(orders))
  const show = (e) => { e.stopPropagation(); setOpen(true) }
  if (isAdmin) return null                         // 관리자는 등급 대신 '관리자' 배지(AdminBadge)만 보인다
  return (
    <>
      <Badge as="button" type="button" bg={L.color} text={lightText(L.color)} className="border-0" style={{ cursor: 'pointer' }}
        title="등급 안내 보기" onClick={show}>
        {part === 'lv' ? `LV.${L.lv}` : part === 'name' ? L.name : `LV.${L.lv} ${L.name}`}
      </Badge>
      {withProgress && (
        <div className="level-progress">
          <button type="button" className="level-next" onClick={show}>
            {L.next ? `다음 LV.${L.next.lv} ${L.next.name}까지 ${won(L.remain)}` : '최고 등급이에요!'}
            <i className="bi bi-chevron-right" />
          </button>
          <ProgressBar now={Math.round(L.progress * 100)} variant={L.color} className="level-line" />
        </div>
      )}
      <LevelModal show={open} onHide={() => setOpen(false)} current={L} />
    </>
  )
}

// 등급 안내 — 위에 내 등급 요약, 아래에 5개 등급을 세로 단계로
function LevelModal({ show, onHide, current }) {
  return (
    <Modal show={show} onHide={onHide} centered className="level-modal">
      <Modal.Header closeButton className="border-0 pb-0"><Modal.Title className="fs-5 fw-bold">등급 안내</Modal.Title></Modal.Header>
      <Modal.Body>
        <div className="level-hero">
          <span className={`level-dot lg bg-${current.color} ${lightText(current.color) ? 'text-dark' : 'text-white'}`}>{current.lv}</span>
          <div>
            <div className="small text-body-secondary">현재 등급</div>
            <div className="fs-4 fw-bold lh-sm">{current.name}</div>
          </div>
          <div className="ms-auto text-end">
            <div className="small text-body-secondary">누적 구매액</div>
            <div className="fw-bold">{won(current.spent)}</div>
          </div>
        </div>
        <ProgressBar now={Math.round(current.progress * 100)} variant={current.color} className="level-line mt-3" />
        <div className="small text-body-secondary mt-1 mb-3">
          {current.next ? `다음 LV.${current.next.lv} ${current.next.name}까지 ${won(current.remain)}` : '최고 등급이에요!'}
        </div>

        <ul className="level-list">
          {LEVELS.map((l) => {
            const mine = l.lv === current.lv, done = l.lv < current.lv
            return (
              <li key={l.lv} className={`level-item ${mine ? 'mine' : ''} ${done ? 'done' : ''}`}>
                <span className={`level-dot bg-${l.color} ${lightText(l.color) ? 'text-dark' : 'text-white'}`}>
                  {done ? <i className="bi bi-check-lg" /> : l.lv}
                </span>
                <div className="flex-grow-1">
                  <div className="fw-bold">{l.name}</div>
                  <div className="small text-body-secondary">{l.min === 0 ? '가입 즉시' : `누적 구매액 ${won(l.min)} 이상`}</div>
                  <ul className="level-benefits">
                    {benefitLines(l).map((b) => <li key={b}>{b}</li>)}
                  </ul>
                </div>
                {mine && <Badge bg="primary" pill>내 등급</Badge>}
              </li>
            )
          })}
        </ul>
        <p className="small text-body-secondary mb-0 mt-3">취소하거나 반품·환불을 접수한 주문은 구매액에 포함되지 않아요.</p>
      </Modal.Body>
    </Modal>
  )
}
