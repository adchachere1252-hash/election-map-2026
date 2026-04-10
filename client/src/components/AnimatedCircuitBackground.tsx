// Dense circuit board / data chip background
// Covers the full viewport with right-angle traces, parallel bus lines,
// junction pads, and corner logic-block grids — like a PCB die shot.

// ─── GRID CONSTANTS ───────────────────────────────────────────────
// viewBox: 1440 × 720 (wider than before to fill widescreen)
const W = 1440;
const H = 720;

// ─── CIRCUIT PATHS ────────────────────────────────────────────────
// All paths use only horizontal / vertical segments (right-angle bends)
// to mimic real PCB routing. Grouped by region so the whole canvas is covered.

const CIRCUIT_PATHS: string[] = [
  // ── TOP EDGE — horizontal bus lines ──────────────────────────────
  "M 0 18 L 360 18 L 360 36 L 720 36",
  "M 720 36 L 1080 36 L 1080 18 L 1440 18",
  "M 0 54 L 180 54 L 180 72 L 540 72 L 540 54 L 900 54",
  "M 900 54 L 900 72 L 1260 72 L 1260 54 L 1440 54",
  "M 0 90 L 90 90 L 90 108 L 450 108 L 450 90 L 810 90",
  "M 810 90 L 810 108 L 1170 108 L 1170 90 L 1440 90",

  // ── BOTTOM EDGE — horizontal bus lines ───────────────────────────
  "M 0 702 L 360 702 L 360 684 L 720 684",
  "M 720 684 L 1080 684 L 1080 702 L 1440 702",
  "M 0 666 L 180 666 L 180 648 L 540 648 L 540 666 L 900 666",
  "M 900 666 L 900 648 L 1260 648 L 1260 666 L 1440 666",
  "M 0 630 L 90 630 L 90 612 L 450 612 L 450 630 L 810 630",
  "M 810 630 L 810 612 L 1170 612 L 1170 630 L 1440 630",

  // ── LEFT EDGE — vertical bus lines ───────────────────────────────
  "M 18 0 L 18 180 L 36 180 L 36 360",
  "M 36 360 L 36 540 L 18 540 L 18 720",
  "M 54 0 L 54 90 L 72 90 L 72 270 L 54 270 L 54 450",
  "M 54 450 L 54 630 L 72 630 L 72 720",
  "M 90 0 L 90 54 L 108 54 L 108 216 L 90 216 L 90 504",
  "M 90 504 L 90 666 L 108 666 L 108 720",

  // ── RIGHT EDGE — vertical bus lines ──────────────────────────────
  "M 1422 0 L 1422 180 L 1404 180 L 1404 360",
  "M 1404 360 L 1404 540 L 1422 540 L 1422 720",
  "M 1386 0 L 1386 90 L 1368 90 L 1368 270 L 1386 270 L 1386 450",
  "M 1386 450 L 1386 630 L 1368 630 L 1368 720",
  "M 1350 0 L 1350 54 L 1332 54 L 1332 216 L 1350 216 L 1350 504",
  "M 1350 504 L 1350 666 L 1332 666 L 1332 720",

  // ── TOP-LEFT LOGIC BLOCK ─────────────────────────────────────────
  "M 108 108 L 216 108 L 216 180 L 108 180 L 108 108",
  "M 144 108 L 144 72",
  "M 180 108 L 180 72",
  "M 216 144 L 252 144 L 252 216 L 180 216 L 180 180",
  "M 108 144 L 72 144",
  "M 108 162 L 72 162",
  "M 162 180 L 162 252 L 252 252 L 252 324 L 324 324",
  "M 216 180 L 288 180 L 288 252",

  // ── TOP-RIGHT LOGIC BLOCK ────────────────────────────────────────
  "M 1224 108 L 1332 108 L 1332 180 L 1224 180 L 1224 108",
  "M 1260 108 L 1260 72",
  "M 1296 108 L 1296 72",
  "M 1224 144 L 1188 144 L 1188 216 L 1260 216 L 1260 180",
  "M 1332 144 L 1368 144",
  "M 1332 162 L 1368 162",
  "M 1278 180 L 1278 252 L 1188 252 L 1188 324 L 1116 324",
  "M 1224 180 L 1152 180 L 1152 252",

  // ── BOTTOM-LEFT LOGIC BLOCK ──────────────────────────────────────
  "M 108 540 L 216 540 L 216 612 L 108 612 L 108 540",
  "M 144 612 L 144 648",
  "M 180 612 L 180 648",
  "M 216 576 L 252 576 L 252 504 L 180 504 L 180 540",
  "M 108 576 L 72 576",
  "M 162 540 L 162 468 L 252 468 L 252 396 L 324 396",

  // ── BOTTOM-RIGHT LOGIC BLOCK ─────────────────────────────────────
  "M 1224 540 L 1332 540 L 1332 612 L 1224 612 L 1224 540",
  "M 1260 612 L 1260 648",
  "M 1296 612 L 1296 648",
  "M 1224 576 L 1188 576 L 1188 504 L 1260 504 L 1260 540",
  "M 1332 576 L 1368 576",
  "M 1278 540 L 1278 468 L 1188 468 L 1188 396 L 1116 396",

  // ── INTERIOR HORIZONTAL BUSES (spanning full width) ──────────────
  "M 324 180 L 540 180 L 540 216 L 720 216",
  "M 720 216 L 900 216 L 900 180 L 1116 180",
  "M 324 252 L 432 252 L 432 288 L 720 288",
  "M 720 288 L 1008 288 L 1008 252 L 1116 252",
  "M 324 360 L 504 360 L 504 324 L 720 324",
  "M 720 324 L 936 324 L 936 360 L 1116 360",
  "M 324 432 L 504 432 L 504 468 L 720 468",
  "M 720 468 L 936 468 L 936 432 L 1116 432",
  "M 324 504 L 432 504 L 432 540 L 720 540",
  "M 720 540 L 1008 540 L 1008 504 L 1116 504",

  // ── INTERIOR VERTICAL BUSES ──────────────────────────────────────
  "M 360 180 L 360 252 L 396 252 L 396 360",
  "M 396 360 L 396 468 L 360 468 L 360 540",
  "M 432 216 L 432 180 L 468 180 L 468 252",
  "M 468 252 L 468 360 L 432 360 L 432 432",
  "M 504 288 L 504 252 L 540 252 L 540 324",
  "M 540 324 L 540 396 L 504 396 L 504 468",
  "M 576 216 L 576 180 L 612 180 L 612 252 L 576 252 L 576 324",
  "M 576 324 L 576 396 L 612 396 L 612 468 L 576 468 L 576 540",
  "M 648 288 L 648 252 L 684 252 L 684 360 L 648 360 L 648 432",
  "M 684 432 L 684 468 L 648 468 L 648 540",
  "M 720 180 L 720 144 L 756 144 L 756 216 L 720 216",
  "M 720 216 L 720 288 L 756 288 L 756 360 L 720 360",
  "M 720 360 L 720 432 L 756 432 L 756 504 L 720 504",
  "M 720 504 L 720 576 L 756 576 L 756 612",
  "M 792 216 L 792 180 L 828 180 L 828 252 L 792 252 L 792 324",
  "M 792 324 L 792 396 L 828 396 L 828 468 L 792 468 L 792 540",
  "M 864 288 L 864 252 L 900 252 L 900 360 L 864 360 L 864 432",
  "M 900 432 L 900 468 L 864 468 L 864 540",
  "M 936 216 L 936 180 L 972 180 L 972 252 L 936 252 L 936 324",
  "M 936 324 L 936 396 L 972 396 L 972 468 L 936 468 L 936 540",
  "M 1008 288 L 1008 252 L 1044 252 L 1044 360 L 1008 360 L 1008 432",
  "M 1044 432 L 1044 468 L 1008 468 L 1008 540",
  "M 1080 216 L 1080 180 L 1116 180 L 1116 252",

  // ── PARALLEL DATA BUS LINES (dense multi-trace) ──────────────────
  "M 288 324 L 288 396 L 252 396 L 252 468 L 288 468 L 288 504",
  "M 306 324 L 306 396 L 270 396 L 270 468 L 306 468 L 306 504",
  "M 1152 324 L 1152 396 L 1188 396 L 1188 468 L 1152 468 L 1152 504",
  "M 1134 324 L 1134 396 L 1170 396 L 1170 468 L 1134 468 L 1134 504",

  // ── CENTER CROSS ─────────────────────────────────────────────────
  "M 612 324 L 648 324 L 648 288 L 792 288 L 792 324 L 828 324",
  "M 612 396 L 648 396 L 648 432 L 792 432 L 792 396 L 828 396",
  "M 684 252 L 684 216 L 756 216 L 756 252",
  "M 684 504 L 684 540 L 756 540 L 756 504",

  // ── SMALL DETAIL TRACES ───────────────────────────────────────────
  "M 162 252 L 162 288 L 216 288 L 216 324 L 162 324 L 162 360",
  "M 288 180 L 288 144 L 360 144 L 360 180",
  "M 1152 180 L 1152 144 L 1080 144 L 1080 180",
  "M 1278 252 L 1278 288 L 1224 288 L 1224 324 L 1278 324 L 1278 360",
  "M 540 144 L 540 108 L 612 108 L 612 144 L 684 144 L 684 108",
  "M 756 108 L 756 144 L 828 144 L 828 108 L 900 108 L 900 144",
  "M 540 576 L 540 612 L 612 612 L 612 576 L 684 576 L 684 612",
  "M 756 612 L 756 576 L 828 576 L 828 612 L 900 612 L 900 576",
];

// ─── JUNCTION NODES ───────────────────────────────────────────────
// Placed at every major right-angle bend and intersection
const NODES: Array<{ x: number; y: number; r: number }> = [
  // Top edge nodes
  { x: 360, y: 18, r: 2.5 }, { x: 720, y: 36, r: 2.5 }, { x: 1080, y: 18, r: 2.5 },
  { x: 180, y: 54, r: 2 }, { x: 540, y: 54, r: 2 }, { x: 900, y: 54, r: 2 }, { x: 1260, y: 54, r: 2 },
  { x: 90, y: 90, r: 2 }, { x: 450, y: 90, r: 2 }, { x: 810, y: 90, r: 2 }, { x: 1170, y: 90, r: 2 },
  // Bottom edge nodes
  { x: 360, y: 702, r: 2.5 }, { x: 720, y: 684, r: 2.5 }, { x: 1080, y: 702, r: 2.5 },
  { x: 180, y: 666, r: 2 }, { x: 540, y: 666, r: 2 }, { x: 900, y: 666, r: 2 }, { x: 1260, y: 666, r: 2 },
  // Left edge nodes
  { x: 18, y: 180, r: 2.5 }, { x: 36, y: 360, r: 2.5 }, { x: 18, y: 540, r: 2.5 },
  { x: 54, y: 270, r: 2 }, { x: 54, y: 450, r: 2 }, { x: 90, y: 216, r: 2 }, { x: 90, y: 504, r: 2 },
  // Right edge nodes
  { x: 1422, y: 180, r: 2.5 }, { x: 1404, y: 360, r: 2.5 }, { x: 1422, y: 540, r: 2.5 },
  { x: 1386, y: 270, r: 2 }, { x: 1386, y: 450, r: 2 }, { x: 1350, y: 216, r: 2 }, { x: 1350, y: 504, r: 2 },
  // Logic block corners
  { x: 108, y: 108, r: 3 }, { x: 216, y: 108, r: 3 }, { x: 216, y: 180, r: 3 }, { x: 108, y: 180, r: 3 },
  { x: 252, y: 144, r: 2 }, { x: 252, y: 252, r: 2 }, { x: 162, y: 252, r: 2 },
  { x: 1224, y: 108, r: 3 }, { x: 1332, y: 108, r: 3 }, { x: 1332, y: 180, r: 3 }, { x: 1224, y: 180, r: 3 },
  { x: 1188, y: 144, r: 2 }, { x: 1188, y: 252, r: 2 }, { x: 1278, y: 252, r: 2 },
  { x: 108, y: 540, r: 3 }, { x: 216, y: 540, r: 3 }, { x: 216, y: 612, r: 3 }, { x: 108, y: 612, r: 3 },
  { x: 252, y: 576, r: 2 }, { x: 252, y: 468, r: 2 }, { x: 162, y: 468, r: 2 },
  { x: 1224, y: 540, r: 3 }, { x: 1332, y: 540, r: 3 }, { x: 1332, y: 612, r: 3 }, { x: 1224, y: 612, r: 3 },
  { x: 1188, y: 576, r: 2 }, { x: 1188, y: 468, r: 2 }, { x: 1278, y: 468, r: 2 },
  // Interior grid intersections
  { x: 360, y: 180, r: 2 }, { x: 432, y: 216, r: 2 }, { x: 504, y: 288, r: 2 },
  { x: 576, y: 216, r: 2 }, { x: 648, y: 288, r: 2 }, { x: 720, y: 216, r: 2.5 },
  { x: 792, y: 216, r: 2 }, { x: 864, y: 288, r: 2 }, { x: 936, y: 216, r: 2 },
  { x: 1008, y: 288, r: 2 }, { x: 1080, y: 216, r: 2 },
  { x: 360, y: 252, r: 2 }, { x: 432, y: 252, r: 2 }, { x: 504, y: 252, r: 2 },
  { x: 576, y: 252, r: 2 }, { x: 648, y: 252, r: 2 }, { x: 720, y: 288, r: 2.5 },
  { x: 792, y: 252, r: 2 }, { x: 864, y: 252, r: 2 }, { x: 936, y: 252, r: 2 },
  { x: 1008, y: 252, r: 2 }, { x: 1080, y: 252, r: 2 },
  { x: 396, y: 360, r: 2 }, { x: 468, y: 360, r: 2 }, { x: 540, y: 324, r: 2 },
  { x: 612, y: 324, r: 2 }, { x: 684, y: 360, r: 2 }, { x: 720, y: 360, r: 2.5 },
  { x: 756, y: 360, r: 2 }, { x: 828, y: 324, r: 2 }, { x: 900, y: 360, r: 2 },
  { x: 1044, y: 360, r: 2 }, { x: 1116, y: 360, r: 2 },
  { x: 396, y: 468, r: 2 }, { x: 468, y: 468, r: 2 }, { x: 540, y: 468, r: 2 },
  { x: 612, y: 468, r: 2 }, { x: 684, y: 468, r: 2 }, { x: 720, y: 468, r: 2.5 },
  { x: 756, y: 468, r: 2 }, { x: 828, y: 468, r: 2 }, { x: 900, y: 468, r: 2 },
  { x: 1044, y: 468, r: 2 }, { x: 1116, y: 468, r: 2 },
  { x: 360, y: 540, r: 2 }, { x: 432, y: 540, r: 2 }, { x: 504, y: 504, r: 2 },
  { x: 576, y: 540, r: 2 }, { x: 648, y: 540, r: 2 }, { x: 720, y: 540, r: 2.5 },
  { x: 792, y: 540, r: 2 }, { x: 864, y: 540, r: 2 }, { x: 936, y: 540, r: 2 },
  { x: 1008, y: 540, r: 2 }, { x: 1080, y: 540, r: 2 },
  // Center cross
  { x: 648, y: 324, r: 2.5 }, { x: 792, y: 324, r: 2.5 },
  { x: 648, y: 396, r: 2.5 }, { x: 792, y: 396, r: 2.5 },
  { x: 720, y: 144, r: 2 }, { x: 720, y: 576, r: 2 },
];

// ─── PULSE CONFIGS ────────────────────────────────────────────────
// Spread pulses across all paths with varied timing
const PULSES = CIRCUIT_PATHS.map((_, i) => ({
  pathIndex: i,
  duration: 2.5 + (i % 9) * 0.7,   // 2.5 – 8.1s
  delay: (i * 0.35) % 7,
  // Teal/cyan palette: #2dd4bf, #06b6d4, #67e8f9, #a5f3fc
  color:
    i % 10 === 0 ? "rgba(165,243,252,0.95)"  // lightest cyan
    : i % 7 === 0 ? "rgba(103,232,249,0.90)"  // light cyan
    : i % 4 === 0 ? "rgba(6,182,212,0.90)"    // medium cyan
    : "rgba(45,212,191,0.88)",                 // teal
  size: i % 5 === 0 ? 5.5 : i % 3 === 0 ? 4.5 : 3.5,
}));

export function AnimatedCircuitBackground() {
  return (
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    >
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Strong glow for pulse dots */}
          <filter id="pulse-glow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="5" result="blur1" />
            <feGaussianBlur stdDeviation="2.5" result="blur2" in="SourceGraphic" />
            <feMerge>
              <feMergeNode in="blur1" />
              <feMergeNode in="blur2" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* Subtle glow for nodes */}
          <filter id="node-glow" x="-150%" y="-150%" width="400%" height="400%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* Line glow — very subtle */}
          <filter id="line-glow" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="1" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* Define paths for animateMotion */}
          {CIRCUIT_PATHS.map((d, i) => (
            <path key={`def-${i}`} id={`cp-${i}`} d={d} />
          ))}
        </defs>

        {/* ── Background fill ── */}
        <rect width={W} height={H} fill="transparent" />

        {/* ── Circuit lines — glow layer + crisp top layer ── */}
        <g opacity="0.45" filter="url(#line-glow)">
          {CIRCUIT_PATHS.map((d, i) => (
            <path
              key={`glow-${i}`}
              d={d}
              fill="none"
              stroke="#2dd4bf"
              strokeWidth="2.5"
              strokeLinecap="square"
              strokeLinejoin="miter"
            />
          ))}
        </g>
        <g opacity="0.70">
          {CIRCUIT_PATHS.map((d, i) => (
            <path
              key={`line-${i}`}
              d={d}
              fill="none"
              stroke={i % 6 === 0 ? "#67e8f9" : i % 3 === 0 ? "#06b6d4" : "#2dd4bf"}
              strokeWidth="1.2"
              strokeLinecap="square"
              strokeLinejoin="miter"
            />
          ))}
        </g>

        {/* ── Junction pads ── */}
        <g opacity="0.80" filter="url(#node-glow)">
          {NODES.map((n, i) => (
            <circle
              key={`node-${i}`}
              cx={n.x}
              cy={n.y}
              r={n.r}
              fill={i % 5 === 0 ? "#a5f3fc" : i % 3 === 0 ? "#67e8f9" : "#2dd4bf"}
            />
          ))}
        </g>

        {/* ── Animated light pulses ── */}
        {PULSES.map((pulse, i) => (
          <circle
            key={`pulse-${i}`}
            r={pulse.size}
            fill={pulse.color}
            filter="url(#pulse-glow)"
            opacity="0"
          >
            <animateMotion
              dur={`${pulse.duration}s`}
              begin={`${pulse.delay}s`}
              repeatCount="indefinite"
              rotate="auto"
            >
              <mpath href={`#cp-${pulse.pathIndex}`} />
            </animateMotion>
            <animate
              attributeName="opacity"
              values="0;1;1;0"
              keyTimes="0;0.06;0.90;1"
              dur={`${pulse.duration}s`}
              begin={`${pulse.delay}s`}
              repeatCount="indefinite"
            />
          </circle>
        ))}
      </svg>
    </div>
  );
}
