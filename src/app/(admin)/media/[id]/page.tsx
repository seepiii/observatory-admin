import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/supabase-server";
import { displayName, formatDate, KIND_LABELS, type Profile, type Report, type VoteRow } from "@/lib/observatory";
import Panel from "@/components/Panel";
import EditForm from "./EditForm";
import DeleteButton from "./DeleteButton";

// READ one report in full, UPDATE it, or DELETE it.
export default async function ReportPage({ params, searchParams }: PageProps<"/media/[id]">) {
  const { id } = await params;
  const { created, error: actionError } = await searchParams;
  const { supabase } = await requireAdmin();

  const { data: report } = await supabase.from("reports").select("*").eq("id", id).maybeSingle<Report>();
  if (!report) notFound();

  const [{ data: votes }, { data: author }] = await Promise.all([
    supabase.from("votes").select("report_id, user_id, value, created_at").eq("report_id", id).returns<VoteRow[]>(),
    supabase.from("profiles").select("id, email, first_name, last_name").eq("id", report.user_id).maybeSingle<Profile>(),
  ]);
  const voterIds = (votes ?? []).map((v) => v.user_id);
  const { data: voters } = voterIds.length
    ? await supabase.from("profiles").select("id, email, first_name, last_name").in("id", voterIds).returns<Profile[]>()
    : { data: [] as Profile[] };
  const voterById = new Map((voters ?? []).map((p) => [p.id, p]));
  const up = (votes ?? []).filter((v) => v.value === 1).length;
  const down = (votes ?? []).length - up;

  return (
    <main className="flex flex-col gap-5">
      <Link href="/media" className="font-mono text-xs tracking-[0.15em] text-white/50 uppercase hover:text-white">← All AI media</Link>
      {created && <p className="rounded border border-[#7ee2a8]/30 bg-[#7ee2a8]/10 px-4 py-2 text-sm text-[#bff2d3]">Created. It&apos;s live in the Observatory now.</p>}
      {actionError && <p className="rounded border border-red-400/30 bg-red-400/10 px-4 py-2 text-sm text-red-200">Couldn&apos;t delete that report.</p>}

      <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
        <Panel title="Edit report" hint={`${KIND_LABELS[report.kind]} by ${displayName(author)} · ${formatDate(report.created_at)} · written by ${report.model}`}>
          {report.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={report.image_url} alt={report.subject} className="max-h-80 w-full rounded object-contain bg-black/40" />
          )}
          <EditForm id={report.id} subject={report.subject} body={report.body} />
        </Panel>

        <div className="flex flex-col gap-5">
          <Panel title="Votes" hint="Who voted on this report (read-only).">
            <p className="font-mono text-2xl font-bold text-white">
              {up - down > 0 ? `+${up - down}` : up - down}
              <span className="ml-2 text-sm font-normal text-white/50">{up}▲ {down}▼</span>
            </p>
            <ul className="flex flex-col gap-1 text-sm">
              {(votes ?? []).map((v) => (
                <li key={v.user_id} className="flex justify-between gap-2">
                  <span className="truncate text-white/80">{displayName(voterById.get(v.user_id))}</span>
                  <span className={v.value === 1 ? "text-[#7ee2a8]" : "text-[#e98a6a]"}>{v.value === 1 ? "▲" : "▼"}</span>
                </li>
              ))}
              {!votes?.length && <li className="font-mono text-xs text-white/45">No votes yet.</li>}
            </ul>
          </Panel>

          <Panel title="Danger zone" hint="Deleting removes the report, its votes, and any stored images. This can't be undone.">
            <DeleteButton id={report.id} />
          </Panel>
        </div>
      </div>

      <Panel title="What the AI was given" hint="The exact prompts saved with this report.">
        {report.user_prompt && <p className="text-sm text-white/80"><span className="font-mono text-xs text-white/50 uppercase">User typed: </span>{report.user_prompt}{report.planet && ` → ${report.planet}`}</p>}
        {report.source_image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={report.source_image_url} alt="User's photo" className="h-24 w-24 rounded object-cover" />
        )}
        <pre className="max-h-72 overflow-auto rounded bg-black/40 p-3 font-mono text-xs whitespace-pre-wrap text-white/70">{report.prompt}</pre>
        {report.image_prompt && (
          <>
            <p className="font-mono text-xs text-white/50 uppercase">Image prompt (Pollinations)</p>
            <pre className="rounded bg-black/40 p-3 font-mono text-xs whitespace-pre-wrap text-white/70">{report.image_prompt}</pre>
          </>
        )}
      </Panel>
    </main>
  );
}
