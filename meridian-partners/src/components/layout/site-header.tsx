"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { site } from "@/content/site";
import { cn } from "@/lib/utils";
import { ButtonLink } from "@/components/ui/button-link";

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="site-header sticky top-0 z-50 border-b border-border/70 bg-cream/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3" onClick={() => setOpen(false)}>
          <Image
            src="/images/logo.png"
            alt="Meridian Partners"
            width={180}
            height={94}
            className="h-10 w-auto sm:h-12"
            priority
          />
          <span className="sr-only">Meridian Partners</span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
          {site.nav.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "px-3 py-2 text-sm font-medium transition-colors",
                  active ? "text-ink" : "text-muted-foreground hover:text-ink",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden lg:block">
          <ButtonLink href="/book" className="!py-2.5 !text-xs uppercase tracking-[0.14em]">
            Book a Free Consultation
          </ButtonLink>
        </div>

        <button
          type="button"
          className="inline-flex size-10 items-center justify-center border border-border text-ink lg:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {open ? (
        <div
          id="mobile-nav"
          className="border-t border-border bg-cream lg:hidden"
        >
          <nav className="mx-auto flex max-w-6xl flex-col px-4 py-4 sm:px-6" aria-label="Mobile">
            {site.nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="border-b border-border/60 py-3 text-base font-medium text-ink"
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <div onClick={() => setOpen(false)}>
              <ButtonLink href="/book" className="mt-4 w-full">
                Book a Free Consultation
              </ButtonLink>
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
