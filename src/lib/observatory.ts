// The main app's data model, as the admin area sees it.
export type ReportKind = "field_note" | "exoplanet" | "transmission" | "postcard";
/** Kinds the admin can generate as text with Gemini (postcards come from the main app's Teleporter). */
export type TextReportKind = Exclude<ReportKind, "postcard">;

export const KIND_LABELS: Record<ReportKind, string> = {
  field_note: "◎ Field Note",
  exoplanet: "◐ Exoplanet",
  transmission: "◉ Transmission",
  postcard: "✉ Postcard",
};

/** Kinds the admin can generate from a text subject alone (transmissions need a photo). */
export const CREATABLE: TextReportKind[] = ["field_note", "exoplanet"];

export function isReportKind(value: unknown): value is ReportKind {
  return typeof value === "string" && value in KIND_LABELS;
}

export type Report = {
  id: string;
  user_id: string;
  kind: ReportKind;
  subject: string;
  body: string;
  prompt: string;
  model: string;
  image_url: string | null;
  anomaly_date: string | null;
  created_at: string;
  planet: string | null;
  image_prompt: string | null;
  user_prompt: string | null;
  source_image_url: string | null;
};

export type Profile = {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  created_at: string;
  is_superadmin: boolean;
};

export type VoteRow = { report_id: string; user_id: string; value: -1 | 1; created_at: string };

export function displayName(p: Pick<Profile, "first_name" | "last_name" | "email"> | undefined | null) {
  if (!p) return "Unknown";
  const name = `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim();
  return name || p.email || "Unnamed";
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
