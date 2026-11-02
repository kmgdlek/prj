// 4D 체험: 3D 지도에 '느낌'을 더한다 — 바람·안개·파도 세기(눈), 소리(귀), 진동(몸).
// 소리는 파일 없이 브라우저의 WebAudio 로 만든다 (잡음을 걸러서 바람·비·파도·천둥 소리로).

// 날씨별 효과 세기. wind 나무·바람줄 · rain 빗소리 · waves 파도 소리 · fog 안개(1 = 그대로, 작을수록 짙음) · amp 파도 높이
const BY_KIND = {
  clear: { wind: 0.5, rain: 0, waves: 0.7, fog: 1, amp: 1 },
  cloudy: { wind: 0.7, rain: 0, waves: 0.9, fog: 0.95, amp: 1.2 },
  overcast: { wind: 1, rain: 0, waves: 1.1, fog: 0.8, amp: 1.4 },
  rain: { wind: 1.3, rain: 1, waves: 1.5, fog: 0.7, amp: 1.9 },
  snow: { wind: 0.6, rain: 0, waves: 0.8, fog: 0.6, amp: 1.1 },
}
const STORM = { wind: 2.4, rain: 1.6, waves: 2.4, fog: 0.5, amp: 2.8 }
export const levelsOf = (kind, storm = false) => (storm ? STORM : BY_KIND[kind] ?? BY_KIND.clear)

// 천둥: 번개 뒤 잠깐 있다가 우르릉. 폰이 진동을 지원하면 같이 떤다
export const canVibrate = () => typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'
export const vibrate = (pattern) => { try { if (canVibrate()) navigator.vibrate(pattern) } catch { /* 진동을 못 쓰는 환경 */ } }

// ── 소리 엔진 ───────────────────────────────────────────
let ctx = null, nodes = null

function noiseBuffer(c) {
  const len = c.sampleRate * 3, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0)
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
  return buf
}
// 잡음 → 필터 → 음량. 켜 두고 음량만 바꿔서 부드럽게 이어지게 한다
function layer(c, master, type, freq, q = 0.7) {
  const src = c.createBufferSource(); src.buffer = noiseBuffer(c); src.loop = true
  const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q
  const g = c.createGain(); g.gain.value = 0
  src.connect(f).connect(g).connect(master)
  src.start()
  return { src, f, g }
}

export const fxAudio = {
  get running() { return Boolean(ctx && ctx.state !== 'closed' && nodes) },
  // 소리를 켠다 (사용자가 버튼을 눌렀을 때 불러야 브라우저가 허용한다)
  start() {
    if (this.running) { ctx.resume?.(); return true }
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return false
    ctx = new AC()
    const master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination)
    const wind = layer(ctx, master, 'bandpass', 420, 0.6)
    const rain = layer(ctx, master, 'highpass', 1500, 0.5)
    const waves = layer(ctx, master, 'lowpass', 520, 0.8)
    // 파도: 천천히 밀려왔다 빠지는 느낌(음량을 느리게 오르내림)
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.13
    const lfoGain = ctx.createGain(); lfoGain.gain.value = 0.05
    lfo.connect(lfoGain).connect(waves.g.gain); lfo.start()
    nodes = { master, wind, rain, waves, lfo }
    ctx.resume?.()
    return true
  },
  // 날씨 세기에 맞춰 바람·비·파도 소리 크기를 바꾼다
  set({ wind = 0, rain = 0, waves = 0 }) {
    if (!this.running) return
    const t = ctx.currentTime
    nodes.wind.g.gain.setTargetAtTime(Math.min(0.5, 0.05 + wind * 0.11), t, 0.6)
    nodes.wind.f.frequency.setTargetAtTime(300 + wind * 160, t, 0.6)
    nodes.rain.g.gain.setTargetAtTime(Math.min(0.42, rain * 0.22), t, 0.6)
    nodes.waves.g.gain.setTargetAtTime(Math.min(0.5, 0.08 + waves * 0.13), t, 0.6)
  },
  // 우르릉: 낮은 잡음이 갑자기 커졌다 길게 사그라든다
  thunder() {
    if (!this.running) return
    const t0 = ctx.currentTime + 0.25
    const src = ctx.createBufferSource(); src.buffer = noiseBuffer(ctx)
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(260, t0); f.frequency.exponentialRampToValueAtTime(70, t0 + 2.6)
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t0)
    g.gain.exponentialRampToValueAtTime(0.9, t0 + 0.06)
    g.gain.exponentialRampToValueAtTime(0.35, t0 + 0.9)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 3.2)
    src.connect(f).connect(g).connect(nodes.master)
    src.start(t0); src.stop(t0 + 3.4)
  },
  stop() {
    if (!ctx) return
    try { nodes?.wind.src.stop(); nodes?.rain.src.stop(); nodes?.waves.src.stop(); nodes?.lfo.stop() } catch { /* 이미 멈춤 */ }
    ctx.close?.().catch(() => {})
    ctx = null; nodes = null
  },
}
