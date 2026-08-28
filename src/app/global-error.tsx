"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 font-sans">
        <h1 className="text-2xl font-bold">Application error</h1>
        <p className="mt-2 text-muted-foreground">
          Passport encountered a critical error. Please refresh the page.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="mt-6 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Try again
        </button>
      </body>
    </html>
  );
}
