import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Wordmark } from "@/components/brand/wordmark";
import { cn } from "@/lib/utils";

interface LogoLockupProps {
  href?: string;
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
  className?: string;
}

export function LogoLockup({
  href,
  size = "md",
  showTagline = false,
  className,
}: LogoLockupProps) {
  const content = (
    <div className={cn("flex items-center gap-3", className)}>
      <Logo size={size} />
      <Wordmark showTagline={showTagline} />
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex transition-opacity hover:opacity-90">
        {content}
      </Link>
    );
  }

  return <div className="inline-flex">{content}</div>;
}
