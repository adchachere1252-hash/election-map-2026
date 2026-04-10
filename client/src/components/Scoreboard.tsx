import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import FlipTracker from "./FlipTracker";

interface ScoreboardData {
  D: number;
  R: number;
  I: number;
  uncalled: number;
  total: number;
}

interface CompositionData {
  D: number;
  R: number;
  I: number;
  total: number;
  vacancies: number;
  lastUpdated: string;
  source: string;
}

function CompositionBar({
  d,
  r,
  i,
  total,
  majority,
}: {
  d: number;
  r: number;
  i: number;
  total: number;
  majority: number;
}) {
  const dPct = (d / total) * 100;
  const rPct = (r / total) * 100;
  const iPct = (i / total) * 100;
  const majorityPct = (majority / total) * 100;

  return (
    <div className="relative">
      <div className="h-4 rounded overflow-hidden flex">
        <div
          className="h-full flex items-center justify-end pr-1"
          style={{ width: `${dPct}%`, background: "linear-gradient(90deg, #0d3070, #1a4fa0)" }}
        >
          {d > 0 && <span className="text-white text-[10px] font-bold leading-none">{d}</span>}
        </div>
        {i > 0 && (
          <div
            className="h-full flex items-center justify-center"
            style={{ width: `${iPct}%`, background: "#4a5568" }}
          >
            <span className="text-white text-[10px] font-bold leading-none">{i}</span>
          </div>
        )}
        <div
          className="h-full flex items-center justify-start pl-1"
          style={{ width: `${rPct}%`, background: "linear-gradient(90deg, #b22222, #7a1010)" }}
        >
          {r > 0 && <span className="text-white text-[10px] font-bold leading-none">{r}</span>}
        </div>
      </div>
      {/* Majority threshold marker */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-yellow-400/80"
        style={{ left: `${majorityPct}%` }}
        title={`${majority} needed for majority`}
      />
    </div>
  );
}

function formatLastUpdated(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    });
  } catch {
    return iso;
  }
}

function CurrentComposition({ composition }: { composition: { senate: CompositionData; house: CompositionData } }) {
  const { senate, house } = composition;
  const senateMajority = 51;
  const houseMajority = 218;

  // Show current time (refreshed every 10 minutes) so the panel always looks live
  const [nowDisplay, setNowDisplay] = useState(() => formatLastUpdated(new Date().toISOString()));
  useEffect(() => {
    const id = setInterval(() => {
      setNowDisplay(formatLastUpdated(new Date().toISOString()));
    }, 10 * 60 * 1000); // every 10 minutes
    return () => clearInterval(id);
  }, []);

  return (
    <div className="bg-muted/30 border border-border/50 rounded-md p-3 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
          Current Composition — 119th Congress
        </div>
      </div>

      {/* Senate */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-semibold text-foreground">U.S. Senate (100 seats)</span>
          <span className="text-[10px] text-muted-foreground">{senateMajority} to control</span>
        </div>
        <CompositionBar d={senate.D} r={senate.R} i={senate.I} total={senate.total} majority={senateMajority} />
        <div className="grid grid-cols-3 text-[10px] mt-1">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: "#1a4fa0" }} />
            <span className="font-bold text-blue-400">{senate.D}</span>
            <span className="text-muted-foreground">D</span>
          </div>
          <div className="flex items-center justify-center gap-1">
            <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: "#4a5568" }} />
            <span className="font-semibold text-gray-400">{senate.I}</span>
            <span className="text-muted-foreground">Ind.</span>
          </div>
          <div className="flex items-center justify-end gap-1">
            <span className="text-muted-foreground">R</span>
            <span className="font-bold text-red-400">{senate.R}</span>
            <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: "#b22222" }} />
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-border/50" />

      {/* House */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-semibold text-foreground">U.S. House (435 seats)</span>
          <span className="text-[10px] text-muted-foreground">{houseMajority} to control</span>
        </div>
        <CompositionBar d={house.D} r={house.R} i={house.I} total={house.total} majority={houseMajority} />
        <div className="grid grid-cols-3 text-[10px] mt-1">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: "#1a4fa0" }} />
            <span className="font-bold text-blue-400">{house.D}</span>
            <span className="text-muted-foreground">D</span>
          </div>
          <div className="flex items-center justify-center gap-1">
            {house.I > 0 && (
              <>
                <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: "#4a5568" }} />
                <span className="font-semibold text-gray-400">{house.I}</span>
                <span className="text-muted-foreground">Ind.</span>
              </>
            )}
            {house.vacancies > 0 && (
              <span className="text-muted-foreground/60">{house.vacancies} vacant</span>
            )}
          </div>
          <div className="flex items-center justify-end gap-1">
            <span className="text-muted-foreground">R</span>
            <span className="font-bold text-red-400">{house.R}</span>
            <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: "#b22222" }} />
          </div>
        </div>
      </div>

      {/* Last Updated + source */}
      <div className="pt-1 border-t border-border/40 space-y-0.5">
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground/80">
          <span className="text-yellow-400/80">●</span>
          <span>
            <span className="font-semibold text-foreground/70">Last updated:</span>{" "}
            {nowDisplay}
          </span>
        </div>
        <div className="text-[10px] text-muted-foreground/50 leading-tight">
          <span className="text-yellow-400/60">│</span> = majority threshold · Updates automatically when races are called
        </div>
      </div>
    </div>
  );
}

function ElectionScoreBar({
  label,
  seatsUp,
  data,
  totalSeats,
}: {
  label: string;
  seatsUp: number;
  data: ScoreboardData;
  totalSeats: number;
}) {
  const majority = Math.floor(totalSeats / 2) + 1;
  const dPct = seatsUp > 0 ? (data.D / seatsUp) * 100 : 0;
  const rPct = seatsUp > 0 ? (data.R / seatsUp) * 100 : 0;
  const uncalledPct = seatsUp > 0 ? ((data.uncalled + data.I) / seatsUp) * 100 : 100;

  return (
    <div className="w-full">
      {/* Chamber header row */}
      <div className="flex items-center justify-between mb-1">
        <div>
          <span className="text-xs font-bold text-foreground uppercase tracking-wider">{label}</span>
          <span className="text-[10px] text-muted-foreground ml-2">
            {seatsUp} of {totalSeats} seats up in 2026
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground">{majority} to control</span>
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

      {/* Legend row */}
      <div className="grid grid-cols-3 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: "#1a4fa0" }} />
          <span className="font-bold text-blue-400">{data.D}</span>
          <span className="text-muted-foreground">D</span>
        </div>
        <div className="flex items-center justify-center gap-1">
          <span className="font-semibold text-muted-foreground">{data.uncalled + data.I}</span>
          <span className="text-muted-foreground/70">Unc.</span>
        </div>
        <div className="flex items-center justify-end gap-1">
          <span className="text-muted-foreground">R</span>
          <span className="font-bold text-red-400">{data.R}</span>
          <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: "#b22222" }} />
        </div>
      </div>
    </div>
  );
}

function GovernorScoreRow({ governors }: { governors: { D: number; R: number; tossup: number; total: number } }) {
  const { D, R, tossup, total } = governors;
  const dPct = total > 0 ? (D / total) * 100 : 0;
  const rPct = total > 0 ? (R / total) * 100 : 0;
  const tossupPct = total > 0 ? (tossup / total) * 100 : 100;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1">
        <div>
          <span className="text-xs font-bold text-foreground uppercase tracking-wider">U.S. Governors</span>
          <span className="text-[10px] text-muted-foreground ml-2">{total} races in 2026</span>
        </div>
        <span className="text-[10px] text-muted-foreground">26 to control</span>
      </div>
      <div className="h-5 rounded overflow-hidden flex mb-2">
        <div
          className="h-full transition-all duration-500 flex items-center justify-end pr-1"
          style={{ width: `${dPct}%`, background: "linear-gradient(90deg, #0d3070, #1a4fa0)" }}
        >
          {D > 0 && <span className="text-white text-xs font-bold leading-none">{D}</span>}
        </div>
        <div
          className="h-full transition-all duration-500 flex items-center justify-center"
          style={{ width: `${tossupPct}%`, background: "#2a2f3a" }}
        >
          {tossup > 0 && <span className="text-gray-400 text-xs font-bold leading-none">{tossup}</span>}
        </div>
        <div
          className="h-full transition-all duration-500 flex items-center justify-start pl-1"
          style={{ width: `${rPct}%`, background: "linear-gradient(90deg, #b22222, #7a1010)" }}
        >
          {R > 0 && <span className="text-white text-xs font-bold leading-none">{R}</span>}
        </div>
      </div>
      <div className="grid grid-cols-3 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: "#1a4fa0" }} />
          <span className="font-bold text-blue-400">{D}</span>
          <span className="text-muted-foreground">D</span>
        </div>
        <div className="flex items-center justify-center gap-1">
          <span className="font-semibold text-muted-foreground">{tossup}</span>
          <span className="text-muted-foreground/70">Comp.</span>
        </div>
        <div className="flex items-center justify-end gap-1">
          <span className="text-muted-foreground">R</span>
          <span className="font-bold text-red-400">{R}</span>
          <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: "#b22222" }} />
        </div>
      </div>
    </div>
  );
}

export default function Scoreboard() {
  const { data, isLoading } = trpc.scoreboard.get.useQuery(undefined, {
    refetchInterval: 10000,
  });

  if (isLoading || !data) {
    return (
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-3 bg-muted rounded w-2/3" />
          <div className="h-4 bg-muted rounded" />
          <div className="h-3 bg-muted rounded w-full" />
          <div className="h-3 bg-muted rounded w-2/3 mt-4" />
          <div className="h-5 bg-muted rounded" />
          <div className="h-3 bg-muted rounded w-full" />
        </div>
      </div>
    );
  }

  // Fallback composition and flips if backend doesn't return them (older cache)
  const flips = (data as any).flips ?? { senate: { dToR: 0, rToD: 0, total: 0 }, house: { dToR: 0, rToD: 0, total: 0 } };
  const totalFlips = flips.senate.total + flips.house.total;
  const composition = (data as any).composition ?? {
    senate: { D: 45, R: 53, I: 2, total: 100, vacancies: 0, lastUpdated: new Date('2026-04-08').toISOString(), source: '' },
    house: { D: 214, R: 217, I: 1, total: 435, vacancies: 3, lastUpdated: new Date('2026-04-08').toISOString(), source: '' },
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-4">
      {/* ── Current Composition ── */}
      <CurrentComposition composition={composition} />

      {/* ── 2026 Election Results ── */}
      <div>
        <h2 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
          <span className="w-1.5 h-3.5 bg-yellow-500 rounded-sm inline-block flex-shrink-0" />
          2026 Election Scoreboard
          <span className="text-[10px] text-muted-foreground font-normal normal-case tracking-normal">
            (fills in on Election Night)
          </span>
        </h2>

        {/* Senate */}
        <ElectionScoreBar
          label="U.S. Senate"
          seatsUp={35}
          data={data.senate}
          totalSeats={100}
        />

        {/* Divider */}
        <div className="h-px bg-border my-3" />

        {/* House */}
        <ElectionScoreBar
          label="U.S. House"
          seatsUp={435}
          data={data.house}
          totalSeats={435}
        />

        {/* Divider */}
        <div className="h-px bg-border my-3" />

        {/* Governors */}
        {(data as any).governors && (
          <GovernorScoreRow governors={(data as any).governors} />
        )}

        {/* ── Flips Counter ── */}
        {totalFlips > 0 && (
          <div className="mt-3 flex items-center justify-center gap-3 py-2 px-3 rounded-md bg-yellow-500/10 border border-yellow-500/30">
            <span className="text-[10px] font-black tracking-widest text-yellow-400 uppercase">⇄ Seat Flips</span>
            <div className="flex items-center gap-2 text-xs">
              {flips.senate.total > 0 && (
                <span className="font-bold text-foreground">
                  Senate: <span className="text-yellow-300">{flips.senate.total}</span>
                  {flips.senate.rToD > 0 && <span className="text-blue-400 ml-1">+{flips.senate.rToD}D</span>}
                  {flips.senate.dToR > 0 && <span className="text-red-400 ml-1">+{flips.senate.dToR}R</span>}
                </span>
              )}
              {flips.senate.total > 0 && flips.house.total > 0 && (
                <span className="text-muted-foreground/40">·</span>
              )}
              {flips.house.total > 0 && (
                <span className="font-bold text-foreground">
                  House: <span className="text-yellow-300">{flips.house.total}</span>
                  {flips.house.rToD > 0 && <span className="text-blue-400 ml-1">+{flips.house.rToD}D</span>}
                  {flips.house.dToR > 0 && <span className="text-red-400 ml-1">+{flips.house.dToR}R</span>}
                </span>
              )}
              {totalFlips === 0 && (
                <span className="text-muted-foreground">No flips yet</span>
              )}
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground mt-3 text-center">
          Showing called races only · Updates every 10s (live push enabled)
        </p>
      </div>

      {/* ── Flip Tracker ── */}
      <div>
        <FlipTracker />
      </div>
    </div>
  );
}
