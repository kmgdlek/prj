import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sparkles } from '@react-three/drei'
import * as THREE from 'three'
import { GRID, heightAt, toXZ } from './terrain'

// 시간대별로 3D 지도에 얹는 장식들. 난수는 고정 시드라 누구에게나 같은 배치.
const makeRnd = (seed) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647)

// 부드럽게 번지는 빛 무늬 (가로등·해의 번짐용)
function useGlowTexture() {
  return useMemo(() => {
    const c = document.createElement('canvas')
    c.width = c.height = 64
    const g = c.getContext('2d')
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32)
    gr.addColorStop(0, 'rgba(255,225,160,1)'); gr.addColorStop(0.25, 'rgba(255,190,100,.55)'); gr.addColorStop(1, 'rgba(255,170,80,0)')
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64)
    return new THREE.CanvasTexture(c)
  }, [])
}

// ── 밤 ───────────────────────────────────────────────
export function Moon() {
  return (
    <mesh position={[-16, 12, -18]}>
      <sphereGeometry args={[1.7, 40, 40]} />
      <meshBasicMaterial color="#fff6d6" fog={false} />
    </mesh>
  )
}

// 반딧불이: 섬 위를 천천히 떠다니며 깜빡이는 연둣빛 알갱이
export function Fireflies() {
  return (
    <>
      <Sparkles count={150} scale={[15, 1.8, 8]} position={[0, 0.9, 0]} size={11} speed={0.45} noise={[1.2, 1, 1.2]} color="#d7ff5f" />
      <Sparkles count={60} scale={[15, 2.4, 8]} position={[0, 1.2, 0]} size={20} speed={0.25} noise={[1.5, 1, 1.5]} color="#a8ff8f" opacity={0.7} />
    </>
  )
}

// ── 새벽 ─────────────────────────────────────────────
// 해가 막 떠오르는 동쪽 수평선 (아침이면 높이 뜬 해)
export function Sun({ mode }) {
  const glow = useGlowTexture()
  const dawn = mode === 'dawn'
  const pos = dawn ? [20, 1.8, -5] : [14, 12, -18]
  return (
    <group position={pos}>
      <mesh>
        <sphereGeometry args={[dawn ? 2.6 : 2.2, 40, 40]} />
        <meshBasicMaterial color={dawn ? '#ff9a52' : '#fff2b8'} fog={false} />
      </mesh>
      <sprite scale={dawn ? [14, 14, 1] : [11, 11, 1]}>
        <spriteMaterial map={glow} transparent opacity={dawn ? 0.9 : 0.7} depthWrite={false} blending={THREE.AdditiveBlending} fog={false} />
      </sprite>
    </group>
  )
}

// 가로등: 해안 낮은 땅(해안도로 근처)에 일정 간격으로 켜진 가로등
let LAMPS = null
function lampPositions() {
  if (LAMPS) return LAMPS
  const rnd = makeRnd(77), pts = []
  for (let n = 0; n < 8000 && pts.length < 34; n++) {
    const x = GRID.x0 + rnd() * GRID.w, z = GRID.z0 + rnd() * GRID.d, h = heightAt(x, z)
    if (h < 0.1 || h > 0.3) continue
    if (pts.some((p) => Math.hypot(p[0] - x, p[2] - z) < 0.75)) continue
    pts.push([x, h, z])
  }
  return (LAMPS = pts)
}

export function Lamps() {
  const glow = useGlowTexture()
  const pts = useMemo(lampPositions, [])
  return (
    <>
      {pts.map(([x, y, z], i) => (
        <group key={i} position={[x, y, z]}>
          <mesh position={[0, 0.11, 0]}>
            <cylinderGeometry args={[0.008, 0.011, 0.22, 6]} />
            <meshStandardMaterial color="#2a2a33" roughness={0.6} metalness={0.5} />
          </mesh>
          <mesh position={[0, 0.235, 0]}>
            <sphereGeometry args={[0.028, 12, 12]} />
            <meshBasicMaterial color="#ffe2a6" />
          </mesh>
          <sprite position={[0, 0.235, 0]} scale={[0.6, 0.6, 0.6]}>
            <spriteMaterial map={glow} transparent depthWrite={false} blending={THREE.AdditiveBlending} fog={false} />
          </sprite>
          {/* 바닥에 번지는 불빛 */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
            <circleGeometry args={[0.24, 24]} />
            <meshBasicMaterial map={glow} transparent opacity={0.55} depthWrite={false} blending={THREE.AdditiveBlending} />
          </mesh>
        </group>
      ))}
    </>
  )
}

// ── 아침 ─────────────────────────────────────────────
// 천천히 흘러가는 구름
export function Clouds() {
  const ref = useRef()
  const clouds = useMemo(() => {
    const rnd = makeRnd(9)
    return Array.from({ length: 9 }, () => ({
      x: -22 + rnd() * 44, y: 5 + rnd() * 2.5, z: -9 + rnd() * 18, s: 0.8 + rnd() * 0.9, speed: 0.12 + rnd() * 0.12,
      puffs: Array.from({ length: 6 }, () => ({ dx: (rnd() - 0.5) * 2.2, dy: (rnd() - 0.3) * 0.5, dz: (rnd() - 0.5) * 1.1, r: 0.5 + rnd() * 0.55 })),
    }))
  }, [])
  useFrame((_, dt) => {
    ref.current.children.forEach((g, i) => { g.position.x += clouds[i].speed * dt; if (g.position.x > 24) g.position.x = -24 })
  })
  return (
    <group ref={ref}>
      {clouds.map((c, i) => (
        <group key={i} position={[c.x, c.y, c.z]} scale={c.s}>
          {c.puffs.map((p, j) => (
            <mesh key={j} position={[p.dx, p.dy, p.dz]} scale={[1, 0.62, 0.8]}>
              <sphereGeometry args={[p.r, 12, 10]} />
              <meshStandardMaterial color="#ffffff" roughness={1} transparent opacity={0.92} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  )
}

// 갈매기 떼: 섬 둘레를 원을 그리며 날개를 펄럭이며 난다
export function Gulls() {
  const ref = useRef()
  const gulls = useMemo(() => {
    const rnd = makeRnd(21)
    return Array.from({ length: 7 }, () => ({ cx: (rnd() - 0.5) * 10, cz: (rnd() - 0.5) * 6, r: 2.5 + rnd() * 3, y: 3 + rnd() * 1.8, sp: 0.25 + rnd() * 0.25, ph: rnd() * 6.28 }))
  }, [])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    ref.current.children.forEach((g, i) => {
      const q = gulls[i], a = t * q.sp + q.ph
      g.position.set(q.cx + Math.cos(a) * q.r, q.y + Math.sin(t * 1.3 + q.ph) * 0.15, q.cz + Math.sin(a) * q.r * 0.7)
      g.rotation.y = -a
      const f = Math.sin(t * 7 + q.ph) * 0.5
      g.children[1].rotation.z = 0.25 + f
      g.children[2].rotation.z = -0.25 - f
    })
  })
  return (
    <group ref={ref}>
      {gulls.map((_, i) => (
        <group key={i}>
          <mesh><boxGeometry args={[0.05, 0.04, 0.14]} /><meshBasicMaterial color="#ffffff" /></mesh>
          <group><mesh position={[0.11, 0, 0]}><boxGeometry args={[0.22, 0.012, 0.07]} /><meshBasicMaterial color="#f4f4f4" /></mesh></group>
          <group><mesh position={[-0.11, 0, 0]}><boxGeometry args={[0.22, 0.012, 0.07]} /><meshBasicMaterial color="#f4f4f4" /></mesh></group>
        </group>
      ))}
    </group>
  )
}

// 바다 위의 작은 어선들: 파도에 따라 살짝 흔들린다
export function Boats() {
  const ref = useRef()
  const boats = useMemo(() => [[33.6, 126.58], [33.16, 126.52], [33.5, 127.02], [33.28, 126.08], [33.62, 126.85]]
    .map(([la, ln], i) => ({ pos: toXZ(la, ln), ph: i * 1.7, rot: i * 1.1 })), [])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    ref.current.children.forEach((g, i) => { g.position.y = 0.03 + Math.sin(t * 1.2 + boats[i].ph) * 0.025; g.rotation.z = Math.sin(t * 0.9 + boats[i].ph) * 0.06 })
  })
  return (
    <group ref={ref}>
      {boats.map((b, i) => (
        <group key={i} position={[b.pos[0], 0.03, b.pos[1]]} rotation={[0, b.rot, 0]}>
          <mesh position={[0, 0.03, 0]}><boxGeometry args={[0.4, 0.06, 0.14]} /><meshStandardMaterial color="#c9552f" /></mesh>
          <mesh position={[0, 0.3, 0]}><cylinderGeometry args={[0.006, 0.006, 0.5, 6]} /><meshStandardMaterial color="#6b4b2a" /></mesh>
          <mesh position={[0.07, 0.3, 0]}><planeGeometry args={[0.22, 0.4]} /><meshStandardMaterial color="#fffaf0" side={THREE.DoubleSide} /></mesh>
        </group>
      ))}
    </group>
  )
}
