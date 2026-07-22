"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ComponentProps, MouseEvent, ReactNode } from "react";

type RefreshLinkProps = Omit<ComponentProps<typeof Link>, "onClick"> & {
  children: ReactNode;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
};

/**
 * Soft-navigates then forces a server refresh so dashboard/group UI
 * (permissions, delete controls, balances) is never stuck on a stale RSC payload.
 */
export function RefreshLink({ children, href, onClick, ...props }: RefreshLinkProps) {
  const router = useRouter();

  return (
    <Link
      {...props}
      href={href}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        // Let Next start navigation, then refresh server components.
        // Using setTimeout keeps the click snappy on mobile.
        window.setTimeout(() => {
          router.refresh();
        }, 0);
      }}
    >
      {children}
    </Link>
  );
}
