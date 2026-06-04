import { useState, useMemo, useRef, useEffect } from "react";
import { Search, X, MapPin, Building2, Vote, ChevronRight, User, Landmark } from "lucide-react";
import { getRatingClass, getPartyColor } from "@/lib/electionUtils";
import type { SenateRace, HouseRace, RedistrictingState, Referendum, Senator, GovernorRace } from "../../../drizzle/schema";
import { trpc } from "@/lib/trpc";


// CDN base for candidate photos (same base as server/candidatePhotos.ts)
const CDN_BASE = "https://d2xsxph8kpxj0f.cloudfront.net/310519663521029713/Duqshn4D3kdv9jkbtBdj4X";

const CANDIDATE_PHOTOS: Record<string, string> = {
  "jon ossoff":           `${CDN_BASE}/jon-ossoff_2eafec1f.jpg`,
  "gary peters":          `${CDN_BASE}/gary-peters_50e7899d.jpg`,
  "john hickenlooper":    `${CDN_BASE}/john-hickenlooper_890f9235.jpg`,
  "dick durbin":          `${CDN_BASE}/dick-durbin_05b3c956.jpg`,
  "tina smith":           `${CDN_BASE}/tina-smith_853cdf1a.jpg`,
  "jeanne shaheen":       `${CDN_BASE}/jeanne-shaheen_9a7397d7.jpg`,
  "cory booker":          `${CDN_BASE}/cory-booker_2545ffe9.jpg`,
  "ben ray luján":        `${CDN_BASE}/ben-ray-lujan_430c3fec.jpg`,
  "ben ray lujan":        `${CDN_BASE}/ben-ray-lujan_430c3fec.jpg`,
  "juliana stratton":     `${CDN_BASE}/juliana-stratton_a6b800ae.jpg`,
  "david schweikert":     `${CDN_BASE}/david-schweikert_c1fa812e.jpg`,
  "adam gray":            `${CDN_BASE}/adam-gray_79bd8b30.jpg`,
  "gabe evans":           `${CDN_BASE}/gabe-evans_ba2df679.jpg`,
  "zach nunn":            `${CDN_BASE}/zach-nunn_eac8970b.jpg`,
  "tom suozzi":           `${CDN_BASE}/tom-suozzi_0c4eae93.jpg`,
  "john w. mannion":      `${CDN_BASE}/john-mannion_bdcaf070.jpg`,
  "john mannion":         `${CDN_BASE}/john-mannion_bdcaf070.jpg`,
  "don davis":            `${CDN_BASE}/don-davis_e33de8a9.jpg`,
  "janelle s. bynum":     `${CDN_BASE}/janelle-bynum_6eacebec.jpg`,
  "janelle bynum":        `${CDN_BASE}/janelle-bynum_6eacebec.jpg`,
  "henry cuellar":        `${CDN_BASE}/henry-cuellar_758f6022.jpg`,
  "eugene vindman":       `${CDN_BASE}/eugene-vindman_6868eaf7.jpg`,
  "nicholas j. begich":   `${CDN_BASE}/nicholas-begich_eb851933.jpg`,
  "nicholas begich":      `${CDN_BASE}/nicholas-begich_eb851933.jpg`,
  "elijah crane":         `${CDN_BASE}/elijah-crane_0100ed41.jpg`,
  "laurie buckhout":      `${CDN_BASE}/laurie-buckhout_18f4c9b7.jpg`,
  // June 2 2026 primary nominees
  "alani bankhead":        `${CDN_BASE}/alani_bankhead_64fa939f.jpg`,
  "justin murphy":         `${CDN_BASE}/justin_murphy_b4a44b43.jpg`,
  // NJ-12 general election candidates
  "adam hamawy":           `${CDN_BASE}/adam_hamawy_1769a586.jpg`,
  "greg mele":             `${CDN_BASE}/greg_mele_350691f2.jpg`,
  // CA D vs D races
  "scott wiener":          `${CDN_BASE}/scott_wiener_61873c20.jpg`,
  "connie chan":           `${CDN_BASE}/connie_chan_11dcae1f.jpg`,
  "jamie joyce":           `${CDN_BASE}/jamie_joyce_e5b8b63a.jpg`,
  // CA-12 incumbent — bioguide S001226
  "lateefah simon":        "https://bioguide.congress.gov/bioguide/photo/S/S001226.jpg",
  // June 3 2026 — full photo audit batch
  "mike mcguire":          `${CDN_BASE}/mike_mcguire_b4d06a7e.jpg`,
  "james gallagher":       `${CDN_BASE}/james_gallagher_0e653239.jpg`,
  "kevin lincoln":         `${CDN_BASE}/kevin_lincoln_0994a1ab.jpg`,
  "larry thompson":        `${CDN_BASE}/larry_thompson_5197132c.jpg`,
  "joe mitchell":          `${CDN_BASE}/joe_mitchell_643e31b1.jpg`,
  "sarah trone garriott":  `${CDN_BASE}/sarah_trone_garriott_0f2f52c7.jpg`,
  "dave dawson":           `${CDN_BASE}/dave_dawson_a73bfbbc.jpg`,
  "chris mcgowan":         `${CDN_BASE}/chris_mcgowan_5eebb45c.jpg`,
  "sam forstag":           `${CDN_BASE}/sam_forstag_8a25a32b.jpg`,
  "aaron flint":           `${CDN_BASE}/aaron_flint_d5400e39.jpg`,
  "deb haaland":           `${CDN_BASE}/deb_haaland_70d42c34.jpg`,
  "gregg hull":            `${CDN_BASE}/gregg_hull_52308593.jpg`,
  "zach lahn":             `${CDN_BASE}/zach_lahn_a30bee0e.jpg`,
  // June 3 batch 2 — full verification additions
  "dan ahlers":            `${CDN_BASE}/dan_ahlers_808ef1bf.jpg`,
  "brian miller":          `${CDN_BASE}/brian_miller_90583729.jpg`,
  "zack mullock":          `${CDN_BASE}/zack_mullock_17ebd1af.jpg`,
  "michael mcguire":       `${CDN_BASE}/michael_mcguire_nj3_a7d50bd9.jpg`,
  "rachel peace":          `${CDN_BASE}/rachel_peace_a7d6f6d5.jpg`,
  "sean kirrane":          `${CDN_BASE}/sean_kirrane_bebbda68.jpg`,
  "hillary herzig":        `${CDN_BASE}/hillary_herzig_048abfb2.jpg`,
  "rosie pino":            `${CDN_BASE}/rosie_pino_233de605.jpg`,
  "carmen bucco":          `${CDN_BASE}/carmen_bucco_3e3f9d95.jpg`,
  "damon galdo":           `${CDN_BASE}/damon_galdo_6d559bce.jpg`,
  // Louisiana Senate runoff candidates
  "julia letlow":          `${CDN_BASE}/julia_letlow_30aa46b4.jpg`,
  "john fleming":          `${CDN_BASE}/john-fleming_363529aa.jpg`,
  "jamie davis":           `${CDN_BASE}/jamie_davis_la_867d6b8d.jpg`,
  // Louisiana Senate runoff — Gary Crockett (added June 4 2026)
  "gary crockett":         `${CDN_BASE}/gary_crockett_dee51265.jpg`,
  // CA photo audit completions (June 4 2026)
  "sam liccardo":          `${CDN_BASE}/sam_liccardo_e0db628c.jpg`,
  "gil cisneros":          `${CDN_BASE}/gil_cisneros_e29e0c3b.jpg`,
  "marni von wilpert":     `${CDN_BASE}/marni_von_wilpert_c2df38d6.jpg`,
};

function getCandidatePhoto(name: string | null | undefined): string | null {
  if (!name) return null;
  return CANDIDATE_PHOTOS[name.toLowerCase().trim()] ?? null;
}

interface GlobalSearchProps {
  senateRaces: SenateRace[];
  houseRaces: HouseRace[];
  redistrictingStates: RedistrictingState[];
  referendums: Referendum[];
  governorRaces?: GovernorRace[];
  onSelectSenate: (race: SenateRace) => void;
  onSelectHouse: (race: HouseRace) => void;
  onSelectRedistricting: (state: RedistrictingState) => void;
  onSelectReferendum: (ref: Referendum) => void;
  onSelectGovernor?: (race: GovernorRace) => void;
  onQueryChange?: (query: string) => void;
  onSelectSenator?: (senator: Senator) => void;
}

type SearchResult =
  | { kind: "senate"; data: SenateRace; score: number; matchedField: string }
  | { kind: "house"; data: HouseRace; score: number; matchedField: string }
  | { kind: "redistricting"; data: RedistrictingState; score: number; matchedField: string }
  | { kind: "referendum"; data: Referendum; score: number; matchedField: string }
  | { kind: "senator"; data: Senator; score: number; matchedField: string }
  | { kind: "governor"; data: GovernorRace; score: number; matchedField: string };

/** Returns a score 0-100 for how well needle matches haystack */
function scoreMatch(haystack: string, needle: string): number {
  const h = haystack.toLowerCase();
  const n = needle.toLowerCase();
  if (!n) return 0;
  if (h === n) return 100;
  if (h.startsWith(n)) return 85;
  // Match first/last name separately
  const parts = h.split(/\s+/);
  if (parts.some(p => p === n)) return 80;
  if (parts.some(p => p.startsWith(n))) return 70;
  if (h.includes(n)) return 60;
  return 0;
}

/** Score a race against a query, returning best score and which field matched */
function scoreRace(
  fields: { value: string | null | undefined; weight: number; label: string }[],
  query: string
): { score: number; matchedField: string } {
  let best = { score: 0, matchedField: "" };
  for (const f of fields) {
    if (!f.value) continue;
    const raw = scoreMatch(f.value, query);
    const weighted = Math.min(100, raw * f.weight);
    if (weighted > best.score) {
      best = { score: weighted, matchedField: f.label };
    }
  }
  return best;
}

/** Highlight matched text in a string */
function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query.trim() || !text) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase().trim());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-400/30 text-yellow-200 rounded-sm px-0.5">
        {text.slice(idx, idx + query.trim().length)}
      </mark>
      {text.slice(idx + query.trim().length)}
    </>
  );
}

/** Small circular candidate avatar */
function CandidateAvatar({
  name,
  party,
  size = "sm",
}: {
  name: string | null | undefined;
  party?: "D" | "R" | null;
  size?: "sm" | "xs";
}) {
  const photo = getCandidatePhoto(name);
  const dim = size === "xs" ? "w-5 h-5" : "w-7 h-7";
  const textSize = size === "xs" ? "text-[9px]" : "text-[10px]";
  const border = party === "D" ? "border-blue-500/60" : party === "R" ? "border-red-500/60" : "border-border";
  const bg = party === "D" ? "bg-blue-900/60" : party === "R" ? "bg-red-900/60" : "bg-muted";
  const initial = name ? name.trim()[0].toUpperCase() : "?";

  if (photo) {
    return (
      <img
        src={photo}
        alt={name ?? ""}
        className={`${dim} rounded-full object-cover border-2 ${border} flex-shrink-0`}
      />
    );
  }
  return (
    <div className={`${dim} rounded-full ${bg} border-2 ${border} flex items-center justify-center flex-shrink-0`}>
      <span className={`${textSize} font-bold text-foreground/70`}>{initial}</span>
    </div>
  );
}

export default function GlobalSearch({
  senateRaces,
  houseRaces,
  redistrictingStates,
  referendums,
  governorRaces = [],
  onSelectSenate,
  onSelectHouse,
  onSelectRedistricting,
  onSelectReferendum,
  onSelectGovernor,
  onQueryChange,
  onSelectSenator,
}: GlobalSearchProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Detect chamber keyword shortcuts in query
  const chamberKeyword = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q === "senate" || q === "sen") return "senate";
    if (q === "house" || q === "hor" || q === "representative" || q === "representatives") return "house";
    if (q === "governor" || q === "gov" || q === "governors") return "governor";
    return null;
  }, [query]);

  const results = useMemo((): SearchResult[] => {
    const q = query.trim();

    // If user typed a chamber keyword alone, show all races of that type
    if (chamberKeyword) {
      const all: SearchResult[] = [];
      if (chamberKeyword === "senate") {
        for (const race of senateRaces) {
          all.push({ kind: "senate", data: race, score: 50, matchedField: "chamber" });
        }
      } else if (chamberKeyword === "house") {
        for (const race of houseRaces) {
          all.push({ kind: "house", data: race, score: 50, matchedField: "chamber" });
        }
      } else if (chamberKeyword === "governor") {
        for (const race of governorRaces) {
          all.push({ kind: "governor", data: race, score: 50, matchedField: "chamber" });
        }
      }
      return all.slice(0, 50);
    }

    if (!q) return [];

    const all: SearchResult[] = [];

    // Senate races — candidate names weighted highest
    for (const race of senateRaces) {
      const { score, matchedField } = scoreRace([
        { value: race.candidate1Name, weight: 1.2, label: "candidate" },
        { value: race.candidate2Name, weight: 1.2, label: "candidate" },
        { value: race.incumbent, weight: 1.1, label: "incumbent" },
        { value: race.stateName, weight: 1.0, label: "state" },
        { value: race.stateCode, weight: 0.9, label: "state" },
        { value: race.calledWinner, weight: 1.0, label: "winner" },
        { value: race.rating, weight: 0.7, label: "rating" },
      ], q);
      if (score > 0) {
        all.push({ kind: "senate", data: race, score, matchedField });
      }
    }

    // House races — candidate names weighted highest
    for (const race of houseRaces) {
      const { score, matchedField } = scoreRace([
        { value: race.candidate1Name, weight: 1.2, label: "candidate" },
        { value: race.candidate2Name, weight: 1.2, label: "candidate" },
        { value: race.incumbent, weight: 1.1, label: "incumbent" },
        { value: race.stateName, weight: 1.0, label: "state" },
        { value: race.stateCode, weight: 0.9, label: "state" },
        { value: `${race.stateCode}-${race.districtLabel}`, weight: 1.0, label: "district" },
        { value: `${race.stateCode} ${race.district}`, weight: 0.9, label: "district" },
        { value: race.calledWinner, weight: 1.0, label: "winner" },
        { value: race.rating, weight: 0.7, label: "rating" },
      ], q);
      if (score > 0) {
        all.push({ kind: "house", data: race, score, matchedField });
      }
    }

    // Governor races — candidate names weighted highest
    for (const race of governorRaces) {
      const { score, matchedField } = scoreRace([
        { value: race.demCandidate, weight: 1.2, label: "candidate" },
        { value: race.repCandidate, weight: 1.2, label: "candidate" },
        { value: race.incumbentName, weight: 1.1, label: "incumbent" },
        { value: race.stateName, weight: 1.0, label: "state" },
        { value: race.stateCode, weight: 0.9, label: "state" },
        { value: race.calledWinner, weight: 1.0, label: "winner" },
        { value: race.rating, weight: 0.7, label: "rating" },
      ], q);
      if (score > 0) {
        all.push({ kind: "governor", data: race, score, matchedField });
      }
    }

    // Redistricting states
    for (const state of redistrictingStates) {
      const { score, matchedField } = scoreRace([
        { value: state.stateName, weight: 1.0, label: "state" },
        { value: state.stateCode, weight: 0.9, label: "state" },
        { value: state.reason, weight: 0.8, label: "reason" },
        { value: state.method, weight: 0.7, label: "method" },
        { value: state.status, weight: 0.7, label: "status" },
      ], q);
      if (score > 0) {
        all.push({ kind: "redistricting", data: state, score, matchedField });
      }
    }

    // Referendums
    for (const ref of referendums) {
      const { score, matchedField } = scoreRace([
        { value: ref.stateName, weight: 1.0, label: "state" },
        { value: ref.stateCode, weight: 0.9, label: "state" },
        { value: ref.name, weight: 1.0, label: "name" },
        { value: ref.description, weight: 0.8, label: "description" },
        { value: ref.status, weight: 0.7, label: "status" },
      ], q);
      if (score > 0) {
        all.push({ kind: "referendum", data: ref, score, matchedField });
      }
    }

    return all.sort((a, b) => b.score - a.score).slice(0, 50);
  }, [query, chamberKeyword, senateRaces, houseRaces, redistrictingStates, referendums, governorRaces]);

  // Senator search — separate query to the senators endpoint
  const debouncedQuery = query.trim();
  const { data: senatorResults } = trpc.senators.search.useQuery(
    { query: debouncedQuery },
    { enabled: debouncedQuery.length >= 2 }
  );

  // Merge senator results into the combined result list
  const allResults = useMemo((): SearchResult[] => {
    const senatorHits: SearchResult[] = (senatorResults ?? []).map((s: Senator) => ({
      kind: "senator" as const,
      data: s,
      score: 90,
      matchedField: "senator",
    }));
    return [...results, ...senatorHits].sort((a, b) => b.score - a.score).slice(0, 60);
  }, [results, senatorResults]);

  // Group results by kind for display
  const grouped = useMemo(() => {
    const senate = allResults.filter(r => r.kind === "senate");
    const senators = allResults.filter(r => r.kind === "senator");
    const house = allResults.filter(r => r.kind === "house");
    const governor = allResults.filter(r => r.kind === "governor");
    const other = allResults.filter(r => r.kind !== "senate" && r.kind !== "house" && r.kind !== "senator" && r.kind !== "governor");
    return { senate, senators, house, governor, other };
  }, [allResults]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSelect = (result: SearchResult) => {
    setIsOpen(false);
    setQuery("");
    onQueryChange?.("");
    if (result.kind === "senate") onSelectSenate(result.data);
    else if (result.kind === "house") onSelectHouse(result.data);
    else if (result.kind === "redistricting") onSelectRedistricting(result.data);
    else if (result.kind === "referendum") onSelectReferendum(result.data);
    else if (result.kind === "senator") onSelectSenator?.(result.data);
    else if (result.kind === "governor") onSelectGovernor?.(result.data);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || allResults.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIndex(i => Math.min(i + 1, allResults.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setActiveIndex(i => Math.max(i - 1, 0)); }
    if (e.key === "Enter") { e.preventDefault(); if (allResults[activeIndex]) handleSelect(allResults[activeIndex]); }
    if (e.key === "Escape") { setIsOpen(false); inputRef.current?.blur(); }
  };

  const showResults = isOpen && (allResults.length > 0 || query.trim().length >= 2);
  const q = query.trim();

  // Render a single result row
  const renderResult = (result: SearchResult, globalIndex: number) => {
    const isActive = globalIndex === activeIndex;

    if (result.kind === "senate") {
      const race = result.data;
      const c1Party = race.candidate1Party as "D" | "R" | null;
      const c2Party = race.candidate2Party as "D" | "R" | null;
      return (
        <button
          key={`senate-${race.id}`}
          onClick={() => handleSelect(result)}
          className={`w-full text-left px-3 py-2.5 border-b border-border/30 hover:bg-accent transition-colors ${isActive ? "bg-accent" : ""}`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 bg-blue-900/30">
              <Building2 className="w-3 h-3 text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-sm font-semibold text-foreground">
                  <HighlightText text={race.stateName} query={q} />
                </span>
                <span className="text-[10px] font-bold bg-blue-900/40 text-blue-300 px-1.5 py-0.5 rounded uppercase tracking-wide">SEN</span>
                {race.isSpecial && <span className="text-[10px] bg-yellow-900/40 text-yellow-400 px-1 rounded">Special</span>}
                {race.rating && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ml-auto flex-shrink-0 ${getRatingClass(race.rating as any)}`}>
                    {race.rating}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {race.candidate1Name ? (
                  <div className="flex items-center gap-1">
                    <CandidateAvatar name={race.candidate1Name} party={c1Party} size="xs" />
                    <span className="text-xs text-foreground/80 truncate max-w-[90px]">
                      <HighlightText text={race.candidate1Name} query={q} />
                    </span>
                    {c1Party && <span className={`text-[9px] font-bold ${c1Party === "D" ? "text-blue-400" : "text-red-400"}`}>{c1Party}</span>}
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground italic">Open seat</span>
                )}
                {race.candidate2Name && (
                  <>
                    <span className="text-muted-foreground/40 text-xs">vs</span>
                    <div className="flex items-center gap-1">
                      <CandidateAvatar name={race.candidate2Name} party={c2Party} size="xs" />
                      <span className="text-xs text-foreground/80 truncate max-w-[90px]">
                        <HighlightText text={race.candidate2Name} query={q} />
                      </span>
                      {c2Party && <span className={`text-[9px] font-bold ${c2Party === "D" ? "text-blue-400" : "text-red-400"}`}>{c2Party}</span>}
                    </div>
                  </>
                )}
                {race.incumbent && !race.candidate1Name && (
                  <span className="text-xs text-muted-foreground">
                    Incumbent: <HighlightText text={race.incumbent} query={q} />
                  </span>
                )}
              </div>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          </div>
        </button>
      );
    }

    if (result.kind === "house") {
      const race = result.data;
      const c1Party = race.candidate1Party as "D" | "R" | null;
      const c2Party = race.candidate2Party as "D" | "R" | null;
      const distLabel = `${race.stateCode}-${race.districtLabel}`;
      return (
        <button
          key={`house-${race.id}`}
          onClick={() => handleSelect(result)}
          className={`w-full text-left px-3 py-2.5 border-b border-border/30 hover:bg-accent transition-colors ${isActive ? "bg-accent" : ""}`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 bg-green-900/30">
              <MapPin className="w-3 h-3 text-green-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-sm font-semibold text-foreground">
                  <HighlightText text={distLabel} query={q} />
                </span>
                <span className="text-xs text-muted-foreground">
                  <HighlightText text={race.stateName} query={q} />
                </span>
                <span className="text-[10px] font-bold bg-green-900/40 text-green-300 px-1.5 py-0.5 rounded uppercase tracking-wide">HOR</span>
                {race.rating && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ml-auto flex-shrink-0 ${getRatingClass(race.rating as any)}`}>
                    {race.rating}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {race.candidate1Name ? (
                  <div className="flex items-center gap-1">
                    <CandidateAvatar name={race.candidate1Name} party={c1Party} size="xs" />
                    <span className="text-xs text-foreground/80 truncate max-w-[90px]">
                      <HighlightText text={race.candidate1Name} query={q} />
                    </span>
                    {c1Party && <span className={`text-[9px] font-bold ${c1Party === "D" ? "text-blue-400" : "text-red-400"}`}>{c1Party}</span>}
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground italic">TBD (D)</span>
                )}
                {race.candidate2Name && (
                  <>
                    <span className="text-muted-foreground/40 text-xs">vs</span>
                    <div className="flex items-center gap-1">
                      <CandidateAvatar name={race.candidate2Name} party={c2Party} size="xs" />
                      <span className="text-xs text-foreground/80 truncate max-w-[90px]">
                        <HighlightText text={race.candidate2Name} query={q} />
                      </span>
                      {c2Party && <span className={`text-[9px] font-bold ${c2Party === "D" ? "text-blue-400" : "text-red-400"}`}>{c2Party}</span>}
                    </div>
                  </>
                )}
                {race.incumbent && !race.candidate1Name && !race.candidate2Name && (
                  <span className="text-xs text-muted-foreground">
                    Incumbent: <HighlightText text={race.incumbent} query={q} />
                  </span>
                )}
              </div>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          </div>
        </button>
      );
    }

    if (result.kind === "governor") {
      const race = result.data;
      return (
        <button
          key={`governor-${race.id}`}
          onClick={() => handleSelect(result)}
          className={`w-full text-left px-3 py-2.5 border-b border-border/30 hover:bg-accent transition-colors ${isActive ? "bg-accent" : ""}`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 bg-orange-900/30">
              <Landmark className="w-3 h-3 text-orange-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-sm font-semibold text-foreground">
                  <HighlightText text={race.stateName} query={q} />
                </span>
                <span className="text-[10px] font-bold bg-orange-900/40 text-orange-300 px-1.5 py-0.5 rounded uppercase tracking-wide">GOV</span>
                {race.isSpecial && <span className="text-[10px] bg-yellow-900/40 text-yellow-400 px-1 rounded">Special</span>}
                {race.rating && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ml-auto flex-shrink-0 ${getRatingClass(race.rating as any)}`}>
                    {race.rating}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {race.demCandidate ? (
                  <div className="flex items-center gap-1">
                    <CandidateAvatar name={race.demCandidate} party="D" size="xs" />
                    <span className="text-xs text-foreground/80 truncate max-w-[90px]">
                      <HighlightText text={race.demCandidate} query={q} />
                    </span>
                    <span className="text-[9px] font-bold text-blue-400">D</span>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground italic">TBD (D)</span>
                )}
                {race.repCandidate && (
                  <>
                    <span className="text-muted-foreground/40 text-xs">vs</span>
                    <div className="flex items-center gap-1">
                      <CandidateAvatar name={race.repCandidate} party="R" size="xs" />
                      <span className="text-xs text-foreground/80 truncate max-w-[90px]">
                        <HighlightText text={race.repCandidate} query={q} />
                      </span>
                      <span className="text-[9px] font-bold text-red-400">R</span>
                    </div>
                  </>
                )}
              </div>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          </div>
        </button>
      );
    }

    if (result.kind === "redistricting") {
      const state = result.data;
      return (
        <button
          key={`redistricting-${state.id}`}
          onClick={() => handleSelect(result)}
          className={`w-full text-left px-3 py-2.5 border-b border-border/30 hover:bg-accent transition-colors ${isActive ? "bg-accent" : ""}`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 bg-yellow-900/30">
              <MapPin className="w-3 h-3 text-yellow-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-foreground">
                  <HighlightText text={state.stateName} query={q} />
                </span>
                <span className="text-[10px] font-bold bg-yellow-900/40 text-yellow-300 px-1.5 py-0.5 rounded uppercase tracking-wide">Redistricting</span>
                <span className={`text-[10px] px-1 rounded ml-auto ${state.enacted ? "bg-green-900/40 text-green-400" : "bg-yellow-900/40 text-yellow-400"}`}>
                  {state.enacted ? "Enacted" : "Pending"}
                </span>
              </div>
              {state.reason && (
                <p className="text-xs text-muted-foreground truncate mt-0.5">{state.reason}</p>
              )}
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          </div>
        </button>
      );
    }

    if (result.kind === "referendum") {
      const ref = result.data;
      return (
        <button
          key={`referendum-${ref.id}`}
          onClick={() => handleSelect(result)}
          className={`w-full text-left px-3 py-2.5 border-b border-border/30 hover:bg-accent transition-colors ${isActive ? "bg-accent" : ""}`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 bg-purple-900/30">
              <Vote className="w-3 h-3 text-purple-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-foreground">
                  <HighlightText text={ref.stateName} query={q} />
                </span>
                <span className="text-[10px] font-bold bg-purple-900/40 text-purple-300 px-1.5 py-0.5 rounded uppercase tracking-wide">Referendum</span>
              </div>
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                <HighlightText text={ref.name} query={q} />
              </p>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          </div>
        </button>
      );
    }

    if (result.kind === "senator") {
      const s = result.data as Senator;
      return (
        <button
          key={`senator-${s.id}`}
          onClick={() => handleSelect(result)}
          className={`w-full text-left px-3 py-2.5 border-b border-border/30 hover:bg-accent transition-colors cursor-pointer ${isActive ? "bg-accent" : ""}`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: getPartyColor(s.party as any) + "33", border: `1.5px solid ${getPartyColor(s.party as any)}66` }}>
              <span className="text-[9px] font-bold" style={{ color: getPartyColor(s.party as any) }}>{s.party}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-foreground">
                  <HighlightText text={s.name} query={q} />
                </span>
                <span className="text-xs text-muted-foreground">{s.stateCode}</span>
                <span className="text-[10px] font-bold bg-blue-900/40 text-blue-300 px-1.5 py-0.5 rounded uppercase tracking-wide">Senator</span>
                {s.isUpIn2026 ? (
                  <span className="text-[10px] font-bold bg-amber-900/40 text-amber-300 px-1.5 py-0.5 rounded">Up 2026</span>
                ) : (
                  <span className="text-[10px] bg-slate-700/60 text-slate-400 px-1.5 py-0.5 rounded">Up {s.nextElectionYear}</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {s.stateName} · Class {s.senateClass} · Term ends {s.nextElectionYear === 2028 ? "Jan 2029" : s.nextElectionYear === 2030 ? "Jan 2031" : "Jan 2027"}
              </p>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          </div>
        </button>
      );
    }

    return null;
  };

  return (
    <>
    <div ref={containerRef} className="relative w-full">
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => {
            setQuery(e.target.value);
            setIsOpen(true);
            setActiveIndex(0);
            onQueryChange?.(e.target.value);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder='Search candidates, states, districts… (try "senate", "governor", or "Gina Hinojosa")'
          className="w-full bg-muted/60 border border-border rounded-lg pl-9 pr-8 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:bg-muted transition-colors"
        />
        {query && (
          <button
            onClick={() => { setQuery(""); setIsOpen(false); onQueryChange?.(""); }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Results dropdown */}
      {showResults && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden max-h-[480px] overflow-y-auto">
          {allResults.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <User className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No results for &ldquo;{query}&rdquo;</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Try a candidate name, state, district (e.g. "GA-14"), or type "senate", "house", or "governor"
              </p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="px-3 py-1.5 border-b border-border bg-muted/20 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {allResults.length} result{allResults.length !== 1 ? "s" : ""}
                  {chamberKeyword && <span className="ml-1 text-muted-foreground/60">— showing all {chamberKeyword} races</span>}
                </span>
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/50">
                  {grouped.senate.length > 0 && <span className="bg-blue-900/30 text-blue-400 px-1.5 py-0.5 rounded">{grouped.senate.length} Senate</span>}
                  {grouped.senators.length > 0 && <span className="bg-indigo-900/30 text-indigo-400 px-1.5 py-0.5 rounded">{grouped.senators.length} Senators</span>}
                  {grouped.house.length > 0 && <span className="bg-green-900/30 text-green-400 px-1.5 py-0.5 rounded">{grouped.house.length} House</span>}
                  {grouped.governor.length > 0 && <span className="bg-orange-900/30 text-orange-400 px-1.5 py-0.5 rounded">{grouped.governor.length} Governor</span>}
                  {grouped.other.length > 0 && <span className="bg-muted text-muted-foreground px-1.5 py-0.5 rounded">{grouped.other.length} Other</span>}
                </div>
              </div>

              {/* Senators section (current members) */}
              {grouped.senators.length > 0 && (
                <>
                  <div className="px-3 py-1 bg-indigo-900/10 border-b border-border/20">
                    <span className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wider">Current Senators (119th Congress)</span>
                  </div>
                  {grouped.senators.map((r, i) => renderResult(r, i))}
                </>
              )}

              {/* Senate Races section */}
              {grouped.senate.length > 0 && (
                <>
                  <div className="px-3 py-1 bg-blue-900/10 border-b border-border/20">
                    <span className="text-[10px] font-semibold text-blue-400 uppercase tracking-wider">U.S. Senate Races</span>
                  </div>
                  {grouped.senate.map((r, i) => renderResult(r, grouped.senators.length + i))}
                </>
              )}

              {/* House section */}
              {grouped.house.length > 0 && (
                <>
                  <div className="px-3 py-1 bg-green-900/10 border-b border-border/20">
                    <span className="text-[10px] font-semibold text-green-400 uppercase tracking-wider">U.S. House of Representatives</span>
                  </div>
                  {grouped.house.map((r, i) => renderResult(r, grouped.senators.length + grouped.senate.length + i))}
                </>
              )}

              {/* Governor section */}
              {grouped.governor.length > 0 && (
                <>
                  <div className="px-3 py-1 bg-orange-900/10 border-b border-border/20">
                    <span className="text-[10px] font-semibold text-orange-400 uppercase tracking-wider">Governor Races</span>
                  </div>
                  {grouped.governor.map((r, i) => renderResult(r, grouped.senators.length + grouped.senate.length + grouped.house.length + i))}
                </>
              )}

              {/* Other section */}
              {grouped.other.length > 0 && (
                <>
                  <div className="px-3 py-1 bg-muted/20 border-b border-border/20">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Other</span>
                  </div>
                  {grouped.other.map((r, i) => renderResult(r, grouped.senators.length + grouped.senate.length + grouped.house.length + grouped.governor.length + i))}
                </>
              )}

              {/* Keyboard hint */}
              <div className="px-3 py-1.5 border-t border-border bg-muted/10 flex items-center gap-3 text-[10px] text-muted-foreground/50">
                <span><kbd className="bg-muted px-1 rounded">↑↓</kbd> navigate</span>
                <span><kbd className="bg-muted px-1 rounded">↵</kbd> select</span>
                <span><kbd className="bg-muted px-1 rounded">Esc</kbd> close</span>
              </div>
            </>
          )}
        </div>
      )}
    </div>

    {/* Senator detail popup */}
    </>
  );
}
