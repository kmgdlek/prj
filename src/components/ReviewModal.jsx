import { useState } from 'react'
import { Alert, Button, Form, Modal } from 'react-bootstrap'
import { StarInput } from './StarRating'
import { useAppStore } from '../store/useAppStore'

// 후기 작성 — target = { product_id, name, order_id }
export default function ReviewModal({ target, onHide }) {
  const addReview = useAppStore((s) => s.addReview)
  const [rating, setRating] = useState(5)
  const [content, setContent] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    setBusy(true); setError('')
    try {
      await addReview({ product_id: target.product_id, order_id: target.order_id, rating, content })
      setContent(''); setRating(5)
      onHide()
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }

  return (
    <Modal show={Boolean(target)} onHide={onHide} centered>
      <Form onSubmit={submit}>
        <Modal.Header closeButton><Modal.Title className="fs-5 fw-bold">후기 쓰기</Modal.Title></Modal.Header>
        <Modal.Body>
          {target && <p className="fw-bold mb-2">{target.name}</p>}
          <div className="mb-3"><StarInput value={rating} onChange={setRating} /> <span className="ms-2 fw-bold">{rating}점</span></div>
          <Form.Control as="textarea" rows={4} required minLength={5} maxLength={500} value={content}
            onChange={(e) => setContent(e.target.value)} placeholder="상품은 어땠나요? (5자 이상)" />
          <div className="small text-body-secondary text-end mt-1">{content.length}/500</div>
          {error && <Alert variant="danger" className="py-2 mt-2 mb-0">{error}</Alert>}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={onHide}>닫기</Button>
          <Button type="submit" disabled={busy}>{busy ? '등록 중...' : '등록'}</Button>
        </Modal.Footer>
      </Form>
    </Modal>
  )
}
