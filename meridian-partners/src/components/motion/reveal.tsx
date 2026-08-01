"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export function Reveal({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setMounted(true);
    const el = ref.current;
    if (!el) return;

    const show = () => setVisible(true);

    // Above-the-fold content should appear immediately
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.92 && rect.bottom > 0) {
      show();
      return;
    }

    if (typeof IntersectionObserver === "undefined") {
      show();
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          show();
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        "transition-all duration-700 ease-out",
        // Keep SSR/first paint visible to avoid blank hydration flashes
        !mounted || visible
          ? "translate-y-0 opacity-100"
          : "translate-y-6 opacity-0",
        className,
      )}
    >
      {children}
    </div>
  );
}
