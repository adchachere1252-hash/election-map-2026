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
  duration: number; // seconds
  delay: number;    // seconds
  color: string;
}

const COLORS = ["#ffffff", "#ffffff", "#ffffff", "#cce8ff", "#e8d8ff", "#fffbe8"];

export function TwinklingStars() {
  const stars = useMemo<Star[]>(() => {
    const rand = seededRand(42);
    return Array.from({ length: 220 }, (_, i) => {
      const r = rand();
      // Most stars tiny (0.5–1.2px), a few medium (1.5–2.2px), rare large (2.5–3px)
      const size = r < 0.65 ? 0.5 + rand() * 0.7 : r < 0.92 ? 1.5 + rand() * 0.7 : 2.5 + rand() * 0.5;
      return {
        id: i,
        cx: rand() * 100,  // percent
        cy: rand() * 100,
        r: size,
        baseOpacity: 0.2 + rand() * 0.65,
        duration: 2.5 + rand() * 4.5,
        delay: -(rand() * 8),
        color: COLORS[Math.floor(rand() * COLORS.length)],
      };
    });
  }, []);

  return (
    <>
      {/* Inject keyframes once */}
      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: var(--star-hi); transform: scale(1); }
          50%       { opacity: var(--star-lo); transform: scale(0.6); }
        }
        .star-twinkle {
          animation: twinkle var(--star-dur) ease-in-out var(--star-delay) infinite;
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
            className="star-twinkle"
            cx={`${s.cx}%`}
            cy={`${s.cy}%`}
            r={s.r * 0.12}   // viewBox units (100×100 space)
            fill={s.color}
            style={{
              "--star-hi": s.baseOpacity,
              "--star-lo": s.baseOpacity * 0.15,
              "--star-dur": `${s.duration}s`,
              "--star-delay": `${s.delay}s`,
            } as React.CSSProperties}
          />
        ))}
      </svg>
    </>
  );
}
