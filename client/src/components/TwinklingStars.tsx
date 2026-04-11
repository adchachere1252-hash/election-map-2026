import { useMemo } from "react";

// Seeded pseudo-random so stars are stable across renders
function seededRand(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

interface Star {
  id: number;
  cx: number;
  cy: number;
  r: number;
  baseOpacity: number;
  duration: number;
  delay: number;
  color: string;
}

const COLORS = ["#ffffff", "#ffffff", "#ffffff", "#cce8ff", "#e8d8ff", "#fffbe8"];

export function TwinklingStars() {
  const stars = useMemo<Star[]>(() => {
    const rand = seededRand(42);
    return Array.from({ length: 220 }, (_, i) => {
      const r = rand();
      const size = r < 0.65 ? 0.5 + rand() * 0.7 : r < 0.92 ? 1.5 + rand() * 0.7 : 2.5 + rand() * 0.5;
      return {
        id: i,
        cx: rand() * 100,
        cy: rand() * 100,
        r: size,
        baseOpacity: 0.2 + rand() * 0.55,
        // Slow cycles: 4–10 seconds so motion is barely perceptible
        duration: 4 + rand() * 6,
        delay: -(rand() * 12),
        color: COLORS[Math.floor(rand() * COLORS.length)],
      };
    });
  }, []);

  return (
    <>
      <style>{`
        /*
         * Gentle two-step ease: star slowly fades to ~40% of its brightness
         * then eases back. No sharp spikes, no scale jitter on most stars.
         * A small subset of larger stars gets a very slight scale nudge (1→0.9)
         * to add depth without being distracting.
         */
        @keyframes twinkle-soft {
          0%, 100% { opacity: var(--s-hi); }
          50%       { opacity: var(--s-lo); }
        }
        @keyframes twinkle-soft-scale {
          0%, 100% { opacity: var(--s-hi); transform: scale(1); }
          50%       { opacity: var(--s-lo); transform: scale(0.88); }
        }
        .star-soft {
          animation: twinkle-soft var(--s-dur) ease-in-out var(--s-delay) infinite;
        }
        .star-soft-scale {
          animation: twinkle-soft-scale var(--s-dur) ease-in-out var(--s-delay) infinite;
          transform-origin: center;
          transform-box: fill-box;
        }
      `}</style>
      <svg
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          zIndex: 0,
          overflow: "hidden",
        }}
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
      >
        {stars.map((s) => (
          <circle
            key={s.id}
            // Larger stars get the subtle scale variant; tiny stars just fade
            className={s.r > 2.2 ? "star-soft-scale" : "star-soft"}
            cx={`${s.cx}%`}
            cy={`${s.cy}%`}
            r={s.r * 0.12}
            fill={s.color}
            style={{
              "--s-hi":    s.baseOpacity,
              // Lo is 40% of hi — a gentle dip, not a dramatic drop
              "--s-lo":    s.baseOpacity * 0.4,
              "--s-dur":   `${s.duration}s`,
              "--s-delay": `${s.delay}s`,
            } as React.CSSProperties}
          />
        ))}
      </svg>
    </>
  );
}
