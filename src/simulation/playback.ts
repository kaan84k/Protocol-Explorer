import { useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';

export const PACKET_DURATION_MS = 4800;

/** One clock drives the packet, narration, progress, and next-frame transition. */
export class PlaybackClock {
  private progress = 0;
  private listeners = new Set<() => void>();
  private animation: number | null = null;
  private lastTime = 0;
  private duration = PACKET_DURATION_MS;
  private speed = 1;
  private onComplete = () => {};

  getSnapshot = () => this.progress;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
  seek = (progress: number) => {
    this.progress = Math.max(0, Math.min(1, progress));
    this.lastTime = performance.now();
    this.listeners.forEach((listener) => listener());
  };
  pause = () => {
    if (this.animation !== null) cancelAnimationFrame(this.animation);
    this.animation = null;
  };
  start = (speed: number, duration: number, onComplete: () => void) => {
    this.pause();
    this.speed = speed;
    this.duration = duration;
    this.onComplete = onComplete;
    this.lastTime = performance.now();
    this.animation = requestAnimationFrame(this.tick);
  };
  private tick = (now: number) => {
    const elapsed = Math.max(0, now - this.lastTime);
    this.lastTime = now;
    this.progress = Math.min(1, this.progress + (elapsed * this.speed) / this.duration);
    this.listeners.forEach((listener) => listener());
    if (this.progress >= 1) {
      this.animation = null;
      this.onComplete();
    } else {
      this.animation = requestAnimationFrame(this.tick);
    }
  };
}

export function usePlaybackClock({
  frameKey,
  playing,
  speed,
  onComplete,
}: {
  frameKey: string;
  playing: boolean;
  speed: number;
  onComplete: () => void;
}) {
  const [clock] = useState(() => new PlaybackClock());
  const completeRef = useRef(onComplete);
  useLayoutEffect(() => {
    completeRef.current = onComplete;
  });
  useLayoutEffect(() => {
    clock.pause();
    clock.seek(0);
  }, [clock, frameKey]);
  useLayoutEffect(() => {
    if (playing) clock.start(speed, PACKET_DURATION_MS, () => completeRef.current());
    else clock.pause();
    return clock.pause;
  }, [clock, frameKey, playing, speed]);
  return clock;
}

// Only animation consumers subscribe; the application shell never renders on every tick.
export function usePlaybackProgress(clock: PlaybackClock) {
  return useSyncExternalStore(clock.subscribe, clock.getSnapshot, clock.getSnapshot);
}
