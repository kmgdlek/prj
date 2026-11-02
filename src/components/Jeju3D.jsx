import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Html, OrbitControls, Sparkles, Stars } from '@react-three/drei'
import * as THREE from 'three'
import { GRID, HALLA, colorAt, heightAt, heightMap, toXZ } from './terrain'
import { useTimeMode } from '../lib/timeOfDay'
import { weatherKind } from '../lib/weather'
import { useAppStore } from '../store/useAppStore'
import { Boats, Clouds, Fireflies, Gulls, Lamps, Moon, Precip, Sun } from './skyThings'

// 시간대별 하늘·빛·바다 색. 새벽 = 보랏빛 하늘 + 동쪽의 해돋이, 아침 = 맑은 낮, 밤 = 달빛
const THEME = {
  night: { bg: '#070418', fog: [20, 46], hemi: ['#8ea6ff', '#1b2a1c', 0.55], ambient: 0.25, key: { pos: [-9, 13, 7], color: '#d7e0ff', i: 1.7 }, fill: { pos: [10, 5, -6], color: '#ffb98a', i: 0.35 }, stars: 4500, sea: '#1a6fb0', seaOpacity: 0.62, halla: 9 },
  dawn: { bg: '#2a1747', fog: [16, 42], hemi: ['#ffb08a', '#2a2438', 0.65], ambient: 0.3, key: { pos: [14, 6, -3], color: '#ffae78', i: 1.7 }, fill: { pos: [-8, 8, 6], color: '#8fa0ff', i: 0.4 }, stars: 900, sea: '#2a5f9a', seaOpacity: 0.66, halla: 3 },
  morning: { bg: '#8fd0ff', fog: [26, 64], hemi: ['#d6ecff', '#4a6a35', 1.0], ambient: 0.55, key: { pos: [8, 14, 6], color: '#fff1cf', i: 2.6 }, fill: { pos: [-10, 6, -6], color: '#bfe0ff', i: 0.5 }, stars: 0, sea: '#27a3d8', seaOpacity: 0.7, halla: 0 },
}

// 섬: 실제 해안선·한라산 높이 지도(terrain.js)를 정점마다 입히고, 높이별 색·바다 깊이 그라데이션을 칠한다
// 날씨(기상청 예보)에 따라 하늘·빛·바다를 어둡고 흐리게. gloom: 0 맑음 … 1
const GLOOM = { clear: 0, cloudy: 0.25, overcast: 0.6, rain: 0.75, snow: 0.5 }
const GRAY = { night: '#14151f', dawn: '#4a4458', morning: '#8e9aa8' }
const hexOf = (c) => `#${c.getHexString()}`
function withWeather(T, w, m) {
  const g = GLOOM[w] ?? 0
  if (!g) return T
  return {
    ...T,
    bg: hexOf(new THREE.Color(T.bg).lerp(new THREE.Color(GRAY[m]), g)),
    fog: [T.fog[0] * (1 - g * 0.4), T.fog[1] * (1 - g * 0.4)],
    hemi: [T.hemi[0], T.hemi[1], T.hemi[2] * (1 - g * 0.2)],
    ambient: T.ambient * (1 + g * 0.3),
    key: { ...T.key, i: T.key.i * (1 - g * 0.55) },
    stars: g >= 0.5 ? 0 : Math.round(T.stars * (1 - g * 1.5)),
    sea: hexOf(new THREE.Color(T.sea).lerp(new THREE.Color('#3b4a5a'), g * 0.6)),
  }
}

function Island() {
  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(GRID.w, GRID.d, GRID.nx - 1, GRID.nz - 1)
    g.rotateX(-Math.PI / 2)
    const pos = g.attributes.position, hm = heightMap()
    const colors = new Float32Array(pos.count * 3)
    for (let i = 0; i < pos.count; i++) {
      const h = hm[i]
      pos.setY(i, h)
      const c = colorAt(h, pos.getX(i), pos.getZ(i))
      colors[i * 3] = c[0]; colors[i * 3 + 1] = c[1]; colors[i * 3 + 2] = c[2]
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    g.computeVertexNormals()
    return g
  }, [])
  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial vertexColors roughness={0.92} metalness={0.02} />
    </mesh>
  )
}

// 설문대할망의 치마에서 샌 흙 = 368개의 오름. 섬 안쪽 임의 지점에 크기·색을 달리해 부드러운 봉우리로 (고정 난수)
function Oreums({ count = 368 }) {
  const ref = useRef()
  const profile = useMemo(() => {
    const pts = [[1, 0], [0.86, 0.2], [0.62, 0.5], [0.34, 0.8], [0.12, 0.96], [0, 1]].map(([r, y]) => new THREE.Vector2(r, y))
    return new THREE.LatheGeometry(pts, 14)
  }, [])
  useLayoutEffect(() => {
    let seed = 368
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(), col = new THREE.Color()
    const up = new THREE.Vector3(0, 1, 0)
    let placed = 0, guard = 0
    while (placed < count && guard++ < 20000) {
      const x = GRID.x0 + rnd() * GRID.w, z = GRID.z0 + rnd() * GRID.d
      const h = heightAt(x, z)
      if (h < 0.2 || h > 1.0 || Math.hypot(x - HALLA[0], z - HALLA[1]) < 1.0) continue   // 해안·한라산 중심은 비움
      const k = 0.06 + rnd() * rnd() * 0.15
      p.set(x, h - 0.01, z)
      s.set(k * (0.9 + rnd() * 0.3), k * (0.7 + rnd() * 0.7), k * (0.9 + rnd() * 0.3))
      q.setFromAxisAngle(up, rnd() * Math.PI * 2)
      ref.current.setMatrixAt(placed, m.compose(p, q, s))
      col.setHSL(0.26 + rnd() * 0.07, 0.4 + rnd() * 0.15, 0.36 + rnd() * 0.14)
      ref.current.setColorAt(placed, col)
      placed++
    }
    ref.current.count = placed
    ref.current.instanceMatrix.needsUpdate = true
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true
  }, [count])
  return (
    <instancedMesh ref={ref} args={[profile, undefined, count]} castShadow receiveShadow>
      <meshStandardMaterial roughness={0.9} />
    </instancedMesh>
  )
}

// 지형 메쉬 바깥의 깊은 바다 바닥 — 지형 가장자리(깊이 -0.75)와 같은 색으로 이어져 사각형 경계가 안 보인다
function Abyss() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.76, 0]} receiveShadow>
      <planeGeometry args={[140, 90]} />
      <meshStandardMaterial color="#05153a" roughness={0.95} />
    </mesh>
  )
}

// 바다: 반투명이라 아래 해저 그라데이션(얕은 청록 → 깊은 남색)이 비친다
function Sea({ color, opacity }) {
  const ref = useRef()
  useFrame(({ clock }) => { ref.current.position.y = Math.sin(clock.elapsedTime * 0.7) * 0.012 })
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[80, 50]} />
      <meshPhysicalMaterial color={color} transparent opacity={opacity} roughness={0.12} metalness={0.25} clearcoat={0.6} />
    </mesh>
  )
}

// 백록담 위에 떠서 도는 신의 고리 + 반짝이는 빛 알갱이
function Halo({ sparkles = true }) {
  const ref = useRef()
  useFrame((_, dt) => { ref.current.rotation.z += dt * 0.6 })
  return (
    <>
      <mesh ref={ref} position={[HALLA[0], 3.1, HALLA[1]]} rotation={[Math.PI / 2.4, 0, 0]}>
        <torusGeometry args={[0.55, 0.025, 12, 64]} />
        <meshBasicMaterial color="#ffd166" />
      </mesh>
      {sparkles && <Sparkles count={50} scale={[2.4, 1.8, 2.4]} position={[HALLA[0], 3, HALLA[1]]} size={3} speed={0.35} color="#ffd166" />}
    </>
  )
}

function Marker({ m, index, selected, onSelect }) {
  const [x, z] = toXZ(Number(m.lat), Number(m.lng))
  const y = Math.max(heightAt(x, z), 0)         // 바다 위 마커(비양도·마라도 등)는 수면에 떠 있게
  const [hover, setHover] = useState(false)          // 이름표가 숨겨진 마커는 마우스를 올리면 이름이 뜬다
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
      onPointerOver={() => { document.body.style.cursor = 'pointer'; setHover(true) }}
      onPointerOut={() => { document.body.style.cursor = ''; setHover(false) }}>
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 0.6, 6]} />
        <meshBasicMaterial color={m.color} transparent opacity={0.6} />
      </mesh>
      <mesh ref={orb}>
        <icosahedronGeometry args={[size, 2]} />
        <meshStandardMaterial color={m.color} emissive={m.color} emissiveIntensity={selected ? 2.4 : 1.2} />
      </mesh>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <ringGeometry args={[0.16, 0.2, 40]} />
        <meshBasicMaterial color={m.color} transparent side={THREE.DoubleSide} />
      </mesh>
      {(m.label !== false || selected || hover) && (
        <Html position={[0, 0.8 + (index % 2) * 0.4, 0]} center distanceFactor={9}
          zIndexRange={selected ? [40, 30] : [10, 0]}>
          <div className={`marker-label ${selected ? 'on' : ''}`} role="button"
            onClick={(e) => { e.stopPropagation(); onSelect?.(m) }}>{m.name}</div>
        </Html>
      )}
    </group>
  )
}

// 마커를 누르면 그 장소로 다가가 확대하고, 선택을 풀면(X) 처음의 섬 전체 화면(가운데 중심)으로 돌아온다.
// 이동이 끝난 뒤에는 다시 마우스로 자유롭게 돌려 볼 수 있다.
const CENTER = new THREE.Vector3(0, 0.3, 0)
const HOME_CAM = new THREE.Vector3(0, 10, 13)

function CameraRig({ focus }) {
  const controls = useThree((s) => s.controls)
  const camera = useThree((s) => s.camera)
  const until = useRef(0)
  const lastId = useRef(null)
  useFrame(({ clock }, dt) => {
    if (!controls) return
    const id = focus?.id ?? null
    if (id !== lastId.current) { lastId.current = id; until.current = clock.elapsedTime + 1.5 }
    if (clock.elapsedTime > until.current) return          // 이동 끝 → 사용자가 자유롭게 조작
    const k = 1 - Math.pow(0.001, dt)
    if (focus) {
      const [x, z] = toXZ(Number(focus.lat), Number(focus.lng))
      const target = new THREE.Vector3(x, heightAt(x, z), z)
      controls.target.lerp(target, k)
      // 섬 중심 → 마커 방향(바깥쪽)에서 다가간다. 그래야 한라산이 마커 뒤에 놓여 가리지 않는다
      const out = new THREE.Vector3(x, 0, z)
      if (out.length() < 1) out.set(0, 0, 1); else out.normalize()
      camera.position.lerp(target.clone().add(out.multiplyScalar(4.6)).add(new THREE.Vector3(0, 2.6, 0)), k)
    } else {
      controls.target.lerp(CENTER, k)                      // 복귀: 섬 한가운데 + 처음 거리
      camera.position.lerp(HOME_CAM, k)
    }
    controls.update()
  })
  return null
}

// items: [{ id, name, lat, lng, color, size?, label? }]
export default function Jeju3D({ items = [], selectedId, onSelect, height = 460, autoRotate = false, mode, weather }) {
  const auto = useTimeMode()
  const m = mode ?? auto                   // mode 를 주지 않으면 지금 시각을 따른다
  const loadWeather = useAppStore((s) => s.loadWeather)
  const real = useAppStore((s) => weatherKind(s.weather.제주시))
  useEffect(() => { loadWeather() }, [loadWeather])
  const w = weather ?? real                // weather 를 주지 않으면 지금 제주시의 실제 예보를 따른다
  const g = GLOOM[w] ?? 0
  const T = withWeather(THEME[m], w, m)
  const dim = g >= 0.6                     // 짙게 흐리거나 비가 오면 해·달이 안 보인다
  const calm = w === 'clear' || w === 'cloudy'
  const pins = items.filter((m) => Number(m.lat) > 0 && Number(m.lng) > 0)
  const focus = pins.find((m) => m.id === selectedId)
  // 휠 확대는 지도를 클릭한 뒤에만: 그냥 지나가며 스크롤할 때 지도가 휠을 가로채지 않게
  const [zoomOn, setZoomOn] = useState(false)
  return (
    <div style={{ height }} onPointerDown={() => setZoomOn(true)} onPointerLeave={() => setZoomOn(false)}>
      <Canvas shadows camera={{ position: [0, 10, 13], fov: 45 }} style={{ height: '100%' }} dpr={[1, 2]}>
        <color attach="background" args={[T.bg]} />
        <fog attach="fog" args={[T.bg, T.fog[0], T.fog[1]]} />
        <hemisphereLight args={T.hemi} />
        <ambientLight intensity={T.ambient} />
        {/* 달빛·햇빛: 그림자를 드리워 한라산·오름의 입체감을 만든다 */}
        <directionalLight position={T.key.pos} intensity={T.key.i} color={T.key.color} castShadow
          shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004} shadow-normalBias={0.03}
          shadow-camera-left={-12} shadow-camera-right={12} shadow-camera-top={9} shadow-camera-bottom={-9}
          shadow-camera-near={1} shadow-camera-far={40} />
        <directionalLight position={T.fill.pos} intensity={T.fill.i} color={T.fill.color} />
        {T.halla > 0 && <pointLight position={[HALLA[0], 4, HALLA[1]]} intensity={T.halla} color="#b388ff" distance={8} />}
        {T.stars > 0 && <Stars radius={70} depth={35} count={T.stars} factor={3.5} fade speed={1} />}
        {m === 'night' && <>{!dim && <Moon />}{calm && <Fireflies />}</>}
        {m === 'dawn' && <>{!dim && <Sun mode="dawn" />}<Lamps /></>}
        {m === 'morning' && <>{!dim && <Sun mode="morning" />}{calm && <><Gulls /><Boats /></>}</>}
        {(m === 'morning' || w !== 'clear') && (
          <Clouds color={hexOf(new THREE.Color('#ffffff').lerp(new THREE.Color(m === 'night' ? '#3a3f4d' : '#7d8794'), g))}
            n={{ clear: 9, cloudy: 10, overcast: 12, rain: 13, snow: 11 }[w] ?? 9} low={g * 0.5} opacity={0.92 - g * 0.3} />
        )}
        {(w === 'rain' || w === 'snow') && <Precip kind={w} />}
        <Abyss />
        <Sea color={T.sea} opacity={T.seaOpacity} />
        <Island />
        <Oreums />
        <Halo sparkles={m !== 'morning'} />
        {pins.map((m, i) => <Marker key={m.id} m={m} index={i} selected={m.id === selectedId} onSelect={onSelect} />)}
        <OrbitControls makeDefault enablePan={false} enableZoom={zoomOn} target={[0, 0.3, 0]}
          minDistance={3} maxDistance={22} maxPolarAngle={Math.PI / 2.15}
          enableDamping dampingFactor={0.08}
          autoRotate={autoRotate && !selectedId} autoRotateSpeed={0.6} />
        <CameraRig focus={focus} />
      </Canvas>
    </div>
  )
}
