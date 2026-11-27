import { useRef, useEffect, useState, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';

/**
 * MascotBot — small rounded white head with INTEGRATED shader eyes (Grok-style).
 * Eyes are drawn in the fragment shader as part of the head surface.
 */

// --- Constants ---
const HEAD_SIZE = 1.1;

const MAX_ROT_Y = 0.35;
const MAX_ROT_X = 0.2;
const LERP_FACTOR = 0.1;
const HEAD_GAZE_FACTOR = 0.08;

const WHITE_VINYL = new THREE.Color('#f8fafc');
const EYE_WHITE = new THREE.Color('#f0f0f0');
const EYE_BLACK = new THREE.Color('#09090b');
const PUPIL_BLACK = new THREE.Color('#000000');

// Vertex shader
const vertexShader = /* glsl */`
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying vec2 vUv;

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Fragment shader — head surface + integrated expressive eyes
const fragmentShader = /* glsl */`
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying vec2 vUv;

  uniform float uTime;
  uniform vec3 uViewDir;
  uniform vec2 uGaze;
  uniform float uBlink;
  uniform float uSquint;
  uniform float uWiden;
  uniform float uPupilSize;
  uniform float uExpression;

  uniform vec3 uHeadColor;
  uniform vec3 uEyeWhiteColor;
  uniform vec3 uEyeIrisColor;
  uniform vec3 uPupilColor;

  // Smoothstep helpers
  float smoothInOut(float t) { return t * t * (3.0 - 2.0 * t); }
  float smoothIn(float t) { return t * t; }
  float smoothOut(float t) { return 1.0 - (1.0 - t) * (1.0 - t); }

  // Eye shape SDF — horizontal capsule/stadium that can morph
  float eyeShape(vec2 p, float width, float height, float roundness) {
    vec2 q = abs(p) - vec2(width, height) + vec2(roundness);
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - roundness;
  }

  // Pupil SDF — circle
  float pupilShape(vec2 p, float r) { return length(p) - r; }

  void main() {
    // --- Base head surface ---
    vec3 N = normalize(vNormal);
    vec3 V = normalize(-uViewDir);
    
    // Fresnel for subtle edge highlight
    float fresnel = pow(1.0 - max(dot(N, V), 0.0), 3.0);
    
    // Lighting
    vec3 lightDir = normalize(vec3(0.5, 1.0, 0.8));
    float diff = max(dot(N, lightDir), 0.0);
    float rim = pow(1.0 - max(dot(N, -lightDir), 0.0), 2.0);
    
    vec3 headBase = uHeadColor * (0.4 + 0.6 * diff) + vec3(0.02) * rim + vec3(0.03) * fresnel;
    
    // Clearcoat highlight
    vec3 halfDir = normalize(lightDir + V);
    float clearcoat = pow(max(dot(N, halfDir), 0.0), 64.0) * 0.5;

    // --- Eye UV projection ---
    vec3 localPos = vWorldPos;
    
    float eyeY = 0.07;
    float eyeX = 0.22;
    float eyeW = 0.14;
    float eyeH = 0.09;
    float eyeRound = 0.06;

    // --- Expressive eye morphing ---
    float blinkScale = mix(1.0, 0.05, smoothInOut(uBlink));
    float squintTop = mix(0.0, 0.35, smoothIn(uSquint));
    float squintWiden = 1.0 + uSquint * 0.15;
    float widenScale = mix(1.0, 1.3, smoothIn(uWiden));
    float widenShrink = mix(1.0, 0.9, smoothIn(uWiden));

    float curEyeH = eyeH * blinkScale * widenScale;
    float curEyeW = eyeW * squintWiden * widenShrink;
    float lidOffset = eyeH * squintTop * (1.0 - uBlink);

    vec2 gazeOffset = uGaze * vec2(curEyeW * 0.35, curEyeH * 0.25);
    float pupilR = mix(0.25, 0.55, smoothInOut(uPupilSize)) * curEyeH;

    // --- Left eye ---
    vec2 leftUV = vec2(
      (localPos.x + eyeX) / HEAD_SIZE * 2.0,
      (localPos.y - eyeY - lidOffset * 0.5) / HEAD_SIZE * 2.0
    );
    
    float leftEyeDist = eyeShape(leftUV - gazeOffset, curEyeW, curEyeH, eyeRound);
    float leftPupilDist = pupilShape(leftUV - gazeOffset, pupilR);
    
    float leftEyeMask = 1.0 - smoothstep(0.0, 0.015, leftEyeDist);
    float leftPupilMask = 1.0 - smoothstep(0.0, 0.01, leftPupilDist);
    float leftLidShadow = smoothstep(-0.02, 0.0, leftUV.y + curEyeH * 0.5) * 0.3;

    // --- Right eye ---
    vec2 rightUV = vec2(
      (localPos.x - eyeX) / HEAD_SIZE * 2.0,
      (localPos.y - eyeY - lidOffset * 0.5) / HEAD_SIZE * 2.0
    );
    
    float rightEyeDist = eyeShape(rightUV - gazeOffset, curEyeW, curEyeH, eyeRound);
    float rightPupilDist = pupilShape(rightUV - gazeOffset, pupilR);
    
    float rightEyeMask = 1.0 - smoothstep(0.0, 0.015, rightEyeDist);
    float rightPupilMask = 1.0 - smoothstep(0.0, 0.01, rightPupilDist);
    float rightLidShadow = smoothstep(-0.02, 0.0, rightUV.y + curEyeH * 0.5) * 0.3;

    // Combine eyes
    float eyeMask = max(leftEyeMask, rightEyeMask);
    float pupilMask = max(leftPupilMask, rightPupilMask);
    float lidShadow = max(leftLidShadow, rightLidShadow);

    // Only draw eyes on front-facing area (z > 0)
    float frontFace = smoothstep(-0.1, 0.1, localPos.z / HEAD_SIZE);
    eyeMask *= frontFace;
    pupilMask *= frontFace;
    lidShadow *= frontFace;

    // --- Final color composition ---
    vec3 color = headBase;
    
    // Eye whites
    color = mix(color, uEyeWhiteColor, eyeMask * (1.0 - pupilMask));
    // Pupils
    color = mix(color, uPupilColor, pupilMask);
    // Eyelid shadow
    color = color * (1.0 - lidShadow);
    // Clearcoat
    color += vec3(clearcoat) * 0.4;

    // Subtle ambient occlusion in creases
    float ao = 1.0 - smoothstep(-0.5, 0.5, vNormal.z) * 0.1;
    color *= ao;

    gl_FragColor = vec4(color, 1.0);
  }
`;

function MascotScene() {
  // Create shader material instance once
  const material = useMemo(() => {
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uViewDir: { value: new THREE.Vector3(0, 0, -1) },
        uGaze: { value: new THREE.Vector2(0, 0) },
        uBlink: { value: 0 },
        uSquint: { value: 0 },
        uWiden: { value: 0 },
        uPupilSize: { value: 0.35 },
        uExpression: { value: 0 },
        uHeadColor: { value: WHITE_VINYL },
        uEyeWhiteColor: { value: EYE_WHITE },
        uEyeIrisColor: { value: EYE_BLACK },
        uPupilColor: { value: PUPIL_BLACK },
      },
      vertexShader,
      fragmentShader,
      transparent: false,
    });
    return mat;
  }, []);

  const meshRef = useRef<THREE.Mesh>(null);
  const clock = useThree((state) => state.clock);
  const camera = useThree((state) => state.camera);

  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const [blink, setBlink] = useState(0);
  const [squint, setSquint] = useState(0);
  const [widen, setWiden] = useState(0);
  const [pupilSize, setPupilSize] = useState(0.35);

  // Global mouse tracking
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

  // Blink timer ~ every 3-5s
  useEffect(() => {
    const schedule = () => {
      const delay = 3000 + Math.random() * 2000;
      setTimeout(() => {
        setBlink(1);
        setTimeout(() => setBlink(0), 150);
        schedule();
      }, delay);
    };
    schedule();
  }, []);

  // Random expression micro-movements
  useEffect(() => {
    const id = setInterval(() => {
      const expr = Math.random();
      if (expr < 0.3) {
        setSquint(0.4 + Math.random() * 0.3);
        setTimeout(() => setSquint(0), 800 + Math.random() * 1200);
      } else if (expr < 0.5) {
        setWiden(0.3 + Math.random() * 0.4);
        setTimeout(() => setWiden(0), 600 + Math.random() * 1000);
      }
      setPupilSize(0.25 + Math.random() * 0.5);
    }, 2000 + Math.random() * 3000);
    return () => clearInterval(id);
  }, []);

  // Animation frame
  useFrame(() => {
    if (!meshRef.current) return;

    const time = clock.getElapsedTime();

    // Head rotation follows cursor (lerped)
    const targetY = THREE.MathUtils.clamp(mouse.x * MAX_ROT_Y, -MAX_ROT_Y, MAX_ROT_Y);
    const targetX = THREE.MathUtils.clamp(mouse.y * MAX_ROT_X, -MAX_ROT_X, MAX_ROT_X);

    meshRef.current.rotation.y = THREE.MathUtils.lerp(meshRef.current.rotation.y, targetY, LERP_FACTOR);
    meshRef.current.rotation.x = THREE.MathUtils.lerp(meshRef.current.rotation.x, targetX, LERP_FACTOR);

    // Gentle vertical bob
    meshRef.current.position.y = Math.sin(time * 1.8) * 0.04;

    // Micro head tilt toward gaze
    meshRef.current.rotation.z = THREE.MathUtils.lerp(
      meshRef.current.rotation.z,
      -mouse.x * HEAD_GAZE_FACTOR * 0.5,
      LERP_FACTOR * 0.5
    );

    // Update shader uniforms
    const mat = meshRef.current.material as THREE.ShaderMaterial;
    if (mat.uniforms) {
      mat.uniforms.uTime.value = time;
      mat.uniforms.uGaze.value.set(mouse.x, mouse.y);
      mat.uniforms.uBlink.value = blink;
      mat.uniforms.uSquint.value = squint;
      mat.uniforms.uWiden.value = widen;
      mat.uniforms.uPupilSize.value = pupilSize;
      mat.uniforms.uExpression.value = Math.sin(time * 0.7) * 0.5 + Math.cos(time * 1.3) * 0.5;
      mat.uniforms.uViewDir.value.set(0, 0, -1).applyQuaternion(camera.quaternion);
    }
  });

  return (
    <mesh ref={meshRef} position={[0, 0, 0]} material={material}>
      <sphereGeometry args={[HEAD_SIZE / 2, 64, 64]} />
    </mesh>
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
        camera={{ position: [0, 0, 4], fov: 30 }}
        style={{ width: '100%', height: '100%', display: 'block' }}
      >
        <Environment preset="city" />
        <directionalLight position={[1.5, 2, 3]} intensity={1.2} />
        <directionalLight position={[-1, 1.5, 2.5]} intensity={0.5} />
        <ambientLight intensity={0.6} />

        <ContactShadows
          position={[0, -0.75, 0]}
          opacity={0.22}
          scale={2.2}
          blur={1.8}
        />

        <MascotScene />
      </Canvas>
    </div>
  );
}

export default MascotBot;