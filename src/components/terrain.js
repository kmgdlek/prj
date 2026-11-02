// 제주섬 지형 — 실제 해안선(대략 28개 지점) + 한라산 + 노이즈 기복으로 높이 지도를 만든다.
// 3D 메쉬와 마커·오름 위치가 같은 높이 지도를 쓰므로 서로 어긋나지 않는다.

// 위도·경도 → 3D (x: 동서, z: 남북). 제주 중심 북위 33.38, 동경 126.56, 1° = 20 유닛
export const SCALE = 20
export const toXZ = (lat, lng) => [(lng - 126.56) * SCALE, (33.38 - lat) * SCALE]

// 해안선 (시계 방향, [위도, 경도]) — 한림에서 시작해 북쪽 해안 → 동쪽 성산 → 남쪽 → 서쪽
const COAST_LL = [
  [33.394, 126.239], [33.434, 126.268], [33.462, 126.309], [33.4635, 126.3266], [33.487, 126.402],
  [33.5125, 126.465], [33.5185, 126.53], [33.5275, 126.582], [33.543, 126.67], [33.559, 126.757],
  [33.557, 126.796], [33.524, 126.862], [33.498, 126.917], [33.462, 126.943], [33.428, 126.925],
  [33.38, 126.88], [33.32, 126.835], [33.285, 126.75], [33.271, 126.667], [33.25, 126.6],
  [33.239, 126.565], [33.24, 126.48], [33.24, 126.415], [33.236, 126.34], [33.225, 126.31],
  [33.21, 126.25], [33.222, 126.2], [33.272, 126.165], [33.293, 126.163], [33.32, 126.17],
  [33.345, 126.17], [33.38, 126.185],
]

// Chaikin 알고리즘으로 모서리를 깎아 부드러운 곡선 해안선으로
function chaikin(points, iterations) {
  let pts = points
  for (let it = 0; it < iterations; it++) {
    const next = []
    for (let i = 0; i < pts.length; i++) {
      const [ax, az] = pts[i], [bx, bz] = pts[(i + 1) % pts.length]
      next.push([ax * 0.75 + bx * 0.25, az * 0.75 + bz * 0.25], [ax * 0.25 + bx * 0.75, az * 0.25 + bz * 0.75])
    }
    pts = next
  }
  return pts
}
const COAST = chaikin(COAST_LL.map(([la, ln]) => toXZ(la, ln)), 2)

// 해안선까지의 부호 있는 거리 (섬 안쪽이 +)
function sdf(x, z) {
  let d2 = Infinity, inside = false
  for (let i = 0, j = COAST.length - 1; i < COAST.length; j = i++) {
    const [ax, az] = COAST[j], [bx, bz] = COAST[i]
    const ex = bx - ax, ez = bz - az
    const t = Math.max(0, Math.min(1, ((x - ax) * ex + (z - az) * ez) / (ex * ex + ez * ez)))
    const px = ax + ex * t - x, pz = az + ez * t - z
    const dd = px * px + pz * pz
    if (dd < d2) d2 = dd
    if ((az > z) !== (bz > z) && x < ((bx - ax) * (z - az)) / (bz - az) + ax) inside = !inside
  }
  return inside ? Math.sqrt(d2) : -Math.sqrt(d2)
}

// 값 노이즈 + fbm (고정 해시라 누구에게나 같은 섬)
const hash = (x, y) => { const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return h - Math.floor(h) }
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y)
  const fx = x - xi, fy = y - yi
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy)
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1)
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
}
export function fbm(x, y, oct = 5) {
  let sum = 0, amp = 0.5, f = 1
  for (let i = 0; i < oct; i++) { sum += amp * vnoise(x * f, y * f); f *= 2; amp *= 0.5 }
  return sum
}
const smooth = (a, b, v) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t) }

export const HALLA = toXZ(33.3617, 126.5292)   // 한라산 백록담

// 높이 함수: 바다 쪽은 완만하게 깊어지고, 육지는 해안에서 서서히 솟아 한라산이 우뚝
function heightFn(x, z) {
  const d = sdf(x, z) + (fbm(x * 0.9 + 10, z * 0.9) - 0.5) * 0.35     // 해안선을 자연스럽게 일렁이게
  if (d <= 0) return Math.max(-0.75, 0.02 + d * 0.6)
  const land = smooth(0, 1.8, d)
  let h = 0.02 + land * 0.5 + (fbm(x * 1.6, z * 1.6) - 0.5) * 0.28 * land
  const dx = x - HALLA[0], dz = z - HALLA[1]
  const r2 = dx * dx * 0.7 + dz * dz * 1.3                              // 동서로 길게 퍼진 한라산 자락
  const ridge = 1 + (fbm(x * 3.5 + 3, z * 3.5) - 0.5) * 0.35
  h += (2.3 * Math.exp(-r2 / 2.4) + 0.55 * Math.exp(-r2 / 10)) * ridge * Math.min(1, land * 1.5)
  h -= 0.16 * Math.exp(-r2 / 0.05)                                       // 백록담 분화구
  return h
}

// 높이 지도 격자 (한 번만 계산해 메쉬·마커가 공유)
export const GRID = { x0: -10, z0: -6, w: 20, d: 12, nx: 401, nz: 241 }
let HM = null
export function heightMap() {
  if (HM) return HM
  HM = new Float32Array(GRID.nx * GRID.nz)
  for (let iz = 0; iz < GRID.nz; iz++) {
    for (let ix = 0; ix < GRID.nx; ix++) {
      HM[iz * GRID.nx + ix] = heightFn(GRID.x0 + (ix * GRID.w) / (GRID.nx - 1), GRID.z0 + (iz * GRID.d) / (GRID.nz - 1))
    }
  }
  return HM
}

// 임의 위치의 높이 (격자를 쌍선형 보간)
export function heightAt(x, z) {
  const m = heightMap()
  const fx = ((x - GRID.x0) / GRID.w) * (GRID.nx - 1), fz = ((z - GRID.z0) / GRID.d) * (GRID.nz - 1)
  if (fx < 0 || fz < 0 || fx > GRID.nx - 1 || fz > GRID.nz - 1) return -0.75
  const ix = Math.min(Math.floor(fx), GRID.nx - 2), iz = Math.min(Math.floor(fz), GRID.nz - 2)
  const tx = fx - ix, tz = fz - iz
  const a = m[iz * GRID.nx + ix], b = m[iz * GRID.nx + ix + 1], c = m[(iz + 1) * GRID.nx + ix], e = m[(iz + 1) * GRID.nx + ix + 1]
  return a + (b - a) * tx + (c - a) * tz + (a - b - c + e) * tx * tz
}

const mix = (c1, c2, t) => [c1[0] + (c2[0] - c1[0]) * t, c1[1] + (c2[1] - c1[1]) * t, c1[2] + (c2[2] - c1[2]) * t]
// 정점 색은 three.js 가 '선형' 값으로 읽으므로, 보이는 색(sRGB)을 선형으로 바꿔 둔다 (안 하면 뿌옇고 밝게 나온다)
const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
const hex = (h) => [1, 3, 5].map((i) => lin(parseInt(h.slice(i, i + 2), 16) / 255))
const C = {
  deep: hex('#05153a'), shallow: hex('#2fc4c0'), sand: hex('#e3cf9c'), foam: hex('#f2fbf8'),
  field: hex('#6fae45'), meadow: hex('#4f8f3a'), forest: hex('#2d6a38'), rock: hex('#7d6150'),
  scree: hex('#5a4638'), snow: hex('#ece6ff'),
}

// 높이·위치별 색 → [r, g, b]  (바다 깊이 그라데이션, 모래·포말, 들판·숲, 암석, 정상의 눈)
export function colorAt(h, x, z) {
  if (h < 0.0) return mix(C.shallow, C.deep, Math.min(1, -h / 0.55))
  const n = fbm(x * 5 + 7, z * 5 + 2)                              // 숲·들판 얼룩
  if (h < 0.05) return mix(C.foam, C.sand, smooth(0, 0.05, h))     // 해안: 포말 → 모래
  if (h < 0.14) return mix(C.sand, mix(C.field, C.meadow, n), smooth(0.05, 0.14, h))
  let c = mix(mix(C.field, C.meadow, n), C.forest, smooth(0.25, 1.0, h) * (0.6 + 0.6 * n))
  if (h > 1.0) c = mix(c, mix(C.rock, C.scree, n), smooth(1.0, 1.7, h))
  if (h > 1.9) c = mix(c, C.snow, smooth(1.9, 2.5, h + (n - 0.5) * 0.3))
  return c
}
