import Link from "next/link";
import { requireAdmin } from "@/lib/supabase-server";
import Panel from "@/components/Panel";
import { deleteImage, replaceImage, uploadImage } from "./actions";

type Stored = { path: string; size: number; updated: string | null };

const button = "rounded-full px-4 py-1.5 font-mono text-xs font-bold tracking-[0.15em] uppercase";
const fileInput = "text-xs text-white/70 file:mr-3 file:rounded-full file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-white";

// Images live in the "reports" bucket as <folder>/<file>: one folder per user, plus "admin".
export default async function ImagesPage({ searchParams }: PageProps<"/images">) {
  const { supabase } = await requireAdmin();
  const { msg, path: highlighted } = await searchParams;
  const bucket = supabase.storage.from("reports");

  const { data: folders, error } = await bucket.list("", { limit: 1000 });
  const listed = await Promise.all(
    (folders ?? [])
      .filter((f) => !f.id) // folders have no id
      .map(async (folder) => {
        const { data } = await bucket.list(folder.name, { limit: 1000, sortBy: { column: "created_at", order: "desc" } });
        return (data ?? [])
          .filter((f) => f.id && f.name !== ".emptyFolderPlaceholder")
          .map((f): Stored => ({ path: `${folder.name}/${f.name}`, size: Number(f.metadata?.size ?? 0), updated: f.updated_at }));
      }),
  );
  const images = listed.flat().sort((a, b) => (b.updated ?? "").localeCompare(a.updated ?? ""));

  // Which report uses each image.
  const { data: reports } = await supabase.from("reports").select("id, subject, image_url, source_image_url");
  const usedBy = new Map<string, { id: string; subject: string }>();
  for (const r of reports ?? []) {
    for (const url of [r.image_url, r.source_image_url]) {
      const at = url?.indexOf("/object/public/reports/") ?? -1;
      if (url && at >= 0) usedBy.set(decodeURIComponent(url.slice(at + "/object/public/reports/".length)), r);
    }
  }

  return (
    <main className="flex flex-col gap-5">
      {msg && <p className="rounded border border-white/15 bg-white/5 px-4 py-3 text-sm text-white">{String(msg)}</p>}
      {error && <p className="rounded border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">Storage error: {error.message}</p>}

      <Panel title="Upload an image" hint="JPG, PNG or WebP, under 3.5 MB. Saved to the reports bucket under admin/.">
        <form action={uploadImage} className="flex flex-wrap items-center gap-3">
          <input type="file" name="file" accept="image/jpeg,image/png,image/webp" required className={fileInput} />
          <button className={`${button} bg-[#e9c46a] text-[#1a1408] hover:bg-[#f4dfa6]`}>Upload</button>
        </form>
      </Panel>

      <Panel title="Images" hint={`Every stored image: photos people uploaded for Transmissions, postcard paintings, and admin uploads. ${images.length} files.`}>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {images.map((img) => {
            const report = usedBy.get(img.path);
            return (
              <li key={img.path} className={`flex flex-col gap-2 rounded-lg border bg-black/30 p-3 ${highlighted === img.path ? "border-[#e9c46a]" : "border-white/10"}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`${bucket.getPublicUrl(img.path).data.publicUrl}?v=${encodeURIComponent(img.updated ?? "")}`} alt="" className="aspect-video w-full rounded object-cover" loading="lazy" />
                <p className="font-mono text-xs break-all text-white/50">{img.path} · {Math.round(img.size / 1024)} KB</p>
                <p className="text-xs text-white/70">
                  {report ? <>Used by <Link href={`/media/${report.id}`} className="text-[#e9c46a] hover:underline">{report.subject}</Link></> : "Not used by any report"}
                </p>
                <form action={replaceImage} className="flex flex-wrap items-center gap-2">
                  <input type="hidden" name="path" value={img.path} />
                  <input type="file" name="file" accept="image/jpeg,image/png,image/webp" required className={`${fileInput} max-w-[12rem]`} />
                  <button className={`${button} border border-white/20 text-white/80 hover:text-white`}>Replace</button>
                </form>
                <form action={deleteImage}>
                  <input type="hidden" name="path" value={img.path} />
                  <button className={`${button} border border-[#e98a6a]/60 text-[#e98a6a] hover:bg-[#e98a6a]/10`}>Delete</button>
                </form>
              </li>
            );
          })}
        </ul>
      </Panel>
    </main>
  );
}
