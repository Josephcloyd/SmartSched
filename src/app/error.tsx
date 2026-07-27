"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-5">
      <section className="w-full max-w-md rounded-lg border border-border bg-surface p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-danger">
          Something went wrong
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">
          SmartSched could not finish the request.
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          {error.message ||
            "Try again. If the issue continues, export your backup data and reload the app."}
        </p>
        <button
          className="mt-5 inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-white"
          onClick={reset}
        >
          Retry
        </button>
      </section>
    </main>
  );
}
