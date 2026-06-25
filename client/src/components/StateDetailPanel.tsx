/**
 * State Detail Panel for the Historical Atlas
 * Shows redistricting history, seat count changes, and party control
 * across all 31 congresses (89th–119th).
 */
import { useMemo } from "react";
import { LEWIS_MANIFEST } from "@shared/lewisManifest";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, AreaChart, Area } from "recharts";

// ─── Types ───────────────────────────────────────────────────────────────────
interface StateDetailPanelProps {
  stateName: string;
  currentCongress: number;
  onClose: () => void;
  onCongressSelect: (congress: number) => void;
  partyCache: Map<number, Record<string, string>>;
  membersCache: Map<number, Record<string, { name: string; party: string; bioguide: string }>>;
}

// ─── Constants ───────────────────────────────────────────────────────────────
const CONGRESS_START = 89;
const CONGRESS_END = 119;

const STATE_CODES: Record<string, string> = {
  "Alabama": "AL", "Alaska": "AK", "Arizona": "AZ", "Arkansas": "AR",
  "California": "CA", "Colorado": "CO", "Connecticut": "CT", "Delaware": "DE",
  "Florida": "FL", "Georgia": "GA", "Hawaii": "HI", "Idaho": "ID",
  "Illinois": "IL", "Indiana": "IN", "Iowa": "IA", "Kansas": "KS",
  "Kentucky": "KY", "Louisiana": "LA", "Maine": "ME", "Maryland": "MD",
  "Massachusetts": "MA", "Michigan": "MI", "Minnesota": "MN", "Mississippi": "MS",
  "Missouri": "MO", "Montana": "MT", "Nebraska": "NE", "Nevada": "NV",
  "New Hampshire": "NH", "New Jersey": "NJ", "New Mexico": "NM", "New York": "NY",
  "North Carolina": "NC", "North Dakota": "ND", "Ohio": "OH", "Oklahoma": "OK",
  "Oregon": "OR", "Pennsylvania": "PA", "Rhode Island": "RI", "South Carolina": "SC",
  "South Dakota": "SD", "Tennessee": "TN", "Texas": "TX", "Utah": "UT",
  "Vermont": "VT", "Virginia": "VA", "Washington": "WA", "West Virginia": "WV",
  "Wisconsin": "WI", "Wyoming": "WY",
};

function congressYear(n: number): number {
  return 1963 + (n - 88) * 2;
}

function ordinal(n: number): string {
  if (n === 11 || n === 12 || n === 13) return `${n}th`;
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// ─── Seat count per state per congress (apportionment) ───────────────────────
// This is derived from the Lewis manifest: count the number of features (districts)
// in the GeoJSON file for each congress. We approximate from the manifest ranges.
const APPORTIONMENT: Record<string, Record<number, number>> = {};

// Build apportionment from manifest data
// Each GeoJSON file covers a range of congresses and the number of districts
// is encoded in the filename pattern or can be inferred from the boundary changes
function getStateSeats(stateName: string): { congress: number; seats: number }[] {
  const manifest = LEWIS_MANIFEST[stateName];
  if (!manifest) return [];
  
  // Known apportionment data (seats per decade after census)
  const KNOWN_SEATS: Record<string, number[]> = {
    // [89th, 93rd, 98th, 103rd, 108th, 113th, 118th] (after each census redistricting)
    "Alabama": [8, 7, 7, 7, 7, 7, 7],
    "Alaska": [1, 1, 1, 1, 1, 1, 1],
    "Arizona": [3, 4, 5, 6, 8, 9, 9],
    "Arkansas": [4, 4, 4, 4, 4, 4, 4],
    "California": [38, 43, 45, 52, 53, 53, 52],
    "Colorado": [4, 5, 6, 6, 7, 7, 8],
    "Connecticut": [6, 6, 6, 6, 5, 5, 5],
    "Delaware": [1, 1, 1, 1, 1, 1, 1],
    "Florida": [12, 15, 19, 23, 25, 27, 28],
    "Georgia": [10, 10, 10, 11, 13, 14, 14],
    "Hawaii": [2, 2, 2, 2, 2, 2, 2],
    "Idaho": [2, 2, 2, 2, 2, 2, 2],
    "Illinois": [24, 24, 22, 20, 19, 18, 17],
    "Indiana": [11, 11, 10, 10, 9, 9, 9],
    "Iowa": [7, 6, 6, 5, 5, 4, 4],
    "Kansas": [5, 5, 5, 4, 4, 4, 4],
    "Kentucky": [7, 7, 7, 6, 6, 6, 6],
    "Louisiana": [8, 8, 8, 7, 7, 6, 6],
    "Maine": [2, 2, 2, 2, 2, 2, 2],
    "Maryland": [8, 8, 8, 8, 8, 8, 8],
    "Massachusetts": [12, 12, 11, 10, 10, 9, 9],
    "Michigan": [19, 19, 18, 16, 15, 14, 13],
    "Minnesota": [8, 8, 8, 8, 8, 8, 8],
    "Mississippi": [5, 5, 5, 5, 4, 4, 4],
    "Missouri": [10, 10, 9, 9, 9, 8, 8],
    "Montana": [2, 2, 2, 1, 1, 1, 2],
    "Nebraska": [3, 3, 3, 3, 3, 3, 3],
    "Nevada": [1, 1, 2, 2, 3, 4, 4],
    "New Hampshire": [2, 2, 2, 2, 2, 2, 2],
    "New Jersey": [15, 15, 14, 13, 13, 12, 12],
    "New Mexico": [2, 2, 3, 3, 3, 3, 3],
    "New York": [41, 39, 34, 31, 29, 27, 26],
    "North Carolina": [11, 11, 11, 12, 13, 13, 14],
    "North Dakota": [2, 1, 1, 1, 1, 1, 1],
    "Ohio": [24, 23, 21, 19, 18, 16, 15],
    "Oklahoma": [6, 6, 6, 6, 5, 5, 5],
    "Oregon": [4, 4, 5, 5, 5, 5, 6],
    "Pennsylvania": [27, 25, 23, 21, 19, 18, 17],
    "Rhode Island": [2, 2, 2, 2, 2, 2, 2],
    "South Carolina": [6, 6, 6, 6, 6, 7, 7],
    "South Dakota": [2, 2, 1, 1, 1, 1, 1],
    "Tennessee": [9, 8, 9, 9, 9, 9, 9],
    "Texas": [23, 24, 27, 30, 32, 36, 38],
    "Utah": [2, 2, 3, 3, 3, 4, 4],
    "Vermont": [1, 1, 1, 1, 1, 1, 1],
    "Virginia": [10, 10, 10, 11, 11, 11, 11],
    "Washington": [7, 7, 8, 9, 9, 10, 10],
    "West Virginia": [5, 4, 4, 3, 3, 3, 2],
    "Wisconsin": [10, 9, 9, 9, 8, 8, 8],
    "Wyoming": [1, 1, 1, 1, 1, 1, 1],
  };

  const knownSeats = KNOWN_SEATS[stateName];
  if (!knownSeats) return [];

  // Map known seats to congress ranges (after each decennial census)
  // 89-92 (1960 census), 93-97 (1970), 98-102 (1980), 103-107 (1990), 108-112 (2000), 113-117 (2010), 118-119 (2020)
  const ranges: [number, number, number][] = [
    [89, 92, knownSeats[0]],
    [93, 97, knownSeats[1]],
    [98, 102, knownSeats[2]],
    [103, 107, knownSeats[3]],
    [108, 112, knownSeats[4]],
    [113, 117, knownSeats[5]],
    [118, 119, knownSeats[6]],
  ];

  const result: { congress: number; seats: number }[] = [];
  for (let c = CONGRESS_START; c <= CONGRESS_END; c++) {
    const range = ranges.find(([s, e]) => c >= s && c <= e);
    result.push({ congress: c, seats: range ? range[2] : knownSeats[0] });
  }
  return result;
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function StateDetailPanel({
  stateName,
  currentCongress,
  onClose,
  onCongressSelect,
  partyCache,
  membersCache,
}: StateDetailPanelProps) {
  const stateAbbrev = STATE_CODES[stateName] || "";

  // Redistricting history from Lewis manifest
  const redistrictingHistory = useMemo(() => {
    const manifest = LEWIS_MANIFEST[stateName];
    if (!manifest) return [];
    return manifest
      .filter(e => e.start >= CONGRESS_START)
      .map(e => ({
        startCongress: Math.max(e.start, CONGRESS_START),
        endCongress: Math.min(e.end, CONGRESS_END),
        startYear: congressYear(Math.max(e.start, CONGRESS_START)),
        endYear: congressYear(Math.min(e.end, CONGRESS_END)) + 1,
        fileName: e.name,
      }));
  }, [stateName]);

  // Seat count data
  const seatData = useMemo(() => getStateSeats(stateName), [stateName]);

  // Party control data across all congresses
  const partyControlData = useMemo(() => {
    const data: { congress: number; year: number; D: number; R: number; I: number }[] = [];
    
    for (let c = CONGRESS_START; c <= CONGRESS_END; c++) {
      const partyData = partyCache.get(c) ?? {};
      const seatInfo = seatData.find(s => s.congress === c);
      const totalSeats = seatInfo?.seats ?? 1;
      
      let dCount = 0, rCount = 0, iCount = 0;
      
      // Count party seats for this state
      for (let d = 0; d <= totalSeats; d++) {
        const key = d === 0 ? `${stateAbbrev}-1` : `${stateAbbrev}-${d}`;
        const party = partyData[key];
        if (party === "D") dCount++;
        else if (party === "R") rCount++;
        else if (party === "I") iCount++;
      }
      
      data.push({
        congress: c,
        year: congressYear(c),
        D: dCount,
        R: rCount,
        I: iCount,
      });
    }
    
    return data;
  }, [stateAbbrev, seatData, partyCache]);

  // Current congress representatives
  const currentReps = useMemo(() => {
    const members = membersCache.get(currentCongress) ?? {};
    const seatInfo = seatData.find(s => s.congress === currentCongress);
    const totalSeats = seatInfo?.seats ?? 1;
    const reps: { district: number; name: string; party: string; bioguide: string }[] = [];
    
    for (let d = 0; d <= totalSeats; d++) {
      const key = d === 0 ? `${stateAbbrev}-1` : `${stateAbbrev}-${d}`;
      const member = members[key];
      if (member) {
        reps.push({ district: d === 0 ? 1 : d, ...member });
      }
    }
    
    return reps.sort((a, b) => a.district - b.district);
  }, [stateAbbrev, currentCongress, seatData, membersCache]);

  // Find seat changes (redistricting events)
  const seatChanges = useMemo(() => {
    const changes: { congress: number; year: number; from: number; to: number }[] = [];
    for (let i = 1; i < seatData.length; i++) {
      if (seatData[i].seats !== seatData[i - 1].seats) {
        changes.push({
          congress: seatData[i].congress,
          year: congressYear(seatData[i].congress),
          from: seatData[i - 1].seats,
          to: seatData[i].seats,
        });
      }
    }
    return changes;
  }, [seatData]);

  const currentSeats = seatData.find(s => s.congress === currentCongress)?.seats ?? 1;

  return (
    <div className="absolute top-0 right-0 h-full w-[380px] max-w-[90vw] bg-black/90 backdrop-blur-xl border-l border-white/10 overflow-y-auto"
      style={{ zIndex: 25 }}>
      {/* Header */}
      <div className="sticky top-0 bg-black/95 backdrop-blur-sm border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <div>
          <h2 className="text-white font-bold text-base">{stateName}</h2>
          <p className="text-white/50 text-xs">{stateAbbrev} · {currentSeats} seat{currentSeats !== 1 ? "s" : ""} · {ordinal(currentCongress)} Congress</p>
        </div>
        <button onClick={onClose} className="text-white/40 hover:text-white text-xl leading-none p-1">×</button>
      </div>

      {/* Party Control Chart */}
      <div className="px-4 pt-4 pb-2">
        <h3 className="text-white/80 text-xs font-semibold uppercase tracking-wider mb-2">Party Control (1965–2025)</h3>
        <div className="h-[120px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={partyControlData} margin={{ top: 4, right: 4, bottom: 4, left: 0 }}>
              <XAxis
                dataKey="year"
                tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 9 }}
                axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                tickLine={false}
                interval={5}
              />
              <YAxis
                tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 9 }}
                axisLine={false}
                tickLine={false}
                width={20}
              />
              <Tooltip
                contentStyle={{ background: "rgba(0,0,0,0.9)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8, fontSize: 11 }}
                labelStyle={{ color: "rgba(255,255,255,0.7)" }}
                formatter={(value: number, name: string) => [value, name === "D" ? "Democrat" : name === "R" ? "Republican" : "Independent"]}
                labelFormatter={(year) => `${year}`}
              />
              <Area type="monotone" dataKey="D" stackId="1" fill="#1a4fa0" stroke="#5b8fd4" fillOpacity={0.7} />
              <Area type="monotone" dataKey="R" stackId="1" fill="#b22222" stroke="#e06060" fillOpacity={0.7} />
              <Area type="monotone" dataKey="I" stackId="1" fill="#7c3aed" stroke="#a78bfa" fillOpacity={0.7} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center gap-3 mt-1">
          <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-sm" style={{ background: "#1a4fa0" }} /><span className="text-[10px] text-white/50">Democrat</span></div>
          <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-sm" style={{ background: "#b22222" }} /><span className="text-[10px] text-white/50">Republican</span></div>
          {partyControlData.some(d => d.I > 0) && (
            <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-sm" style={{ background: "#7c3aed" }} /><span className="text-[10px] text-white/50">Independent</span></div>
          )}
        </div>
      </div>

      {/* Seat Count Over Time */}
      <div className="px-4 pt-3 pb-2 border-t border-white/5">
        <h3 className="text-white/80 text-xs font-semibold uppercase tracking-wider mb-2">Seat Count Over Time</h3>
        <div className="h-[80px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={seatData} margin={{ top: 4, right: 4, bottom: 4, left: 0 }}>
              <XAxis
                dataKey="congress"
                tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 9 }}
                axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                tickLine={false}
                interval={5}
                tickFormatter={(c) => `${congressYear(c)}`}
              />
              <YAxis
                tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 9 }}
                axisLine={false}
                tickLine={false}
                width={20}
                domain={[0, "auto"]}
              />
              <Tooltip
                contentStyle={{ background: "rgba(0,0,0,0.9)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8, fontSize: 11 }}
                labelStyle={{ color: "rgba(255,255,255,0.7)" }}
                formatter={(value: number) => [`${value} seat${value !== 1 ? "s" : ""}`, "Seats"]}
                labelFormatter={(c) => `${ordinal(c)} Congress (${congressYear(c)})`}
              />
              <Bar dataKey="seats" radius={[2, 2, 0, 0]}>
                {seatData.map((entry) => (
                  <Cell
                    key={entry.congress}
                    fill={entry.congress === currentCongress ? "#f59e0b" : "rgba(245,158,11,0.35)"}
                    stroke={entry.congress === currentCongress ? "#fbbf24" : "transparent"}
                    strokeWidth={entry.congress === currentCongress ? 1 : 0}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        {seatChanges.length > 0 && (
          <div className="mt-2 text-[10px] text-white/40">
            Apportionment changes: {seatChanges.map((ch, i) => (
              <span key={i}>
                {i > 0 && " · "}
                <span className="text-amber-400/70">{ch.year}</span>: {ch.from}→{ch.to}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Redistricting History */}
      <div className="px-4 pt-3 pb-2 border-t border-white/5">
        <h3 className="text-white/80 text-xs font-semibold uppercase tracking-wider mb-2">Redistricting History</h3>
        <div className="space-y-1">
          {redistrictingHistory.map((entry, idx) => {
            const isCurrent = currentCongress >= entry.startCongress && currentCongress <= entry.endCongress;
            return (
              <button
                key={idx}
                onClick={() => onCongressSelect(entry.startCongress)}
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                  isCurrent
                    ? "bg-amber-500/15 border border-amber-500/30"
                    : "bg-white/5 border border-white/5 hover:bg-white/10"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-semibold ${isCurrent ? "text-amber-300" : "text-white/70"}`}>
                    {ordinal(entry.startCongress)}–{ordinal(entry.endCongress)}
                  </span>
                  <span className="text-[10px] text-white/40">
                    {entry.startYear}–{entry.endYear}
                  </span>
                </div>
                {isCurrent && (
                  <span className="text-[9px] text-amber-400/60 mt-0.5 block">← Current boundaries</span>
                )}
              </button>
            );
          })}
        </div>
        <p className="text-[10px] text-white/30 mt-2">
          {redistrictingHistory.length} boundary set{redistrictingHistory.length !== 1 ? "s" : ""} since 1965.
          Click to jump to that era.
        </p>
      </div>

      {/* Current Representatives */}
      <div className="px-4 pt-3 pb-4 border-t border-white/5">
        <h3 className="text-white/80 text-xs font-semibold uppercase tracking-wider mb-2">
          Representatives ({ordinal(currentCongress)} Congress)
        </h3>
        {currentReps.length === 0 ? (
          <p className="text-white/30 text-xs italic">No member data available for this congress.</p>
        ) : (
          <div className="space-y-1 max-h-[200px] overflow-y-auto">
            {currentReps.map((rep) => {
              const partyColor = rep.party === "D" ? "#5b8fd4" : rep.party === "R" ? "#e06060" : "#a78bfa";
              return (
                <div key={rep.district} className="flex items-center gap-2 px-2 py-1.5 rounded bg-white/5">
                  {rep.bioguide && (
                    <img
                      src={`https://bioguide.congress.gov/bioguide/photo/${rep.bioguide[0]}/${rep.bioguide}.jpg`}
                      alt={rep.name}
                      className="w-6 h-6 rounded-full object-cover border border-white/20 flex-shrink-0"
                      onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-[11px] font-medium truncate">{rep.name}</div>
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: partyColor }} />
                      <span className="text-[9px]" style={{ color: partyColor }}>
                        {rep.party === "D" ? "D" : rep.party === "R" ? "R" : "I"}-{rep.district}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
