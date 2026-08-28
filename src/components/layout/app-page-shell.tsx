import type { ReactNode } from "react";
import { AppHeader } from "@/components/layout/app-header";

interface AppPageShellProps {
  organizationName?: string;
  userEmail?: string;
  children: ReactNode;
  className?: string;
}

export function AppPageShell({
  organizationName,
  userEmail,
  children,
  className = "bg-slate-50",
}: AppPageShellProps) {
  return (
    <div className={`no-print min-h-screen overflow-x-hidden print:hidden ${className}`}>
      <AppHeader organizationName={organizationName} userEmail={userEmail} />
      {children}
    </div>
  );
}
