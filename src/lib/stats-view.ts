export const STATS_VIEWS = ["general", "distributions", "sport", "type", "bookmaker", "tipster", "details"] as const;

export type StatsView = typeof STATS_VIEWS[number];
