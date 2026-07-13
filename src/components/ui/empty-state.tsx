import { ReactNode } from "react";
import { Logo } from "@/components/brand/logo";

interface EmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-muted/30 px-6 py-14 text-center">
      <Logo size="md" className="mb-5 opacity-80" />
      <h3 className="text-lg font-semibold text-brand-navy">{title}</h3>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-brand-muted">
        {description}
      </p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
