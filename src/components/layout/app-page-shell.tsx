import type { ReactNode } from "react";
import { AppHeader } from "@/components/layout/app-header";

interface AppPageShellProps {
  organizationName?: string;
  userEmail?: string;
  isPlatformAdmin?: boolean;
  children: ReactNode;
  className?: string;
}

export function AppPageShell({
  organizationName,
  userEmail,
  isPlatformAdmin,
  children,
  className = "bg-white",
}: AppPageShellProps) {
  return (
    <div className={`no-print min-h-screen overflow-x-hidden print:hidden ${className}`}>
      <AppHeader
        organizationName={organizationName}
        userEmail={userEmail}
        isPlatformAdmin={isPlatformAdmin}
      />
      {children}
    </div>
  );
}
