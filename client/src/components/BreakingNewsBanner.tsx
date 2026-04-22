import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { X } from "lucide-react";

export default function BreakingNewsBanner() {
  const { data: referendums = [] } = trpc.referendum.list.useQuery(undefined, {
    refetchInterval: 10_000,
    refetchIntervalInBackground: true,
  });

  const [dismissed, setDismissed] = useState(false);
  const [visible, setVisible] = useState(false);

  const calledReferendums = referendums.filter(
    (r) => r.status === "Called" && r.calledResult
  );

  useEffect(() => {
    if (calledReferendums.length > 0 && !dismissed) {
      // Small delay for dramatic entrance
      const t = setTimeout(() => setVisible(true), 300);
      return () => clearTimeout(t);
    }
  }, [calledReferendums.length, dismissed]);

  if (calledReferendums.length === 0 || dismissed || !visible) return null;

  // Show the most recently called one
  const ref = calledReferendums[calledReferendums.length - 1];
  const isYes = ref.calledResult === "Yes";

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{
        animation: "breakingSlideDown 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards",
      }}
    >
      {/* Animated background */}
      <div
        className={`relative flex items-center justify-between px-4 py-2.5 ${
          isYes
            ? "bg-gradient-to-r from-green-900 via-green-800 to-emerald-900"
            : "bg-gradient-to-r from-red-900 via-red-800 to-rose-900"
        }`}
      >
        {/* Shimmer sweep */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 50%, transparent 100%)",
            animation: "shimmerSweep 2.5s ease-in-out infinite",
          }}
        />

        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* BREAKING badge */}
          <span
            className="flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded text-xs font-black tracking-widest uppercase text-white"
            style={{
              background: "rgba(255,255,255,0.2)",
              animation: "pulseBadge 1.2s ease-in-out infinite",
            }}
          >
            ⚡ CALLED
          </span>

          {/* Main message */}
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-white font-bold text-sm truncate">
              {ref.stateName} — {ref.name}
            </span>
            <span
              className={`flex-shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-black ${
                isYes
                  ? "bg-green-400 text-green-950"
                  : "bg-red-400 text-red-950"
              }`}
            >
              {ref.calledResult === "Yes"
                ? `✓ ${ref.yesLabel || "YES PASSES"}`
                : `✗ ${ref.noLabel || "NO WINS"}`}
            </span>
            <span className="flex-shrink-0 text-white/70 text-xs">
              {Number(ref.yesVotes).toLocaleString()} Yes /{" "}
              {Number(ref.noVotes).toLocaleString()} No ·{" "}
              {parseFloat(String(ref.pctReporting)).toFixed(0)}% reporting
            </span>
          </div>
        </div>

        {/* Dismiss button */}
        <button
          onClick={() => setDismissed(true)}
          className="flex-shrink-0 ml-3 p-1 rounded hover:bg-white/20 transition-colors text-white/70 hover:text-white"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <style>{`
        @keyframes breakingSlideDown {
          from { transform: translateY(-100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes shimmerSweep {
          0% { transform: translateX(-100%); }
          60% { transform: translateX(100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes pulseBadge {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}
