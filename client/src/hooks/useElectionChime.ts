/**
 * useElectionChime
 *
 * Plays a broadcast-style chime using the Web Audio API (no external files).
 * The chime is a two-tone "ding-dong" — a high note followed by a lower note,
 * mimicking classic TV election night broadcast sounds.
 *
 * Usage:
 *   const { soundEnabled, toggleSound, playChime } = useElectionChime();
 */
import { useState, useCallback, useRef } from "react";

const STORAGE_KEY = "election-sound-enabled";

function createChime(ctx: AudioContext) {
  const now = ctx.currentTime;

  // Two-tone broadcast chime: high C5 → G4
  const tones = [
    { freq: 523.25, start: 0,    duration: 0.45 }, // C5
    { freq: 392.00, start: 0.35, duration: 0.55 }, // G4
  ];

  tones.forEach(({ freq, start, duration }) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, now + start);

    // Soft attack, gentle decay — broadcast bell feel
    gain.gain.setValueAtTime(0, now + start);
    gain.gain.linearRampToValueAtTime(0.28, now + start + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, now + start + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + start);
    osc.stop(now + start + duration + 0.05);
  });
}

export function useElectionChime() {
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      // Default OFF so first-time visitors aren't startled
      return stored === "true";
    } catch {
      return false;
    }
  });

  const audioCtxRef = useRef<AudioContext | null>(null);

  const getCtx = useCallback((): AudioContext | null => {
    try {
      if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
        audioCtxRef.current = new AudioContext();
      }
      return audioCtxRef.current;
    } catch {
      return null;
    }
  }, []);

  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  }, []);

  const playChime = useCallback(() => {
    if (!soundEnabled) return;
    const ctx = getCtx();
    if (!ctx) return;

    // Resume context if suspended (browser autoplay policy)
    const play = () => createChime(ctx);
    if (ctx.state === "suspended") {
      ctx.resume().then(play).catch(() => {});
    } else {
      play();
    }
  }, [soundEnabled, getCtx]);

  return { soundEnabled, toggleSound, playChime };
}
