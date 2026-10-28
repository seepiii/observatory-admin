import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/supabase-server";
import { getResource } from "@/lib/resources";
import Panel from "@/components/Panel";
import RowForm from "./RowForm";
import { display, loadOptions } from "./data";

export default async function ResourceList({ params, searchParams }: PageProps<"/[resource]">) {
  const resource = getResource((await params).resource);
  if (!resource) notFound();
  const { deleted } = await searchParams;
  const { supabase } = await requireAdmin();

  const [{ data: rows, error }, options] = await Promise.all([
    supabase.from(resource.table).select("*").order(resource.orderBy.column, { ascending: resource.orderBy.ascending }),
    loadOptions(supabase, resource),
  ]);
  const key = resource.key ?? "id";
  const columns = resource.fields.filter((f) => !f.hideInList);
  const editable = resource.ops.includes("update") || resource.ops.includes("delete");

  return (
    <main className="flex flex-col gap-5">
      {deleted && <p className="rounded border border-[#7ee2a8]/30 bg-[#7ee2a8]/10 px-4 py-3 text-sm text-[#7ee2a8]">Deleted.</p>}
      {error && <p className="rounded border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">Database error: {error.message}</p>}

      <Panel title={resource.title} hint={`${resource.hint}${resource.ops.length ? "" : " Read-only."} ${rows?.length ?? 0} rows.`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left font-mono text-[11px] tracking-[0.15em] text-white/50 uppercase">
                {columns.map((c) => <th key={c.name} className="py-2 pr-4">{c.label}</th>)}
                {resource.extraColumns?.map((c) => <th key={c.name} className="py-2 pr-4">{c.label}</th>)}
                {editable && <th />}
              </tr>
            </thead>
            <tbody>
              {(rows ?? []).map((row: Record<string, unknown>) => (
                <tr key={String(row[key])} className="border-t border-white/5 align-top">
                  {columns.map((c) => (
                    <td key={c.name} className="max-w-md py-2 pr-4 whitespace-pre-line text-white/85">{display(row[c.name], c, options)}</td>
                  ))}
                  {resource.extraColumns?.map((c) => (
                    <td key={c.name} className="py-2 pr-4 font-mono text-xs whitespace-nowrap text-white/50">{display(row[c.name])}</td>
                  ))}
                  {editable && (
                    <td className="py-2 text-right">
                      <Link href={`/${resource.slug}/${row[key]}`} className="font-mono text-xs text-[#e9c46a] uppercase hover:underline">Edit</Link>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {resource.ops.includes("create") && (
        <Panel title={`Add to ${resource.title.toLowerCase()}`}>
          <RowForm resource={resource.slug} fields={resource.fields} options={options} />
        </Panel>
      )}
    </main>
  );
}
