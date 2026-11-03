// 동작 확인용 서버 함수 → http://localhost:3000/api/hello
// 키 값은 절대 내보내지 않고 "있는지 없는지"만 알려줍니다.
import { pickProvider } from '../server/aiProvider.js';

export default function handler(req, res) {
  const ai = pickProvider();
  res.status(200).json({
    ok: true,
    time: new Date().toISOString(),
    hasDataKey: Boolean(process.env.DATA_GO_KR_KEY),
    hasClaudeKey: Boolean(process.env.ANTHROPIC_API_KEY),
    hasOpenAIKey: Boolean(process.env.OPENAI_API_KEY),
    aiProvider: ai.name,              // 'claude' | 'openai' — 이야기꾼 AI 가 지금 쓰는 모델 회사
    hasAiKey: ai.hasKey,              // 고른 회사의 키가 있는지
    hasPixabayKey: Boolean(process.env.PIXABAY_KEY),
  });
}
