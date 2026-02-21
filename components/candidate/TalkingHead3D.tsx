'use client';

import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import { VISEMES } from 'wawa-lipsync';

const SMOOTH_SPEED_ACTIVE = 0.2;
const SMOOTH_SPEED_OTHER = 0.1;

/**
 * Apply viseme to a mesh's morph targets. Only touches targets that exist in the model.
 */
function applyVisemeToMesh(
  mesh: THREE.Mesh & { morphTargetDictionary?: Record<string, number>; morphTargetInfluences?: number[] },
  currentViseme: string,
  smooth: boolean
) {
  const dict = mesh.morphTargetDictionary;
  const influences = mesh.morphTargetInfluences;
  if (!dict || !influences) return;

  const allVisemes = Object.values(VISEMES) as string[];
  for (const visemeName of allVisemes) {
    const index = dict[visemeName];
    if (index === undefined) continue;
    const target = visemeName === currentViseme ? 1 : 0;
    if (smooth) {
      influences[index] = THREE.MathUtils.lerp(
        influences[index],
        target,
        target === 1 ? SMOOTH_SPEED_ACTIVE : SMOOTH_SPEED_OTHER
      );
    } else {
      influences[index] = target;
    }
  }
}

/**
 * Apply blink to eye morph targets if present.
 */
function applyBlinkToMesh(
  mesh: THREE.Mesh & { morphTargetDictionary?: Record<string, number>; morphTargetInfluences?: number[] },
  blinkAmount: number
) {
  const dict = mesh.morphTargetDictionary;
  const influences = mesh.morphTargetInfluences;
  if (!dict || !influences) return;

  const leftIndex = dict['eyeBlinkLeft'];
  const rightIndex = dict['eyeBlinkRight'];
  if (leftIndex !== undefined) influences[leftIndex] = blinkAmount;
  if (rightIndex !== undefined) influences[rightIndex] = blinkAmount;
}

export interface TalkingHead3DProps {
  modelUrl: string;
  /** Ref whose .current is the current viseme string (e.g. viseme_sil, viseme_PP). */
  visemeRef: React.MutableRefObject<string | null>;
  /** Smooth morph target transitions. */
  smooth?: boolean;
  /** Called when the model has no viseme morph targets (optional). */
  onNoMorphTargets?: () => void;
}

/**
 * 3D avatar that drives Oculus-style viseme morph targets from visemeRef.
 * For 3D mode, use a GLB with Oculus-style viseme morph targets; Ready Player Me
 * exports (before shutdown) or Blender-authored models with these names are compatible.
 */
export default function TalkingHead3D({
  modelUrl,
  visemeRef,
  smooth = true,
  onNoMorphTargets,
}: TalkingHead3DProps) {
  const { scene } = useGLTF(modelUrl);
  const groupRef = useRef<THREE.Group>(null);
  const hasMorphTargetsRef = useRef<boolean | null>(null);
  const [blink, setBlink] = useState(0);

  // Timer-based blinking
  useEffect(() => {
    let blinkTimeout: ReturnType<typeof setTimeout>;
    const scheduleNext = () => {
      blinkTimeout = setTimeout(() => {
        setBlink(1);
        const unblink = setTimeout(() => {
          setBlink(0);
          scheduleNext();
        }, 150);
        return () => clearTimeout(unblink);
      }, 2000 + Math.random() * 3000);
    };
    scheduleNext();
    return () => clearTimeout(blinkTimeout);
  }, []);

  useFrame(() => {
    const currentViseme = visemeRef.current ?? 'viseme_sil';
    let anyMorph = false;

    scene.traverse((child) => {
      const mesh = child as THREE.Mesh & {
        morphTargetDictionary?: Record<string, number>;
        morphTargetInfluences?: number[];
      };
      if (!mesh.isMesh) return;
      if (mesh.morphTargetDictionary && mesh.morphTargetInfluences) {
        anyMorph = true;
        applyVisemeToMesh(mesh, currentViseme, smooth);
        applyBlinkToMesh(mesh, blink);
      }
    });

    if (hasMorphTargetsRef.current === null) {
      hasMorphTargetsRef.current = anyMorph;
      if (!anyMorph) {
        console.warn('TalkingHead3D: model has no viseme morph targets; mouth will stay static.');
        onNoMorphTargets?.();
      }
    }
  });

  return (
    <group ref={groupRef}>
      <primitive object={scene} />
    </group>
  );
}
