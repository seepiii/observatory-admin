import Link from "next/link";
import { requireAdmin } from "@/lib/supabase-server";
import { loadEverything } from "@/lib/admin-data";
import { tallyVotes } from "@/lib/stats";
import { displayName, formatDate, isReportKind, KIND_LABELS } from "@/lib/observatory";
import Panel from "@/components/Panel";

// READ all AI-generated media, with links to CREATE / UPDATE / DELETE.
export default async function MediaPage({ searchParams }: PageProps<"/media">) {
  const params = await searchParams;
  const kind = isReportKind(params.kind) ? params.kind : undefined;
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const author = typeof params.author === "string" ? params.author : undefined;

  const { supabase } = await requireAdmin();
  const { reports, votes, profiles, error } = await loadEverything(supabase);
  const tallies = tallyVotes(votes);
  const profileById = new Map(profiles.map((p) => [p.id, p]));
  const authorProfile = author ? profileById.get(author) : undefined;

  const needle = q.toLowerCase();
  const shown = reports.filter(
    (r) =>
      (!kind || r.kind === kind) &&
      (!authorProfile || r.user_id === authorProfile.id) &&
      (!needle || r.subject.toLowerCase().includes(needle) || r.body.toLowerCase().includes(needle)),
  );

  const link = (k?: string) => {
    const sp = new URLSearchParams();
    if (k) sp.set("kind", k);
    if (q) sp.set("q", q);
    if (authorProfile) sp.set("author", authorProfile.id);
    return `/media${sp.size ? `?${sp}` : ""}`;
  };

  return (
    <Panel title={`AI media · ${reports.length}`} hint="Every AI-generated report and postcard. Open one to edit or delete it.">
      {params.deleted && <p className="rounded border border-[#7ee2a8]/30 bg-[#7ee2a8]/10 px-4 py-2 text-sm text-[#bff2d3]">Report deleted.</p>}
      {error && <p className="text-sm text-red-300">Database error: {error}</p>}

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <form className="flex flex-1 gap-2" action="/media">
          {kind && <input type="hidden" name="kind" value={kind} />}
          {authorProfile && <input type="hidden" name="author" value={authorProfile.id} />}
          <input
            name="q"
            defaultValue={q}
            placeholder="Search titles and text…"
            className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white placeholder-white/35 outline-none focus:border-[#e9c46a]/60"
          />
          <button className="rounded-lg border border-white/20 px-4 font-mono text-xs uppercase text-white/70 hover:text-white">Search</button>
        </form>
        <Link href="/media/new" className="rounded-full bg-[#e9c46a] px-5 py-2 text-center font-mono text-xs font-bold tracking-[0.15em] text-[#1a1408] uppercase hover:bg-[#f4dfa6]">
          + Generate new report
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Link href={link()} className={`rounded-full border px-3 py-1 font-mono text-xs ${!kind ? "border-[#e9c46a] bg-[#e9c46a]/15 text-[#f4dfa6]" : "border-white/15 text-white/60 hover:text-white"}`}>All</Link>
        {Object.entries(KIND_LABELS).map(([k, label]) => (
          <Link key={k} href={link(k)} className={`rounded-full border px-3 py-1 font-mono text-xs ${kind === k ? "border-[#e9c46a] bg-[#e9c46a]/15 text-[#f4dfa6]" : "border-white/15 text-white/60 hover:text-white"}`}>
            {label}
          </Link>
        ))}
        {authorProfile && (
          <Link href={`/media${kind ? `?kind=${kind}` : ""}`} className="rounded-full border border-white/15 px-3 py-1 font-mono text-xs text-white/70 hover:text-white">
            Author: {displayName(authorProfile)} ✕
          </Link>
        )}
        <span className="ml-auto font-mono text-xs text-white/45">{shown.length} shown</span>
      </div>

      <ul className="flex flex-col divide-y divide-white/5">
        {shown.map((r) => {
          const t = tallies.get(r.id);
          return (
            <li key={r.id}>
              <Link href={`/media/${r.id}`} className="flex items-center gap-4 py-3 hover:bg-white/[0.03]">
                {r.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.image_url} alt="" className="h-14 w-14 shrink-0 rounded object-cover" />
                ) : (
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded border border-white/10 font-mono text-lg text-white/40">
                    {KIND_LABELS[r.kind].split(" ")[0]}
                  </span>
                )}
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-white">{r.subject}</span>
                  <span className="line-clamp-1 text-sm text-white/50">{r.body}</span>
                  <span className="font-mono text-xs text-white/45">
                    {KIND_LABELS[r.kind]} · {displayName(profileById.get(r.user_id))} · {formatDate(r.created_at)} · {r.model}
                  </span>
                </div>
                <span className="shrink-0 text-right font-mono text-sm text-white tabular-nums">
                  {(t?.score ?? 0) > 0 ? `+${t?.score}` : (t?.score ?? 0)}
                  <span className="block text-xs text-white/45">{t?.up ?? 0}▲ {t?.down ?? 0}▼</span>
                </span>
              </Link>
            </li>
          );
        })}
        {shown.length === 0 && <li className="py-6 text-center font-mono text-sm text-white/45">No reports match.</li>}
      </ul>
    </Panel>
  );
}
