import { trpc } from "@/lib/trpc";
import FlipTracker from "./FlipTracker";

interface ScoreboardData {
  D: number;
  R: number;
  I: number;
  uncalled: number;
  total: number;
}

function ChamberScore({
  label,
  data,
  totalSeats,
}: {
  label: string;
  data: ScoreboardData;
  totalSeats: number;
}) {
  const majority = Math.floor(totalSeats / 2) + 1;
  const dPct = totalSeats > 0 ? (data.D / totalSeats) * 100 : 0;
  const rPct = totalSeats > 0 ? (data.R / totalSeats) * 100 : 0;
  const uncalledPct = totalSeats > 0 ? ((data.uncalled + data.I) / totalSeats) * 100 : 100;

  return (
    <div className="w-full">
      {/* Chamber header row */}
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-bold text-foreground uppercase tracking-wider">
          {label}
        </span>
        <span className="text-xs text-muted-foreground">{majority} to control</span>
      </div>

      {/* Seat progress bar */}
      <div className="h-5 rounded overflow-hidden flex mb-2">
        <div
          className="h-full transition-all duration-500 flex items-center justify-end pr-1"
          style={{ width: `${dPct}%`, background: "linear-gradient(90deg, #0d3070, #1a4fa0)" }}
        >
          {data.D > 0 && (
            <span className="text-white text-xs font-bold leading-none">{data.D}</span>
          )}
        </div>
        <div
          className="h-full transition-all duration-500 flex items-center justify-center"
          style={{ width: `${uncalledPct}%`, background: "#2a2f3a" }}
        >
          {data.uncalled + data.I > 0 && (
            <span className="text-gray-400 text-xs font-bold leading-none">
              {data.uncalled + data.I}
            </span>
          )}
        </div>
        <div
          className="h-full transition-all duration-500 flex items-center justify-start pl-1"
          style={{ width: `${rPct}%`, background: "linear-gradient(90deg, #b22222, #7a1010)" }}
        >
          {data.R > 0 && (
            <span className="text-white text-xs font-bold leading-none">{data.R}</span>
          )}
        </div>
      </div>

      {/* Legend row — three columns with fixed widths */}
      <div className="grid grid-cols-3 text-xs">
        {/* Democrat */}
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: "#1a4fa0" }} />
          <span className="font-bold text-blue-400">{data.D}</span>
          <span className="text-muted-foreground">D</span>
        </div>
        {/* Uncalled — centered */}
        <div className="flex items-center justify-center gap-1">
          <span className="font-semibold text-muted-foreground">{data.uncalled + data.I}</span>
          <span className="text-muted-foreground/70">Unc.</span>
        </div>
        {/* Republican — right-aligned */}
        <div className="flex items-center justify-end gap-1">
          <span className="text-muted-foreground">R</span>
          <span className="font-bold text-red-400">{data.R}</span>
          <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: "#b22222" }} />
        </div>
      </div>
    </div>
  );
}

export default function Scoreboard() {
  const { data, isLoading } = trpc.scoreboard.get.useQuery(undefined, {
    refetchInterval: 30000,
  });

  if (isLoading || !data) {
    return (
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-3 bg-muted rounded w-2/3" />
          <div className="h-5 bg-muted rounded" />
          <div className="h-3 bg-muted rounded w-full" />
          <div className="h-3 bg-muted rounded w-2/3 mt-4" />
          <div className="h-5 bg-muted rounded" />
          <div className="h-3 bg-muted rounded w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <h2 className="text-xs font-bold text-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
        <span className="w-1.5 h-3.5 bg-blue-500 rounded-sm inline-block flex-shrink-0" />
        2026 Election Scoreboard
      </h2>

      {/* Senate */}
      <ChamberScore label="U.S. Senate" data={data.senate} totalSeats={35} />

      {/* Divider */}
      <div className="h-px bg-border my-3" />

      {/* House */}
      <ChamberScore label="U.S. House" data={data.house} totalSeats={435} />

      <p className="text-xs text-muted-foreground mt-3 text-center">
        Showing called races only · Updates every 30s
      </p>

      <div className="mt-3">
        <FlipTracker />
      </div>
    </div>
  );
}
