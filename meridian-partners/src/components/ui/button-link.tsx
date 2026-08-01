import Link from "next/link";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "onDark";

const variants: Record<Variant, string> = {
  primary:
    "bg-brass text-ink hover:bg-brass-deep hover:text-cream shadow-[0_10px_30px_rgb(11_31_51/12%)]",
  secondary:
    "bg-ink text-cream hover:bg-ink-soft border border-ink",
  ghost:
    "bg-transparent text-ink border border-border hover:border-ink/40 hover:bg-white/50",
  onDark:
    "bg-cream text-ink hover:bg-white border border-transparent",
};

export function ButtonLink({
  href,
  children,
  variant = "primary",
  className,
}: {
  href: string;
  children: React.ReactNode;
  variant?: Variant;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold tracking-wide transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 focus-visible:ring-offset-cream",
        variants[variant],
        className,
      )}
    >
      {children}
    </Link>
  );
}

export function Button({
  children,
  variant = "primary",
  className,
  type = "submit",
  disabled,
}: {
  children: React.ReactNode;
  variant?: Variant;
  className?: string;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold tracking-wide transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 disabled:opacity-60",
        variants[variant],
        className,
      )}
    >
      {children}
    </button>
  );
}
