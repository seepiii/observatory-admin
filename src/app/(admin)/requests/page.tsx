import Link from "next/link";
import { requireAdmin } from "@/lib/supabase-server";
import { KIND_LABELS } from "@/lib/observatory";
import Panel from "@/components/Panel";

const when = (at: string) =>
  new Date(at).toLocaleString("en-US", { timeZone: "America/New_York", dateStyle: "medium", timeStyle: "short" });

// READ: every generation request (one per report filed), logged by a database trigger.
export default async function RequestsPage() {
  const { supabase } = await requireAdmin();
  const [{ data: requests, error }, { data: profiles }] = await Promise.all([
    supabase.from("generation_requests").select("*, llm_responses(id, model)").order("created_at", { ascending: false }).limit(300),
    supabase.from("profiles").select("id, email"),
  ]);
  const email = new Map((profiles ?? []).map((p) => [p.id, p.email]));

  return (
    <main className="flex flex-col gap-5">
      {error && <p className="rounded border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">Database error: {error.message}</p>}
      <Panel title="Generation requests" hint={`Every time someone asks the AI for a report. Logged automatically by a database trigger. Newest first, ${requests?.length ?? 0} shown.`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left font-mono text-[11px] tracking-[0.15em] text-white/50 uppercase">
                <th className="py-2 pr-4">When</th><th className="py-2 pr-4">Who</th><th className="py-2 pr-4">Type</th>
                <th className="py-2 pr-4">Subject</th><th className="py-2 pr-4">Photo</th><th className="py-2 pr-4">Model</th><th className="py-2">Media</th>
              </tr>
            </thead>
            <tbody>
              {(requests ?? []).map((r) => (
                <tr key={r.id} className="border-t border-white/5 align-top">
                  <td className="py-2 pr-4 font-mono text-xs whitespace-nowrap text-white/60">{when(r.created_at)}</td>
                  <td className="py-2 pr-4 text-white/70">{email.get(r.user_id) ?? "—"}</td>
                  <td className="py-2 pr-4 text-white/85">{KIND_LABELS[r.kind as keyof typeof KIND_LABELS] ?? r.kind}</td>
                  <td className="py-2 pr-4 text-white">{r.subject || "—"}</td>
                  <td className="py-2 pr-4 text-white/60">{r.has_photo ? "yes" : "no"}</td>
                  <td className="py-2 pr-4 font-mono text-xs text-white/60">
                    {r.llm_responses?.map((x: { id: number; model: string }) => (
                      <Link key={x.id} href={`/responses?id=${x.id}`} className="hover:underline">{x.model}</Link>
                    ))}
                  </td>
                  <td className="py-2">
                    {r.report_id ? <Link href={`/media/${r.report_id}`} className="font-mono text-xs text-[#e9c46a] uppercase hover:underline">View</Link> : <span className="text-white/40">deleted</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </main>
  );
}
