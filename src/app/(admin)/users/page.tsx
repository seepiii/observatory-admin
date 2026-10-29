import Link from "next/link";
import { requireAdmin } from "@/lib/supabase-server";
import { loadEverything } from "@/lib/admin-data";
import { tallyVotes } from "@/lib/stats";
import { displayName, formatDate } from "@/lib/observatory";
import Panel from "@/components/Panel";

// READ users/profiles.
export default async function UsersPage() {
  const { supabase } = await requireAdmin();
  const { reports, votes, profiles, error } = await loadEverything(supabase);
  const tallies = tallyVotes(votes);

  const rows = profiles.map((p) => {
    const mine = reports.filter((r) => r.user_id === p.id);
    return {
      p,
      reports: mine.length,
      postcards: mine.filter((r) => r.kind === "postcard").length,
      score: mine.reduce((sum, r) => sum + (tallies.get(r.id)?.score ?? 0), 0),
      votesCast: votes.filter((v) => v.user_id === p.id).length,
    };
  });

  return (
    <Panel title={`Users · ${profiles.length}`} hint="Every crew profile (read-only). Profiles are created automatically on first Google sign-in.">
      {error && <p className="text-sm text-red-300">Database error: {error}</p>}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left font-mono text-xs tracking-[0.15em] text-white/50 uppercase">
              <th className="py-2 pr-3">Crew member</th>
              <th className="py-2 pr-3">Joined</th>
              <th className="py-2 pr-3 text-right">Reports</th>
              <th className="py-2 pr-3 text-right">Postcards</th>
              <th className="py-2 pr-3 text-right">Score earned</th>
              <th className="py-2 pr-3 text-right">Votes cast</th>
              <th className="py-2">Role</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ p, ...r }) => (
              <tr key={p.id} className="border-b border-white/5 align-middle">
                <td className="py-2.5 pr-3">
                  <div className="flex items-center gap-3">
                    {p.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.avatar_url} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
                    ) : (
                      <span className="h-8 w-8 shrink-0 rounded-full border border-dashed border-white/20" />
                    )}
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-white">{displayName(p)}</span>
                      <span className="truncate font-mono text-xs text-white/50">{p.email}</span>
                    </div>
                  </div>
                </td>
                <td className="py-2.5 pr-3 font-mono text-xs text-white/60">{formatDate(p.created_at)}</td>
                <td className="py-2.5 pr-3 text-right font-mono">
                  {r.reports ? <Link href={`/media?author=${p.id}`} className="text-[#f4dfa6] hover:underline">{r.reports}</Link> : <span className="text-white/40">0</span>}
                </td>
                <td className="py-2.5 pr-3 text-right font-mono text-white/80">{r.postcards}</td>
                <td className="py-2.5 pr-3 text-right font-mono text-white">{r.score > 0 ? `+${r.score}` : r.score}</td>
                <td className="py-2.5 pr-3 text-right font-mono">
                  {r.votesCast ? <Link href={`/votes?voter=${p.id}`} className="text-[#f4dfa6] hover:underline">{r.votesCast}</Link> : <span className="text-white/40">0</span>}
                </td>
                <td className="py-2.5">
                  {p.is_superadmin ? (
                    <span className="rounded-full bg-[#7ee2a8]/15 px-2 py-0.5 font-mono text-xs tracking-[0.1em] text-[#7ee2a8] uppercase">Superadmin</span>
                  ) : (
                    <span className="font-mono text-xs text-white/40">Crew</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
