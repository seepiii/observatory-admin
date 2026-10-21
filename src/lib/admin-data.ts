import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile, Report, VoteRow } from "./observatory";

// The Observatory is small, so the admin reads whole tables and aggregates in code.
// RLS only returns every profile and vote because the caller is a superadmin.
export async function loadEverything(supabase: SupabaseClient) {
  const [reports, votes, profiles] = await Promise.all([
    supabase.from("reports").select("*").order("created_at", { ascending: false }).returns<Report[]>(),
    supabase.from("votes").select("report_id, user_id, value, created_at").returns<VoteRow[]>(),
    supabase
      .from("profiles")
      .select("id, email, first_name, last_name, avatar_url, created_at, is_superadmin")
      .order("created_at", { ascending: true })
      .returns<Profile[]>(),
  ]);
  const error = reports.error ?? votes.error ?? profiles.error;
  return {
    reports: reports.data ?? [],
    votes: votes.data ?? [],
    profiles: profiles.data ?? [],
    error: error?.message ?? null,
  };
}
