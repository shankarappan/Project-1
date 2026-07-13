import { cn } from "@/lib/utils";

interface WordmarkProps {
  className?: string;
  showTagline?: boolean;
}

export function Wordmark({ className, showTagline = false }: WordmarkProps) {
  return (
    <div className={cn("flex flex-col", className)}>
      <span className="font-heading text-lg font-bold tracking-tight sm:text-xl">
        <span className="text-brand-navy">Lets </span>
        <span className="text-brand-blue">Split</span>
      </span>
      {showTagline && (
        <span className="mt-0.5 text-[10px] font-medium tracking-[0.2em] text-brand-muted uppercase sm:text-xs">
          One off spending. Clearly split.
        </span>
      )}
    </div>
  );
}
