import { useRef, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, ContactShadows, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';

/**
 * MascotBot — small, rounded white robot head (Grok-style).
 * Transparent canvas overlay that tracks cursor globally.
 * No extra page layout — just the component.
 */

// --- Constants: smaller, more spherical ---
const HEAD_SIZE = 1.35;        // overall scale (was ~2.1)
const HEAD_RADIUS = 0.55;      // rounder corners
const HEAD_SMOOTHNESS = 10;    // smoother

const EYE_RADIUS = 0.065;
const EYE_HEIGHT = 0.18;       // shorter, rounder eyes
const EYE_Z = 0.62;
const EYE_Y = 0.08;
const EYE_X = 0.28;

const MAX_ROT_Y = 0.35;        // slightly less rotation range
const MAX_ROT_X = 0.2;
const LERP_FACTOR = 0.1;
const EYE_SHIFT_FACTOR = 0.1;

const WHITE_VINYL = '#f8fafc';
const BLACK_EYE = '#09090b';

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
    headRef.current.position.y = Math.sin(time * 2) * 0.05;

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
      {/* Rounded Head Shell — near-spherical */}
      <RoundedBox
        args={[HEAD_SIZE, HEAD_SIZE, HEAD_SIZE]}
        radius={HEAD_RADIUS}
        smoothness={HEAD_SMOOTHNESS}
        position={[0, 0, 0]}
      >
        <meshPhysicalMaterial
          color={WHITE_VINYL}
          roughness={0.2}
          metalness={0.02}
          clearcoat={0.7}
          clearcoatRoughness={0.15}
        />
      </RoundedBox>

      {/* Rounded Eyes — simple capsules */}
      <mesh ref={leftEyeRef} position={[-EYE_X, EYE_Y, EYE_Z]}>
        <capsuleGeometry args={[EYE_RADIUS, EYE_HEIGHT, 8, 16]} />
        <meshStandardMaterial color={BLACK_EYE} roughness={0.1} />
      </mesh>
      <mesh ref={rightEyeRef} position={[EYE_X, EYE_Y, EYE_Z]}>
        <capsuleGeometry args={[EYE_RADIUS, EYE_HEIGHT, 8, 16]} />
        <meshStandardMaterial color={BLACK_EYE} roughness={0.1} />
      </mesh>
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
        pointerEvents: 'none',
      }}
      aria-hidden="true"
    >
      <Canvas
        gl={{ alpha: true, antialias: true, preserveDrawingBuffer: false }}
        camera={{ position: [0, 0, 4.5], fov: 30 }}
        style={{ width: '100%', height: '100%', display: 'block' }}
      >
        <Environment preset="city" />
        <directionalLight position={[2, 3, 4]} intensity={1.1} />
        <directionalLight position={[-1.5, 2, 3]} intensity={0.4} />
        <ambientLight intensity={0.5} />

        <ContactShadows
          position={[0, -0.9, 0]}
          opacity={0.25}
          scale={2.5}
          blur={2}
        />

        <MascotScene />
      </Canvas>
    </div>
  );
}

export default MascotBot;