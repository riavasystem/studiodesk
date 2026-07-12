"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame, type ThreeElements } from "@react-three/fiber";
import * as THREE from "three";

const BAR_COLUMNS = 12;
const BAR_ROWS = 7;
const BAR_GAP = 0.34;

function MixerBars() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const seeds = useMemo(
    () =>
      Array.from({ length: BAR_COLUMNS * BAR_ROWS }, () => Math.random() * Math.PI * 2),
    [],
  );

  useFrame(({ clock }) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const t = clock.getElapsedTime();

    let i = 0;
    for (let col = 0; col < BAR_COLUMNS; col++) {
      for (let row = 0; row < BAR_ROWS; row++) {
        const seed = seeds[i];
        const wave =
          Math.sin(t * 1.6 + col * 0.5 + seed) * 0.5 +
          Math.sin(t * 0.9 + row * 0.8 + seed) * 0.3;
        const height = 0.4 + Math.abs(wave) * 1.8;

        dummy.position.set(
          (col - (BAR_COLUMNS - 1) / 2) * BAR_GAP,
          height / 2 - 1.2,
          (row - (BAR_ROWS - 1) / 2) * BAR_GAP,
        );
        dummy.scale.set(0.12, height, 0.12);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        i++;
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, BAR_COLUMNS * BAR_ROWS]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#ff8a1f" emissive="#ff5c00" emissiveIntensity={0.35} roughness={0.35} />
    </instancedMesh>
  );
}

function RigCamera(props: ThreeElements["group"]) {
  const group = useRef<THREE.Group>(null);

  useFrame(({ pointer }) => {
    if (!group.current) return;
    group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, pointer.x * 0.35, 0.04);
    group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, -pointer.y * 0.15, 0.04);
  });

  return (
    <group ref={group} {...props}>
      <MixerBars />
    </group>
  );
}

export default function HeroScene() {
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [3.2, 1.8, 5.2], fov: 42 }}
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={0.5} />
      <pointLight position={[4, 4, 4]} intensity={60} color="#ff8a1f" />
      <pointLight position={[-4, 2, -3]} intensity={25} color="#3fd0ff" />
      <RigCamera />
    </Canvas>
  );
}
