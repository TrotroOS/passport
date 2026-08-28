import type { NotificationPreferences } from "@/types/database";

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  email_alerts: true,
  tracking_updates: true,
  compliance_alerts: true,
  weekly_digest: false,
};

export type NotificationChannel =
  | "email_alerts"
  | "tracking_updates"
  | "compliance_alerts"
  | "weekly_digest";

export function mergeNotificationPreferences(
  prefs: Partial<NotificationPreferences> | null | undefined
): NotificationPreferences {
  return {
    ...DEFAULT_NOTIFICATION_PREFERENCES,
    ...(prefs ?? {}),
  };
}

export function shouldSendNotification(
  prefs: Partial<NotificationPreferences> | null | undefined,
  channel: NotificationChannel
): boolean {
  return mergeNotificationPreferences(prefs)[channel];
}
