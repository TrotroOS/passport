import Link from "next/link";
import { cn } from "@/lib/utils";

interface AdminStatCardProps {
  label: string;
  value: string | number;
  href?: string;
  highlight?: "default" | "warning" | "danger";
  hint?: string;
}

export function AdminStatCard({
  label,
  value,
  href,
  highlight = "default",
  hint,
}: AdminStatCardProps) {
  const content = (
    <>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </>
  );

  const className = cn(
    "rounded-lg border bg-card p-4 shadow-sm transition-colors",
    highlight === "warning" && "border-amber-500/40 bg-amber-500/5",
    highlight === "danger" && "border-destructive/40 bg-destructive/5",
    href && "hover:border-primary/40 hover:bg-muted/30"
  );

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }

  return <div className={className}>{content}</div>;
}
