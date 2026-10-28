"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/supabase-server";

const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const MAX_BYTES = 3.5 * 1024 * 1024;

function checkFile(file: FormDataEntryValue | null): File | string {
  if (!(file instanceof File) || file.size === 0) return "Choose an image first.";
  if (!TYPES[file.type]) return "Use a JPG, PNG or WebP image.";
  if (file.size > MAX_BYTES) return "Images must be under 3.5 MB.";
  return file;
}

function back(message: string, path?: string) {
  const q = new URLSearchParams({ msg: message });
  if (path) q.set("path", path);
  redirect(`/images?${q}`);
}

// CREATE: upload a new image into the reports bucket.
export async function uploadImage(form: FormData) {
  const { supabase } = await requireAdmin();
  const file = checkFile(form.get("file"));
  if (typeof file === "string") back(file);
  const f = file as File;
  const path = `admin/${crypto.randomUUID()}.${TYPES[f.type]}`;
  const { error } = await supabase.storage.from("reports").upload(path, f, { contentType: f.type });
  if (error) back(`Upload failed: ${error.message}`);
  revalidatePath("/images");
  back("Uploaded ✓", path);
}

// UPDATE: replace an image's file, keeping its URL so reports that use it update too.
export async function replaceImage(form: FormData) {
  const { supabase } = await requireAdmin();
  const path = String(form.get("path"));
  const file = checkFile(form.get("file"));
  if (typeof file === "string") back(file, path);
  const f = file as File;
  const { error } = await supabase.storage.from("reports").update(path, f, { contentType: f.type, upsert: true });
  if (error) back(`Replace failed: ${error.message}`, path);
  revalidatePath("/images");
  back("Replaced ✓ (browsers may show the old copy until they refresh)", path);
}

// DELETE: remove the stored file.
export async function deleteImage(form: FormData) {
  const { supabase } = await requireAdmin();
  const path = String(form.get("path"));
  const { data, error } = await supabase.storage.from("reports").remove([path]);
  if (error || !data?.length) back(`Delete failed: ${error?.message ?? "not allowed"}`, path);
  revalidatePath("/images");
  back("Deleted ✓");
}
