export const USER_HELP_TOPICS = [
  {
    id: "signIn",
    link: { href: "/login", labelKey: "links.signIn" },
  },
  {
    id: "documents",
    link: { href: "/dashboard", labelKey: "links.dashboard" },
  },
  {
    id: "blocked",
    link: { href: "/readiness", labelKey: "links.readiness" },
  },
  {
    id: "verification",
    link: { href: "/compliance-alerts", labelKey: "links.complianceAlerts" },
  },
  {
    id: "regulatory",
    link: { href: "/compliance/calendar", labelKey: "links.calendar" },
  },
  {
    id: "invites",
    link: { href: "/dashboard", labelKey: "links.dashboard" },
  },
  {
    id: "inbound",
    link: { href: "/settings/channels", labelKey: "links.channels" },
  },
  {
    id: "api",
    link: { href: "/settings/api-docs", labelKey: "links.apiDocs" },
  },
] as const;

export type UserHelpTopicId = (typeof USER_HELP_TOPICS)[number]["id"];
