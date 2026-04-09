import { trpc } from "@/lib/trpc";
import { useElectionSocket } from "@/contexts/ElectionSocketContext";
import { useEffect, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const RATING_COLORS: Record<string, string> = {
  "Toss-up":  "bg-yellow-500/20 text-yellow-300 border-yellow-500/40",
  "Lean D":   "bg-blue-500/20 text-blue-300 border-blue-500/40",
  "Likely D": "bg-blue-600/20 text-blue-200 border-blue-600/40",
  "Lean R":   "bg-red-500/20 text-red-300 border-red-500/40",
  "Likely R": "bg-red-600/20 text-red-200 border-red-600/40",
};

const PARTY_BG: Record<string, string> = {
  D: "bg-blue-600",
  R: "bg-red-600",
  I: "bg-gray-600",
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
  candidate1Photo: string | null;
  candidate2Name: string | null;
  candidate2Party: string | null;
  candidate2Photo: string | null;
  partyLogos?: { D: string; R: string };
  status: string | null;
  calledParty: string | null;
  calledWinner: string | null;
  generalDate: string | null;
};

/** Circular candidate avatar: photo if available, else party-colored initial */
function CandidateAvatar({
  name,
  party,
  photo,
  size = "sm",
}: {
  name: string | null;
  party: string | null;
  photo: string | null;
  size?: "sm" | "md";
}) {
  const dim = size === "md" ? "w-8 h-8 text-sm" : "w-6 h-6 text-[9px]";
  const initial = name ? name.charAt(0).toUpperCase() : party ?? "?";
  const bg = party ? PARTY_BG[party] ?? "bg-gray-600" : "bg-gray-600";

  if (photo) {
    return (
      <img
        src={photo}
        alt={name ?? "candidate"}
        className={`${dim} rounded-full object-cover object-top flex-shrink-0 border-2 ${
          party === "D" ? "border-blue-500/60" : party === "R" ? "border-red-500/60" : "border-gray-500/60"
        }`}
        onError={(e) => {
          // Fallback to initial on broken image
          const target = e.currentTarget;
          target.style.display = "none";
          const sibling = target.nextElementSibling as HTMLElement | null;
          if (sibling) sibling.style.display = "flex";
        }}
      />
    );
  }

  return (
    <div
      className={`${dim} ${bg} rounded-full flex items-center justify-center flex-shrink-0 font-bold text-white border-2 ${
        party === "D" ? "border-blue-500/60" : party === "R" ? "border-red-500/60" : "border-gray-500/60"
      }`}
    >
      {initial}
    </div>
  );
}

function KeyRaceCard({ race }: { race: KeyRace }) {
  const isCalled = race.status === "Called" || race.status === "Certified";
  const ratingClass = race.rating
    ? RATING_COLORS[race.rating] ?? "bg-gray-700/40 text-gray-300 border-gray-600/40"
    : "";
  const label =
    race.chamber === "house" && race.district != null
      ? `${race.stateCode}-${race.district}`
      : race.stateName;

  // Resolve D and R candidates with photos
  let dCandidate: string | null = null;
  let dPhoto: string | null = null;
  let rCandidate: string | null = null;
  let rPhoto: string | null = null;

  if (race.candidate1Party === "D") {
    dCandidate = race.candidate1Name;
    dPhoto = race.candidate1Photo;
  } else if (race.candidate2Party === "D") {
    dCandidate = race.candidate2Name;
    dPhoto = race.candidate2Photo;
  }
  if (race.candidate1Party === "R") {
    rCandidate = race.candidate1Name;
    rPhoto = race.candidate1Photo;
  } else if (race.candidate2Party === "R") {
    rCandidate = race.candidate2Name;
    rPhoto = race.candidate2Photo;
  }

  // Fallback: if no candidate slots filled, show incumbent
  const showIncumbentFallback = !dCandidate && !rCandidate;

  return (
    <div
      className={`px-3 py-2 rounded-md border transition-colors ${
        isCalled
          ? "bg-muted/20 border-border/30 opacity-70"
          : "bg-muted/30 border-border/50 hover:bg-muted/50"
      }`}
    >
      {/* Top row: rating badge + location */}
      <div className="flex items-center gap-2 mb-1.5">
        <span
          className={`text-[9px] font-black tracking-wider px-1.5 py-0.5 rounded border flex-shrink-0 ${ratingClass}`}
        >
          {race.rating ?? "?"}
        </span>
        <span className="text-xs font-bold text-foreground flex-1 min-w-0 truncate">{label}</span>
        {race.chamber === "senate" && (
          <span className="text-[9px] text-muted-foreground/60 flex-shrink-0">SEN</span>
        )}
        {race.chamber === "house" && (
          <span className="text-[9px] text-muted-foreground/60 flex-shrink-0">HOR</span>
        )}
      </div>

      {/* Candidates row */}
      {isCalled ? (
        <div className="flex items-center gap-1.5">
          <CandidateAvatar
            name={race.calledWinner}
            party={race.calledParty}
            photo={
              race.calledParty === "D" ? dPhoto : race.calledParty === "R" ? rPhoto : null
            }
          />
          <div className="min-w-0">
            <span className="text-xs font-bold text-foreground truncate block">{race.calledWinner}</span>
            <span className="text-[9px] text-muted-foreground">✓ Called</span>
          </div>
        </div>
      ) : showIncumbentFallback ? (
        <div className="flex items-center gap-1.5">
          <CandidateAvatar
            name={race.incumbent}
            party={race.incumbentParty}
            photo={null}
          />
          <div className="min-w-0">
            <span className="text-[10px] text-muted-foreground truncate block">{race.incumbent}</span>
            <span className="text-[9px] text-muted-foreground/60">Incumbent · TBD challenger</span>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-1 w-full">
          {/* Democrat side */}
          <div className="flex items-center gap-1 flex-1 min-w-0">
            {dCandidate ? (
              <>
                <CandidateAvatar name={dCandidate} party="D" photo={dPhoto} />
                <span className="text-[10px] text-blue-300 truncate">{dCandidate}</span>
              </>
            ) : (
              <span className="text-[10px] text-muted-foreground/50 italic">TBD (D)</span>
            )}
          </div>

          {/* vs divider */}
          <span className="text-muted-foreground/40 text-[10px] flex-shrink-0 px-0.5">vs</span>

          {/* Republican side */}
          <div className="flex items-center gap-1 flex-1 min-w-0 justify-end">
            {rCandidate ? (
              <>
                <span className="text-[10px] text-red-300 truncate text-right">{rCandidate}</span>
                <CandidateAvatar name={rCandidate} party="R" photo={rPhoto} />
              </>
            ) : (
              <span className="text-[10px] text-muted-foreground/50 italic">TBD (R)</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Filter types ─────────────────────────────────────────────────────────────
type ChamberFilter = "all" | "senate" | "house";
type RatingFilter  = "all" | "Toss-up" | "Lean D" | "Likely D" | "Lean R" | "Likely R";
type SortOption    = "competitiveness" | "alphabetical" | "chamber";

export default function KeyRaces() {
  const { lastEvent } = useElectionSocket();

  const [chamberFilter, setChamberFilter] = useState<ChamberFilter>("all");
  const [ratingFilter, setRatingFilter]   = useState<RatingFilter>("all");
  const [sortOption, setSortOption]       = useState<SortOption>("competitiveness");

  const { data, isLoading, refetch } = trpc.keyRaces.get.useQuery(undefined, {
    refetchInterval: 10_000,
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
          <div key={i} className="h-14 bg-muted/30 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  const RATING_ORDER: Record<string, number> = {
    "Toss-up": 0, "Lean D": 1, "Lean R": 2, "Likely D": 3, "Likely R": 4,
  };

  // Combine senate + house into one list for filtering/sorting
  const allRaces: KeyRace[] = [
    ...(data?.senate ?? []),
    ...(data?.house ?? []),
  ];

  // Apply filters
  const filtered = allRaces.filter(r => {
    if (chamberFilter !== "all" && r.chamber !== chamberFilter) return false;
    if (ratingFilter !== "all" && r.rating !== ratingFilter) return false;
    return true;
  });

  // Apply sort
  const sorted = [...filtered].sort((a, b) => {
    if (sortOption === "competitiveness") {
      return (RATING_ORDER[a.rating ?? ""] ?? 9) - (RATING_ORDER[b.rating ?? ""] ?? 9);
    }
    if (sortOption === "alphabetical") {
      const aLabel = a.chamber === "senate" ? a.stateName : `${a.stateCode}-${a.district}`;
      const bLabel = b.chamber === "senate" ? b.stateName : `${b.stateCode}-${b.district}`;
      return aLabel.localeCompare(bLabel);
    }
    if (sortOption === "chamber") {
      if (a.chamber !== b.chamber) return a.chamber === "senate" ? -1 : 1;
      return (RATING_ORDER[a.rating ?? ""] ?? 9) - (RATING_ORDER[b.rating ?? ""] ?? 9);
    }
    return 0;
  });

  if (allRaces.length === 0) {
    return (
      <div className="text-xs text-muted-foreground text-center py-4">
        No competitive races found. Ratings will appear as the election approaches.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Filter controls */}
      <div className="flex gap-1.5 flex-wrap">
        <Select value={chamberFilter} onValueChange={(v) => setChamberFilter(v as ChamberFilter)}>
          <SelectTrigger className="h-6 text-[10px] px-2 py-0 w-auto min-w-[80px] bg-muted/30 border-border/50">
            <SelectValue placeholder="Chamber" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Chambers</SelectItem>
            <SelectItem value="senate">Senate</SelectItem>
            <SelectItem value="house">House</SelectItem>
          </SelectContent>
        </Select>

        <Select value={ratingFilter} onValueChange={(v) => setRatingFilter(v as RatingFilter)}>
          <SelectTrigger className="h-6 text-[10px] px-2 py-0 w-auto min-w-[90px] bg-muted/30 border-border/50">
            <SelectValue placeholder="Rating" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Ratings</SelectItem>
            <SelectItem value="Toss-up">Toss-up</SelectItem>
            <SelectItem value="Lean D">Lean D</SelectItem>
            <SelectItem value="Likely D">Likely D</SelectItem>
            <SelectItem value="Lean R">Lean R</SelectItem>
            <SelectItem value="Likely R">Likely R</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortOption} onValueChange={(v) => setSortOption(v as SortOption)}>
          <SelectTrigger className="h-6 text-[10px] px-2 py-0 w-auto min-w-[110px] bg-muted/30 border-border/50">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="competitiveness">Most Competitive</SelectItem>
            <SelectItem value="alphabetical">Alphabetical</SelectItem>
            <SelectItem value="chamber">By Chamber</SelectItem>
          </SelectContent>
        </Select>

        {/* Result count */}
        <span className="text-[10px] text-muted-foreground self-center ml-auto">
          {sorted.length} race{sorted.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Race cards */}
      {sorted.length === 0 ? (
        <div className="text-xs text-muted-foreground text-center py-3">
          No races match the selected filters.
        </div>
      ) : (
        <div className="space-y-1.5">
          {sorted.map(r => (
            <KeyRaceCard
              key={`${r.chamber}-${r.id}`}
              race={r}
            />
          ))}
        </div>
      )}
    </div>
  );
}
