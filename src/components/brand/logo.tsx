import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizes = {
  sm: "h-8 w-8 rounded-lg",
  md: "h-10 w-10 rounded-xl",
  lg: "h-14 w-14 rounded-2xl",
};

export function Logo({ size = "md", className }: LogoProps) {
  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden shadow-sm ring-1 ring-black/5",
        sizes[size],
        className
      )}
      aria-hidden
    >
      <div className="absolute inset-0 bg-brand-teal" />
      <div className="absolute inset-y-0 right-0 w-1/2 bg-brand-blue" />
      <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white">
        $
      </span>
    </div>
  );
}
