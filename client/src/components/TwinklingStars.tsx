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
// outerR = length of the points (long rays), innerR = width at the cross (narrow)
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
      if (r < 0.5) {
        type = "tiny";
        size = 0.2 + rand() * 0.15; // small dots
      } else if (r < 0.75) {
        type = "small";
        size = 0.5 + rand() * 0.3; // small sparkles — more visible
      } else if (r < 0.92) {
        type = "medium";
        size = 0.8 + rand() * 0.4; // medium sparkles — clearly star-shaped
      } else {
        type = "bright";
        size = 1.2 + rand() * 0.6; // bright feature stars — very visible
      }
      return {
        id: i,
        cx: rand() * 100,
        cy: rand() * 100,
        size,
        baseOpacity: 0.3 + rand() * 0.5,
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
          25%       { opacity: calc(var(--s-hi) * 0.8); transform: scale(1.1) rotate(8deg); }
          50%       { opacity: var(--s-lo); transform: scale(0.8) rotate(20deg); }
          75%       { opacity: calc(var(--s-hi) * 0.7); transform: scale(0.95) rotate(12deg); }
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
          {/* Glow filter for bright stars — stronger blur for visible halo */}
          <filter id="star-glow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="0.08" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* Medium glow */}
          <filter id="star-glow-med" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="0.05" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
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
                  "--s-lo": s.baseOpacity * 0.2,
                  "--s-dur": `${s.duration}s`,
                  "--s-delay": `${s.delay}s`,
                } as React.CSSProperties}
              />
            );
          }
          // Small/medium/bright — 4-point sparkle shape with elongated rays
          // Ratio of outerR to innerR determines how "pointy" the star is
          // Higher ratio = more elongated, star-like rays
          const outerR = s.size * 0.18; // longer rays
          const innerR = outerR * (s.type === "bright" ? 0.08 : s.type === "medium" ? 0.1 : 0.12); // much narrower cross = more star-like
          const glowFilter = s.type === "bright" ? "url(#star-glow)" : s.type === "medium" ? "url(#star-glow-med)" : undefined;
          return (
            <g
              key={s.id}
              className="star-sparkle"
              style={{
                "--s-hi": s.baseOpacity,
                "--s-lo": s.baseOpacity * 0.25,
                "--s-dur": `${s.duration}s`,
                "--s-delay": `${s.delay}s`,
              } as React.CSSProperties}
            >
              <path
                d={sparklePathD(outerR, innerR)}
                fill={s.color}
                transform={`translate(${s.cx}, ${s.cy})`}
                filter={glowFilter}
              />
              {/* Bright center glow — white dot in the middle for all sparkle types */}
              <circle
                cx={s.cx}
                cy={s.cy}
                r={s.type === "bright" ? outerR * 0.2 : s.type === "medium" ? outerR * 0.18 : outerR * 0.15}
                fill="#ffffff"
                opacity={s.type === "bright" ? 1 : s.type === "medium" ? 0.95 : 0.85}
              />
              {/* Extra outer halo for bright stars */}
              {s.type === "bright" && (
                <circle
                  cx={s.cx}
                  cy={s.cy}
                  r={outerR * 0.35}
                  fill="#ffffff"
                  opacity={0.3}
                  filter="url(#star-glow)"
                />
              )}
            </g>
          );
        })}
      </svg>
    </>
  );
}
