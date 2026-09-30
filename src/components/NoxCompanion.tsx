import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useMemo, useRef } from "react";
import "./NoxCompanion3D.css";

type Props = {
  observedDays: number;
  size?: "sm" | "md" | "lg";
  className?: string;
};

export function getNoxStage(days: number) {
  if (days >= 365) return 5;
  if (days >= 90) return 4;
  if (days >= 30) return 3;
  if (days >= 7) return 2;
  return 1;
}

function Leaf({ position, rotation, scale = 1, delay = 0 }: {
  position: [number, number, number];
  rotation: [number, number, number];
  scale?: number;
  delay?: number;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const geometry = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(0, -0.72);
    s.bezierCurveTo(-0.62, -0.22, -0.52, 0.55, 0, 0.92);
    s.bezierCurveTo(0.52, 0.55, 0.62, -0.22, 0, -0.72);
    return new THREE.ExtrudeGeometry(s, {
      depth: 0.055,
      bevelEnabled: true,
      bevelSegments: 3,
      bevelSize: 0.035,
      bevelThickness: 0.025,
      curveSegments: 20,
    });
  }, []);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.elapsedTime + delay;
    ref.current.rotation.z = rotation[2] + Math.sin(t * 0.75) * 0.055;
    ref.current.rotation.x = rotation[0] + Math.sin(t * 0.52) * 0.025;
  });

  return (
    <mesh ref={ref} geometry={geometry} position={position} rotation={rotation} scale={scale}>
      <meshPhysicalMaterial
        color="#c8ff00"
        emissive="#9dcc00"
        emissiveIntensity={0.55}
        transparent
        opacity={0.64}
        roughness={0.2}
        metalness={0}
        transmission={0.18}
        thickness={0.18}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function Eye({ x }: { x: number }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const cycle = clock.elapsedTime % 7.4;
    const blink = cycle > 6.92 && cycle < 7.06;
    ref.current.scale.y = THREE.MathUtils.lerp(ref.current.scale.y, blink ? 0.08 : 1, 0.24);
  });

  return (
    <mesh ref={ref} position={[x, 0.05, 1.39]} rotation={[0, 0, x < 0 ? -0.16 : 0.16]} scale={[0.34, 0.12, 0.08]}>
      <sphereGeometry args={[1, 32, 16]} />
      <meshStandardMaterial color="#eaff8a" emissive="#c8ff00" emissiveIntensity={4.2} />
    </mesh>
  );
}

function Particles({ stage }: { stage: number }) {
  const points = useRef<THREE.Points>(null);
  const count = stage >= 5 ? 34 : stage >= 4 ? 16 : 0;
  const positions = useMemo(() => {
    const a = new Float32Array(Math.max(count, 1) * 3);
    for (let i = 0; i < count; i++) {
      const angle = (i * 2.399963) % (Math.PI * 2);
      const radius = 1.5 + (i % 5) * 0.16;
      a[i*3] = Math.cos(angle) * radius;
      a[i*3+1] = -0.4 + ((i * 0.37) % 2.8);
      a[i*3+2] = -0.2 + Math.sin(angle) * 0.7;
    }
    return a;
  }, [count]);

  useFrame(({ clock }) => {
    if (!points.current || count === 0) return;
    points.current.rotation.y = clock.elapsedTime * 0.06;
    points.current.position.y = Math.sin(clock.elapsedTime * 0.45) * 0.08;
  });
  if (!count) return null;

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#c8ff00" size={0.045} transparent opacity={0.68} sizeAttenuation />
    </points>
  );
}

function Creature({ stage }: { stage: number }) {
  const group = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!group.current) return;
    const t = clock.elapsedTime;
    const breath = 1 + Math.sin(t * 1.18) * 0.018;
    group.current.scale.set(1, breath, 1);
    group.current.rotation.z = Math.sin(t * 0.33) * 0.012;
  });

  const leaves = [
    { p:[-0.58,1.22,0.05], r:[0.02,-0.12,-0.48], s:.72, d:0 },
    { p:[0.50,1.28,-0.02], r:[0.04,0.16,0.44], s:.82, d:1.2 },
    { p:[-1.00,.68,-.12], r:[0.08,-0.25,-1.03], s:.72, d:2.1 },
    { p:[1.00,.62,-.14], r:[0.08,0.25,1.03], s:.76, d:3.2 },
    { p:[-.94,1.42,-.25], r:[0.10,-0.34,-.78], s:1.0, d:4.0 },
    { p:[.86,1.48,-.28], r:[0.10,.34,.72], s:1.08, d:5.1 },
  ] as const;
  const leafCount = stage === 1 ? 0 : stage === 2 ? 2 : stage === 3 ? 3 : stage === 4 ? 4 : 6;

  return (
    <group ref={group} position={[0,-0.22,0]}>
      {leaves.slice(0, leafCount).map((l,i) =>
        <Leaf key={i} position={l.p as any} rotation={l.r as any} scale={l.s} delay={l.d}/>
      )}

      <mesh scale={[1.38, 1.18, 1.22]} position={[0,0,0]}>
        <sphereGeometry args={[1, 64, 48]} />
        <meshPhysicalMaterial color="#090b09" roughness={0.62} metalness={0.04} clearcoat={0.18} clearcoatRoughness={0.5}/>
      </mesh>

      <Eye x={-.48}/><Eye x={.48}/>
      <pointLight color="#c8ff00" intensity={stage >= 4 ? 2.8 : 1.8} distance={5} position={[0,.1,1.9]} />
      <Particles stage={stage}/>
    </group>
  );
}

function Scene({ stage }: { stage: number }) {
  return (
    <>
      <ambientLight intensity={0.38}/>
      <directionalLight position={[-3,5,4]} intensity={2.2} color="#f5ffe8"/>
      <pointLight position={[3,2,-1]} intensity={stage >= 3 ? 3.2 : 1.5} color="#baff00" distance={7}/>
      <Creature stage={stage}/>
      <mesh position={[0,-1.38,0]} rotation={[-Math.PI/2,0,0]}>
        <circleGeometry args={[3.2,64]}/>
        <meshStandardMaterial color="#0a0c08" roughness={1}/>
      </mesh>
    </>
  );
}

export default function NoxCompanion({ observedDays, size="md", className="" }: Props) {
  const stage = getNoxStage(Math.max(0, observedDays));
  return (
    <div className={`nox3d nox3d--${size} ${className}`} aria-label={`Ton NOX, stade ${stage} sur 5`}>
      <Canvas
        dpr={[1, 1.6]}
        camera={{ position:[0,.2,5.4], fov:42 }}
        gl={{ alpha:true, antialias:true, powerPreference:"high-performance" }}
      >
        <Scene stage={stage}/>
      </Canvas>
      <div className="nox3d__vignette"/>
    </div>
  );
}
