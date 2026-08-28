import type { ShipmentStatus } from "@/types/database";
import { colors } from "@/lib/theme";

export function getStatusStyle(status: string): {
  bg: string;
  text: string;
  dot: string;
} {
  switch (status) {
    case "ready":
      return { bg: "#dcfce7", text: "#166534", dot: colors.success };
    case "blocked":
      return { bg: "#fee2e2", text: "#991b1b", dot: colors.danger };
    case "in_review":
      return { bg: "#fef3c7", text: "#92400e", dot: colors.warning };
    case "documents_uploaded":
      return { bg: "#dbeafe", text: "#1e40af", dot: colors.primary };
    case "archived":
      return { bg: "#f1f5f9", text: "#475569", dot: colors.muted };
    default:
      return { bg: "#e2e8f0", text: "#334155", dot: colors.muted };
  }
}

export function getScoreColor(score: number): string {
  if (score >= 80) return colors.success;
  if (score >= 60) return colors.warning;
  return colors.danger;
}

export function getSeverityStyle(severity: string): { bg: string; text: string } {
  switch (severity) {
    case "critical":
      return { bg: "#fee2e2", text: "#991b1b" };
    case "warning":
      return { bg: "#fef3c7", text: "#92400e" };
    default:
      return { bg: "#dbeafe", text: "#1e40af" };
  }
}

export function countByStatus(shipments: { status: ShipmentStatus }[]) {
  return {
    total: shipments.length,
    draft: shipments.filter((s) => s.status === "draft").length,
    ready: shipments.filter((s) => s.status === "ready").length,
    blocked: shipments.filter((s) => s.status === "blocked").length,
    inReview: shipments.filter((s) => s.status === "in_review").length,
  };
}
