import { describe, expect, it } from "vitest";
import { computeStats, dailyCounts, hourLabel, nyDay, nyHour, plural, tallyVotes, textModel } from "../stats";
import type { Profile, Report, VoteRow } from "../observatory";

const now = new Date("2026-10-21T16:00:00Z"); // noon in New York

function report(id: string, over: Partial<Report> = {}): Report {
  return {
    id, user_id: "u1", kind: "field_note", subject: id, body: "", prompt: "", model: "m1",
    image_url: null, anomaly_date: null, created_at: "2026-10-21T14:00:00Z", planet: null,
    image_prompt: null, user_prompt: null, source_image_url: null, ...over,
  };
}
const vote = (report_id: string, user_id: string, value: 1 | -1): VoteRow => ({ report_id, user_id, value, created_at: now.toISOString() });
const profile = (id: string, first_name: string): Profile => ({
  id, email: `${id}@x.edu`, first_name, last_name: "L", avatar_url: null, created_at: now.toISOString(), is_superadmin: false,
});

describe("time helpers", () => {
  it("uses New York days and hours", () => {
    expect(nyDay("2026-10-21T03:00:00Z")).toBe("2026-10-20"); // 11pm the night before in NY
    expect(nyHour("2026-10-21T03:00:00Z")).toBe(23);
    expect(hourLabel(0)).toBe("12am");
    expect(hourLabel(13)).toBe("1pm");
  });

  it("zero-fills the daily series, oldest first", () => {
    const days = dailyCounts([{ created_at: "2026-10-21T14:00:00Z" }, { created_at: "2026-10-19T14:00:00Z" }], 3, now);
    expect(days).toEqual([
      { day: "2026-10-19", count: 1 },
      { day: "2026-10-20", count: 0 },
      { day: "2026-10-21", count: 1 },
    ]);
  });
});

describe("computeStats", () => {
  const reports = [
    report("a", { user_id: "u1", model: "flash" }),
    report("b", { user_id: "u2", kind: "postcard", planet: "mars", model: "flash-lite", anomaly_date: "2026-10-21" }),
    report("c", { user_id: "u2", kind: "postcard", planet: "mars", model: "flash-lite + pollinations" }),
  ];
  const votes = [vote("a", "u1", 1), vote("a", "u2", 1), vote("b", "u1", 1), vote("b", "u3", -1), vote("c", "u3", -1)];
  const stats = computeStats({ reports, votes, profiles: [profile("u1", "Sam"), profile("u2", "Ana")], now });

  it("tallies votes per report", () => {
    expect(tallyVotes(votes).get("b")).toEqual({ up: 1, down: 1, score: 0, total: 2 });
  });

  it("totals", () => {
    expect(stats.totals).toMatchObject({ users: 2, creators: 2, reports: 3, postcards: 2, votes: 5, voters: 3 });
    expect(stats.totals.upvoteRate).toBeCloseTo(3 / 5);
    expect(stats.totals.anomalyShare).toBeCloseTo(1 / 3);
  });

  it("groups by kind, planet and model with average scores", () => {
    expect(stats.byKind[0]).toMatchObject({ key: "postcard", count: 2, avgScore: -0.5 });
    expect(stats.byPlanet).toEqual([{ key: "mars", count: 2, avgScore: -0.5, votes: 3 }]);
    expect(stats.byModel.find((m) => m.key === "flash")).toMatchObject({ count: 1, avgScore: 2 });
    expect(stats.byModel.find((m) => m.key === "flash-lite")).toMatchObject({ count: 2 }); // image service stripped
    expect(textModel("gemini-3.8-flash + pollinations")).toBe("gemini-3.8-flash");
    expect([plural(1, "report"), plural(2, "report")]).toEqual(["1 report", "2 reports"]);
  });

  it("finds the top report, the most divisive one, and the leaderboard", () => {
    expect(stats.topReports[0].id).toBe("a");
    expect(stats.controversial?.id).toBe("b");
    expect(stats.topCreators.map((c) => [c.profile?.first_name, c.score])).toEqual([["Sam", 2], ["Ana", -1]]);
  });

  it("handles an empty database", () => {
    const empty = computeStats({ reports: [], votes: [], profiles: [], now });
    expect(empty.totals.upvoteRate).toBeNull();
    expect(empty.peakHour).toBeNull();
    expect(empty.controversial).toBeNull();
  });
});
