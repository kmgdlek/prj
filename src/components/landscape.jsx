import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { GRID, HALLA, fbm, heightAt, toXZ } from './terrain'
import { MYTHS } from '../../server/myths'

// 섬 위에 얹는 풍경: 나무(침엽수·활엽수·야자수) · 감귤밭 · 현무암 · 돌하르방 · 풍력발전기.
// 모두 terrain.js 의 높이 지도 위에 놓이고, 고정 난수라 누구에게나 같은 섬이 나온다.
// 같은 모양이 수천 개라서 InstancedMesh(모양 하나 = 그리기 한 번)로 그린다. 마우스 판정은 꺼서(raycast 끔) 마커 클릭을 방해하지 않는다.
const noRay = () => null
const rngOf = (seed) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647)

// 모양 하나를 여러 부품(원기둥·원뿔·구)으로 만들고 부품마다 색을 칠해 한 덩어리로 합친다
export function part(geo, color, { x = 0, y = 0, z = 0, rx = 0, rz = 0, sx = 1, sy = 1, sz = 1 } = {}) {
  const g = geo.clone()
  g.scale(sx, sy, sz); g.rotateX(rx); g.rotateZ(rz); g.translate(x, y, z)
  const c = new THREE.Color(color), n = g.attributes.position.count, arr = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3))
  g.deleteAttribute('uv')
  return g
}
export const cyl = (r0, r1, h, seg = 6) => new THREE.CylinderGeometry(r1, r0, h, seg)
export const cone = (r, h, seg = 7) => new THREE.ConeGeometry(r, h, seg)
export const ball = (r, d = 1) => new THREE.IcosahedronGeometry(r, d)
export const merge = (parts) => mergeGeometries(parts.map((p) => (p.index ? p.toNonIndexed() : p)))

const GEO = {
  conifer: () => merge([
    part(cyl(0.022, 0.018, 0.12), '#5b3d27', { y: 0.06 }),
    part(cone(0.17, 0.2), '#1f5a35', { y: 0.2 }), part(cone(0.13, 0.19), '#256b3d', { y: 0.33 }), part(cone(0.085, 0.17), '#2c7a45', { y: 0.45 }),
  ]),
  broadleaf: () => merge([
    part(cyl(0.028, 0.02, 0.17), '#6a4a30', { y: 0.085 }),
    part(ball(0.17), '#3f8f3c', { y: 0.29, sy: 0.9 }), part(ball(0.1), '#52a448', { x: 0.1, y: 0.22 }), part(ball(0.09), '#357d36', { x: -0.09, y: 0.25, z: 0.05 }),
  ]),
  palm: () => merge([
    part(cyl(0.028, 0.018, 0.34), '#8b6a45', { y: 0.17, rz: 0.12 }),
    ...[0, 1, 2, 3, 4, 5].map((i) => part(cone(0.028, 0.26, 4), '#3e9a45', { x: 0.04 + Math.cos(i * 1.047) * 0.11, y: 0.35, z: Math.sin(i * 1.047) * 0.11, rz: Math.cos(i * 1.047) * -1.25, rx: Math.sin(i * 1.047) * 1.25 })),
  ]),
  bush: () => merge([
    part(ball(0.1), '#4c9a3a', { y: 0.08, sy: 0.85 }),
    part(ball(0.026, 0), '#ff9a1f', { x: 0.07, y: 0.12, z: 0.04 }), part(ball(0.026, 0), '#ff8a00', { x: -0.05, y: 0.14, z: 0.06 }), part(ball(0.026, 0), '#ffab2e', { x: 0.01, y: 0.1, z: -0.08 }), part(ball(0.026, 0), '#ff9a1f', { x: -0.07, y: 0.07, z: -0.04 }),
  ]),
  rock: () => part(new THREE.DodecahedronGeometry(0.05, 0), '#34343a', { sy: 0.6 }),
  hareubang: () => merge([
    part(cyl(0.07, 0.06, 0.16, 8), '#7b7b82', { y: 0.08 }), part(ball(0.065, 1), '#85858c', { y: 0.2 }),
    part(cyl(0.09, 0.07, 0.035, 10), '#6a6a71', { y: 0.265 }), part(ball(0.024, 0), '#4a4a50', { x: -0.025, y: 0.205, z: 0.058 }), part(ball(0.024, 0), '#4a4a50', { x: 0.025, y: 0.205, z: 0.058 }),
  ]),
}

// 정해진 모양을 정해진 자리에 수백~수천 개 심는다. spots: [{ x, z, s, rot, tint }] (높이는 지형에서 읽는다)
function Planted({ kind, spots, shadow = true, sink = 0.01 }) {
  const ref = useRef()
  const geometry = useMemo(() => GEO[kind](), [kind])
  useLayoutEffect(() => {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(), col = new THREE.Color()
    const up = new THREE.Vector3(0, 1, 0)
    spots.forEach((o, i) => {
      p.set(o.x, heightAt(o.x, o.z) - sink, o.z)
      s.set(o.s, o.s * (o.sy ?? 1), o.s)
      q.setFromAxisAngle(up, o.rot)
      ref.current.setMatrixAt(i, m.compose(p, q, s))
      col.setHSL(0, 0, 1).offsetHSL(0, 0, o.tint ?? 0)           // 흰색 기준 밝기만 살짝 달리해 같은 모양도 제각각으로
      ref.current.setColorAt(i, col)
    })
    ref.current.count = spots.length
    ref.current.instanceMatrix.needsUpdate = true
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true
  }, [spots, sink])
  return (
    <instancedMesh ref={ref} args={[geometry, undefined, Math.max(spots.length, 1)]} castShadow={shadow} receiveShadow raycast={noRay} frustumCulled={false}>
      <meshStandardMaterial vertexColors roughness={0.9} />
    </instancedMesh>
  )
}

// 후보 자리를 무작위로 뽑아 조건(accept)에 맞는 것만 count 개 모은다
function scatter(seed, count, accept, size) {
  const rnd = rngOf(seed), out = []
  for (let guard = 0; out.length < count && guard < count * 40; guard++) {
    const x = GRID.x0 + rnd() * GRID.w, z = GRID.z0 + rnd() * GRID.d
    const h = heightAt(x, z)
    if (!accept(x, z, h, rnd)) continue
    out.push({ x, z, s: size(rnd), rot: rnd() * Math.PI * 2, tint: (rnd() - 0.5) * 0.18 })
  }
  return out
}
const nearHalla = (x, z) => Math.hypot(x - HALLA[0], z - HALLA[1])

// 숲: 한라산 자락의 숲은 침엽수, 낮은 들은 활엽수. 숲 얼룩(노이즈)이 짙은 곳에 모여 자란다
function Forest() {
  const conifers = useMemo(() => scatter(7, 900, (x, z, h, r) => h > 0.75 && h < 1.55 && nearHalla(x, z) > 0.7 && fbm(x * 2.4, z * 2.4) + r() * 0.25 > 0.68, (r) => 0.7 + r() * 0.55), [])
  const broad = useMemo(() => scatter(11, 700, (x, z, h, r) => h > 0.16 && h < 0.85 && fbm(x * 2.1 + 5, z * 2.1) + r() * 0.3 > 0.72, (r) => 0.65 + r() * 0.5), [])
  const palms = useMemo(() => scatter(13, 70, (x, z, h, r) => z > 0.4 && h > 0.06 && h < 0.2 && r() < 0.8, (r) => 0.8 + r() * 0.35), [])
  return <><Planted kind="conifer" spots={conifers} /><Planted kind="broadleaf" spots={broad} /><Planted kind="palm" spots={palms} /></>
}

// 감귤밭: 한라산 남쪽(서귀포 쪽) 낮은 땅에 줄 맞춰 심은 귤나무. 열매(주황)가 박혀 있다
function Orchards() {
  const spots = useMemo(() => {
    const rnd = rngOf(21), out = []
    for (let x = -4.4; x < 4.6; x += 0.24) {
      for (let z = 0.9; z < 3.9; z += 0.24) {
        const px = x + (rnd() - 0.5) * 0.04, pz = z + (rnd() - 0.5) * 0.04, h = heightAt(px, pz)
        const field = fbm(px * 1.3 + 40, pz * 1.3) > 0.46                  // 밭은 군데군데 네모난 구획으로
        if (h > 0.1 && h < 0.5 && field && nearHalla(px, pz) > 1.6) out.push({ x: px, z: pz, s: 0.8 + rnd() * 0.25, rot: rnd() * 6.28, tint: (rnd() - 0.5) * 0.1 })
      }
    }
    return out
  }, [])
  return <Planted kind="bush" spots={spots} />
}

// 현무암 바위: 해안과 들판에 흩어진 검은 돌 (제주의 화산암)
function Basalt() {
  const spots = useMemo(() => scatter(31, 650, (x, z, h) => h > 0.03 && h < 0.7, (r) => 0.5 + r() * r() * 1.8).map((o) => ({ ...o, sy: 0.7 + Math.abs(Math.sin(o.x * 9)) * 0.8 })), [])
  return <Planted kind="rock" spots={spots} shadow={false} sink={0.015} />
}

// 돌하르방: 제주의 수호신 — 신화 장소 중 돌하르방·돌문화공원·삼성혈·정방폭포 곁에 한 쌍씩
function Hareubangs() {
  const spots = useMemo(() => {
    const ids = ['dolhareubang', 'stonepark', 'samseonghyeol', 'jeongbang', 'sanbang']
    return MYTHS.filter((m) => ids.includes(m.id)).flatMap((m) => {
      const [x, z] = toXZ(m.lat, m.lng)
      return [[0.16, 0.1, 0.5], [-0.12, 0.16, -0.4]].map(([dx, dz, rot]) => ({ x: x + dx, z: z + dz, s: 1.15, rot, tint: 0 }))
    })
  }, [])
  return <Planted kind="hareubang" spots={spots} />
}

// 풍력발전기: 제주 해안·초원의 바람개비. 날개가 돈다
const TURBINES = [[33.553, 126.725], [33.549, 126.745], [33.543, 126.77], [33.372, 126.79], [33.38, 126.805], [33.39, 126.82], [33.33, 126.18], [33.35, 126.19], [33.31, 126.17], [33.47, 126.34], [33.455, 126.31]]
function Turbine({ lat, lng, phase }) {
  const [x, z] = toXZ(lat, lng)
  const y = Math.max(heightAt(x, z), 0.02)
  const rotor = useRef()
  useFrame(({ clock }) => { rotor.current.rotation.z = clock.elapsedTime * 1.4 + phase })
  return (
    <group position={[x, y, z]} raycast={noRay}>
      <mesh position={[0, 0.3, 0]} castShadow raycast={noRay}><cylinderGeometry args={[0.012, 0.022, 0.6, 8]} /><meshStandardMaterial color="#f1f3f5" roughness={0.5} /></mesh>
      <mesh position={[0, 0.61, 0.02]} castShadow raycast={noRay}><boxGeometry args={[0.04, 0.04, 0.09]} /><meshStandardMaterial color="#e9ecef" roughness={0.5} /></mesh>
      <group ref={rotor} position={[0, 0.61, 0.075]}>
        {[0, 1, 2].map((i) => (
          <group key={i} rotation={[0, 0, (i * Math.PI * 2) / 3]}>
            <mesh position={[0, 0.17, 0]} castShadow raycast={noRay}><boxGeometry args={[0.016, 0.34, 0.004]} /><meshStandardMaterial color="#ffffff" roughness={0.4} /></mesh>
          </group>
        ))}
      </group>
    </group>
  )
}
function Turbines() {
  return <>{TURBINES.map(([la, ln], i) => <Turbine key={i} lat={la} lng={ln} phase={i * 0.9} />)}</>
}

// 섬 풍경 전체
export default function Landscape() {
  return <><Forest /><Orchards /><Basalt /><Hareubangs /><Turbines /></>
}
