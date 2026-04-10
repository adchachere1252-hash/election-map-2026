import { useEffect, useRef } from "react";

// Circuit node positions and path definitions for the background
// These form a realistic-looking PCB circuit board pattern
const CIRCUIT_PATHS = [
  // Top-left cluster
  "M 20 80 L 80 80 L 80 40 L 180 40",
  "M 80 80 L 80 160 L 140 160 L 140 220",
  "M 180 40 L 260 40 L 260 100 L 340 100",
  "M 260 40 L 260 20 L 400 20 L 400 60",
  // Top-center
  "M 400 20 L 560 20 L 560 60 L 640 60",
  "M 560 20 L 560 0",
  "M 640 60 L 720 60 L 720 120",
  "M 400 60 L 400 140 L 480 140",
  // Top-right cluster
  "M 720 60 L 820 60 L 820 20 L 960 20",
  "M 820 60 L 820 140 L 900 140 L 900 200",
  "M 960 20 L 1060 20 L 1060 80",
  "M 1060 80 L 1060 160 L 980 160",
  // Right side
  "M 1060 160 L 1060 260 L 1000 260",
  "M 1000 260 L 1000 340 L 1060 340 L 1060 420",
  "M 1060 420 L 1060 500 L 980 500",
  // Bottom-right
  "M 1060 500 L 1060 580 L 960 580 L 960 640",
  "M 960 640 L 860 640 L 860 600",
  "M 860 600 L 760 600 L 760 560",
  // Bottom-center
  "M 760 600 L 640 600 L 640 640",
  "M 640 600 L 540 600 L 540 560 L 460 560",
  "M 460 560 L 380 560 L 380 600 L 300 600",
  // Bottom-left
  "M 300 600 L 200 600 L 200 560 L 140 560",
  "M 140 560 L 60 560 L 60 500",
  "M 60 500 L 20 500 L 20 420",
  // Left side
  "M 20 420 L 20 340 L 80 340 L 80 280",
  "M 80 280 L 20 280 L 20 200",
  "M 20 200 L 20 120 L 80 120 L 80 80",
  // Interior cross-connections
  "M 340 100 L 340 200 L 480 200 L 480 140",
  "M 480 140 L 560 140 L 560 200 L 640 200",
  "M 640 200 L 720 200 L 720 120",
  "M 640 200 L 640 280 L 560 280 L 560 360",
  "M 560 360 L 480 360 L 480 440 L 400 440",
  "M 400 440 L 320 440 L 320 360 L 240 360",
  "M 240 360 L 140 360 L 140 280 L 80 280",
  "M 720 200 L 800 200 L 800 280 L 720 280",
  "M 720 280 L 720 360 L 800 360 L 800 440 L 720 440",
  "M 720 440 L 640 440 L 640 360",
  "M 800 440 L 900 440 L 900 360 L 980 360 L 980 280",
  "M 980 280 L 980 200 L 900 200",
  // Small detail paths
  "M 140 220 L 200 220 L 200 280 L 140 280",
  "M 200 280 L 240 280 L 240 360",
  "M 400 140 L 320 140 L 320 200 L 240 200 L 240 280",
];

// Nodes (junction dots) at key intersections
const NODES = [
  { x: 80, y: 80 }, { x: 80, y: 160 }, { x: 260, y: 40 }, { x: 400, y: 20 },
  { x: 400, y: 60 }, { x: 560, y: 20 }, { x: 640, y: 60 }, { x: 720, y: 60 },
  { x: 720, y: 120 }, { x: 820, y: 60 }, { x: 1060, y: 80 }, { x: 1060, y: 160 },
  { x: 1000, y: 260 }, { x: 1060, y: 340 }, { x: 1060, y: 420 }, { x: 980, y: 500 },
  { x: 960, y: 640 }, { x: 760, y: 600 }, { x: 640, y: 600 }, { x: 460, y: 560 },
  { x: 300, y: 600 }, { x: 140, y: 560 }, { x: 80, y: 280 }, { x: 20, y: 280 },
  { x: 480, y: 140 }, { x: 560, y: 140 }, { x: 640, y: 200 }, { x: 720, y: 200 },
  { x: 640, y: 280 }, { x: 560, y: 360 }, { x: 480, y: 360 }, { x: 400, y: 440 },
  { x: 320, y: 360 }, { x: 240, y: 360 }, { x: 800, y: 280 }, { x: 720, y: 280 },
  { x: 720, y: 360 }, { x: 800, y: 440 }, { x: 900, y: 360 }, { x: 980, y: 280 },
  { x: 140, y: 220 }, { x: 200, y: 280 }, { x: 240, y: 280 }, { x: 320, y: 200 },
];

// Pulse configurations — each pulse travels along one path with a delay
const PULSES = CIRCUIT_PATHS.map((_, i) => ({
  pathIndex: i,
  duration: 3 + (i % 7) * 0.8,  // 3–8.6s per pulse
  delay: (i * 0.4) % 6,           // staggered starts
  color: i % 5 === 0 ? "rgba(248,113,113,1.0)"   // bright red accent every 5th
       : i % 7 === 0 ? "rgba(251,191,36,1.0)"    // bright gold accent every 7th
       : "rgba(147,197,253,1.0)",                 // bright blue default
  size: i % 3 === 0 ? 5 : 4,
}));

export function AnimatedCircuitBackground() {
  const containerRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    // Respect prefers-reduced-motion
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) return;
  }, []);

  return (
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    >
      <svg
        ref={containerRef}
        width="100%"
        height="100%"
        viewBox="0 0 1080 660"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Glow filter for pulses */}
          <filter id="circuit-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* Subtle glow for nodes */}
          <filter id="node-glow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* Define each circuit path for animateMotion */}
          {CIRCUIT_PATHS.map((d, i) => (
            <path key={`def-${i}`} id={`circuit-path-${i}`} d={d} />
          ))}
        </defs>

        {/* Static circuit lines */}
        <g opacity="0.40">
          {CIRCUIT_PATHS.map((d, i) => (
            <path
              key={`line-${i}`}
              d={d}
              fill="none"
              stroke={i % 9 === 0 ? "#f87171" : i % 13 === 0 ? "#fbbf24" : "#60a5fa"}
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        </g>

        {/* Junction nodes */}
        <g opacity="0.55" filter="url(#node-glow)">
          {NODES.map((n, i) => (
            <circle
              key={`node-${i}`}
              cx={n.x}
              cy={n.y}
              r={i % 4 === 0 ? 3.5 : 2.2}
              fill={i % 6 === 0 ? "#f87171" : "#93c5fd"}
            />
          ))}
        </g>

        {/* Animated light pulses */}
        {PULSES.map((pulse, i) => (
          <circle
            key={`pulse-${i}`}
            r={pulse.size}
            fill={pulse.color}
            filter="url(#circuit-glow)"
            opacity="0"
          >
            <animateMotion
              dur={`${pulse.duration}s`}
              begin={`${pulse.delay}s`}
              repeatCount="indefinite"
              rotate="auto"
            >
              <mpath href={`#circuit-path-${pulse.pathIndex}`} />
            </animateMotion>
            {/* Fade in at start, fade out at end */}
            <animate
              attributeName="opacity"
              values="0;0.9;0.9;0"
              keyTimes="0;0.08;0.88;1"
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
