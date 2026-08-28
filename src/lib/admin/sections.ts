import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  BookOpen,
  Building2,
  Cpu,
  Inbox,
  LayoutDashboard,
  MessageSquare,
  Scale,
  Tags,
  Truck,
  Users,
} from "lucide-react";

export interface AdminSection {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

export const ADMIN_SECTIONS: AdminSection[] = [
  {
    href: "/admin/dashboard",
    label: "Dashboard",
    description: "Platform overview, alerts, and operator guide",
    icon: LayoutDashboard,
  },
  {
    href: "/admin/runbook",
    label: "Runbook",
    description: "Step-by-step procedures for operations and incidents",
    icon: BookOpen,
  },
  {
    href: "/admin/organizations",
    label: "Organizations",
    description: "Tenant accounts, user counts, and shipment volume",
    icon: Building2,
  },
  {
    href: "/admin/users",
    label: "Users",
    description: "Search users and promote or demote platform admins",
    icon: Users,
  },
  {
    href: "/admin/shipments",
    label: "Shipments",
    description: "Cross-tenant shipment list with filters and read-only detail",
    icon: Truck,
  },
  {
    href: "/admin/inbound",
    label: "Inbound",
    description: "Email and WhatsApp document ingestion audit trail",
    icon: Inbox,
  },
  {
    href: "/admin/ai-usage",
    label: "Model usage",
    description: "AI cost, tokens, and error rate by provider and organization",
    icon: Cpu,
  },
  {
    href: "/admin/errors",
    label: "Errors",
    description: "Application error logs with stack traces and filters",
    icon: AlertTriangle,
  },
  {
    href: "/admin/regulations",
    label: "Regulations",
    description: "Manage compliance rules and jurisdiction mappings",
    icon: Scale,
  },
  {
    href: "/admin/document-abbreviations",
    label: "Abbreviations",
    description: "Trade document abbreviation → canonical type mappings",
    icon: Tags,
  },
  {
    href: "/admin/feedback",
    label: "Feedback",
    description: "User-submitted product feedback and support requests",
    icon: MessageSquare,
  },
];

export const ADMIN_OPERATOR_TASKS = [
  {
    title: "Promote a platform admin",
    detail: "Admin → Users → select user → Promote. Requires migration 009 (is_platform_admin column).",
  },
  {
    title: "Bootstrap first admin (CLI)",
    detail: "npm run bootstrap-admin -- <email> <password> \"Full Name\"",
  },
  {
    title: "Promote existing user (CLI)",
    detail: "npm run make-admin -- <email>",
  },
  {
    title: "Check database migrations",
    detail: "npm run check-migrations — then npm run apply-migrations if SUPABASE_DB_URL is set.",
  },
  {
    title: "Review open feedback",
    detail: "Admin → Feedback — update status and add admin notes for follow-up.",
  },
  {
    title: "Monitor AI spend",
    detail: "Admin → Model usage — filter by date range; investigate spikes or high error rates.",
  },
  {
    title: "Manage regulations",
    detail: "Admin → Regulations — add corridor rules; changes apply to new compliance runs.",
  },
  {
    title: "Triage inbound failures",
    detail: "Admin → Inbound — check messages with Error status; verify channel webhook config.",
  },
] as const;

export const ADMIN_ENV_KEYS = [
  { key: "NEXT_PUBLIC_SUPABASE_URL", label: "Supabase URL", required: true },
  { key: "NEXT_PUBLIC_SUPABASE_ANON_KEY", label: "Supabase anon key", required: true },
  { key: "SUPABASE_SERVICE_ROLE_KEY", label: "Service role key", required: true },
  { key: "NEXT_PUBLIC_APP_URL", label: "App URL", required: true },
  { key: "OPENAI_API_KEY", label: "OpenAI API key", required: true },
  { key: "SUPABASE_DB_URL", label: "Database URI (migrations)", required: false },
  { key: "STRIPE_SECRET_KEY", label: "Stripe billing", required: false },
  { key: "SENDGRID_API_KEY", label: "Email invites", required: false },
  { key: "NEXT_PUBLIC_SUPPORT_EMAIL", label: "Support email override", required: false },
] as const;
