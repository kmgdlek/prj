import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// 번개 한 번(flash 번호가 바뀔 때): 번쩍-꺼짐-번쩍-사그라듦(두 번 깜빡) 동안 장면 전체가 푸르스름하게 환해지고, 하늘에서 바다로 번개 줄기가 내리꽂힌다
// 줄기 모양은 번호로 정해지는 무작위(꺾이는 정도·자리)라 번개마다 다르다
const rngOf = (seed) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
const flicker = (t) => (t < 0.07 ? 1 : t < 0.13 ? 0.08 : t < 0.24 ? 0.85 : t < 0.7 ? Math.max(0, 0.45 * (1 - (t - 0.24) / 0.46)) : 0)

export default function Lightning({ flash, power = 1 }) {
  const light = useRef(), glow = useRef(), bolt = useRef()
  const start = useRef(-99)
  useEffect(() => { if (flash > 0) start.current = performance.now() / 1000 }, [flash])
  const segs = useMemo(() => {
    const rnd = rngOf(flash * 7919 + 13)
    const x0 = (rnd() - 0.5) * 16, z0 = (rnd() - 0.5) * 9
    const pts = []
    let x = x0, z = z0
    for (let k = 0; k <= 12; k++) { pts.push(new THREE.Vector3(x, 9 - k * 0.72, z)); x += (rnd() - 0.5) * 1.1; z += (rnd() - 0.5) * 0.6 }
    return pts.slice(1).map((b, i) => {
      const a = pts[i], d = b.clone().sub(a), len = d.length()
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize())
      return { pos: a.clone().add(b).multiplyScalar(0.5).toArray(), q: q.toArray(), len }
    })
  }, [flash])
  useFrame(() => {
    const t = performance.now() / 1000 - start.current
    const k = t >= 0 && t < 0.8 ? flicker(t) : 0
    light.current.intensity = k * 3.4 * power
    glow.current.intensity = k * 60 * power
    bolt.current.visible = k > 0.05
  })
  return (
    <>
      <ambientLight ref={light} intensity={0} color="#cfdcff" />
      <pointLight ref={glow} intensity={0} color="#dfe9ff" position={[0, 5, 0]} distance={26} decay={1.4} />
      <group ref={bolt} visible={false}>
        {segs.map((s, i) => (
          <group key={i} position={s.pos} quaternion={s.q}>
            <mesh><cylinderGeometry args={[0.035, 0.035, s.len, 5]} /><meshBasicMaterial color="#f6f9ff" fog={false} /></mesh>
            <mesh><cylinderGeometry args={[0.16, 0.16, s.len, 7]} /><meshBasicMaterial color="#9fc0ff" transparent opacity={0.28} depthWrite={false} blending={THREE.AdditiveBlending} fog={false} /></mesh>
          </group>
        ))}
      </group>
    </>
  )
}
