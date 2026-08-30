"use client";

import { useEffect } from "react";
import { reportClientError } from "@/lib/monitoring/report-error";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Passport]", error);
    reportClientError(error, { digest: error.digest });
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4">
      <h1 className="text-2xl font-bold tracking-tight">Something went wrong</h1>
      <p className="mt-2 max-w-md text-center text-muted-foreground">
        An unexpected error occurred. Try again, or return to your dashboard.
      </p>
      <div className="mt-6 flex gap-3">
        <Button onClick={() => reset()}>Try again</Button>
        <Button variant="outline" asChild>
          <a href="/dashboard">Dashboard</a>
        </Button>
      </div>
    </div>
  );
}
