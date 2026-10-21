import Link from "next/link";
import { requireAdmin } from "@/lib/supabase-server";
import { loadEverything } from "@/lib/admin-data";
import { displayName, formatDate, KIND_LABELS } from "@/lib/observatory";
import Panel from "@/components/Panel";
import { StatTile } from "@/components/Charts";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "up", label: "▲ Upvotes" },
  { id: "down", label: "▼ Downvotes" },
] as const;

// READ upvotes/downvotes.
export default async function VotesPage({ searchParams }: PageProps<"/votes">) {
  const { filter: rawFilter, voter } = await searchParams;
  const filter = FILTERS.find((f) => f.id === rawFilter)?.id ?? "all";
  const { supabase } = await requireAdmin();
  const { reports, votes, profiles, error } = await loadEverything(supabase);

  const reportById = new Map(reports.map((r) => [r.id, r]));
  const profileById = new Map(profiles.map((p) => [p.id, p]));
  const voterProfile = typeof voter === "string" ? profileById.get(voter) : undefined;

  const shown = votes
    .filter((v) => (filter === "up" ? v.value === 1 : filter === "down" ? v.value === -1 : true))
    .filter((v) => (voterProfile ? v.user_id === voterProfile.id : true))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  const ups = votes.filter((v) => v.value === 1).length;
  const href = (f: string) => `/votes?filter=${f}${voterProfile ? `&voter=${voterProfile.id}` : ""}`;

  return (
    <main className="flex flex-col gap-5">
      <div className="grid grid-cols-3 gap-3">
        <StatTile label="All votes" value={String(votes.length)} />
        <StatTile label="Upvotes ▲" value={String(ups)} />
        <StatTile label="Downvotes ▼" value={String(votes.length - ups)} />
      </div>

      <Panel title="Vote log" hint="Every upvote and downvote, newest first (read-only). Voting happens in the main app.">
        {error && <p className="text-sm text-red-300">Database error: {error}</p>}
        <div className="flex flex-wrap items-center gap-2">
          {FILTERS.map((f) => (
            <Link
              key={f.id}
              href={href(f.id)}
              className={`rounded-full border px-3 py-1 font-mono text-xs uppercase ${filter === f.id ? "border-[#e9c46a] bg-[#e9c46a]/15 text-[#f4dfa6]" : "border-white/15 text-white/60 hover:text-white"}`}
            >
              {f.label}
            </Link>
          ))}
          {voterProfile && (
            <Link href={`/votes?filter=${filter}`} className="rounded-full border border-white/15 px-3 py-1 font-mono text-xs text-white/70 hover:text-white">
              Voter: {displayName(voterProfile)} ✕
            </Link>
          )}
          <span className="ml-auto font-mono text-xs text-white/45">{shown.length} shown</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left font-mono text-[11px] tracking-[0.15em] text-white/50 uppercase">
                <th className="py-2 pr-3">When</th>
                <th className="py-2 pr-3">Voter</th>
                <th className="py-2 pr-3">Vote</th>
                <th className="py-2">On report</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((v) => {
                const r = reportById.get(v.report_id);
                return (
                  <tr key={`${v.report_id}-${v.user_id}`} className="border-b border-white/5">
                    <td className="py-2 pr-3 font-mono text-xs text-white/60">{formatDate(v.created_at)}</td>
                    <td className="py-2 pr-3 text-white/85">{displayName(profileById.get(v.user_id))}</td>
                    <td className={`py-2 pr-3 font-mono font-bold ${v.value === 1 ? "text-[#7ee2a8]" : "text-[#e98a6a]"}`}>
                      {v.value === 1 ? "▲ up" : "▼ down"}
                    </td>
                    <td className="py-2">
                      {r ? (
                        <Link href={`/media/${r.id}`} className="text-white hover:underline">
                          <span className="mr-2 font-mono text-xs text-white/45">{KIND_LABELS[r.kind]}</span>
                          {r.subject}
                        </Link>
                      ) : (
                        <span className="text-white/40">deleted report</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {shown.length === 0 && (
                <tr><td colSpan={4} className="py-6 text-center font-mono text-sm text-white/45">No votes match.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </main>
  );
}
