import { trpc } from "@/lib/trpc";
import { useElectionSocket } from "@/contexts/ElectionSocketContext";
import { useEffect } from "react";

const RATING_COLORS: Record<string, string> = {
  "Toss-up": "bg-yellow-500/20 text-yellow-300 border-yellow-500/40",
  "Lean D": "bg-blue-500/20 text-blue-300 border-blue-500/40",
  "Lean R": "bg-red-500/20 text-red-300 border-red-500/40",
};

const PARTY_DOT: Record<string, string> = {
  D: "bg-blue-500",
  R: "bg-red-500",
  I: "bg-gray-500",
};

type KeyRace = {
  id: number;
  chamber: "senate" | "house";
  stateCode: string;
  stateName: string;
  district?: number | null;
  districtLabel?: string | null;
  rating: string | null;
  incumbent: string | null;
  incumbentParty: string | null;
  candidate1Name: string | null;
  candidate1Party: string | null;
  candidate2Name: string | null;
  candidate2Party: string | null;
  status: string | null;
  calledParty: string | null;
  calledWinner: string | null;
  generalDate: string | null;
};

function KeyRaceCard({ race }: { race: KeyRace }) {
  const isCalled = race.status === "Called" || race.status === "Certified";
  const ratingClass = race.rating ? RATING_COLORS[race.rating] ?? "bg-gray-700/40 text-gray-300 border-gray-600/40" : "";
  const label =
    race.chamber === "house" && race.district != null
      ? `${race.stateCode}-${race.district}`
      : race.stateName;

  // Determine D and R candidates from candidate1/candidate2 fields
  let dCandidate: string | null = null;
  let rCandidate: string | null = null;
  if (race.candidate1Party === "D") dCandidate = race.candidate1Name;
  else if (race.candidate2Party === "D") dCandidate = race.candidate2Name;
  if (race.candidate1Party === "R") rCandidate = race.candidate1Name;
  else if (race.candidate2Party === "R") rCandidate = race.candidate2Name;

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-md border transition-colors ${
        isCalled
          ? "bg-muted/20 border-border/30 opacity-70"
          : "bg-muted/30 border-border/50 hover:bg-muted/50"
      }`}
    >
      {/* Rating badge */}
      <span
        className={`text-[9px] font-black tracking-wider px-1.5 py-0.5 rounded border flex-shrink-0 ${ratingClass}`}
      >
        {race.rating ?? "?"}
      </span>

      {/* Location */}
      <span className="text-xs font-bold text-foreground w-14 flex-shrink-0">{label}</span>

      {/* Candidates */}
      <div className="flex items-center gap-1 flex-1 min-w-0">
        {isCalled ? (
          <div className="flex items-center gap-1">
            <span
              className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                race.calledParty === "D"
                  ? "bg-blue-400"
                  : race.calledParty === "R"
                  ? "bg-red-400"
                  : "bg-gray-400"
              }`}
            />
            <span className="text-xs font-bold text-foreground truncate">{race.calledWinner}</span>
            <span className="text-[10px] text-muted-foreground ml-0.5">✓ Called</span>
          </div>
        ) : (
          <>
            {dCandidate && (
              <div className="flex items-center gap-0.5 min-w-0">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                <span className="text-[10px] text-blue-300 truncate">{dCandidate}</span>
              </div>
            )}
            {dCandidate && rCandidate && (
              <span className="text-muted-foreground/40 text-[10px] flex-shrink-0">vs</span>
            )}
            {rCandidate && (
              <div className="flex items-center gap-0.5 min-w-0">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                <span className="text-[10px] text-red-300 truncate">{rCandidate}</span>
              </div>
            )}
            {!dCandidate && !rCandidate && race.incumbent && (
              <span className="text-[10px] text-muted-foreground truncate">
                {race.incumbent}
                {race.incumbentParty && (
                  <span className={`ml-1 ${race.incumbentParty === "D" ? "text-blue-400" : "text-red-400"}`}>
                    ({race.incumbentParty})
                  </span>
                )}
              </span>
            )}
          </>
        )}
      </div>

      {/* Incumbent party dot (right side) */}
      {race.incumbentParty && !isCalled && (
        <span
          className={`w-2 h-2 rounded-full flex-shrink-0 ${PARTY_DOT[race.incumbentParty] ?? "bg-gray-500"}`}
          title={`Incumbent: ${race.incumbentParty}`}
        />
      )}
    </div>
  );
}

export default function KeyRaces() {
  const { lastEvent } = useElectionSocket();

  const { data, isLoading, refetch } = trpc.keyRaces.get.useQuery(undefined, {
    refetchInterval: 30_000,
  });

  // Instantly refetch when a race is called via WebSocket
  useEffect(() => {
    if (lastEvent?.type === "race_called") {
      refetch();
    }
  }, [lastEvent, refetch]);

  if (isLoading) {
    return (
      <div className="space-y-1.5">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-8 bg-muted/30 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  const senate = data?.senate ?? [];
  const house = data?.house ?? [];
  const total = senate.length + house.length;

  if (total === 0) {
    return (
      <div className="text-xs text-muted-foreground text-center py-4">
        No competitive races found. Ratings will appear as the election approaches.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {senate.length > 0 && (
        <div>
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 inline-block" />
            Senate ({senate.length})
          </div>
          <div className="space-y-1">
            {senate.map(r => (
              <KeyRaceCard key={`senate-${r.id}`} race={r} />
            ))}
          </div>
        </div>
      )}

      {senate.length > 0 && house.length > 0 && (
        <div className="h-px bg-border/40" />
      )}

      {house.length > 0 && (
        <div>
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 inline-block" />
            House ({house.length})
          </div>
          <div className="space-y-1">
            {house.map(r => (
              <KeyRaceCard key={`house-${r.id}`} race={r} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
