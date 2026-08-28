import { z } from "zod";

export const analyticsDateRangeSchema = z.enum(["30d", "90d", "1y", "all"]);

export type AnalyticsDateRange = z.infer<typeof analyticsDateRangeSchema>;

export function parseAnalyticsDateRange(
  value: string | null | undefined
): AnalyticsDateRange {
  const parsed = analyticsDateRangeSchema.safeParse(value ?? "30d");
  return parsed.success ? parsed.data : "30d";
}

export function dateRangeCutoff(range: AnalyticsDateRange): Date | null {
  const now = new Date();
  switch (range) {
    case "30d":
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case "90d":
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    case "1y":
      return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    case "all":
      return null;
  }
}

export function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function formatMonthLabel(key: string): string {
  const [year, month] = key.split("-");
  const d = new Date(Number(year), Number(month) - 1, 1);
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}
