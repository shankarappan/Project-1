"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * On every visit to a group page, refresh server data so delete/admin
 * controls and balances match the current session (avoids stale RSC cache).
 */
export function GroupPageRefresh() {
  const router = useRouter();

  useEffect(() => {
    router.refresh();
  }, [router]);

  return null;
}
