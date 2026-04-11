import { useEffect, useRef } from "react";

interface StarConfig {
  x1: number;   // start x (%)
  y1: number;   // start y (%)
  angle: number; // degrees below horizontal
  length: number; // tail length (% of diagonal)
  duration: number; // ms
}

function randomStar(): StarConfig {
  const angle = 18 + Math.random() * 28; // 18–46 degrees
  const fromTop = Math.random() < 0.65;
  const x1 = fromTop ? 5 + Math.random() * 75 : Math.random() * 15;
  const y1 = fromTop ? Math.random() * 25 : 5 + Math.random() * 45;
  return {
    x1,
    y1,
    angle,
    length: 14 + Math.random() * 16,
    duration: 850 + Math.random() * 550,
  };
}

export function ShootingStar() {
  const containerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function scheduleNext() {
      const delay = 20_000 + Math.random() * 13_000;
      timeoutRef.current = setTimeout(fire, delay);
    }

    function fire() {
      const container = containerRef.current;
      if (!container) { scheduleNext(); return; }

      const star = randomStar();
      const rad = (star.angle * Math.PI) / 180;
      const dx = Math.cos(rad) * star.length;
      const dy = Math.sin(rad) * star.length;
      const x2 = star.x1 + dx;
      const y2 = star.y1 + dy;

      // Build SVG element
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("viewBox", "0 0 100 100");
      svg.setAttribute("preserveAspectRatio", "xMidYMid slice");
      svg.style.cssText = "position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:hidden;";

      const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");

      // Gradient: transparent tail → bright head
      const grad = document.createElementNS("http://www.w3.org/2000/svg", "linearGradient");
      const gradId = `sg-${Date.now()}`;
      grad.setAttribute("id", gradId);
      grad.setAttribute("gradientUnits", "userSpaceOnUse");
      grad.setAttribute("x1", `${star.x1}`);
      grad.setAttribute("y1", `${star.y1}`);
      grad.setAttribute("x2", `${x2}`);
      grad.setAttribute("y2", `${y2}`);

      const stop1 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
      stop1.setAttribute("offset", "0%");
      stop1.setAttribute("stop-color", "white");
      stop1.setAttribute("stop-opacity", "0");

      const stop2 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
      stop2.setAttribute("offset", "75%");
      stop2.setAttribute("stop-color", "#b8e0ff");
      stop2.setAttribute("stop-opacity", "0.7");

      const stop3 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
      stop3.setAttribute("offset", "100%");
      stop3.setAttribute("stop-color", "white");
      stop3.setAttribute("stop-opacity", "1");

      grad.appendChild(stop1);
      grad.appendChild(stop2);
      grad.appendChild(stop3);
      defs.appendChild(grad);
      svg.appendChild(defs);

      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", `${star.x1}`);
      line.setAttribute("y1", `${star.y1}`);
      line.setAttribute("x2", `${x2}`);
      line.setAttribute("y2", `${y2}`);
      line.setAttribute("stroke", `url(#${gradId})`);
      line.setAttribute("stroke-width", "0.35");
      line.setAttribute("stroke-linecap", "round");

      // Compute pixel length for dashoffset animation
      const w = container.clientWidth || 900;
      const h = container.clientHeight || 500;
      const pxLen = Math.sqrt(
        ((dx / 100) * w) ** 2 + ((dy / 100) * h) ** 2
      );
      line.setAttribute("stroke-dasharray", `${pxLen}`);
      line.setAttribute("stroke-dashoffset", `${pxLen}`);

      svg.appendChild(line);
      container.appendChild(svg);

      const anim = line.animate(
        [
          { strokeDashoffset: pxLen, opacity: 0 },
          { strokeDashoffset: pxLen * 0.25, opacity: 1, offset: 0.12 },
          { strokeDashoffset: 0, opacity: 0.85, offset: 0.65 },
          { strokeDashoffset: 0, opacity: 0 },
        ],
        { duration: star.duration, easing: "ease-in", fill: "forwards" }
      );

      anim.onfinish = () => {
        svg.remove();
        scheduleNext();
      };
    }

    // First shot after a short random warm-up so it doesn't fire on load
    timeoutRef.current = setTimeout(fire, 5_000 + Math.random() * 7_000);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 2,
        overflow: "hidden",
      }}
    />
  );
}
