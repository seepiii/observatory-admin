import type { Profile, Report, ReportKind, VoteRow } from "./observatory";

const TZ = "America/New_York";

/** YYYY-MM-DD in New York (the Observatory's "day"). */
export function nyDay(at: Date | string): string {
  return new Date(at).toLocaleDateString("en-CA", { timeZone: TZ });
}

/** 0-23 hour in New York. */
export function nyHour(at: Date | string): number {
  return Number(new Date(at).toLocaleString("en-US", { timeZone: TZ, hour: "numeric", hourCycle: "h23" }));
}

export type Tally = { up: number; down: number; score: number; total: number };

export function tallyVotes(votes: VoteRow[]): Map<string, Tally> {
  const out = new Map<string, Tally>();
  for (const v of votes) {
    const t = out.get(v.report_id) ?? { up: 0, down: 0, score: 0, total: 0 };
    if (v.value === 1) t.up++;
    else t.down++;
    t.score += v.value;
    t.total++;
    out.set(v.report_id, t);
  }
  return out;
}

const EMPTY: Tally = { up: 0, down: 0, score: 0, total: 0 };

/** Reports per New York day for the last `days` days, oldest first (zero-filled). */
export function dailyCounts(reports: Pick<Report, "created_at">[], days: number, now = new Date()) {
  const counts = new Map<string, number>();
  for (const r of reports) counts.set(nyDay(r.created_at), (counts.get(nyDay(r.created_at)) ?? 0) + 1);
  const out: { day: string; count: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = nyDay(new Date(now.getTime() - i * 86_400_000));
    out.push({ day, count: counts.get(day) ?? 0 });
  }
  return out;
}

export function hourlyCounts(reports: Pick<Report, "created_at">[]) {
  const hours = Array.from({ length: 24 }, () => 0);
  for (const r of reports) hours[nyHour(r.created_at)]++;
  return hours;
}

type Group = { key: string; count: number; avgScore: number; votes: number };

function groupBy(reports: Report[], tallies: Map<string, Tally>, keyOf: (r: Report) => string | null): Group[] {
  const groups = new Map<string, { count: number; score: number; votes: number }>();
  for (const r of reports) {
    const key = keyOf(r);
    if (!key) continue;
    const g = groups.get(key) ?? { count: 0, score: 0, votes: 0 };
    const t = tallies.get(r.id) ?? EMPTY;
    g.count++;
    g.score += t.score;
    g.votes += t.total;
    groups.set(key, g);
  }
  return [...groups.entries()]
    .map(([key, g]) => ({ key, count: g.count, avgScore: g.score / g.count, votes: g.votes }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
}

export function computeStats({
  reports,
  votes,
  profiles,
  now = new Date(),
}: {
  reports: Report[];
  votes: VoteRow[];
  profiles: Profile[];
  now?: Date;
}) {
  const tallies = tallyVotes(votes);
  const tally = (id: string) => tallies.get(id) ?? EMPTY;
  const ups = votes.filter((v) => v.value === 1).length;

  const withTally = reports.map((r) => ({ ...r, ...tally(r.id) }));

  // The most divisive report: the most votes on BOTH sides (the smaller side decides).
  const controversial = withTally
    .filter((r) => r.up > 0 && r.down > 0)
    .sort((a, b) => Math.min(b.up, b.down) - Math.min(a.up, a.down) || b.total - a.total)[0] ?? null;

  // Crew leaderboard: total score their reports earned.
  const byAuthor = new Map<string, { reports: number; score: number }>();
  for (const r of withTally) {
    const a = byAuthor.get(r.user_id) ?? { reports: 0, score: 0 };
    a.reports++;
    a.score += r.score;
    byAuthor.set(r.user_id, a);
  }
  const profileById = new Map(profiles.map((p) => [p.id, p]));
  const topCreators = [...byAuthor.entries()]
    .map(([id, a]) => ({ profile: profileById.get(id) ?? null, id, ...a }))
    .sort((a, b) => b.score - a.score || b.reports - a.reports)
    .slice(0, 5);

  const votesByUser = new Map<string, number>();
  for (const v of votes) votesByUser.set(v.user_id, (votesByUser.get(v.user_id) ?? 0) + 1);
  const voters = votesByUser.size;

  const hours = hourlyCounts(reports);
  const peakHour = reports.length ? hours.indexOf(Math.max(...hours)) : null;

  return {
    totals: {
      users: profiles.length,
      creators: byAuthor.size,
      reports: reports.length,
      postcards: reports.filter((r) => r.kind === "postcard").length,
      votes: votes.length,
      voters,
      upvoteRate: votes.length ? ups / votes.length : null,
      votesPerReport: reports.length ? votes.length / reports.length : null,
      anomalyShare: reports.length ? reports.filter((r) => r.anomaly_date).length / reports.length : null,
      lastWeek: reports.filter((r) => now.getTime() - new Date(r.created_at).getTime() < 7 * 86_400_000).length,
    },
    daily: dailyCounts(reports, 14, now),
    hours,
    peakHour,
    byKind: groupBy(reports, tallies, (r) => r.kind) as (Group & { key: ReportKind })[],
    byPlanet: groupBy(reports, tallies, (r) => (r.kind === "postcard" ? r.planet : null)),
    // Postcards record "gemini-x + pollinations"; compare the Gemini text model alone.
    byModel: groupBy(reports, tallies, (r) => textModel(r.model)),
    topReports: [...withTally].sort((a, b) => b.score - a.score || b.up - a.up).slice(0, 3),
    controversial,
    topCreators,
  };
}

export type Stats = ReturnType<typeof computeStats>;

/** "gemini-3.5-flash-lite + pollinations" → "gemini-3.5-flash-lite" */
export function textModel(model: string) {
  return model.split(" + ")[0].trim();
}

export function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

export function hourLabel(h: number) {
  const suffix = h < 12 ? "am" : "pm";
  return `${h % 12 === 0 ? 12 : h % 12}${suffix}`;
}
