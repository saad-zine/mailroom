import { useRef, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, ContactShadows, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';

/**
 * MascotBot — a stylized, head-only white robot with a red scarf.
 * Transparent canvas overlay that tracks cursor globally.
 * No extra page layout — just the component.
 */

// --- Constants matching the spec ---
const HEAD_W = 2.1;
const HEAD_H = 1.85;
const HEAD_D = 1.8;
const HEAD_RADIUS = 0.68;
const HEAD_SMOOTHNESS = 8;

const EAR_RADIUS = 0.16;
const EAR_HEIGHT = 0.24;
const EAR_X = 1.12;
const EAR_Y = 0.08;

const EYE_RADIUS = 0.075;
const EYE_HEIGHT = 0.28;
const EYE_Z = 0.92;
const EYE_Y = 0.16;
const EYE_X = 0.36;

const SCARF_Y = -0.52;
const SCARF_TAIL_X = 0.55;
const SCARF_TAIL_Y = -0.95;

const MAX_ROT_Y = 0.45;
const MAX_ROT_X = 0.25;
const LERP_FACTOR = 0.08;
const EYE_SHIFT_FACTOR = 0.12;

const WHITE_VINYL = '#f8fafc';
const LIGHT_SILVER = '#e2e8f0';
const DARK_TRIM = '#1e293b';
const BLACK_EYE = '#09090b';
const RED_SCARF = '#dc2626';

function MascotScene() {
  const headRef = useRef<THREE.Group>(null);
  const leftEyeRef = useRef<THREE.Mesh>(null);
  const rightEyeRef = useRef<THREE.Mesh>(null);
  const clock = useThree((state) => state.clock);

  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const [blink, setBlink] = useState(1);

  // Global mouse tracking — pointerEvents: 'none' on wrapper lets clicks through
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      setMouse({
        x: (e.clientX / window.innerWidth) * 2 - 1,
        y: -(e.clientY / window.innerHeight) * 2 + 1,
      });
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  // Blink timer ~ every 4s
  useEffect(() => {
    const id = setInterval(() => {
      setBlink(0.08);
      setTimeout(() => setBlink(1), 120);
    }, 4000 + Math.random() * 1000);
    return () => clearInterval(id);
  }, []);

  // Head + eyes follow cursor smoothly
  useFrame(() => {
    if (!headRef.current) return;

    const targetY = THREE.MathUtils.clamp(mouse.x * MAX_ROT_Y, -MAX_ROT_Y, MAX_ROT_Y);
    const targetX = THREE.MathUtils.clamp(mouse.y * MAX_ROT_X, -MAX_ROT_X, MAX_ROT_X);

    headRef.current.rotation.y = THREE.MathUtils.lerp(headRef.current.rotation.y, targetY, LERP_FACTOR);
    headRef.current.rotation.x = THREE.MathUtils.lerp(headRef.current.rotation.x, targetX, LERP_FACTOR);

    // Gentle vertical bob
    const time = clock.getElapsedTime();
    headRef.current.position.y = Math.sin(time * 2) * 0.06;

    // Eyes shift slightly with gaze
    const shiftX = mouse.x * EYE_SHIFT_FACTOR;
    const shiftY = mouse.y * EYE_SHIFT_FACTOR;

    if (leftEyeRef.current) {
      leftEyeRef.current.position.x = -EYE_X + shiftX;
      leftEyeRef.current.position.y = EYE_Y + shiftY;
      leftEyeRef.current.scale.y = blink;
    }
    if (rightEyeRef.current) {
      rightEyeRef.current.position.x = EYE_X + shiftX;
      rightEyeRef.current.position.y = EYE_Y + shiftY;
      rightEyeRef.current.scale.y = blink;
    }
  });

  return (
    <group ref={headRef}>
      {/* White Rounded Head Shell */}
      <RoundedBox
        args={[HEAD_W, HEAD_H, HEAD_D]}
        radius={HEAD_RADIUS}
        smoothness={HEAD_SMOOTHNESS}
        position={[0, 0, 0]}
      >
        <meshPhysicalMaterial
          color={WHITE_VINYL}
          roughness={0.25}
          metalness={0.05}
          clearcoat={0.6}
          clearcoatRoughness={0.2}
        />
      </RoundedBox>

      {/* Cute Side Ears — Left & Right */}
      {[-1, 1].map((side) => (
        <group key={side} position={[side * EAR_X, EAR_Y, 0]}>
          {/* Ear pod */}
          <mesh>
            <capsuleGeometry args={[EAR_RADIUS, EAR_HEIGHT, 8, 16]} />
            <meshStandardMaterial color={LIGHT_SILVER} roughness={0.3} metalness={0.1} />
          </mesh>
          {/* Dark trim ring at base of ear */}
          <mesh position={[0, -EAR_HEIGHT / 2 - 0.02, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[EAR_RADIUS + 0.015, 0.012, 8, 16]} />
            <meshStandardMaterial color={DARK_TRIM} roughness={0.4} metalness={0.2} />
          </mesh>
        </group>
      ))}

      {/* Long Vertical Rounded-Dash Eyes — Black */}
      <mesh ref={leftEyeRef} position={[-EYE_X, EYE_Y, EYE_Z]}>
        <capsuleGeometry args={[EYE_RADIUS, EYE_HEIGHT, 8, 16]} />
        <meshStandardMaterial color={BLACK_EYE} roughness={0.15} />
      </mesh>
      <mesh ref={rightEyeRef} position={[EYE_X, EYE_Y, EYE_Z]}>
        <capsuleGeometry args={[EYE_RADIUS, EYE_HEIGHT, 8, 16]} />
        <meshStandardMaterial color={BLACK_EYE} roughness={0.15} />
      </mesh>

      {/* Red Scarf — Collar ring + two tails */}
      <group>
        {/* Main collar ring (torus) hugging lower head */}
        <mesh position={[0, SCARF_Y, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[HEAD_W / 2 - 0.05, 0.14, 16, 32]} />
          <meshStandardMaterial color={RED_SCARF} roughness={0.85} metalness={0} />
        </mesh>

        {/* Front overlap flap for extra "wrapped" look */}
        <mesh position={[0, SCARF_Y, HEAD_D / 2 + 0.02]} rotation={[Math.PI / 2, 0, 0]}>
          <circleGeometry args={[HEAD_W / 2 - 0.05, 32]} />
          <meshStandardMaterial color={RED_SCARF} roughness={0.85} metalness={0} side={THREE.DoubleSide} />
        </mesh>

        {/* Scarf Tail 1 — upper */}
        <mesh position={[SCARF_TAIL_X, SCARF_TAIL_Y + 0.15, -0.2]} rotation={[0, 0, -0.25]}>
          <capsuleGeometry args={[0.09, 0.35, 8, 16]} />
          <meshStandardMaterial color={RED_SCARF} roughness={0.85} metalness={0} />
        </mesh>

        {/* Scarf Tail 2 — lower, slightly angled */}
        <mesh position={[SCARF_TAIL_X + 0.08, SCARF_TAIL_Y - 0.15, -0.35]} rotation={[0, 0.15, -0.35]}>
          <capsuleGeometry args={[0.08, 0.3, 8, 16]} />
          <meshStandardMaterial color={RED_SCARF} roughness={0.85} metalness={0} />
        </mesh>
      </group>
    </group>
  );
}

export function MascotBot() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1,
        pointerEvents: 'none', // clicks pass through to page
      }}
      aria-hidden="true"
    >
      <Canvas
        gl={{ alpha: true, antialias: true, preserveDrawingBuffer: false }}
        camera={{ position: [0, 0, 5.5], fov: 35 }}
        style={{ width: '100%', height: '100%', display: 'block' }}
      >
        <Environment preset="city" />
        <directionalLight position={[3, 4, 5]} intensity={1.2} />
        <directionalLight position={[-2, 2, 3]} intensity={0.5} />
        <ambientLight intensity={0.4} />

        <ContactShadows
          position={[0, -1.35, 0]}
          opacity={0.3}
          scale={3.5}
          blur={2.2}
        />

        <MascotScene />
      </Canvas>
    </div>
  );
}

export default MascotBot;