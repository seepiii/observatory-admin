import Link from "next/link";
import { requireAdmin } from "@/lib/supabase-server";
import { loadEverything } from "@/lib/admin-data";
import { computeStats, hourLabel, plural } from "@/lib/stats";
import { displayName, KIND_LABELS } from "@/lib/observatory";
import Panel from "@/components/Panel";
import { BarList, ColumnChart, HourStrip, StatTile } from "@/components/Charts";

const pct = (n: number | null) => (n === null ? "—" : `${Math.round(n * 100)}%`);
const signed = (n: number) => (n > 0 ? `+${n}` : String(n));
const avg = (n: number) => `avg ${n > 0 ? "+" : ""}${n.toFixed(1)}`;
const planetName = (id: string) => id.charAt(0).toUpperCase() + id.slice(1);

function shortDay(day: string) {
  return new Date(`${day}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default async function OverviewPage() {
  const { supabase } = await requireAdmin();
  const data = await loadEverything(supabase);
  const s = computeStats(data);
  const t = s.totals;

  return (
    <main className="flex flex-col gap-5">
      {data.error && <p className="rounded border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">Database error: {data.error}</p>}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="Crew members" value={String(t.users)} sub={`${t.creators} have filed a report`} />
        <StatTile label="AI reports" value={String(t.reports)} sub={`${t.postcards} postcards · ${t.lastWeek} this week`} />
        <StatTile label="Votes cast" value={String(t.votes)} sub={`by ${t.voters} voters · ${t.votesPerReport?.toFixed(1) ?? "—"} per report`} />
        <StatTile label="Upvote rate" value={pct(t.upvoteRate)} sub="share of votes that are ▲" />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Panel title="Transmissions per day" hint="AI reports filed each day for the last 14 days (New York time). Hover a bar for the count." className="lg:col-span-2">
          <ColumnChart unit="reports" data={s.daily.map((d) => ({ label: shortDay(d.day), short: shortDay(d.day), value: d.count }))} />
        </Panel>

        <Panel title="Hall of fame" hint="The three highest-scoring reports of all time.">
          <ol className="flex flex-col gap-3">
            {s.topReports.map((r, i) => (
              <li key={r.id} className="flex gap-3">
                <span className="font-mono text-xl font-bold text-[#f4dfa6]">{i + 1}</span>
                <Link href={`/media/${r.id}`} className="flex min-w-0 flex-col hover:underline">
                  <span className="truncate text-sm text-white">{r.subject}</span>
                  <span className="font-mono text-xs text-white/50">{KIND_LABELS[r.kind]} · {signed(r.score)} ({r.up}▲ {r.down}▼)</span>
                </Link>
              </li>
            ))}
          </ol>
          {s.controversial && (
            <div className="mt-auto border-t border-white/10 pt-3">
              <p className="font-mono text-xs tracking-[0.2em] text-[#e98a6a] uppercase">Most divisive</p>
              <Link href={`/media/${s.controversial.id}`} className="text-sm text-white hover:underline">{s.controversial.subject}</Link>
              <p className="font-mono text-xs text-white/50">{s.controversial.up}▲ vs {s.controversial.down}▼ — the crew can&apos;t agree</p>
            </div>
          )}
        </Panel>
      </div>

      <Panel
        title="When do humans transmit?"
        hint={`Reports by hour of day (New York). Brighter = busier.${s.peakHour !== null ? ` Peak hour: ${hourLabel(s.peakHour)}.` : ""}`}
      >
        <HourStrip hours={s.hours} labelOf={hourLabel} />
      </Panel>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Report types" hint="How many of each kind were made, with the average vote score each kind earns.">
          <BarList rows={s.byKind.map((k) => ({ label: KIND_LABELS[k.key] ?? k.key, value: k.count, note: avg(k.avgScore) }))} />
        </Panel>

        <Panel title="Which AI model is funniest?" hint="The app falls back to smaller Gemini models when busy. Reports each model wrote, and the average score humans gave them.">
          <BarList rows={s.byModel.map((m) => ({ label: m.key.replace(/^gemini-/, "Gemini "), value: m.count, note: avg(m.avgScore) }))} />
        </Panel>

        <Panel title="Most visited planets" hint="Where the Teleporter sends postcards.">
          <BarList rows={s.byPlanet.map((p) => ({ label: planetName(p.key), value: p.count, note: plural(p.votes, "vote") }))} />
        </Panel>

        <Panel title="Top crew" hint="Who earns the most votes: total score across everything they've made.">
          <BarList
            rows={s.topCreators.map((c) => ({
              label: displayName(c.profile),
              value: Math.max(0, c.score),
              display: signed(c.score),
              note: plural(c.reports, "report"),
            }))}
          />
          <p className="font-mono text-xs text-white/45">
            {pct(t.anomalyShare)} of reports answer the Daily Anomaly prompt.
          </p>
        </Panel>
      </div>

      <details className="hud-panel p-5">
        <summary className="cursor-pointer font-mono text-xs tracking-[0.2em] text-white/60 uppercase">Daily numbers as a table</summary>
        <table className="mt-3 w-full font-mono text-sm">
          <thead><tr className="text-left text-white/50"><th className="py-1">Day</th><th className="py-1 text-right">Reports</th></tr></thead>
          <tbody>
            {s.daily.map((d) => (
              <tr key={d.day} className="border-t border-white/5"><td className="py-1 text-white/80">{d.day}</td><td className="py-1 text-right text-white">{d.count}</td></tr>
            ))}
          </tbody>
        </table>
      </details>
    </main>
  );
}
