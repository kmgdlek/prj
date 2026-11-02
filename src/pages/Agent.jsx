import { Card } from 'react-bootstrap'
import PageHeader from '../components/PageHeader'
import ChatPanel from '../components/ChatPanel'

// 전체 화면 버전 (평소에는 오른쪽 아래 떠 있는 창으로 쓰고, 주소로 직접 들어오면 이 페이지)
export default function Agent() {
  return (
    <>
      <PageHeader icon="robot" title="이야기꾼 AI" subtitle="신화 · 관광 · 날씨 · 국가유산 도구를 스스로 골라 쓰는 에이전트" />
      <Card style={{ height: '65vh' }}><ChatPanel /></Card>
    </>
  )
}
