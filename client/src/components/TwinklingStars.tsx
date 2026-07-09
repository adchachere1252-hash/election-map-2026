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
  size: number;
  baseOpacity: number;
  duration: number;
  delay: number;
  color: string;
  type: "tiny" | "small" | "medium" | "bright";
}

const COLORS = ["#ffffff", "#ffffff", "#ffffff", "#cce8ff", "#e8d8ff", "#fffbe8"];

// Generate a 4-point star sparkle path centered at (0,0)
// outerR = length of the points, innerR = width of the cross
function sparklePathD(outerR: number, innerR: number): string {
  return [
    `M 0 -${outerR}`,
    `Q ${innerR} -${innerR} ${innerR} 0`,
    `Q ${innerR} ${innerR} 0 ${outerR}`,
    `Q -${innerR} ${innerR} -${innerR} 0`,
    `Q -${innerR} -${innerR} 0 -${outerR}`,
    "Z",
  ].join(" ");
}

export function TwinklingStars() {
  const stars = useMemo<Star[]>(() => {
    const rand = seededRand(42);
    return Array.from({ length: 260 }, (_, i) => {
      const r = rand();
      let type: Star["type"];
      let size: number;
      if (r < 0.55) {
        type = "tiny";
        size = 0.15 + rand() * 0.15; // very small dots
      } else if (r < 0.82) {
        type = "small";
        size = 0.25 + rand() * 0.2; // small sparkles
      } else if (r < 0.95) {
        type = "medium";
        size = 0.4 + rand() * 0.2; // medium sparkles
      } else {
        type = "bright";
        size = 0.55 + rand() * 0.25; // bright feature stars
      }
      return {
        id: i,
        cx: rand() * 100,
        cy: rand() * 100,
        size,
        baseOpacity: 0.25 + rand() * 0.55,
        duration: 4 + rand() * 6,
        delay: -(rand() * 12),
        color: COLORS[Math.floor(rand() * COLORS.length)],
        type,
      };
    });
  }, []);

  return (
    <>
      <style>{`
        @keyframes twinkle-soft {
          0%, 100% { opacity: var(--s-hi); }
          50%       { opacity: var(--s-lo); }
        }
        @keyframes twinkle-sparkle {
          0%, 100% { opacity: var(--s-hi); transform: scale(1) rotate(0deg); }
          50%       { opacity: var(--s-lo); transform: scale(0.85) rotate(15deg); }
        }
        .star-dot {
          animation: twinkle-soft var(--s-dur) ease-in-out var(--s-delay) infinite;
        }
        .star-sparkle {
          animation: twinkle-sparkle var(--s-dur) ease-in-out var(--s-delay) infinite;
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
        <defs>
          {/* Radial glow filter for bright stars */}
          <filter id="star-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="0.04" />
          </filter>
        </defs>
        {stars.map((s) => {
          if (s.type === "tiny") {
            // Tiny dots — just small circles
            return (
              <circle
                key={s.id}
                className="star-dot"
                cx={`${s.cx}%`}
                cy={`${s.cy}%`}
                r={s.size * 0.06}
                fill={s.color}
                style={{
                  "--s-hi": s.baseOpacity,
                  "--s-lo": s.baseOpacity * 0.3,
                  "--s-dur": `${s.duration}s`,
                  "--s-delay": `${s.delay}s`,
                } as React.CSSProperties}
              />
            );
          }
          // Small/medium/bright — 4-point sparkle shape
          const outerR = s.size * 0.12;
          const innerR = outerR * (s.type === "bright" ? 0.15 : 0.2);
          return (
            <g
              key={s.id}
              className="star-sparkle"
              style={{
                "--s-hi": s.baseOpacity,
                "--s-lo": s.baseOpacity * 0.35,
                "--s-dur": `${s.duration}s`,
                "--s-delay": `${s.delay}s`,
              } as React.CSSProperties}
            >
              <path
                d={sparklePathD(outerR, innerR)}
                fill={s.color}
                transform={`translate(${s.cx}, ${s.cy})`}
                filter={s.type === "bright" ? "url(#star-glow)" : undefined}
              />
              {/* Add a tiny center dot for extra brightness on medium/bright */}
              {(s.type === "medium" || s.type === "bright") && (
                <circle
                  cx={`${s.cx}%`}
                  cy={`${s.cy}%`}
                  r={innerR * 0.5}
                  fill="#ffffff"
                  opacity={0.9}
                />
              )}
            </g>
          );
        })}
      </svg>
    </>
  );
}
