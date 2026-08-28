import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { FileText, Shield } from "lucide-react";
import { AdminNav } from "@/components/admin/admin-nav";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { getPlatformAdminContext } from "@/lib/admin/require-platform-admin";

export const metadata: Metadata = {
  title: "Passport Admin",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getPlatformAdminContext();
  if (!ctx) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-muted/20 text-foreground">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <Shield className="h-5 w-5 shrink-0 text-primary" aria-hidden />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">Passport Admin</p>
              <p className="hidden truncate text-xs text-muted-foreground sm:block">
                {ctx.email}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <ThemeToggle />
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <FileText className="h-4 w-4 shrink-0" aria-hidden />
              <span className="hidden sm:inline">Back to app</span>
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-0 px-4 py-6 sm:px-6 md:flex-row md:gap-6">
        <AdminNav />

        <main className="min-w-0 flex-1 md:pt-0">
          <div className="rounded-lg border bg-card p-4 shadow-sm sm:p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
