import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppPageShell } from "@/components/layout/app-page-shell";
import { SettingsNav } from "@/components/settings/settings-nav";
import { Button } from "@/components/ui/button";
import { getSettingsContext } from "@/lib/settings/get-settings-context";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { organizationName, userEmail } = await getSettingsContext();

  return (
    <AppPageShell organizationName={organizationName} userEmail={userEmail}>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-0 px-4 py-4 sm:px-6 sm:py-6 md:flex-row md:items-start md:gap-6 lg:px-8">
        <SettingsNav />

        <main className="min-w-0 flex-1 md:pt-0">
          <Button variant="ghost" size="sm" asChild className="mb-4 -ms-2 md:hidden">
            <Link href="/dashboard">
              <ArrowLeft className="me-2 h-4 w-4" />
              Back to dashboard
            </Link>
          </Button>
          <div className="rounded-lg border bg-card p-4 shadow-sm sm:p-6">{children}</div>
        </main>
      </div>
    </AppPageShell>
  );
}
