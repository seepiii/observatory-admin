"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/supabase-server";
import { getResource, parseForm } from "@/lib/resources";

export type FormState = { error?: string; saved?: boolean } | undefined;

function friendly(message: string) {
  if (message.includes("duplicate key")) return "That already exists.";
  if (message.includes("violates foreign key")) return "Other rows still use this one, so it can't be removed.";
  if (message.includes("violates check constraint")) return "That value isn't in the right format.";
  return message;
}

export async function createRow(_prev: FormState, form: FormData): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const resource = getResource(String(form.get("_resource")));
  if (!resource?.ops.includes("create")) return { error: "Not allowed." };
  const parsed = parseForm(resource, form);
  if ("error" in parsed) return parsed;

  const { error } = await supabase.from(resource.table).insert(parsed.row);
  if (error) return { error: friendly(error.message) };
  revalidatePath(`/${resource.slug}`);
  return { saved: true };
}

export async function updateRow(_prev: FormState, form: FormData): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const resource = getResource(String(form.get("_resource")));
  if (!resource?.ops.includes("update")) return { error: "Not allowed." };
  const parsed = parseForm(resource, form);
  if ("error" in parsed) return parsed;
  const row = resource.table === "prompt_chain_mix" ? { ...parsed.row, updated_at: new Date().toISOString() } : parsed.row;

  // .select() so a row RLS silently skipped shows up as an error instead of a fake success.
  const { data, error } = await supabase
    .from(resource.table)
    .update(row)
    .eq(resource.key ?? "id", String(form.get("_id")))
    .select();
  if (error) return { error: friendly(error.message) };
  if (!data?.length) return { error: "Nothing was updated (row missing or not allowed)." };
  revalidatePath(`/${resource.slug}`, "layout");
  return { saved: true };
}

export async function deleteRow(form: FormData) {
  const { supabase } = await requireAdmin();
  const resource = getResource(String(form.get("_resource")));
  const id = String(form.get("_id"));
  if (!resource?.ops.includes("delete")) redirect("/");

  const { data, error } = await supabase.from(resource.table).delete().eq(resource.key ?? "id", id).select();
  if (error || !data?.length) {
    redirect(`/${resource.slug}/${id}?error=${encodeURIComponent(error ? friendly(error.message) : "Nothing was deleted.")}`);
  }
  revalidatePath(`/${resource.slug}`);
  redirect(`/${resource.slug}?deleted=1`);
}
