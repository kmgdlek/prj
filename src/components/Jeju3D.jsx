import { useLayoutEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Html, OrbitControls, Stars } from '@react-three/drei'
import * as THREE from 'three'

// ── 좌표 변환 ────────────────────────────────────────────
// 위도·경도 → 3D (x: 동서, z: 남북). 제주 중심 북위 33.38, 동경 126.56, 1° = 20 유닛
const SCALE = 20
export const toXZ = (lat, lng) => [(lng - 126.56) * SCALE, (33.38 - lat) * SCALE]

// 섬은 동서로 긴 타원, 한라산은 가우시안 봉우리로 솟는다
const SEMI_X = 8.4, SEMI_Z = 4.7
const HALLA = toXZ(33.3617, 126.5292)
export function heightAt(x, z) {
  const d = Math.hypot(x / SEMI_X, z / SEMI_Z)
  if (d >= 1) return -0.25
  const plateau = Math.pow(1 - d, 0.55) * 0.55
  const peak = 2.3 * Math.exp(-((x - HALLA[0]) ** 2 + (z - HALLA[1]) ** 2) / 2.4)
  const bumps = 0.07 * Math.sin(x * 3.1) * Math.cos(z * 2.7)
  return plateau + peak + bumps * (1 - d)
}

// 높이별 색: 해안 모래 → 초원 → 암갈색 → 정상의 보랏빛 눈
function colorAt(h) {
  if (h < 0) return new THREE.Color('#0a1f44')
  if (h < 0.12) return new THREE.Color('#d9c28f')
  if (h < 0.7) return new THREE.Color('#3c8d5a').lerp(new THREE.Color('#2b6b45'), h)
  if (h < 1.7) return new THREE.Color('#7a5c4a')
  return new THREE.Color('#e6dcff')
}

function Island() {
  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(SEMI_X * 2.2, SEMI_Z * 2.4, 220, 130)
    g.rotateX(-Math.PI / 2)
    const pos = g.attributes.position
    const colors = new Float32Array(pos.count * 3)
    for (let i = 0; i < pos.count; i++) {
      const h = heightAt(pos.getX(i), pos.getZ(i))
      pos.setY(i, h)
      const c = colorAt(h)
      colors.set([c.r, c.g, c.b], i * 3)
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    g.computeVertexNormals()
    return g
  }, [])
  return <mesh geometry={geometry}><meshStandardMaterial vertexColors roughness={0.95} /></mesh>
}

// 설문대할망의 치마에서 샌 흙 = 368개의 오름 (같은 결과가 나오도록 고정 난수)
function Oreums({ count = 368 }) {
  const ref = useRef()
  useLayoutEffect(() => {
    let seed = 368
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3()
    let placed = 0
    while (placed < count) {
      const x = (rnd() * 2 - 1) * SEMI_X, z = (rnd() * 2 - 1) * SEMI_Z
      const d = Math.hypot(x / SEMI_X, z / SEMI_Z)
      if (d > 0.93 || Math.hypot(x - HALLA[0], z - HALLA[1]) < 1.1) continue
      const k = 0.07 + rnd() * 0.09
      p.set(x, heightAt(x, z) + k * 0.5, z)
      s.set(k, k * 1.3, k)
      ref.current.setMatrixAt(placed++, m.compose(p, q, s))
    }
    ref.current.instanceMatrix.needsUpdate = true
  }, [count])
  return (
    <instancedMesh ref={ref} args={[null, null, count]}>
      <coneGeometry args={[1, 1, 7]} />
      <meshStandardMaterial color="#9ad97a" roughness={0.9} />
    </instancedMesh>
  )
}

function Sea() {
  const ref = useRef()
  useFrame(({ clock }) => { ref.current.position.y = 0.03 + Math.sin(clock.elapsedTime * 0.8) * 0.012 })
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[60, 40]} />
      <meshStandardMaterial color="#143a8f" transparent opacity={0.82} metalness={0.4} roughness={0.25} />
    </mesh>
  )
}

// 백록담 위에 떠서 도는 신의 고리
function Halo() {
  const ref = useRef()
  useFrame((_, dt) => { ref.current.rotation.z += dt * 0.6 })
  return (
    <mesh ref={ref} position={[HALLA[0], 2.9, HALLA[1]]} rotation={[Math.PI / 2.4, 0, 0]}>
      <torusGeometry args={[0.55, 0.025, 12, 64]} />
      <meshBasicMaterial color="#ffd166" />
    </mesh>
  )
}

function Marker({ m, selected, onSelect }) {
  const [x, z] = toXZ(Number(m.lat), Number(m.lng))
  const y = heightAt(x, z)
  const orb = useRef(), ring = useRef()
  const size = (m.size ?? 0.16) * (selected ? 1.6 : 1)
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    orb.current.position.y = 0.55 + Math.sin(t * 2 + x) * 0.08
    const k = 1 + ((t * 0.8 + x) % 1) * 1.6
    ring.current.scale.set(k, k, k)
    ring.current.material.opacity = 0.7 * (1 - (k - 1) / 1.6)
  })
  return (
    <group position={[x, y, z]} onClick={(e) => { e.stopPropagation(); onSelect?.(m) }}
      onPointerOver={() => (document.body.style.cursor = 'pointer')}
      onPointerOut={() => (document.body.style.cursor = '')}>
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 0.6, 6]} />
        <meshBasicMaterial color={m.color} transparent opacity={0.6} />
      </mesh>
      <mesh ref={orb}>
        <icosahedronGeometry args={[size, 1]} />
        <meshStandardMaterial color={m.color} emissive={m.color} emissiveIntensity={selected ? 2.2 : 1.1} />
      </mesh>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <ringGeometry args={[0.16, 0.2, 32]} />
        <meshBasicMaterial color={m.color} transparent side={THREE.DoubleSide} />
      </mesh>
      {(m.label !== false || selected) && (
        <Html position={[0, 0.95, 0]} center distanceFactor={9} zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
          <div className={`marker-label ${selected ? 'on' : ''}`}>{m.name}</div>
        </Html>
      )}
    </group>
  )
}

// 선택한 마커로 카메라를 부드럽게 날려 보낸다 (이동이 끝나면 다시 마우스로 자유롭게 회전)
function CameraRig({ focus }) {
  const controls = useThree((s) => s.controls)
  const camera = useThree((s) => s.camera)
  const until = useRef(0)
  const lastId = useRef(null)
  useFrame(({ clock }, dt) => {
    if (!controls) return
    if (focus && focus.id !== lastId.current) { lastId.current = focus.id; until.current = clock.elapsedTime + 1.6 }
    if (!focus || clock.elapsedTime > until.current) return
    const [x, z] = toXZ(Number(focus.lat), Number(focus.lng))
    const target = new THREE.Vector3(x, heightAt(x, z), z)
    const k = 1 - Math.pow(0.001, dt)
    controls.target.lerp(target, k)
    camera.position.lerp(target.clone().add(new THREE.Vector3(0, 3.2, 5.2)), k)
    controls.update()
  })
  return null
}

// items: [{ id, name, lat, lng, color, size?, label? }]
export default function Jeju3D({ items = [], selectedId, onSelect, height = 460, autoRotate = false }) {
  const pins = items.filter((m) => Number(m.lat) > 0 && Number(m.lng) > 0)
  const focus = pins.find((m) => m.id === selectedId)
  return (
    <Canvas camera={{ position: [0, 9, 11], fov: 45 }} style={{ height }} dpr={[1, 2]}>
      <color attach="background" args={['#0b0620']} />
      <fog attach="fog" args={['#0b0620', 18, 42]} />
      <ambientLight intensity={0.55} />
      <directionalLight position={[6, 10, 4]} intensity={1.3} color="#ffe9c4" />
      <pointLight position={[HALLA[0], 4, HALLA[1]]} intensity={8} color="#b388ff" distance={8} />
      <Stars radius={60} depth={30} count={3000} factor={3} fade speed={1} />
      <mesh position={[-14, 11, -16]}>
        <sphereGeometry args={[1.6, 32, 32]} />
        <meshBasicMaterial color="#fff6d6" />
      </mesh>
      <Sea />
      <Island />
      <Oreums />
      <Halo />
      {pins.map((m) => <Marker key={m.id} m={m} selected={m.id === selectedId} onSelect={onSelect} />)}
      <OrbitControls makeDefault enablePan={false} minDistance={3} maxDistance={20} maxPolarAngle={Math.PI / 2.15}
        autoRotate={autoRotate && !selectedId} autoRotateSpeed={0.6} />
      <CameraRig focus={focus} />
    </Canvas>
  )
}
