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
  duration: number;   // seconds for one full twinkle cycle
  delay: number;      // negative delay = start mid-animation
  color: string;
  animClass: string;  // which animation variant to use
}

// Slightly warm/cool star colors like real stars (O/B/A/F/G/K/M types)
const COLORS = [
  "#ffffff", "#ffffff", "#ffffff", "#ffffff",  // most stars: pure white
  "#cce8ff",  // blue-white (B/A type)
  "#e8f4ff",  // blue-white faint
  "#fff8e8",  // yellow-white (F/G type)
  "#ffe8cc",  // orange-white (K type)
  "#e8d8ff",  // pale violet
];

export function TwinklingStars() {
  const stars = useMemo<Star[]>(() => {
    const rand = seededRand(42);
    return Array.from({ length: 260 }, (_, i) => {
      const r = rand();
      // Size distribution: 65% tiny, 27% medium, 8% large/bright
      const size = r < 0.65
        ? 0.5 + rand() * 0.7    // tiny: 0.5–1.2px
        : r < 0.92
          ? 1.4 + rand() * 0.8  // medium: 1.4–2.2px
          : 2.4 + rand() * 0.7; // large: 2.4–3.1px

      // Large/bright stars get more dramatic shimmer; tiny stars get subtle flicker
      const animClass = size > 2.2
        ? "star-shimmer"
        : size > 1.3
          ? "star-twinkle-b"
          : "star-twinkle-a";

      return {
        id: i,
        cx: rand() * 100,
        cy: rand() * 100,
        r: size,
        baseOpacity: 0.25 + rand() * 0.65,
        duration: size > 2.2
          ? 1.8 + rand() * 2.2   // bright stars: faster, more dramatic
          : 2.8 + rand() * 5.0,  // dim stars: slower, subtler
        delay: -(rand() * 10),
        color: COLORS[Math.floor(rand() * COLORS.length)],
        animClass,
      };
    });
  }, []);

  return (
    <>
      <style>{`
        /*
         * Three animation variants to mimic real atmospheric scintillation:
         *
         * star-twinkle-a: Tiny/dim stars — slow, gentle fade with slight scale.
         *   Real dim stars twinkle less dramatically because they subtend a
         *   smaller solid angle and average out more atmospheric turbulence cells.
         *
         * star-twinkle-b: Medium stars — moderate multi-step flicker.
         *   Intermediate brightness with occasional rapid dip.
         *
         * star-shimmer: Bright/large stars — fast, irregular multi-step shimmer
         *   with sharp brightness spikes. Real bright stars scintillate rapidly
         *   (the "twinkling" most people notice) because they're bright enough
         *   that individual turbulence cells cause visible intensity changes.
         */

        @keyframes twinkle-a {
          0%   { opacity: var(--s-hi); transform: scale(1); }
          30%  { opacity: var(--s-lo); transform: scale(0.75); }
          55%  { opacity: var(--s-mid); transform: scale(0.9); }
          80%  { opacity: var(--s-lo); transform: scale(0.7); }
          100% { opacity: var(--s-hi); transform: scale(1); }
        }

        @keyframes twinkle-b {
          0%   { opacity: var(--s-hi);  transform: scale(1); }
          15%  { opacity: var(--s-mid); transform: scale(0.85); }
          28%  { opacity: var(--s-lo);  transform: scale(0.65); }
          42%  { opacity: var(--s-hi);  transform: scale(1.05); }
          60%  { opacity: var(--s-mid); transform: scale(0.9); }
          75%  { opacity: var(--s-lo);  transform: scale(0.7); }
          88%  { opacity: var(--s-mid); transform: scale(0.88); }
          100% { opacity: var(--s-hi);  transform: scale(1); }
        }

        @keyframes shimmer {
          0%   { opacity: var(--s-hi);   transform: scale(1.1); }
          8%   { opacity: var(--s-lo);   transform: scale(0.6); }
          18%  { opacity: var(--s-hi);   transform: scale(1.15); }
          30%  { opacity: var(--s-mid);  transform: scale(0.8); }
          40%  { opacity: var(--s-lo);   transform: scale(0.55); }
          52%  { opacity: var(--s-hi);   transform: scale(1.2); }
          63%  { opacity: var(--s-mid);  transform: scale(0.85); }
          74%  { opacity: var(--s-lo);   transform: scale(0.6); }
          85%  { opacity: var(--s-hi);   transform: scale(1.1); }
          93%  { opacity: var(--s-mid);  transform: scale(0.9); }
          100% { opacity: var(--s-hi);   transform: scale(1.1); }
        }

        .star-twinkle-a {
          animation: twinkle-a var(--s-dur) ease-in-out var(--s-delay) infinite;
          transform-origin: center;
          transform-box: fill-box;
        }
        .star-twinkle-b {
          animation: twinkle-b var(--s-dur) ease-in-out var(--s-delay) infinite;
          transform-origin: center;
          transform-box: fill-box;
        }
        .star-shimmer {
          animation: shimmer var(--s-dur) ease-in-out var(--s-delay) infinite;
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
            className={s.animClass}
            cx={`${s.cx}%`}
            cy={`${s.cy}%`}
            r={s.r * 0.12}
            fill={s.color}
            style={{
              "--s-hi":  s.baseOpacity,
              "--s-mid": s.baseOpacity * 0.55,
              "--s-lo":  s.baseOpacity * 0.12,
              "--s-dur": `${s.duration}s`,
              "--s-delay": `${s.delay}s`,
            } as React.CSSProperties}
          />
        ))}
      </svg>
    </>
  );
}
