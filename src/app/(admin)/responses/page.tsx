import Link from "next/link";
import { requireAdmin } from "@/lib/supabase-server";
import Panel from "@/components/Panel";

const when = (at: string) =>
  new Date(at).toLocaleString("en-US", { timeZone: "America/New_York", dateStyle: "medium", timeStyle: "short" });

// READ: the raw text each model returned, with the prompt it was given.
export default async function ResponsesPage({ searchParams }: PageProps<"/responses">) {
  const { supabase } = await requireAdmin();
  const { id, model } = await searchParams;

  let query = supabase.from("llm_responses").select("*").order("created_at", { ascending: false }).limit(100);
  if (id) query = query.eq("id", Number(id));
  if (model) query = query.eq("model", String(model));
  const [{ data: responses, error }, { data: models }] = await Promise.all([
    query,
    supabase.from("llm_responses").select("model"),
  ]);
  const modelNames = [...new Set((models ?? []).map((m) => m.model))].sort();

  return (
    <main className="flex flex-col gap-5">
      {error && <p className="rounded border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">Database error: {error.message}</p>}
      <Panel title="LLM responses" hint={`What each model wrote back, newest first (${responses?.length ?? 0} shown). Open "Prompt" to see exactly what it was asked.`}>
        <div className="flex flex-wrap gap-2 font-mono text-xs">
          <Link href="/responses" className={`rounded-full px-3 py-1 ${!model && !id ? "bg-[#e9c46a] text-[#1a1408]" : "text-white/60 hover:text-white"}`}>All</Link>
          {modelNames.map((m) => (
            <Link key={m} href={`/responses?model=${encodeURIComponent(m)}`} className={`rounded-full px-3 py-1 ${model === m ? "bg-[#e9c46a] text-[#1a1408]" : "text-white/60 hover:text-white"}`}>{m}</Link>
          ))}
        </div>
        <ul className="flex flex-col gap-3">
          {(responses ?? []).map((r) => (
            <li key={r.id} className="rounded-lg border border-white/10 bg-black/30 p-4">
              <p className="mb-2 font-mono text-xs text-white/50">#{r.id} · {r.model} · {when(r.created_at)} · request {r.request_id}</p>
              <p className="font-mono text-sm leading-relaxed whitespace-pre-line text-white/90">{r.response}</p>
              {r.prompt && (
                <details className="mt-2">
                  <summary className="cursor-pointer font-mono text-xs text-white/50 uppercase">Prompt</summary>
                  <p className="mt-2 font-mono text-xs leading-relaxed whitespace-pre-line text-white/60">{r.prompt}</p>
                </details>
              )}
            </li>
          ))}
        </ul>
      </Panel>
    </main>
  );
}
