import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/supabase-server";
import { getResource } from "@/lib/resources";
import Panel from "@/components/Panel";
import RowForm from "../RowForm";
import DeleteRow from "../DeleteRow";
import { display, loadOptions } from "../data";

export default async function ResourceRow({ params, searchParams }: PageProps<"/[resource]/[id]">) {
  const { resource: slug, id } = await params;
  const resource = getResource(slug);
  if (!resource || resource.ops.length === 0) notFound();
  const { error: deleteError } = await searchParams;
  const { supabase } = await requireAdmin();

  const [{ data: row }, options] = await Promise.all([
    supabase.from(resource.table).select("*").eq(resource.key ?? "id", id).maybeSingle(),
    loadOptions(supabase, resource),
  ]);
  if (!row) notFound();

  const labelField = resource.fields.find((f) => f.name === resource.labelField);
  // A row's primary key (the mix's chain) can't change, so it's the heading rather than a field.
  const fields = resource.fields.filter((f) => f.name !== resource.key);

  return (
    <main className="flex flex-col gap-5">
      <Link href={`/${resource.slug}`} className="font-mono text-xs text-white/50 uppercase hover:text-white">← {resource.title}</Link>
      {deleteError && <p className="rounded border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">{String(deleteError)}</p>}
      <Panel title={display(row[resource.labelField], labelField, options)} hint={resource.hint}>
        {resource.ops.includes("update") ? (
          <RowForm resource={resource.slug} fields={fields} options={options} row={row} rowId={id} />
        ) : (
          <p className="text-sm text-white/60">This table can&apos;t be edited.</p>
        )}
      </Panel>
      {resource.ops.includes("delete") && <DeleteRow resource={resource.slug} id={id} />}
    </main>
  );
}
