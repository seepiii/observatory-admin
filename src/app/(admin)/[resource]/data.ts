import type { SupabaseClient } from "@supabase/supabase-js";
import { getResource, type Resource } from "@/lib/resources";
import type { Option } from "./RowForm";

/** Dropdown choices for every "ref" field, keyed by field name. */
export async function loadOptions(supabase: SupabaseClient, resource: Resource) {
  const options: Record<string, Option[]> = {};
  for (const f of resource.fields) {
    const target = f.ref ? getResource(f.ref) : null;
    if (!target) continue;
    const { data } = await supabase.from(target.table).select(`id, ${target.labelField}`).order("id");
    options[f.name] = ((data ?? []) as unknown as Record<string, unknown>[]).map((r) => ({
      value: String(r.id),
      label: String(r[target.labelField]),
    }));
  }
  return options;
}

export function display(value: unknown, field?: { type: string; name: string }, options?: Record<string, Option[]>) {
  if (value === null || value === undefined || value === "") return "—";
  if (field?.type === "ref") return options?.[field.name]?.find((o) => o.value === String(value))?.label ?? String(value);
  if (typeof value === "boolean") return value ? "yes" : "no";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    return new Date(value).toLocaleString("en-US", { timeZone: "America/New_York", dateStyle: "medium", timeStyle: "short" });
  }
  return String(value);
}
