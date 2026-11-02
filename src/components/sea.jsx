import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { COAST_PTS, heightAt, toXZ } from './terrain'
import { MYTHS } from '../../server/myths'
import { ball, cone, merge, part } from './landscape'

const noRay = () => null

// ── 출렁이는 바다 ─────────────────────────────────────────
// 바다 면을 잘게 나눠 두고, 그래픽 카드(정점 셰이더)에서 여러 물결을 겹쳐 높이와 면의 방향(빛 반사)을 시간에 따라 바꾼다.
// 높이(wave)와 기울기(waveGrad)는 같은 식이라 빛이 물결 모양대로 반짝인다.
const WAVE_GLSL = `
uniform float uTime;
uniform float uAmp;
float wave(vec2 p) {
  return uAmp * (0.040 * sin(p.x * 1.10 + uTime * 1.10) + 0.032 * sin(p.y * 1.60 - uTime * 0.90)
       + 0.020 * sin((p.x + p.y) * 2.40 + uTime * 1.60) + 0.012 * sin((p.x - p.y) * 4.20 - uTime * 2.10));
}
vec2 waveGrad(vec2 p) {
  float a = 0.040 * 1.10 * cos(p.x * 1.10 + uTime * 1.10), b = 0.032 * 1.60 * cos(p.y * 1.60 - uTime * 0.90);
  float c = 0.020 * 2.40 * cos((p.x + p.y) * 2.40 + uTime * 1.60), d = 0.012 * 4.20 * cos((p.x - p.y) * 4.20 - uTime * 2.10);
  return uAmp * vec2(a + c + d, b + c - d);
}`
export function WavySea({ color, opacity, amp = 1 }) {
  const uniforms = useRef({ uTime: { value: 0 }, uAmp: { value: 1 } })
  const geometry = useMemo(() => { const g = new THREE.PlaneGeometry(240, 150, 240, 150); g.rotateX(-Math.PI / 2); return g }, [])
  const material = useMemo(() => {
    const m = new THREE.MeshPhysicalMaterial({ color, transparent: true, opacity, roughness: 0.14, metalness: 0.25, clearcoat: 0.6 })
    m.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = uniforms.current.uTime
      shader.uniforms.uAmp = uniforms.current.uAmp
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>\nvarying float vH;\n${WAVE_GLSL}`)
        .replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\n  vec2 wg = waveGrad(position.xz);\n  objectNormal = normalize(vec3(-wg.x, 1.0, -wg.y));')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\n  float wh = wave(position.xz);\n  vH = wh;\n  transformed.y += wh;')
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying float vH;\nuniform float uAmp;')
        .replace('#include <color_fragment>', `#include <color_fragment>
  float crest = clamp(vH / (0.104 * uAmp), 0.0, 1.0);
  float foam = smoothstep(0.6, 0.95, crest) * clamp((uAmp - 1.2) / 1.6, 0.0, 1.0);   // 파도가 거칠수록(비·폭풍) 마루에 흰 거품
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.93, 0.97, 1.0), foam);
  diffuseColor.a = mix(diffuseColor.a, 0.96, foam);`)
    }
    return m
  }, [])                                                                  // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { material.color.set(color); material.opacity = opacity }, [material, color, opacity])
  useFrame(({ clock }, dt) => {
    uniforms.current.uTime.value = clock.elapsedTime
    const u = uniforms.current.uAmp
    u.value += (amp - u.value) * Math.min(1, dt * 1.5)                 // 날씨가 바뀌면 파도 높이가 천천히 따라간다
  })
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

// 바다 위를 큰 원을 그리며 헤엄치다가(등과 지느러미만 수면 위로), 몇 초마다 한 번 물 밖으로 솟구쳐 포물선을 그리며 뛰어오른다 (고정된 시간 식이라 누구에게나 같은 움직임)
// 누르면 깜짝 놀라 살짝 튀어 오르며 옆으로 쓰러졌다가(약 2초) 다시 헤엄친다
const ease = (t) => t * t * (3 - 2 * t)
function Dolphin({ cx, cz, r, speed, phase, period, jump = 0.55 }) {
  const root = useRef(), pitch = useRef(), ring = useRef()
  const geometry = useMemo(dolphinGeo, [])
  const clock = useThree((st) => st.clock)
  const hit = useRef({ at: -99, sign: 1 })                 // 눌린 시각과 쓰러지는 쪽(좌·우)
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const a = t * speed + phase
    const hx = -Math.sin(a) * r * speed, hz = Math.cos(a) * r * speed           // 원의 접선 = 진행 방향
    const len = Math.hypot(hx, hz) || 1
    const u = ((t + phase * 3) % period) / period, air = 0.28                    // 한 주기 중 앞 28% 가 공중
    const jumping = u < air
    const j = jumping ? u / air : 0
    let x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r
    let y = jumping ? Math.sin(j * Math.PI) * jump - 0.02 : -0.075 + Math.sin(t * 2 + phase) * 0.012   // 헤엄칠 땐 등만 수면 위
    let roll = 0, wobble = 0
    const h = t - hit.current.at                                                // 눌린 뒤 지난 시간
    if (h >= 0 && h < 2.2) {
      const out = ease(Math.min(h / 0.7, 1)) * (1 - ease(Math.min(Math.max((h - 1.2) / 1.0, 0), 1)))   // 0.7초에 옆으로 밀려나고, 1.2초부터 돌아온다
      x += (hz / len) * hit.current.sign * 0.8 * out; z += (-hx / len) * hit.current.sign * 0.8 * out    // 진행 방향의 옆으로 날아간다
      y += Math.sin(Math.min(h / 0.8, 1) * Math.PI) * 0.28                      // 깜짝 놀라 살짝 튀어 오른다
      roll = hit.current.sign * 1.35 * out                                       // 옆으로 쓰러진다
      wobble = 0.5 * Math.sin(h * 9) * Math.exp(-h * 2.2)                        // 쓰러지며 휘청
    }
    root.current.position.set(x, y, z)
    root.current.rotation.y = Math.atan2(hx, hz) + wobble
    pitch.current.rotation.set(jumping ? -Math.cos(j * Math.PI) * 0.9 : 0, 0, roll)   // 올라갈 땐 코를 들고, 내려갈 땐 숙인다
    // 뛰어오를 때·착수할 때·눌렸을 때 물보라 고리
    let splash = u < 0.06 ? u / 0.06 : u > air && u < air + 0.08 ? (u - air) / 0.08 : -1
    if (h >= 0 && h < 0.8) splash = h / 0.8
    ring.current.visible = splash >= 0
    if (splash >= 0) {
      const k = 0.6 + splash * 2.4
      ring.current.position.set(x, 0.015, z)
      ring.current.scale.set(k, k, k)
      ring.current.material.opacity = 0.7 * (1 - splash)
    }
  })
  const onPush = (e) => { e.stopPropagation(); hit.current = { at: clock.elapsedTime, sign: Math.random() < 0.5 ? -1 : 1 } }
  return (
    <>
      <group ref={root}>
        <group ref={pitch}>
          <mesh geometry={geometry} castShadow raycast={noRay}><meshStandardMaterial vertexColors roughness={0.45} /></mesh>
        </group>
        {/* 누르기 쉽도록 몸보다 큰 투명한 판정 영역 */}
        <mesh scale={[1.6, 1.4, 4]} position={[0, 0.02, 0]} onClick={onPush} onPointerOver={() => { document.body.style.cursor = 'pointer' }} onPointerOut={() => { document.body.style.cursor = '' }}>
          <sphereGeometry args={[0.16, 10, 8]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
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

// ── 해안에 밀려오는 물결 ───────────────────────────────────
// 실제 해안선(지형의 높이가 0 이 되는 곳)을 따라 흰 띠를 두르고, 띠가 바다 쪽으로 밀려갔다 돌아오며 옅어졌다 짙어진다.
// 파도가 거칠수록 더 멀리 밀려오고 더 진해진다
export function Surf({ amp = 1 }) {
  const ref = useRef()
  const geometry = useMemo(() => {
    const P = COAST_PTS, n = P.length, pos = [], nor = [], side = [], ph = [], idx = []
    for (let i = 0; i < n; i++) {
      const a = P[(i + n - 1) % n], b = P[(i + 1) % n], p = P[i]
      let tx = b[0] - a[0], tz = b[1] - a[1]
      const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l
      let nx = tz, nz = -tx                                                      // 해안선의 옆 방향
      if (heightAt(p[0] + nx * 0.15, p[1] + nz * 0.15) > heightAt(p[0] - nx * 0.15, p[1] - nz * 0.15)) { nx = -nx; nz = -nz }   // 바다 쪽(낮은 쪽)을 향하게
      let t0 = 0
      for (let t = -0.5; t <= 0.5; t += 0.02) { if (heightAt(p[0] + nx * t, p[1] + nz * t) < 0.01) { t0 = t; break } }       // 노이즈로 일렁이는 실제 물가까지 옮긴다
      const bx = p[0] + nx * t0, bz = p[1] + nz * t0
      for (const s of [0, 1]) { pos.push(bx, 0, bz); nor.push(nx, 0, nz); side.push(s); ph.push(i * 0.37) }
    }
    for (let i = 0; i < n; i++) { const j = (i + 1) % n, a = i * 2, b = j * 2; idx.push(a, a + 1, b, b, a + 1, b + 1) }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    g.setAttribute('aN', new THREE.Float32BufferAttribute(nor, 3))
    g.setAttribute('aSide', new THREE.Float32BufferAttribute(side, 1))
    g.setAttribute('aPh', new THREE.Float32BufferAttribute(ph, 1))
    g.setIndex(idx)
    return g
  }, [])
  const material = useMemo(() => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false,
    uniforms: { uTime: { value: 0 }, uAmp: { value: 1 } },
    vertexShader: `attribute vec3 aN; attribute float aSide; attribute float aPh; uniform float uTime; uniform float uAmp; varying float vA;
      void main() {
        float cyc = 0.5 + 0.5 * sin(uTime * (0.7 + 0.18 * uAmp) + aPh);
        vec3 p = position + aN * (0.03 + (0.09 + 0.06 * uAmp) * cyc) * aSide;
        p.y += 0.016;
        vA = (1.0 - aSide * 0.55) * (0.2 + 0.5 * (1.0 - cyc)) * min(1.0, 0.55 + 0.3 * uAmp);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: 'varying float vA; void main() { gl_FragColor = vec4(1.0, 1.0, 1.0, vA); }',
  }), [])
  useFrame(({ clock }, dt) => {
    const u = material.uniforms
    u.uTime.value = clock.elapsedTime
    u.uAmp.value += (amp - u.uAmp.value) * Math.min(1, dt * 1.5)
  })
  return <mesh ref={ref} geometry={geometry} material={material} frustumCulled={false} raycast={noRay} />
}
