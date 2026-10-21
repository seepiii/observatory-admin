"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/supabase-server";
import { buildPrompt } from "@/lib/prompts";
import { generateReport, GenerationError } from "@/lib/gemini";
import { CREATABLE, type TextReportKind } from "@/lib/observatory";

export type FormState = { error?: string; saved?: boolean } | undefined;

// CREATE: Gemini writes a new report exactly like the main app does, credited to the admin.
export async function createReport(_prev: FormState, form: FormData): Promise<FormState> {
  const { supabase, user } = await requireAdmin();
  const kind = form.get("kind") as TextReportKind;
  const subject = String(form.get("subject") ?? "").trim().slice(0, 140);
  if (!CREATABLE.includes(kind)) return { error: "Pick Field Note or Exoplanet." };
  if (!subject) return { error: "Give the alien something to study." };

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { error: "GEMINI_API_KEY isn't configured for the admin app." };

  const prompt = buildPrompt({ kind, subject });
  let result;
  try {
    result = await generateReport({ system: prompt.system, user: prompt.user, apiKey });
  } catch (e) {
    return {
      error: e instanceof GenerationError && e.reason === "blocked"
        ? "Gemini refused that subject. Try another."
        : "Gemini is busy right now. Try again in a moment.",
    };
  }

  const { data, error } = await supabase
    .from("reports")
    .insert({ user_id: user.id, kind, subject, prompt: prompt.stored, model: result.model, body: result.text })
    .select("id")
    .single();
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  redirect(`/media/${data.id}?created=1`);
}

// UPDATE: fix a title or edit what the AI wrote.
export async function updateReport(_prev: FormState, form: FormData): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const id = String(form.get("id") ?? "");
  const subject = String(form.get("subject") ?? "").trim();
  const body = String(form.get("body") ?? "").trim();
  if (!subject || subject.length > 140) return { error: "Title must be 1–140 characters." };
  if (!body) return { error: "The report text can't be empty." };

  // .select() so a row RLS silently skipped shows up as an error instead of a fake success.
  const { data, error } = await supabase.from("reports").update({ subject, body }).eq("id", id).select("id");
  if (error) return { error: error.message };
  if (!data?.length) return { error: "Nothing was updated (report missing or not allowed)." };

  revalidatePath("/", "layout");
  return { saved: true };
}

function storagePath(url: string | null) {
  const marker = "/storage/v1/object/public/reports/";
  const at = url?.indexOf(marker) ?? -1;
  return url && at >= 0 ? decodeURIComponent(url.slice(at + marker.length)) : null;
}

// DELETE: removes the report (its votes cascade) and any images it stored.
export async function deleteReport(form: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(form.get("id") ?? "");

  const { data: report } = await supabase
    .from("reports")
    .select("image_url, source_image_url")
    .eq("id", id)
    .maybeSingle();

  const { data, error } = await supabase.from("reports").delete().eq("id", id).select("id");
  if (error || !data?.length) redirect(`/media/${id}?error=delete`);

  const paths = [storagePath(report?.image_url ?? null), storagePath(report?.source_image_url ?? null)].filter(
    (p): p is string => !!p,
  );
  if (paths.length) await supabase.storage.from("reports").remove(paths);

  revalidatePath("/", "layout");
  redirect("/media?deleted=1");
}
