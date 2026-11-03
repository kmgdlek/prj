// 이야기꾼 AI 가 쓸 모델 회사를 고른다 (서버 전용 — 키 값은 내보내지 않는다).
//   AI_PROVIDER=claude | openai 로 직접 고르고, 비워 두면 키가 있는 쪽을 따른다 (둘 다 있으면 Claude).
export function pickProvider(env = process.env) {
  const hasClaude = Boolean(env.ANTHROPIC_API_KEY), hasOpenAI = Boolean(env.OPENAI_API_KEY)
  const want = (env.AI_PROVIDER ?? '').trim().toLowerCase()
  if (want === 'openai') return { name: 'openai', hasKey: hasOpenAI }
  if (want === 'claude' || want === 'anthropic') return { name: 'claude', hasKey: hasClaude }
  if (hasClaude) return { name: 'claude', hasKey: true }
  if (hasOpenAI) return { name: 'openai', hasKey: true }
  return { name: 'claude', hasKey: false }
}
