import { AppNav } from "@/components/layout/app-nav";
import { cn } from "@/lib/utils";
import type { Profile } from "@/lib/types/database";

interface AppShellProps {
  profile: Profile | null;
  children: React.ReactNode;
  maxWidth?: "md" | "lg" | "xl" | "2xl" | "6xl";
}

const widths = {
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
  "2xl": "max-w-5xl",
  "6xl": "max-w-6xl",
};

export function AppShell({
  profile,
  children,
  maxWidth = "6xl",
}: AppShellProps) {
  return (
    <div className="min-h-screen bg-surface">
      <AppNav profile={profile} />
      <main
        id="main-content"
        tabIndex={-1}
        className={cn("mx-auto px-4 py-8 sm:px-6 outline-none", widths[maxWidth])}
      >
        {children}
      </main>
    </div>
  );
}
