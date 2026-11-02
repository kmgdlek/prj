import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { toXZ } from './terrain'
import { MYTHS } from '../../server/myths'
import { ball, cone, merge, part } from './landscape'

const noRay = () => null

// ── 출렁이는 바다 ─────────────────────────────────────────
// 바다 면을 잘게 나눠 두고, 그래픽 카드(정점 셰이더)에서 여러 물결을 겹쳐 높이와 면의 방향(빛 반사)을 시간에 따라 바꾼다.
// 높이(wave)와 기울기(waveGrad)는 같은 식이라 빛이 물결 모양대로 반짝인다.
const WAVE_GLSL = `
uniform float uTime;
float wave(vec2 p) {
  return 0.040 * sin(p.x * 1.10 + uTime * 1.10) + 0.032 * sin(p.y * 1.60 - uTime * 0.90)
       + 0.020 * sin((p.x + p.y) * 2.40 + uTime * 1.60) + 0.012 * sin((p.x - p.y) * 4.20 - uTime * 2.10);
}
vec2 waveGrad(vec2 p) {
  float a = 0.040 * 1.10 * cos(p.x * 1.10 + uTime * 1.10), b = 0.032 * 1.60 * cos(p.y * 1.60 - uTime * 0.90);
  float c = 0.020 * 2.40 * cos((p.x + p.y) * 2.40 + uTime * 1.60), d = 0.012 * 4.20 * cos((p.x - p.y) * 4.20 - uTime * 2.10);
  return vec2(a + c + d, b + c - d);
}`
export function WavySea({ color, opacity }) {
  const uniforms = useRef({ uTime: { value: 0 } })
  const geometry = useMemo(() => { const g = new THREE.PlaneGeometry(240, 150, 240, 150); g.rotateX(-Math.PI / 2); return g }, [])
  const material = useMemo(() => {
    const m = new THREE.MeshPhysicalMaterial({ color, transparent: true, opacity, roughness: 0.14, metalness: 0.25, clearcoat: 0.6 })
    m.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = uniforms.current.uTime
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>\n${WAVE_GLSL}`)
        .replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\n  vec2 wg = waveGrad(position.xz);\n  objectNormal = normalize(vec3(-wg.x, 1.0, -wg.y));')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\n  transformed.y += wave(position.xz);')
    }
    return m
  }, [])                                                                  // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { material.color.set(color); material.opacity = opacity }, [material, color, opacity])
  useFrame(({ clock }) => { uniforms.current.uTime.value = clock.elapsedTime })
  return <mesh geometry={geometry} material={material} receiveShadow raycast={noRay} />
}

// ── 돌고래 ────────────────────────────────────────────────
// 머리가 +Z 쪽. 등은 푸른 회색, 배는 밝게
const dolphinGeo = () => merge([
  part(ball(0.1, 2), '#6f8ea8', { sx: 1, sy: 0.95, sz: 3.2 }),
  part(ball(0.1, 2), '#dbe8f0', { y: -0.03, sx: 0.88, sy: 0.55, sz: 2.9 }),
  part(cone(0.028, 0.17, 8), '#7b99b2', { y: -0.005, z: 0.37, rx: Math.PI / 2 }),                       // 주둥이
  part(cone(0.034, 0.1, 6), '#587791', { y: 0.11, z: -0.02, rx: -0.55 }),                                // 등지느러미
  part(cone(0.05, 0.26, 8), '#6f8ea8', { z: -0.34, rx: -Math.PI / 2 }),                                  // 꼬리 자루
  part(new THREE.BoxGeometry(0.24, 0.012, 0.075), '#587791', { y: 0.005, z: -0.5 }),                     // 꼬리지느러미
  part(ball(0.035, 1), '#587791', { x: 0.1, y: -0.045, z: 0.1, sx: 1.8, sy: 0.35, sz: 1.2 }),
  part(ball(0.035, 1), '#587791', { x: -0.1, y: -0.045, z: 0.1, sx: 1.8, sy: 0.35, sz: 1.2 }),
])

// 바다 위를 큰 원을 그리며 헤엄치다가, 몇 초마다 한 번 물 밖으로 솟구쳐 포물선을 그리며 뛰어오른다 (고정된 시간 식이라 누구에게나 같은 움직임)
function Dolphin({ cx, cz, r, speed, phase, period, jump = 0.55 }) {
  const root = useRef(), pitch = useRef(), ring = useRef()
  const geometry = useMemo(dolphinGeo, [])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const a = t * speed + phase
    const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r
    const u = ((t + phase * 3) % period) / period, air = 0.28               // 한 주기 중 앞 28% 가 공중
    const jumping = u < air
    const j = jumping ? u / air : 0
    const y = jumping ? Math.sin(j * Math.PI) * jump - 0.02 : -0.5           // 물속에서는 안 보인다
    root.current.visible = jumping
    root.current.position.set(x, y, z)
    const hx = -Math.sin(a) * r * speed, hz = Math.cos(a) * r * speed          // 원의 접선 = 진행 방향
    root.current.rotation.y = Math.atan2(hx, hz)
    pitch.current.rotation.x = jumping ? -Math.cos(j * Math.PI) * 0.9 : 0       // 올라갈 땐 코를 들고, 내려갈 땐 숙인다
    // 뛰어오를 때와 착수할 때 물보라 고리
    const splash = u < 0.06 ? u / 0.06 : u > air && u < air + 0.08 ? (u - air) / 0.08 : -1
    ring.current.visible = splash >= 0
    if (splash >= 0) {
      const k = 0.6 + splash * 2.4
      ring.current.position.set(x, 0.015, z)
      ring.current.scale.set(k, k, k)
      ring.current.material.opacity = 0.7 * (1 - splash)
    }
  })
  return (
    <>
      <group ref={root} raycast={noRay}>
        <group ref={pitch}>
          <mesh geometry={geometry} castShadow raycast={noRay}><meshStandardMaterial vertexColors roughness={0.45} /></mesh>
        </group>
      </group>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} raycast={noRay}>
        <ringGeometry args={[0.12, 0.17, 32]} />
        <meshBasicMaterial color="#ffffff" transparent depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </>
  )
}
const PODS = [
  // 남쪽 바다 (서귀포 앞)
  { cx: -1.5, cz: 6.4, r: 1.1, speed: 0.34, phase: 0.2, period: 5.4 },
  { cx: -1.5, cz: 6.4, r: 1.5, speed: 0.30, phase: 2.6, period: 6.3 },
  // 동쪽 바다 (성산·우도 앞)
  { cx: 11, cz: 0.5, r: 1.2, speed: 0.32, phase: 1.4, period: 5.9 },
  // 서쪽 바다 (한림 앞)
  { cx: -10.2, cz: 1.2, r: 1.3, speed: 0.36, phase: 4.1, period: 6.8 },
  // 북쪽 바다 (제주시 앞)
  { cx: 0.5, cz: -6.6, r: 1.4, speed: 0.31, phase: 3.3, period: 7.1 },
  { cx: 3.4, cz: -6.9, r: 1.0, speed: 0.38, phase: 5.2, period: 5.2 },
]
export function Dolphins() {
  return <>{PODS.map((p, i) => <Dolphin key={i} {...p} />)}</>
}

// ── 주변 섬 ───────────────────────────────────────────────
// 둥근 모래톱 위에 풀 언덕을 얹은 작은 섬. flat 이면 가파도·마라도처럼 납작하게
function Islet({ at, r = 0.3, h = 0.25, flat = false, rock = false, name, trees = 2 }) {
  const [x, z] = Array.isArray(at) ? at : toXZ(at.lat, at.lng)
  const geo = useMemo(() => {
    const parts = [
      part(new THREE.CylinderGeometry(r * 1.2, r * 1.35, 0.1, 12), '#e3cf9c', { y: 0.0 }),
      part(ball(r, 2), rock ? '#6b6560' : flat ? '#6fae45' : '#4f8f3a', { y: 0.04, sy: Math.max(h / r, 0.12) }),
    ]
    if (!flat && !rock) for (let i = 0; i < trees; i++) parts.push(part(cone(0.07, 0.2, 6), '#256b3d', { x: Math.cos(i * 2.4) * r * 0.45, z: Math.sin(i * 2.4) * r * 0.45, y: h * 0.7 }))
    return merge(parts)
  }, [r, h, flat, rock, trees])
  return (
    <group position={[x, -0.02, z]} raycast={noRay}>
      <mesh geometry={geo} castShadow receiveShadow raycast={noRay}><meshStandardMaterial vertexColors roughness={0.9} /></mesh>
      {name && (
        <Html position={[0, h + 0.5, 0]} center distanceFactor={9} zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}>
          <div className="marker-label">{name}</div>
        </Html>
      )}
    </group>
  )
}
const myth = (id) => MYTHS.find((m) => m.id === id)
export function Islets() {
  return (
    <>
      {/* 신화 마커가 있는 섬: 마커 바로 아래에 실제 섬을 놓는다 */}
      <Islet at={myth('udo')} r={0.5} h={0.32} trees={3} />
      <Islet at={myth('biyang')} r={0.26} h={0.4} trees={1} />
      <Islet at={myth('chagwi')} r={0.28} h={0.22} rock />
      <Islet at={myth('mara')} r={0.22} h={0.05} flat />
      {/* 그 밖의 가까운 섬 */}
      <Islet at={{ lat: 33.17, lng: 126.275 }} r={0.3} h={0.06} flat name="가파도" />
      <Islet at={{ lat: 33.22, lng: 126.525 }} r={0.16} h={0.4} rock />
      {/* 추자도: 제주와 한반도 사이의 섬무리 */}
      <Islet at={{ lat: 33.955, lng: 126.30 }} r={0.36} h={0.3} trees={3} name="추자도" />
      <Islet at={{ lat: 33.975, lng: 126.325 }} r={0.22} h={0.22} trees={1} />
      <Islet at={{ lat: 33.935, lng: 126.34 }} r={0.2} h={0.18} trees={1} />
      <Islet at={{ lat: 33.99, lng: 126.285 }} r={0.15} h={0.14} rock />
    </>
  )
}

// ── 한반도 남해안 ─────────────────────────────────────────
// 제주 북쪽 바다 건너편의 전남·경남 해안선(대략). 낮은 땅과 산을 얹어 수평선 너머 육지가 보이게 한다
const COAST_KOREA = [
  [36.4, 125.0], [34.9, 125.3], [34.8, 126.2], [34.55, 126.3], [34.31, 126.52], [34.45, 126.8], [34.62, 127.05], [34.46, 127.3],
  [34.66, 127.55], [34.72, 127.78], [34.85, 128.05], [34.8, 128.4], [34.72, 128.7], [35.06, 128.98], [35.4, 129.3], [36.4, 129.4],
]
export function Mainland() {
  const geometry = useMemo(() => {
    const pts = COAST_KOREA.map(([la, ln]) => toXZ(la, ln))
    const shape = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, -z)))             // Shape 의 y 는 3D 의 -z
    const g = new THREE.ExtrudeGeometry(shape, { depth: 0.5, bevelEnabled: false })
    g.rotateX(-Math.PI / 2)                                                                  // 눕힌다 (돌출 방향 +z → +y)
    g.translate(0, -0.2, 0)
    return g
  }, [])
  const [lx, lz] = toXZ(34.5, 126.9)
  const [jx, jz] = toXZ(35.34, 127.73)
  return (
    <group raycast={noRay}>
      <mesh geometry={geometry} receiveShadow raycast={noRay}><meshStandardMaterial color="#5d9444" roughness={0.95} /></mesh>
      <mesh position={[jx, 0.9, jz]} castShadow raycast={noRay}><coneGeometry args={[2.4, 1.8, 9]} /><meshStandardMaterial color="#3f7d3e" roughness={0.95} /></mesh>
      <mesh position={[jx - 3.4, 0.55, jz + 1.2]} castShadow raycast={noRay}><coneGeometry args={[1.6, 1.1, 8]} /><meshStandardMaterial color="#4b8a45" roughness={0.95} /></mesh>
      <mesh position={[jx + 4.2, 0.5, jz + 0.5]} castShadow raycast={noRay}><coneGeometry args={[1.5, 1.0, 8]} /><meshStandardMaterial color="#4b8a45" roughness={0.95} /></mesh>
      <Html position={[lx, 0.7, lz]} center distanceFactor={14} zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}>
        <div className="marker-label">한반도 (전남·경남)</div>
      </Html>
    </group>
  )
}
