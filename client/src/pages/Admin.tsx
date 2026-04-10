import { useState, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Lock, LogOut, Search, ChevronDown, ChevronUp, Save, ArrowLeft, RefreshCw, AlertTriangle, Zap, Star, StarOff, Pin, PinOff } from "lucide-react";
import ElectionNightPanel from "@/components/ElectionNightPanel";
import { Link } from "wouter";
import { getRatingClass } from "@/lib/electionUtils";
import type { SenateRace, HouseRace, RedistrictingState, Referendum, GovernorRace } from "../../../drizzle/schema";

const ADMIN_TOKEN_KEY = "election_admin_token";

// ─── Login Screen ─────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }: { onLogin: (token: string) => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const loginMutation = trpc.admin.login.useMutation({
    onSuccess: (data) => {
      localStorage.setItem(ADMIN_TOKEN_KEY, data.token);
      onLogin(data.token);
      toast.success("Logged in to Admin Panel");
    },
    onError: (err) => {
      setError(err.message || "Incorrect password");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    loginMutation.mutate({ password });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-blue-700 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Admin Panel</h1>
          <p className="text-sm text-muted-foreground mt-1">2026 U.S. Election Center</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Admin Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-muted border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Enter admin password"
              autoFocus
            />
          </div>
          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <button
            type="submit"
            disabled={loginMutation.isPending || !password}
            className="w-full bg-blue-700 hover:bg-blue-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm"
          >
            {loginMutation.isPending ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="text-center mt-4">
          <Link href="/" className="text-xs text-muted-foreground hover:text-foreground flex items-center justify-center gap-1">
            <ArrowLeft className="w-3 h-3" />
            Back to Election Map
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Senate Race Editor ───────────────────────────────────────────────────────
function SenateEditor({ race, token, onUpdated }: { race: SenateRace; token: string; onUpdated: () => void }) {
  const [form, setForm] = useState({
    incumbent: race.incumbent ?? "",
    incumbentParty: race.incumbentParty ?? "R",
    incumbentRetiring: race.incumbentRetiring ?? false,
    candidate1Name: race.candidate1Name ?? "",
    candidate1Party: race.candidate1Party ?? "D",
    candidate1VotePct: race.candidate1VotePct ? String(race.candidate1VotePct) : "",
    candidate2Name: race.candidate2Name ?? "",
    candidate2Party: race.candidate2Party ?? "R",
    candidate2VotePct: race.candidate2VotePct ? String(race.candidate2VotePct) : "",
    calledWinner: race.calledWinner ?? "",
    calledParty: race.calledParty ?? "",
    rating: race.rating ?? "Solid R",
    status: race.status ?? "Scheduled",
    primaryDate: race.primaryDate ?? "",
    primaryRunoffDate: race.primaryRunoffDate ?? "",
    pctReporting: race.pctReporting ? String(race.pctReporting) : "",
    notes: race.notes ?? "",
  });

  const utils = trpc.useUtils();
  const updateMutation = trpc.senate.update.useMutation({
    onSuccess: () => {
      toast.success(`${race.stateName} Senate race updated`);
      utils.senate.list.invalidate();
      utils.scoreboard.get.invalidate();
      onUpdated();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSave = () => {
    updateMutation.mutate({
      id: race.id,
      incumbent: form.incumbent || null,
      incumbentParty: (form.incumbentParty as any) || null,
      incumbentRetiring: form.incumbentRetiring,
      candidate1Name: form.candidate1Name || null,
      candidate1Party: (form.candidate1Party as any) || null,
      candidate1VotePct: form.candidate1VotePct ? parseFloat(form.candidate1VotePct) : null,
      candidate2Name: form.candidate2Name || null,
      candidate2Party: (form.candidate2Party as any) || null,
      candidate2VotePct: form.candidate2VotePct ? parseFloat(form.candidate2VotePct) : null,
      calledWinner: form.calledWinner || null,
      calledParty: (form.calledParty as any) || null,
      rating: form.rating as any,
      status: form.status as any,
      primaryDate: form.primaryDate || null,
      primaryRunoffDate: form.primaryRunoffDate || null,
      pctReporting: form.pctReporting ? parseFloat(form.pctReporting) : null,
      notes: form.notes || null,
      adminToken: token,
    });
  };

  const set = (key: string, val: any) => setForm(prev => ({ ...prev, [key]: val }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Status</label>
          <select className="w-full bg-muted border border-border rounded px-2 py-1.5 text-sm text-foreground focus:outline-none"
            value={form.status} onChange={e => set("status", e.target.value)}>
            {["Scheduled", "Primary", "General", "Called", "Certified"].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Rating</label>
          <select className="w-full bg-muted border border-border rounded px-2 py-1.5 text-sm text-foreground focus:outline-none"
            value={form.rating} onChange={e => set("rating", e.target.value)}>
            {["Solid D", "Likely D", "Lean D", "Toss-up", "Lean R", "Likely R", "Solid R"].map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="border-t border-border pt-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Incumbent</p>
        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-2">
            <input className="w-full bg-muted border border-border rounded px-2 py-1.5 text-sm text-foreground focus:outline-none"
              placeholder="Incumbent name" value={form.incumbent} onChange={e => set("incumbent", e.target.value)} />
          </div>
          <select className="bg-muted border border-border rounded px-2 py-1.5 text-sm text-foreground focus:outline-none"
            value={form.incumbentParty} onChange={e => set("incumbentParty", e.target.value)}>
            {["D", "R", "I"].map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <label className="flex items-center gap-2 mt-2 text-sm text-muted-foreground cursor-pointer">
          <input type="checkbox" checked={form.incumbentRetiring} onChange={e => set("incumbentRetiring", e.target.checked)} className="rounded" />
          Incumbent retiring
        </label>
      </div>

      <div className="border-t border-border pt-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Candidate 1</p>
        <div className="grid grid-cols-3 gap-2 mb-1.5">
          <div className="col-span-2">
            <input className="w-full bg-muted border border-border rounded px-2 py-1.5 text-sm text-foreground focus:outline-none"
              placeholder="Candidate name" value={form.candidate1Name} onChange={e => set("candidate1Name", e.target.value)} />
          </div>
          <select className="bg-muted border border-border rounded px-2 py-1.5 text-sm text-foreground focus:outline-none"
            value={form.candidate1Party} onChange={e => set("candidate1Party", e.target.value)}>
            {["D", "R", "I", "L", "G"].map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <input className="w-full bg-muted border border-border rounded px-2 py-1.5 text-sm text-foreground focus:outline-none"
          placeholder="Vote % (e.g. 52.3)" type="number" step="0.1" min="0" max="100"
          value={form.candidate1VotePct} onChange={e => set("candidate1VotePct", e.target.value)} />
      </div>

      <div className="border-t border-border pt-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Candidate 2</p>
        <div className="grid grid-cols-3 gap-2 mb-1.5">
          <div className="col-span-2">
            <input className="w-full bg-muted border border-border rounded px-2 py-1.5 text-sm text-foreground focus:outline-none"
              placeholder="Candidate name" value={form.candidate2Name} onChange={e => set("candidate2Name", e.target.value)} />
          </div>
          <select className="bg-muted border border-border rounded px-2 py-1.5 text-sm text-foreground focus:outline-none"
            value={form.candidate2Party} onChange={e => set("candidate2Party", e.target.value)}>
            {["D", "R", "I", "L", "G"].map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <input className="w-full bg-muted border border-border rounded px-2 py-1.5 text-sm text-foreground focus:outline-none"
          placeholder="Vote % (e.g. 47.1)" type="number" step="0.1" min="0" max="100"
          value={form.candidate2VotePct} onChange={e => set("candidate2VotePct", e.target.value)} />
      </div>

      <div className="border-t border-border pt-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Called Result</p>
        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-2">
            <input className="w-full bg-muted border border-border rounded px-2 py-1.5 text-sm text-foreground focus:outline-none"
              placeholder="Called winner name" value={form.calledWinner} onChange={e => set("calledWinner", e.target.value)} />
          </div>
          <select className="bg-muted border border-border rounded px-2 py-1.5 text-sm text-foreground focus:outline-none"
            value={form.calledParty} onChange={e => set("calledParty", e.target.value)}>
            <option value="">—</option>
            {["D", "R", "I"].map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>

      <div className="border-t border-border pt-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Dates & Reporting</p>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Primary Date</label>
            <input className="w-full bg-muted border border-border rounded px-2 py-1.5 text-sm text-foreground focus:outline-none"
              value={form.primaryDate} onChange={e => set("primaryDate", e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Runoff Date</label>
            <input className="w-full bg-muted border border-border rounded px-2 py-1.5 text-sm text-foreground focus:outline-none"
              value={form.primaryRunoffDate} onChange={e => set("primaryRunoffDate", e.target.value)} />
          </div>
        </div>
        <div className="mt-2">
          <label className="block text-xs text-muted-foreground mb-1">% Reporting</label>
          <input className="w-full bg-muted border border-border rounded px-2 py-1.5 text-sm text-foreground focus:outline-none"
            type="number" step="0.1" min="0" max="100" placeholder="0.0"
            value={form.pctReporting} onChange={e => set("pctReporting", e.target.value)} />
        </div>
      </div>

      <div className="border-t border-border pt-3">
        <label className="block text-xs text-muted-foreground mb-1">Notes</label>
        <textarea className="w-full bg-muted border border-border rounded px-2 py-1.5 text-sm text-foreground focus:outline-none resize-none"
          rows={2} value={form.notes} onChange={e => set("notes", e.target.value)} />
      </div>

      <button
        onClick={handleSave}
        disabled={updateMutation.isPending}
        className="w-full bg-blue-700 hover:bg-blue-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
      >
        <Save className="w-4 h-4" />
        {updateMutation.isPending ? "Saving..." : "Save Changes"}
      </button>
    </div>
  );
}

// ─── House Race Editor ────────────────────────────────────────────────────────
function HouseEditor({ race, token, onUpdated }: { race: HouseRace; token: string; onUpdated: () => void }) {
  const [form, setForm] = useState({
    incumbent: race.incumbent ?? "",
    incumbentParty: race.incumbentParty ?? "R",
    incumbentRetiring: race.incumbentRetiring ?? false,
    candidate1Name: race.candidate1Name ?? "",
    candidate1Party: race.candidate1Party ?? "D",
    candidate1VotePct: race.candidate1VotePct ? String(race.candidate1VotePct) : "",
    candidate2Name: race.candidate2Name ?? "",
    candidate2Party: race.candidate2Party ?? "R",
    candidate2VotePct: race.candidate2VotePct ? String(race.candidate2VotePct) : "",
    calledWinner: race.calledWinner ?? "",
    calledParty: race.calledParty ?? "",
    rating: race.rating ?? "Solid R",
    status: race.status ?? "Scheduled",
    pctReporting: race.pctReporting ? String(race.pctReporting) : "",
    notes: race.notes ?? "",
  });

  const utils = trpc.useUtils();
  const updateMutation = trpc.house.update.useMutation({
    onSuccess: () => {
      toast.success(`${race.stateName} ${race.districtLabel === "AL" ? "At-Large" : `District ${race.district}`} updated`);
      utils.house.list.invalidate();
      utils.scoreboard.get.invalidate();
      onUpdated();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSave = () => {
    updateMutation.mutate({
      id: race.id,
      incumbent: form.incumbent || null,
      incumbentParty: (form.incumbentParty as any) || null,
      incumbentRetiring: form.incumbentRetiring,
      candidate1Name: form.candidate1Name || null,
      candidate1Party: (form.candidate1Party as any) || null,
      candidate1VotePct: form.candidate1VotePct ? parseFloat(form.candidate1VotePct) : null,
      candidate2Name: form.candidate2Name || null,
      candidate2Party: (form.candidate2Party as any) || null,
      candidate2VotePct: form.candidate2VotePct ? parseFloat(form.candidate2VotePct) : null,
      calledWinner: form.calledWinner || null,
      calledParty: (form.calledParty as any) || null,
      rating: form.rating as any,
      status: form.status as any,
      pctReporting: form.pctReporting ? parseFloat(form.pctReporting) : null,
      notes: form.notes || null,
      adminToken: token,
    });
  };

  const set = (key: string, val: any) => setForm(prev => ({ ...prev, [key]: val }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Status</label>
          <select className="w-full bg-muted border border-border rounded px-2 py-1.5 text-sm text-foreground focus:outline-none"
            value={form.status} onChange={e => set("status", e.target.value)}>
            {["Scheduled", "Primary", "General", "Called", "Certified"].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Rating</label>
          <select className="w-full bg-muted border border-border rounded px-2 py-1.5 text-sm text-foreground focus:outline-none"
            value={form.rating} onChange={e => set("rating", e.target.value)}>
            {["Solid D", "Likely D", "Lean D", "Toss-up", "Lean R", "Likely R", "Solid R"].map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="border-t border-border pt-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Incumbent</p>
        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-2">
            <input className="w-full bg-muted border border-border rounded px-2 py-1.5 text-sm text-foreground focus:outline-none"
              placeholder="Incumbent name" value={form.incumbent} onChange={e => set("incumbent", e.target.value)} />
          </div>
          <select className="bg-muted border border-border rounded px-2 py-1.5 text-sm text-foreground focus:outline-none"
            value={form.incumbentParty} onChange={e => set("incumbentParty", e.target.value)}>
            {["D", "R", "I"].map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <label className="flex items-center gap-2 mt-2 text-sm text-muted-foreground cursor-pointer">
          <input type="checkbox" checked={form.incumbentRetiring} onChange={e => set("incumbentRetiring", e.target.checked)} className="rounded" />
          Incumbent retiring / open seat
        </label>
      </div>

      <div className="border-t border-border pt-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Candidates</p>
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <input className="w-full bg-muted border border-border rounded px-2 py-1.5 text-sm text-foreground focus:outline-none"
                placeholder="Candidate 1" value={form.candidate1Name} onChange={e => set("candidate1Name", e.target.value)} />
            </div>
            <div className="flex gap-1">
              <select className="flex-1 bg-muted border border-border rounded px-1 py-1.5 text-sm text-foreground focus:outline-none"
                value={form.candidate1Party} onChange={e => set("candidate1Party", e.target.value)}>
                {["D", "R", "I", "L", "G"].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <input className="w-14 bg-muted border border-border rounded px-1 py-1.5 text-sm text-foreground focus:outline-none"
                type="number" step="0.1" min="0" max="100" placeholder="%"
                value={form.candidate1VotePct} onChange={e => set("candidate1VotePct", e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <input className="w-full bg-muted border border-border rounded px-2 py-1.5 text-sm text-foreground focus:outline-none"
                placeholder="Candidate 2" value={form.candidate2Name} onChange={e => set("candidate2Name", e.target.value)} />
            </div>
            <div className="flex gap-1">
              <select className="flex-1 bg-muted border border-border rounded px-1 py-1.5 text-sm text-foreground focus:outline-none"
                value={form.candidate2Party} onChange={e => set("candidate2Party", e.target.value)}>
                {["D", "R", "I", "L", "G"].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <input className="w-14 bg-muted border border-border rounded px-1 py-1.5 text-sm text-foreground focus:outline-none"
                type="number" step="0.1" min="0" max="100" placeholder="%"
                value={form.candidate2VotePct} onChange={e => set("candidate2VotePct", e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-border pt-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Called Result</p>
        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-2">
            <input className="w-full bg-muted border border-border rounded px-2 py-1.5 text-sm text-foreground focus:outline-none"
              placeholder="Called winner" value={form.calledWinner} onChange={e => set("calledWinner", e.target.value)} />
          </div>
          <select className="bg-muted border border-border rounded px-2 py-1.5 text-sm text-foreground focus:outline-none"
            value={form.calledParty} onChange={e => set("calledParty", e.target.value)}>
            <option value="">—</option>
            {["D", "R", "I"].map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div className="mt-2">
          <label className="block text-xs text-muted-foreground mb-1">% Reporting</label>
          <input className="w-full bg-muted border border-border rounded px-2 py-1.5 text-sm text-foreground focus:outline-none"
            type="number" step="0.1" min="0" max="100" placeholder="0.0"
            value={form.pctReporting} onChange={e => set("pctReporting", e.target.value)} />
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={updateMutation.isPending}
        className="w-full bg-blue-700 hover:bg-blue-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
      >
        <Save className="w-4 h-4" />
        {updateMutation.isPending ? "Saving..." : "Save Changes"}
      </button>
    </div>
  );
}

// ─── Referendum Editor ────────────────────────────────────────────────────────
function ReferendumEditor({ referendum, token, onUpdated }: { referendum: Referendum; token: string; onUpdated: () => void }) {
  const [form, setForm] = useState({
    yesVotes: String(referendum.yesVotes ?? 0),
    noVotes: String(referendum.noVotes ?? 0),
    pctReporting: referendum.pctReporting ? String(referendum.pctReporting) : "0",
    status: referendum.status ?? "Scheduled",
    calledResult: referendum.calledResult ?? "",
    notes: referendum.notes ?? "",
  });

  const utils = trpc.useUtils();
  const updateMutation = trpc.referendum.update.useMutation({
    onSuccess: () => {
      toast.success(`${referendum.stateName} referendum updated`);
      utils.referendum.list.invalidate();
      onUpdated();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSave = () => {
    updateMutation.mutate({
      id: referendum.id,
      yesVotes: parseInt(form.yesVotes) || 0,
      noVotes: parseInt(form.noVotes) || 0,
      pctReporting: parseFloat(form.pctReporting) || 0,
      status: form.status as any,
      calledResult: (form.calledResult as any) || null,
      notes: form.notes || null,
      adminToken: token,
    });
  };

  const set = (key: string, val: any) => setForm(prev => ({ ...prev, [key]: val }));

  const total = (parseInt(form.yesVotes) || 0) + (parseInt(form.noVotes) || 0);
  const yesPct = total > 0 ? ((parseInt(form.yesVotes) || 0) / total * 100).toFixed(1) : "0.0";
  const noPct = total > 0 ? ((parseInt(form.noVotes) || 0) / total * 100).toFixed(1) : "0.0";

  return (
    <div className="space-y-4">
      <div className="bg-muted/30 rounded-lg p-3 text-sm">
        <p className="font-semibold text-foreground mb-1">{referendum.name}</p>
        <p className="text-xs text-muted-foreground">{referendum.electionDate}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Status</label>
          <select className="w-full bg-muted border border-border rounded px-2 py-1.5 text-sm text-foreground focus:outline-none"
            value={form.status} onChange={e => set("status", e.target.value)}>
            {["Scheduled", "Voting", "Called", "Certified"].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Called Result</label>
          <select className="w-full bg-muted border border-border rounded px-2 py-1.5 text-sm text-foreground focus:outline-none"
            value={form.calledResult} onChange={e => set("calledResult", e.target.value)}>
            <option value="">Not called</option>
            <option value="Yes">Yes</option>
            <option value="No">No</option>
          </select>
        </div>
      </div>

      <div className="border-t border-border pt-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Vote Tallies</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-green-400 mb-1">Yes Votes ({yesPct}%)</label>
            <input className="w-full bg-muted border border-border rounded px-2 py-1.5 text-sm text-foreground focus:outline-none"
              type="number" min="0" value={form.yesVotes} onChange={e => set("yesVotes", e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-red-400 mb-1">No Votes ({noPct}%)</label>
            <input className="w-full bg-muted border border-border rounded px-2 py-1.5 text-sm text-foreground focus:outline-none"
              type="number" min="0" value={form.noVotes} onChange={e => set("noVotes", e.target.value)} />
          </div>
        </div>
        <div className="mt-2">
          <label className="block text-xs text-muted-foreground mb-1">% Precincts Reporting</label>
          <input className="w-full bg-muted border border-border rounded px-2 py-1.5 text-sm text-foreground focus:outline-none"
            type="number" step="0.1" min="0" max="100" value={form.pctReporting} onChange={e => set("pctReporting", e.target.value)} />
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={updateMutation.isPending}
        className="w-full bg-blue-700 hover:bg-blue-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
      >
        <Save className="w-4 h-4" />
        {updateMutation.isPending ? "Saving..." : "Save Tallies"}
      </button>
    </div>
  );
}

// ─── Redistricting Editor ─────────────────────────────────────────────────────
function RedistrictingEditor({ state, token, onUpdated }: { state: RedistrictingState; token: string; onUpdated: () => void }) {
  const [form, setForm] = useState({
    enacted: state.enacted ?? false,
    status: state.status ?? "",
    projectedImpact: state.projectedImpact ?? "",
    litigationNotes: state.litigationNotes ?? "",
  });

  const utils = trpc.useUtils();
  const updateMutation = trpc.redistricting.update.useMutation({
    onSuccess: () => {
      toast.success(`${state.stateName} redistricting updated`);
      utils.redistricting.list.invalidate();
      onUpdated();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSave = () => {
    updateMutation.mutate({
      id: state.id,
      enacted: form.enacted,
      status: form.status || null,
      projectedImpact: form.projectedImpact || null,
      litigationNotes: form.litigationNotes || null,
      adminToken: token,
    });
  };

  const set = (key: string, val: any) => setForm(prev => ({ ...prev, [key]: val }));

  return (
    <div className="space-y-4">
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input type="checkbox" checked={form.enacted} onChange={e => set("enacted", e.target.checked)} className="rounded" />
        <span className="text-foreground">Map Enacted</span>
      </label>

      <div>
        <label className="block text-xs text-muted-foreground mb-1">Current Status</label>
        <textarea className="w-full bg-muted border border-border rounded px-2 py-1.5 text-sm text-foreground focus:outline-none resize-none"
          rows={2} value={form.status} onChange={e => set("status", e.target.value)} />
      </div>

      <div>
        <label className="block text-xs text-muted-foreground mb-1">Projected Impact</label>
        <input className="w-full bg-muted border border-border rounded px-2 py-1.5 text-sm text-foreground focus:outline-none"
          placeholder="e.g. +2 R, +1 D, TBD" value={form.projectedImpact} onChange={e => set("projectedImpact", e.target.value)} />
      </div>

      <div>
        <label className="block text-xs text-muted-foreground mb-1">Litigation Notes</label>
        <textarea className="w-full bg-muted border border-border rounded px-2 py-1.5 text-sm text-foreground focus:outline-none resize-none"
          rows={2} value={form.litigationNotes} onChange={e => set("litigationNotes", e.target.value)} />
      </div>

      <button
        onClick={handleSave}
        disabled={updateMutation.isPending}
        className="w-full bg-blue-700 hover:bg-blue-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
      >
        <Save className="w-4 h-4" />
        {updateMutation.isPending ? "Saving..." : "Save Changes"}
      </button>
    </div>
  );
}

//// ─── Primary Results Editor ────────────────────────────────────────────────
function PrimaryResultsPanel({ token, onUpdated }: { token: string; onUpdated: () => void }) {
  const [selectedRace, setSelectedRace] = useState<{ type: "senate" | "house"; race: SenateRace | HouseRace } | null>(null);
  const [winnerName, setWinnerName] = useState("");
  const [winnerParty, setWinnerParty] = useState<"D" | "R" | "I" | "L" | "G">("D");

  const { data, isLoading, refetch } = trpc.primary.listPending.useQuery({ adminToken: token });

  const promoteSenate = trpc.primary.promoteSenate.useMutation({
    onSuccess: () => { toast.success("Primary winner promoted to General!"); setSelectedRace(null); setWinnerName(""); onUpdated(); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const promoteHouse = trpc.primary.promoteHouse.useMutation({
    onSuccess: () => { toast.success("Primary winner promoted to General!"); setSelectedRace(null); setWinnerName(""); onUpdated(); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const handlePromote = () => {
    if (!selectedRace || !winnerName.trim()) return;
    if (selectedRace.type === "senate") {
      promoteSenate.mutate({ id: selectedRace.race.id, adminToken: token, winnerName: winnerName.trim(), winnerParty });
    } else {
      promoteHouse.mutate({ id: selectedRace.race.id, adminToken: token, winnerName: winnerName.trim(), winnerParty });
    }
  };

  const totalPending = (data?.senate.length ?? 0) + (data?.house.length ?? 0);

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left: pending primaries list */}
      <div className="w-64 border-r border-border overflow-y-auto flex-shrink-0">
        <div className="p-3 border-b border-border">
          <p className="text-xs font-semibold text-foreground">Races in Primary Status</p>
          <p className="text-xs text-muted-foreground mt-0.5">{isLoading ? "Loading..." : `${totalPending} pending`}</p>
        </div>
        {!isLoading && totalPending === 0 && (
          <div className="p-4 text-center text-xs text-muted-foreground">
            No races currently in Primary status.
            <br />Update a race status to "Primary" first.
          </div>
        )}
        {(data?.senate ?? []).length > 0 && (
          <div>
            <p className="px-3 py-1.5 text-xs font-bold text-muted-foreground bg-muted/30 border-b border-border">SENATE</p>
            {(data?.senate ?? []).map(race => (
              <button key={race.id}
                onClick={() => { setSelectedRace({ type: "senate", race }); setWinnerName(race.incumbent ?? ""); }}
                className={`w-full text-left px-3 py-2.5 border-b border-border/50 hover:bg-accent transition-colors ${
                  selectedRace?.race.id === race.id ? "bg-accent" : ""
                }`}>
                <p className="text-sm font-medium">{race.stateName}</p>
                <p className="text-xs text-muted-foreground">{race.primaryDate ?? "Date TBD"}</p>
              </button>
            ))}
          </div>
        )}
        {(data?.house ?? []).length > 0 && (
          <div>
            <p className="px-3 py-1.5 text-xs font-bold text-muted-foreground bg-muted/30 border-b border-border">HOUSE</p>
            {(data?.house ?? []).map(race => {
              const hr = race as HouseRace;
              return (
                <button key={race.id}
                  onClick={() => { setSelectedRace({ type: "house", race }); setWinnerName(race.incumbent ?? ""); }}
                  className={`w-full text-left px-3 py-2.5 border-b border-border/50 hover:bg-accent transition-colors ${
                    selectedRace?.race.id === race.id ? "bg-accent" : ""
                  }`}>
                  <p className="text-sm font-medium">{hr.stateCode}-{hr.districtLabel}</p>
                  <p className="text-xs text-muted-foreground truncate">{race.incumbent ?? "Open seat"}</p>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Right: promote form */}
      <div className="flex-1 p-6 overflow-y-auto">
        {!selectedRace ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-12 h-12 rounded-full bg-yellow-900/30 flex items-center justify-center mb-4">
              <span className="text-2xl">🗳️</span>
            </div>
            <p className="text-foreground font-medium">Select a race to record primary results</p>
            <p className="text-xs text-muted-foreground mt-1">The winner will be promoted to the general election candidate slot and the race status will advance to General.</p>
          </div>
        ) : (
          <div className="max-w-md">
            <h2 className="text-lg font-bold text-foreground mb-1">
              {selectedRace.type === "senate"
                ? `${(selectedRace.race as SenateRace).stateName} Senate Primary`
                : `${(selectedRace.race as HouseRace).stateName} — ${(selectedRace.race as HouseRace).districtLabel === "AL" ? "At-Large" : `District ${(selectedRace.race as HouseRace).district}`} Primary`
              }
            </h2>
            <p className="text-xs text-muted-foreground mb-6">Recording the primary winner will set them as Candidate 1 and advance the race status to General.</p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Primary Winner Name</label>
                <input
                  className="w-full bg-muted border border-border rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Full name of primary winner"
                  value={winnerName}
                  onChange={e => setWinnerName(e.target.value)}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Party</label>
                <select
                  className="w-full bg-muted border border-border rounded px-3 py-2 text-sm text-foreground focus:outline-none"
                  value={winnerParty}
                  onChange={e => setWinnerParty(e.target.value as any)}
                >
                  <option value="D">Democrat (D)</option>
                  <option value="R">Republican (R)</option>
                  <option value="I">Independent (I)</option>
                  <option value="L">Libertarian (L)</option>
                  <option value="G">Green (G)</option>
                </select>
              </div>
              <div className="bg-yellow-900/20 border border-yellow-700/30 rounded-lg p-3">
                <p className="text-xs text-yellow-400 font-medium">What happens next:</p>
                <ul className="text-xs text-muted-foreground mt-1 space-y-0.5">
                  <li>• Candidate 1 will be set to <strong className="text-foreground">{winnerName || "[winner name]"}</strong> ({winnerParty})</li>
                  <li>• Race status will advance from Primary → General</li>
                  <li>• Map and scoreboard will update immediately</li>
                </ul>
              </div>
              <button
                onClick={handlePromote}
                disabled={!winnerName.trim() || promoteSenate.isPending || promoteHouse.isPending}
                className="w-full bg-yellow-700 hover:bg-yellow-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                {(promoteSenate.isPending || promoteHouse.isPending) ? "Promoting..." : "Promote to General Election"}
              </button>
              <button
                onClick={() => setSelectedRace(null)}
                className="w-full text-xs text-muted-foreground hover:text-foreground py-1 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Governor Race Editor ───────────────────────────────────────────────────
function GovernorEditor({ race, token, onUpdated }: { race: GovernorRace; token: string; onUpdated: () => void }) {
  const [form, setForm] = useState({
    incumbentName: race.incumbentName ?? "",
    incumbentParty: race.incumbentParty ?? "R",
    isOpen: race.isOpen ?? false,
    isTermLimited: race.isTermLimited ?? false,
    previousParty: race.previousParty ?? "R",
    rating: race.rating ?? "Solid R",
    status: race.status ?? "Scheduled",
    demCandidate: race.demCandidate ?? "",
    repCandidate: race.repCandidate ?? "",
    calledParty: race.calledParty ?? "",
    demVotes: race.demVotes ? String(race.demVotes) : "",
    repVotes: race.repVotes ? String(race.repVotes) : "",
    pctReporting: race.pctReporting ? String(race.pctReporting) : "",
    primaryDate: race.primaryDate ?? "",
    runoffDate: race.runoffDate ?? "",
    generalDate: race.generalDate ?? "",
    notes: race.notes ?? "",
  });

  const utils = trpc.useUtils();
  const updateMutation = trpc.governor.update.useMutation({
    onSuccess: () => {
      toast.success(`${race.stateName} governor race updated`);
      utils.governor.list.invalidate();
      onUpdated();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSave = () => {
    updateMutation.mutate({
      id: race.id,
      adminToken: token,
      incumbentName: form.incumbentName || null,
      incumbentParty: (form.incumbentParty as any) || null,
      isOpen: form.isOpen,
      isTermLimited: form.isTermLimited,
      previousParty: form.previousParty as any,
      rating: form.rating as any,
      status: form.status as any,
      demCandidate: form.demCandidate || null,
      repCandidate: form.repCandidate || null,
      calledParty: (form.calledParty as any) || null,
      demVotes: form.demVotes ? parseInt(form.demVotes) : undefined,
      repVotes: form.repVotes ? parseInt(form.repVotes) : undefined,
      pctReporting: form.pctReporting ? parseFloat(form.pctReporting) : undefined,
      primaryDate: form.primaryDate || null,
      runoffDate: form.runoffDate || null,
      generalDate: form.generalDate || undefined,
      notes: form.notes || null,
    });
  };

  const set = (key: string, val: any) => setForm(prev => ({ ...prev, [key]: val }));

  const demVotesNum = parseInt(form.demVotes) || 0;
  const repVotesNum = parseInt(form.repVotes) || 0;
  const totalVotes = demVotesNum + repVotesNum;
  const demPct = totalVotes > 0 ? (demVotesNum / totalVotes * 100).toFixed(1) : "0.0";
  const repPct = totalVotes > 0 ? (repVotesNum / totalVotes * 100).toFixed(1) : "0.0";

  return (
    <div className="space-y-4">
      {/* Status & Rating */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Status</label>
          <select className="w-full bg-muted border border-border rounded px-2 py-1.5 text-sm text-foreground focus:outline-none"
            value={form.status} onChange={e => set("status", e.target.value)}>
            {["Scheduled", "Voting", "Called", "Certified"].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Rating</label>
          <select className="w-full bg-muted border border-border rounded px-2 py-1.5 text-sm text-foreground focus:outline-none"
            value={form.rating} onChange={e => set("rating", e.target.value)}>
            {["Solid D", "Likely D", "Lean D", "Toss-up", "Lean R", "Likely R", "Solid R"].map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Incumbent */}
      <div className="border-t border-border pt-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Incumbent / Seat</p>
        <div className="grid grid-cols-3 gap-2 mb-2">
          <div className="col-span-2">
            <input className="w-full bg-muted border border-border rounded px-2 py-1.5 text-sm text-foreground focus:outline-none"
              placeholder="Incumbent name" value={form.incumbentName} onChange={e => set("incumbentName", e.target.value)} />
          </div>
          <select className="bg-muted border border-border rounded px-2 py-1.5 text-sm text-foreground focus:outline-none"
            value={form.incumbentParty} onChange={e => set("incumbentParty", e.target.value)}>
            {["D", "R", "I"].map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
            <input type="checkbox" checked={form.isOpen} onChange={e => set("isOpen", e.target.checked)} className="rounded" />
            Open seat
          </label>
          <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
            <input type="checkbox" checked={form.isTermLimited} onChange={e => set("isTermLimited", e.target.checked)} className="rounded" />
            Term-limited
          </label>
        </div>
        <div className="mt-2">
          <label className="block text-xs text-muted-foreground mb-1">Previous Party (for flip tracking)</label>
          <select className="w-full bg-muted border border-border rounded px-2 py-1.5 text-sm text-foreground focus:outline-none"
            value={form.previousParty} onChange={e => set("previousParty", e.target.value)}>
            {["D", "R", "I"].map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>

      {/* Candidates */}
      <div className="border-t border-border pt-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Candidates</p>
        <div className="space-y-2">
          <div>
            <label className="block text-xs text-blue-400 mb-1">Democratic Candidate</label>
            <input className="w-full bg-muted border border-border rounded px-2 py-1.5 text-sm text-foreground focus:outline-none"
              placeholder="Dem candidate name" value={form.demCandidate} onChange={e => set("demCandidate", e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-red-400 mb-1">Republican Candidate</label>
            <input className="w-full bg-muted border border-border rounded px-2 py-1.5 text-sm text-foreground focus:outline-none"
              placeholder="Rep candidate name" value={form.repCandidate} onChange={e => set("repCandidate", e.target.value)} />
          </div>
        </div>
      </div>

      {/* Called Result */}
      <div className="border-t border-border pt-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Called Result</p>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Called Party</label>
          <select className="w-full bg-muted border border-border rounded px-2 py-1.5 text-sm text-foreground focus:outline-none"
            value={form.calledParty} onChange={e => set("calledParty", e.target.value)}>
            <option value="">Not called</option>
            <option value="D">D — Democrat wins</option>
            <option value="R">R — Republican wins</option>
            <option value="I">I — Independent wins</option>
          </select>
        </div>
      </div>

      {/* Vote Tallies */}
      <div className="border-t border-border pt-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Vote Tallies</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-blue-400 mb-1">Dem Votes ({demPct}%)</label>
            <input className="w-full bg-muted border border-border rounded px-2 py-1.5 text-sm text-foreground focus:outline-none"
              type="number" min="0" value={form.demVotes} onChange={e => set("demVotes", e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-red-400 mb-1">Rep Votes ({repPct}%)</label>
            <input className="w-full bg-muted border border-border rounded px-2 py-1.5 text-sm text-foreground focus:outline-none"
              type="number" min="0" value={form.repVotes} onChange={e => set("repVotes", e.target.value)} />
          </div>
        </div>
        <div className="mt-2">
          <label className="block text-xs text-muted-foreground mb-1">% Precincts Reporting</label>
          <input className="w-full bg-muted border border-border rounded px-2 py-1.5 text-sm text-foreground focus:outline-none"
            type="number" step="0.1" min="0" max="100" placeholder="0.0"
            value={form.pctReporting} onChange={e => set("pctReporting", e.target.value)} />
        </div>
      </div>

      {/* Dates */}
      <div className="border-t border-border pt-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Election Dates</p>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Primary Date</label>
            <input className="w-full bg-muted border border-border rounded px-2 py-1.5 text-sm text-foreground focus:outline-none"
              placeholder="e.g. June 2, 2026" value={form.primaryDate} onChange={e => set("primaryDate", e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Runoff Date</label>
            <input className="w-full bg-muted border border-border rounded px-2 py-1.5 text-sm text-foreground focus:outline-none"
              placeholder="If applicable" value={form.runoffDate} onChange={e => set("runoffDate", e.target.value)} />
          </div>
        </div>
        <div className="mt-2">
          <label className="block text-xs text-muted-foreground mb-1">General Election Date</label>
          <input className="w-full bg-muted border border-border rounded px-2 py-1.5 text-sm text-foreground focus:outline-none"
            placeholder="e.g. November 3, 2026" value={form.generalDate} onChange={e => set("generalDate", e.target.value)} />
        </div>
      </div>

      {/* Notes */}
      <div className="border-t border-border pt-3">
        <label className="block text-xs text-muted-foreground mb-1">Notes / Analyst Context</label>
        <textarea className="w-full bg-muted border border-border rounded px-2 py-1.5 text-sm text-foreground focus:outline-none resize-none"
          rows={3} value={form.notes} onChange={e => set("notes", e.target.value)}
          placeholder="Analyst notes, context, key factors..." />
      </div>

      <button
        onClick={handleSave}
        disabled={updateMutation.isPending}
        className="w-full bg-blue-700 hover:bg-blue-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
      >
        <Save className="w-4 h-4" />
        {updateMutation.isPending ? "Saving..." : "Save Changes"}
      </button>
    </div>
  );
}

// ─── Main Admin Panel ─────────────────────────────────────────────────
type AdminTab = "senate" | "house" | "redistricting" | "referendums" | "primary" | "election-night" | "key-races" | "governors";

function AdminPanel({ token, onLogout }: { token: string; onLogout: () => void }) {
  const [tab, setTab] = useState<AdminTab>("senate");
  const [search, setSearch] = useState("");
  const [selectedSenate, setSelectedSenate] = useState<SenateRace | null>(null);
  const [selectedHouse, setSelectedHouse] = useState<HouseRace | null>(null);
  const [selectedRedistricting, setSelectedRedistricting] = useState<RedistrictingState | null>(null);
  const [selectedReferendum, setSelectedReferendum] = useState<Referendum | null>(null);
  const [selectedGovernor, setSelectedGovernor] = useState<GovernorRace | null>(null);
  const [govSearch, setGovSearch] = useState("");

  const { data: senateRaces = [], refetch: refetchSenate } = trpc.senate.list.useQuery();
  const { data: houseRaces = [], refetch: refetchHouse } = trpc.house.list.useQuery();
  const { data: redistrictingStates = [], refetch: refetchRedistricting } = trpc.redistricting.list.useQuery();
  const { data: referendums = [], refetch: refetchReferendums } = trpc.referendum.list.useQuery();
  const { data: pinnedRaces = [], refetch: refetchPinned } = trpc.keyRaces.listPinned.useQuery();
  const { data: governorRaces = [], refetch: refetchGovernors } = trpc.governor.list.useQuery();

  const pinMutation = trpc.keyRaces.pin.useMutation({ onSuccess: () => { refetchPinned(); toast.success("Race pinned to Key Races sidebar"); } });
  const unpinMutation = trpc.keyRaces.unpin.useMutation({ onSuccess: () => { refetchPinned(); toast.success("Race unpinned"); } });
  const clearAllMutation = trpc.keyRaces.clearAll.useMutation({ onSuccess: (d) => { refetchPinned(); toast.success(`Cleared ${d.cleared} pinned races — sidebar reverts to auto-computed`); } });

  const handleRefresh = () => {
    refetchSenate(); refetchHouse(); refetchRedistricting(); refetchReferendums(); refetchPinned(); refetchGovernors();
    toast.success("Data refreshed");
  };

  const isPinned = (chamber: "senate" | "house", raceId: number) =>
    pinnedRaces.some(p => p.chamber === chamber && p.raceId === raceId);

  const togglePin = (chamber: "senate" | "house", raceId: number) => {
    if (isPinned(chamber, raceId)) {
      unpinMutation.mutate({ adminToken: token, chamber, raceId });
    } else {
      pinMutation.mutate({ adminToken: token, chamber, raceId });
    }
  };

  const filteredGovernors = governorRaces.filter(r =>
    !govSearch || r.stateName.toLowerCase().includes(govSearch.toLowerCase()) ||
    (r.incumbentName?.toLowerCase().includes(govSearch.toLowerCase()) ?? false)
  ).sort((a, b) => {
    const ORDER: Record<string, number> = { "Toss-up": 0, "Lean D": 1, "Lean R": 1, "Likely D": 2, "Likely R": 2, "Solid D": 3, "Solid R": 3 };
    const oa = ORDER[a.rating ?? ""] ?? 4;
    const ob = ORDER[b.rating ?? ""] ?? 4;
    if (oa !== ob) return oa - ob;
    return a.stateName.localeCompare(b.stateName);
  });

  const filteredSenate = senateRaces.filter(r =>
    !search || r.stateName.toLowerCase().includes(search.toLowerCase()) ||
    (r.incumbent?.toLowerCase().includes(search.toLowerCase()) ?? false)
  );

  const filteredHouse = houseRaces.filter(r =>
    !search || r.stateName.toLowerCase().includes(search.toLowerCase()) ||
    (r.incumbent?.toLowerCase().includes(search.toLowerCase()) ?? false)
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Admin Header */}
      <header className="border-b border-border bg-card px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-blue-400" />
            <h1 className="text-sm font-bold text-foreground">Admin Update Panel</h1>
          </div>
          <span className="text-xs bg-green-900 text-green-300 px-2 py-0.5 rounded">Authenticated</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleRefresh} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-2 py-1.5 rounded hover:bg-muted transition-colors">
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
          <button onClick={onLogout} className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 px-2 py-1.5 rounded hover:bg-muted transition-colors">
            <LogOut className="w-3.5 h-3.5" />
            Logout
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden" style={{ height: "calc(100vh - 57px)" }}>
        {/* Left: Race list — hidden in Election Night mode (full-width layout) */}
        <div className={`border-r border-border flex flex-col overflow-hidden transition-all ${tab === "election-night" ? "w-0 overflow-hidden border-0" : "w-72"}`}>
          {/* Tabs */}
          <div className="flex flex-wrap border-b border-border">
            {(["senate", "house", "redistricting", "referendums", "governors", "primary", "key-races", "election-night"] as AdminTab[]).map(t => (
              <button
                key={t}
                onClick={() => { setTab(t); setSearch(""); }}
                className={`flex-1 py-2 text-xs font-semibold capitalize transition-colors min-w-[60px] ${
                  tab === t
                    ? t === "election-night"
                      ? "border-b-2 border-yellow-500 text-yellow-400"
                      : "border-b-2 border-blue-500 text-blue-400"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t === "redistricting" ? "Redistrict"
                  : t === "governors" ? "Govs"
                  : t === "primary" ? "Primaries"
                  : t === "election-night" ? <span className="flex items-center justify-center gap-0.5"><Zap className="w-3 h-3" />Night</span>
                  : t === "key-races" ? <span className="flex items-center justify-center gap-0.5"><Star className="w-3 h-3" />Key Races</span>
                  : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          {/* Search */}
          {(tab === "senate" || tab === "house" || tab === "governors") && (
            <div className="p-2 border-b border-border">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  className="w-full bg-muted border border-border rounded pl-8 pr-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                  placeholder="Search..."
                  value={tab === "governors" ? govSearch : search}
                  onChange={e => tab === "governors" ? setGovSearch(e.target.value) : setSearch(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {tab === "senate" && filteredSenate.map(race => (
              <button
                key={race.id}
                onClick={() => setSelectedSenate(race)}
                className={`w-full text-left px-3 py-2.5 border-b border-border/50 hover:bg-accent transition-colors ${selectedSenate?.id === race.id ? "bg-accent" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{race.stateName}</span>
                  {race.rating && (
                    <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${getRatingClass(race.rating as any)}`}>
                      {race.rating}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{race.status}{race.isSpecial ? " · Special" : ""}</p>
              </button>
            ))}

            {tab === "house" && filteredHouse.map(race => (
              <button
                key={race.id}
                onClick={() => setSelectedHouse(race)}
                className={`w-full text-left px-3 py-2.5 border-b border-border/50 hover:bg-accent transition-colors ${selectedHouse?.id === race.id ? "bg-accent" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {race.stateCode}-{race.districtLabel}
                  </span>
                  {race.rating && (
                    <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${getRatingClass(race.rating as any)}`}>
                      {race.rating}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{race.incumbent ?? "Open seat"}</p>
              </button>
            ))}

            {tab === "governors" && filteredGovernors.map(race => (
              <button
                key={race.id}
                onClick={() => setSelectedGovernor(race)}
                className={`w-full text-left px-3 py-2.5 border-b border-border/50 hover:bg-accent transition-colors ${selectedGovernor?.id === race.id ? "bg-accent" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{race.stateName}</span>
                  {race.rating && (
                    <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${getRatingClass(race.rating as any)}`}>
                      {race.rating}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {race.incumbentName ?? "Open seat"}
                  {race.isOpen ? " · Open" : ""}
                  {race.isTermLimited ? " · Term-limited" : ""}
                  {race.calledParty ? ` · Called ${race.calledParty}` : ""}
                </p>
              </button>
            ))}

            {tab === "redistricting" && redistrictingStates.map(state => (
              <button
                key={state.id}
                onClick={() => setSelectedRedistricting(state)}
                className={`w-full text-left px-3 py-2.5 border-b border-border/50 hover:bg-accent transition-colors ${selectedRedistricting?.id === state.id ? "bg-accent" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{state.stateName}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded font-semibold text-white`}
                    style={{ background: state.enacted ? "#4a7c59" : "#8b6914" }}>
                    {state.enacted ? "Enacted" : "Pending"}
                  </span>
                </div>
              </button>
            ))}

            {tab === "referendums" && referendums.map(ref => (
              <button
                key={ref.id}
                onClick={() => setSelectedReferendum(ref)}
                className={`w-full text-left px-3 py-2.5 border-b border-border/50 hover:bg-accent transition-colors ${selectedReferendum?.id === ref.id ? "bg-accent" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{ref.stateName}</span>
                  <span className="text-xs bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded">{ref.status}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{ref.electionDate}</p>
              </button>
            ))}
          </div>

          <div className="p-2 border-t border-border text-xs text-muted-foreground text-center">
            {tab === "senate" && `${filteredSenate.length} races`}
            {tab === "house" && `${filteredHouse.length} districts`}
            {tab === "redistricting" && `${redistrictingStates.length} states`}
            {tab === "referendums" && `${referendums.length} referendums`}
            {tab === "governors" && `${filteredGovernors.length} races`}
            {tab === "key-races" && `${pinnedRaces.length} pinned`}
          </div>
        </div>

        {/* Right: Editor */}
        <div className={`flex-1 overflow-hidden ${tab === "primary" || tab === "election-night" || tab === "key-races" ? "" : "overflow-y-auto p-6"}`}>
          {tab === "senate" && selectedSenate && (
            <div>
              <h2 className="text-lg font-bold text-foreground mb-1">{selectedSenate.stateName} Senate Race</h2>
              {selectedSenate.isSpecial && (
                <p className="text-xs text-yellow-400 mb-3">{selectedSenate.specialNote}</p>
              )}
              <div className="max-w-lg">
                <SenateEditor race={selectedSenate} token={token} onUpdated={() => refetchSenate()} />
              </div>
            </div>
          )}

          {tab === "house" && selectedHouse && (
            <div>
              <h2 className="text-lg font-bold text-foreground mb-1">
                {selectedHouse.stateName} — {selectedHouse.districtLabel === "AL" ? "At-Large" : `District ${selectedHouse.district}`}
              </h2>
              <div className="max-w-lg">
                <HouseEditor race={selectedHouse} token={token} onUpdated={() => refetchHouse()} />
              </div>
            </div>
          )}

          {tab === "governors" && selectedGovernor && (
            <div>
              <h2 className="text-lg font-bold text-foreground mb-1">{selectedGovernor.stateName} Governor Race</h2>
              <div className="max-w-lg">
                <GovernorEditor race={selectedGovernor} token={token} onUpdated={() => { refetchGovernors(); setSelectedGovernor(prev => prev ? { ...prev } : null); }} />
              </div>
            </div>
          )}

          {tab === "redistricting" && selectedRedistricting && (
            <div>
              <h2 className="text-lg font-bold text-foreground mb-1">{selectedRedistricting.stateName} Redistricting</h2>
              <div className="max-w-lg">
                <RedistrictingEditor state={selectedRedistricting} token={token} onUpdated={() => refetchRedistricting()} />
              </div>
            </div>
          )}

          {tab === "referendums" && selectedReferendum && (
            <div>
              <h2 className="text-lg font-bold text-foreground mb-1">{selectedReferendum.stateName} Referendum</h2>
              <div className="max-w-lg">
                <ReferendumEditor referendum={selectedReferendum} token={token} onUpdated={() => refetchReferendums()} />
              </div>
            </div>
          )}

          {/* Key Races Curation Panel */}
          {tab === "key-races" && (
            <div className="h-full overflow-y-auto p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <Star className="w-5 h-5 text-yellow-400" />
                    Key Races Sidebar
                  </h2>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {pinnedRaces.length > 0
                      ? `${pinnedRaces.length} races pinned — sidebar shows your curated selection`
                      : "No races pinned — sidebar auto-computes competitive races"}
                  </p>
                </div>
                {pinnedRaces.length > 0 && (
                  <button
                    onClick={() => clearAllMutation.mutate({ adminToken: token })}
                    disabled={clearAllMutation.isPending}
                    className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 border border-red-800 hover:border-red-600 px-3 py-1.5 rounded transition-colors"
                  >
                    <PinOff className="w-3.5 h-3.5" />
                    Clear All Pins
                  </button>
                )}
              </div>

              {/* Pinned races preview */}
              {pinnedRaces.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Currently Pinned</h3>
                  <div className="space-y-1">
                    {pinnedRaces.map(p => {
                      const senateRace = senateRaces.find(r => r.id === p.raceId && p.chamber === "senate");
                      const houseRace = houseRaces.find(r => r.id === p.raceId && p.chamber === "house");
                      const label = senateRace ? `${senateRace.stateName} Senate` : houseRace ? `${houseRace.stateCode}-${houseRace.districtLabel}` : `${p.chamber} #${p.raceId}`;
                      const rating = senateRace?.rating ?? houseRace?.rating;
                      return (
                        <div key={p.id} className="flex items-center justify-between bg-card border border-border rounded-lg px-3 py-2">
                          <div className="flex items-center gap-2">
                            <Pin className="w-3.5 h-3.5 text-yellow-400" />
                            <span className="text-sm font-medium">{label}</span>
                            <span className="text-xs text-muted-foreground capitalize">{p.chamber}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {rating && <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${getRatingClass(rating as any)}`}>{rating}</span>}
                            <button
                              onClick={() => togglePin(p.chamber, p.raceId)}
                              className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-muted transition-colors"
                            >
                              Unpin
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Senate races to pin */}
              <div className="mb-6">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Senate Races</h3>
                <div className="space-y-1">
                  {senateRaces.filter(r => r.rating && ["Toss-up", "Lean D", "Lean R", "Likely D", "Likely R"].includes(r.rating)).map(race => (
                    <div key={race.id} className="flex items-center justify-between bg-card border border-border rounded-lg px-3 py-2">
                      <div>
                        <span className="text-sm font-medium">{race.stateName}</span>
                        <span className="text-xs text-muted-foreground ml-2">{race.incumbent ?? "Open"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {race.rating && <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${getRatingClass(race.rating as any)}`}>{race.rating}</span>}
                        <button
                          onClick={() => togglePin("senate", race.id)}
                          className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors ${
                            isPinned("senate", race.id)
                              ? "bg-yellow-900/40 text-yellow-300 hover:bg-yellow-900/60"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted"
                          }`}
                        >
                          {isPinned("senate", race.id) ? <StarOff className="w-3 h-3" /> : <Star className="w-3 h-3" />}
                          {isPinned("senate", race.id) ? "Pinned" : "Pin"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* House races to pin */}
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">House Toss-ups &amp; Lean Races</h3>
                <div className="space-y-1">
                  {houseRaces.filter(r => r.rating && ["Toss-up", "Lean D", "Lean R"].includes(r.rating)).map(race => (
                    <div key={race.id} className="flex items-center justify-between bg-card border border-border rounded-lg px-3 py-2">
                      <div>
                        <span className="text-sm font-medium">{race.stateCode}-{race.districtLabel}</span>
                        <span className="text-xs text-muted-foreground ml-2">{race.incumbent ?? "Open"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {race.rating && <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${getRatingClass(race.rating as any)}`}>{race.rating}</span>}
                        <button
                          onClick={() => togglePin("house", race.id)}
                          className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors ${
                            isPinned("house", race.id)
                              ? "bg-yellow-900/40 text-yellow-300 hover:bg-yellow-900/60"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted"
                          }`}
                        >
                          {isPinned("house", race.id) ? <StarOff className="w-3 h-3" /> : <Star className="w-3 h-3" />}
                          {isPinned("house", race.id) ? "Pinned" : "Pin"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Primary Results Panel */}
          {tab === "primary" && (
            <PrimaryResultsPanel token={token} onUpdated={() => { refetchSenate(); refetchHouse(); }} />
          )}

          {/* Election Night Rapid Entry Panel */}
          {tab === "election-night" && (
            <div className="h-full overflow-hidden p-4 flex flex-col">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-5 h-5 text-yellow-400" />
                <h2 className="text-lg font-bold text-foreground">Election Night Mode</h2>
                <span className="text-xs bg-yellow-900/50 text-yellow-300 border border-yellow-700/40 px-2 py-0.5 rounded">Rapid Entry</span>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Optimized for fast vote percentage and called-winner entry. Races are sorted by competitiveness — Toss-ups first.
                Use <kbd className="bg-muted border border-border px-1 rounded text-xs">Tab</kbd> to advance fields and click a candidate name to call the race.
              </p>
              <div className="flex-1 min-h-0 overflow-hidden">
                <ElectionNightPanel adminToken={token} />
              </div>
            </div>
          )}

          {/* Empty state */}
          {tab !== "election-night" && tab !== "primary" && tab !== "key-races" &&
            ((tab === "senate" && !selectedSenate) ||
            (tab === "house" && !selectedHouse) ||
            (tab === "redistricting" && !selectedRedistricting) ||
            (tab === "referendums" && !selectedReferendum) ||
            (tab === "governors" && !selectedGovernor)) && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Lock className="w-12 h-12 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground font-medium">Select a race from the left panel to edit</p>
              <p className="text-xs text-muted-foreground mt-1">All changes reflect instantly on the public map</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Root Admin Component ─────────────────────────────────────────────────────
export default function Admin() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(ADMIN_TOKEN_KEY));

  const { data: verifyData, isLoading } = trpc.admin.verify.useQuery(
    { token: token ?? "" },
    { enabled: !!token }
  );

  useEffect(() => {
    if (verifyData && !verifyData.valid) {
      localStorage.removeItem(ADMIN_TOKEN_KEY);
      setToken(null);
    }
  }, [verifyData]);

  const handleLogout = useCallback(() => {
    if (token) {
      localStorage.removeItem(ADMIN_TOKEN_KEY);
      setToken(null);
      toast.success("Logged out");
    }
  }, [token]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!token || (verifyData && !verifyData.valid)) {
    return <LoginScreen onLogin={setToken} />;
  }

  return <AdminPanel token={token} onLogout={handleLogout} />;
}
