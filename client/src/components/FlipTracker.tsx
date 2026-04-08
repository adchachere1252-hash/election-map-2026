import { trpc } from "@/lib/trpc";
import { TrendingUp, TrendingDown, Minus, ArrowRightLeft } from "lucide-react";

interface FlipEntry {
  id: number;
  stateName: string;
  stateCode: string;
  calledParty: string | null;
  previousParty: string | null;
  calledWinner: string | null;
  status: string | null;
  districtLabel?: string | null;
}

interface ChamberFlips {
  dToR: FlipEntry[];
  rToD: FlipEntry[];
  netD: number;
  netR: number;
}

interface FlipTrackerProps {
  className?: string;
}

function NetBadge({ net, party }: { net: number; party: "D" | "R" }) {
  if (net === 0) {
    return (
      <span className="flex items-center gap-0.5 text-xs text-muted-foreground font-medium">
        <Minus className="w-3 h-3" /> 0
      </span>
    );
  }
  const isGain = net > 0;
  const color = party === "D"
    ? isGain ? "text-blue-400" : "text-red-400"
    : isGain ? "text-red-400" : "text-blue-400";
  const Icon = isGain ? TrendingUp : TrendingDown;
  return (
    <span className={`flex items-center gap-0.5 text-xs font-bold ${color}`}>
      <Icon className="w-3 h-3" />
      {isGain ? "+" : ""}{net}
    </span>
  );
}

function FlipList({ flips, direction }: { flips: FlipEntry[]; direction: "dToR" | "rToD" }) {
  if (flips.length === 0) return null;
  const fromColor = direction === "dToR" ? "#3b82f6" : "#ef4444";
  const toColor = direction === "dToR" ? "#ef4444" : "#3b82f6";
  const fromLabel = direction === "dToR" ? "D" : "R";
  const toLabel = direction === "dToR" ? "R" : "D";

  return (
    <div className="mt-1">
      <div className="flex items-center gap-1 mb-1">
        <span className="text-xs font-bold px-1 rounded" style={{ background: fromColor, color: "#fff" }}>{fromLabel}</span>
        <ArrowRightLeft className="w-2.5 h-2.5 text-muted-foreground" />
        <span className="text-xs font-bold px-1 rounded" style={{ background: toColor, color: "#fff" }}>{toLabel}</span>
        <span className="text-xs text-muted-foreground ml-1">{flips.length} seat{flips.length !== 1 ? "s" : ""}</span>
      </div>
      <div className="flex flex-wrap gap-1">
        {flips.map(f => (
          <span
            key={f.id}
            className="text-xs px-1.5 py-0.5 rounded bg-muted/30 text-foreground border border-border/50"
            title={f.calledWinner ? `${f.calledWinner} (${f.calledParty})` : undefined}
          >
            {f.stateCode}{f.districtLabel ? `-${f.districtLabel}` : ""}
          </span>
        ))}
      </div>
    </div>
  );
}

function ChamberFlipSection({ label, data }: { label: string; data: ChamberFlips }) {
  const totalFlips = data.dToR.length + data.rToD.length;
  return (
    <div className="px-3 py-2 border-b border-border/50 last:border-0">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
        {totalFlips === 0 ? (
          <span className="text-xs text-muted-foreground">No flips yet</span>
        ) : (
          <span className="text-xs text-muted-foreground">{totalFlips} flip{totalFlips !== 1 ? "s" : ""}</span>
        )}
      </div>

      {totalFlips === 0 ? (
        <p className="text-xs text-muted-foreground/60 italic">Awaiting called results</p>
      ) : (
        <>
          <div className="flex items-center gap-4 mb-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Dem net:</span>
              <NetBadge net={data.netD} party="D" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Rep net:</span>
              <NetBadge net={data.netR} party="R" />
            </div>
          </div>
          <FlipList flips={data.rToD} direction="rToD" />
          <FlipList flips={data.dToR} direction="dToR" />
        </>
      )}
    </div>
  );
}

export default function FlipTracker({ className = "" }: FlipTrackerProps) {
  const { data, isLoading } = trpc.flips.get.useQuery(undefined, {
    refetchInterval: 10_000,
  });

  return (
    <div className={`border border-border rounded-lg bg-card overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-3 py-2 bg-muted/20 border-b border-border flex items-center gap-2">
        <ArrowRightLeft className="w-3.5 h-3.5 text-yellow-400" />
        <span className="text-xs font-bold text-foreground uppercase tracking-wider">Flip Tracker</span>
        <span className="ml-auto text-xs text-muted-foreground">Party changes</span>
      </div>

      {isLoading ? (
        <div className="p-3 space-y-2">
          {[1, 2].map(i => (
            <div key={i} className="h-12 bg-muted/20 rounded animate-pulse" />
          ))}
        </div>
      ) : !data ? (
        <div className="p-3 text-xs text-muted-foreground text-center">Unable to load flip data</div>
      ) : (
        <>
          <ChamberFlipSection label="U.S. Senate" data={data.senate as ChamberFlips} />
          <ChamberFlipSection label="U.S. House" data={data.house as ChamberFlips} />
        </>
      )}
    </div>
  );
}
