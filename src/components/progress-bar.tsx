import { cn } from "@/lib/utils";

/** A thin completion bar — value out of total. */
export function ProgressBar({
  value,
  total,
  className,
}: {
  value: number;
  total: number;
  className?: string;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div
      className={cn(
        "bg-muted h-2 w-full overflow-hidden rounded-full",
        className,
      )}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="bg-primary h-full rounded-full transition-all"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
