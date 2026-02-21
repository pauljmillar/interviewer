'use client';

import React, { Suspense, useEffect, useRef, useState } from 'react';
import { Lipsync } from 'wawa-lipsync';
import { Canvas } from '@react-three/fiber';
import TalkingHead3D from './TalkingHead3D';

/** Map viseme string to mouth openness 0 (closed) .. 1 (open) for 2D avatar */
function visemeToMouthOpenness(viseme: string): number {
  if (!viseme) return 0;
  switch (viseme) {
    case 'viseme_sil':
      return 0;
    case 'viseme_PP':
    case 'viseme_DD':
    case 'viseme_kk':
    case 'viseme_nn':
      return 0.15;
    case 'viseme_FF':
    case 'viseme_TH':
    case 'viseme_CH':
    case 'viseme_SS':
    case 'viseme_RR':
      return 0.35;
    case 'viseme_aa':
      return 0.9;
    case 'viseme_E':
      return 0.5;
    case 'viseme_I':
      return 0.45;
    case 'viseme_O':
      return 0.7;
    case 'viseme_U':
      return 0.55;
    default:
      return 0.2;
  }
}

interface TalkingHeadAvatarProps {
  /** Blob URL or URL to audio (e.g. from POST /api/tts). When set, plays and drives lip-sync. */
  audioUrl: string | null;
  /** Called when playback ends (or errors). */
  onEnd?: () => void;
  /** Optional: show idle state when no audio. */
  isActive?: boolean;
  /** '2d' (default) or '3d'. When '3d', modelUrl must be set or 2D is shown. */
  variant?: '2d' | '3d';
  /** URL to GLB with Oculus-style viseme morph targets. Used only when variant === '3d'. */
  modelUrl?: string;
  className?: string;
}

class Avatar3DErrorBoundary extends React.Component<
  { fallback: React.ReactNode; children: React.ReactNode },
  { hasError: boolean }
> {
  override state = { hasError: false };
  static getDerivedStateFromError = (): { hasError: true } => ({ hasError: true });
  override render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

export default function TalkingHeadAvatar({
  audioUrl,
  onEnd,
  isActive = true,
  variant = '2d',
  modelUrl,
  className = '',
}: TalkingHeadAvatarProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lipsyncRef = useRef<Lipsync | null>(null);
  const rafRef = useRef<number | null>(null);
  const visemeRef = useRef<string | null>(null);
  const [mouthOpenness, setMouthOpenness] = useState(0);

  const use3D = variant === '3d' && Boolean(modelUrl);
  useEffect(() => {
    if (variant === '3d' && !modelUrl) {
      console.warn('TalkingHeadAvatar: variant is "3d" but modelUrl is missing; showing 2D avatar.');
    }
  }, [variant, modelUrl]);

  // Create Lipsync instance once
  useEffect(() => {
    if (typeof window === 'undefined') return;
    lipsyncRef.current = new Lipsync();
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      lipsyncRef.current = null;
    };
  }, []);

  // Run processAudio in a loop and update mouth openness for avatar
  useEffect(() => {
    if (!lipsyncRef.current || !isActive) return;

    const loop = () => {
      const lipsync = lipsyncRef.current;
      if (lipsync) {
        lipsync.processAudio();
        visemeRef.current = lipsync.viseme;
        const openness = visemeToMouthOpenness(lipsync.viseme);
        setMouthOpenness((prev) => (Math.abs(prev - openness) < 0.01 ? prev : openness));
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [isActive]);

  // When audioUrl changes: set source, connect, play, and on end call onEnd
  useEffect(() => {
    const audio = audioRef.current;
    const lipsync = lipsyncRef.current;
    if (!audio || !lipsync) return;

    if (!audioUrl) {
      setMouthOpenness(0);
      return;
    }

    let cancelled = false;

    const handleCanPlay = () => {
      if (cancelled) return;
      try {
        lipsync.connectAudio(audio);
        audio.play().catch((err) => {
          console.warn('TalkingHeadAvatar play failed', err);
          onEnd?.();
        });
      } catch (err) {
        console.warn('TalkingHeadAvatar connectAudio failed', err);
        onEnd?.();
      }
    };

    const handleEnded = () => {
      if (cancelled) return;
      setMouthOpenness(0);
      onEnd?.();
    };

    const handleError = () => {
      if (cancelled) return;
      setMouthOpenness(0);
      onEnd?.();
    };

    audio.addEventListener('canplay', handleCanPlay, { once: true });
    audio.addEventListener('ended', handleEnded, { once: true });
    audio.addEventListener('error', handleError, { once: true });

    audio.src = audioUrl;
    audio.load();

    return () => {
      cancelled = true;
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.src = '';
      setMouthOpenness(0);
    };
  }, [audioUrl, onEnd]);

  const avatar2D = (
    <svg
      viewBox="0 0 120 140"
      className="w-32 h-auto max-w-[200px]"
      aria-hidden
    >
      <ellipse cx="60" cy="70" rx="48" ry="58" fill="#e8e4dc" stroke="#c4b8a8" strokeWidth="2" />
      <ellipse cx="42" cy="62" rx="6" ry="8" fill="#333" />
      <ellipse cx="78" cy="62" rx="6" ry="8" fill="#333" />
      <ellipse
        cx="60"
        cy="92"
        rx="14"
        ry={4 + mouthOpenness * 10}
        fill="#8b7355"
        className="transition-all duration-75 ease-out"
      />
    </svg>
  );

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <audio ref={audioRef} className="hidden" crossOrigin="anonymous" />
      {use3D ? (
        <Avatar3DErrorBoundary fallback={avatar2D}>
          <div className="w-32 h-[140px] max-w-[200px] bg-gray-100 rounded overflow-hidden">
            <Canvas
              camera={{ position: [0, 0, 1.2], fov: 35 }}
              gl={{ antialias: true, alpha: true }}
            >
              <ambientLight intensity={0.8} />
              <directionalLight position={[2, 2, 2]} intensity={1.2} />
              <directionalLight position={[-1, 1, 1]} intensity={0.4} />
              <Suspense fallback={null}>
                <TalkingHead3D
                  modelUrl={modelUrl!}
                  visemeRef={visemeRef}
                  smooth={true}
                />
              </Suspense>
            </Canvas>
          </div>
        </Avatar3DErrorBoundary>
      ) : (
        avatar2D
      )}
    </div>
  );
}
