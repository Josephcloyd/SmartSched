import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-5">
      <section className="w-full max-w-md rounded-lg border border-border bg-surface p-6 text-center shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">
          Not found
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">
          This SmartSched page does not exist.
        </h1>
        <Link
          className="mt-5 inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-white"
          href="/"
        >
          Back to SmartSched
        </Link>
      </section>
    </main>
  );
}
