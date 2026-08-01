import Image from "next/image";
import Link from "next/link";
import { site } from "@/content/site";

export function SiteFooter() {
  return (
    <footer className="ink-panel mt-auto text-cream">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.4fr_1fr_1fr] lg:px-8">
        <div>
          <Image
            src="/images/logo.png"
            alt="Meridian Partners"
            width={200}
            height={104}
            className="mb-5 h-12 w-auto brightness-0 invert"
          />
          <p className="max-w-sm text-sm leading-relaxed text-cream/75">
            Meridian Partners provides practical legal advice for individuals,
            families, and businesses across New Zealand.
          </p>
        </div>

        <div>
          <h2 className="mb-4 font-display text-lg tracking-wide">Quick Links</h2>
          <ul className="space-y-2 text-sm text-cream/80">
            {site.nav.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="transition-colors hover:text-brass">
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/book" className="transition-colors hover:text-brass">
                Book a Consultation
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="mb-4 font-display text-lg tracking-wide">Contact</h2>
          <ul className="space-y-3 text-sm text-cream/80">
            <li>
              <a href={`mailto:${site.email}`} className="hover:text-brass">
                {site.email}
              </a>
            </li>
            <li>
              <address className="not-italic leading-relaxed">
                {site.address.street}
                <br />
                {site.address.suburb}, {site.address.city} {site.address.postcode}
              </address>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-5 text-xs text-cream/55 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} Meridian Partners. All rights reserved.</p>
          <p>Barristers & Solicitors · Auckland, New Zealand</p>
        </div>
      </div>
    </footer>
  );
}
