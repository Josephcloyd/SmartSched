export default function Loading() {
  return (
    <div className="grid min-h-screen place-items-center bg-background px-5">
      <div className="w-full max-w-sm rounded-lg border border-border bg-surface p-5 shadow-sm">
        <div className="h-4 w-28 animate-pulse rounded bg-surface-2" />
        <div className="mt-4 h-8 w-56 animate-pulse rounded bg-surface-2" />
        <div className="mt-3 h-4 w-full animate-pulse rounded bg-surface-2" />
        <div className="mt-2 h-4 w-4/5 animate-pulse rounded bg-surface-2" />
      </div>
    </div>
  );
}
