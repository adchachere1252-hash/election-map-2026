import { trpc } from "@/lib/trpc";
import FlipTracker from "./FlipTracker";

interface ScoreboardData {
  D: number;
  R: number;
  I: number;
  uncalled: number;
  total: number;
}

function ChamberScore({ label, data, totalSeats }: { label: string; data: ScoreboardData; totalSeats: number }) {
  const majority = Math.floor(totalSeats / 2) + 1;
  const dPct = (data.D / totalSeats) * 100;
  const rPct = (data.R / totalSeats) * 100;
  const uncalledPct = ((data.uncalled + data.I) / totalSeats) * 100;

  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{label}</span>
        <span className="text-xs text-muted-foreground">{majority} to control</span>
      </div>

      {/* Seat bar */}
      <div className="h-6 rounded overflow-hidden flex mb-2">
        <div
          className="h-full transition-all duration-500 flex items-center justify-end pr-1"
          style={{ width: `${dPct}%`, background: "linear-gradient(90deg, #0d3070, #1a4fa0)" }}
        >
          {data.D > 0 && <span className="text-white text-xs font-bold">{data.D}</span>}
        </div>
        <div
          className="h-full transition-all duration-500 flex items-center justify-center"
          style={{ width: `${uncalledPct}%`, background: "#2a2f3a" }}
        >
          {(data.uncalled + data.I) > 0 && (
            <span className="text-gray-400 text-xs font-bold">{data.uncalled + data.I}</span>
          )}
        </div>
        <div
          className="h-full transition-all duration-500 flex items-center justify-start pl-1"
          style={{ width: `${rPct}%`, background: "linear-gradient(90deg, #b22222, #7a1010)" }}
        >
          {data.R > 0 && <span className="text-white text-xs font-bold">{data.R}</span>}
        </div>
      </div>

      {/* Labels */}
      <div className="flex justify-between text-xs">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-sm" style={{ background: "#1a4fa0" }} />
          <span className="font-bold text-blue-400">{data.D}</span>
          <span className="text-muted-foreground">Dem</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground">{data.uncalled + data.I}</span>
          <span className="text-muted-foreground">Uncalled</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground">Rep</span>
          <span className="font-bold text-red-400">{data.R}</span>
          <div className="w-2 h-2 rounded-sm" style={{ background: "#b22222" }} />
        </div>
      </div>
    </div>
  );
}

export default function Scoreboard() {
  const { data, isLoading } = trpc.scoreboard.get.useQuery(undefined, {
    refetchInterval: 30000, // refresh every 30s
  });

  if (isLoading || !data) {
    return (
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-muted rounded w-1/3" />
          <div className="h-6 bg-muted rounded" />
          <div className="h-4 bg-muted rounded w-1/3 mt-4" />
          <div className="h-6 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <h2 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
        <span className="w-1.5 h-4 bg-blue-500 rounded-sm inline-block" />
        2026 Election Scoreboard
      </h2>
      <div className="flex gap-6">
        <ChamberScore label="U.S. Senate" data={data.senate} totalSeats={35} />
        <div className="w-px bg-border" />
        <ChamberScore label="U.S. House" data={data.house} totalSeats={435} />
      </div>
      <p className="text-xs text-muted-foreground mt-3 text-center">
        Showing called races only · Updates every 30s
      </p>
      <div className="mt-3">
        <FlipTracker />
      </div>
    </div>
  );
}
