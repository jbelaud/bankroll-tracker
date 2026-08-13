import { describe, expect, it } from "vitest";
import { groupHistoryBets } from "./history-grouping";

describe("groupHistoryBets", () => {
  it("organizes bets by month, Monday-based week, then day", () => {
    const groups = groupHistoryBets(
      [
        { id: "aug-17", date: new Date(2026, 7, 17, 12), profit: -4 },
        { id: "aug-16", date: new Date(2026, 7, 16, 12), profit: 8 },
        { id: "aug-14", date: new Date(2026, 7, 14, 12), profit: 2 },
        { id: "jul-31", date: new Date(2026, 6, 31, 12), profit: 1 },
      ],
      "fr-FR"
    );

    expect(groups.map((month) => month.key)).toEqual(["2026-08", "2026-07"]);
    expect(groups[0]).toMatchObject({ betCount: 3, profit: 6 });
    expect(groups[0].weeks.map((week) => week.key)).toEqual(["2026-08-17", "2026-08-10"]);
    expect(groups[0].weeks[1]).toMatchObject({ betCount: 2, profit: 10 });
    expect(groups[0].weeks[1].days.map((day) => day.key)).toEqual(["2026-08-16", "2026-08-14"]);
  });

  it("keeps each bet ordered from newest to oldest within its day", () => {
    const groups = groupHistoryBets(
      [
        { id: "early", date: new Date(2026, 7, 14, 9), profit: 1 },
        { id: "late", date: new Date(2026, 7, 14, 18), profit: 2 },
      ],
      "fr-FR"
    );

    expect(groups[0].weeks[0].days[0].bets.map((bet) => bet.id)).toEqual(["late", "early"]);
  });
});
