import Image from "next/image";
import { ButtonLink } from "@/components/ui/button-link";
import { pillars } from "@/content/site";

export function Hero() {
  return (
    <section className="relative min-h-[92vh] overflow-hidden text-cream">
      <Image
        src="/images/hero/auckland.jpg"
        alt="Auckland city skyline"
        fill
        priority
        className="object-cover object-center"
        sizes="100vw"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/85 to-ink/45" />
      <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-transparent to-ink/30" />

      <div className="relative mx-auto flex min-h-[92vh] max-w-6xl flex-col justify-end px-4 pb-16 pt-28 sm:px-6 sm:pb-20 lg:px-8 lg:pb-24">
        <p className="reveal text-xs font-semibold uppercase tracking-[0.28em] text-brass">
          Meridian Partners
        </p>
        <h1 className="reveal reveal-delay-1 mt-4 max-w-3xl font-display text-4xl leading-[1.05] tracking-tight text-balance sm:text-5xl lg:text-6xl">
          Legal counsel you can rely on
        </h1>
        <p className="reveal reveal-delay-2 mt-5 max-w-xl text-base leading-relaxed text-cream/80 sm:text-lg">
          Clear, practical advice for individuals, families, and businesses
          across New Zealand — from our Auckland practice.
        </p>
        <div className="reveal reveal-delay-3 mt-8 flex flex-wrap gap-3">
          <ButtonLink href="/book" variant="primary">
            Book a Free Consultation
          </ButtonLink>
          <ButtonLink href="/services" variant="ghost" className="border-cream/30 text-cream hover:border-cream/60 hover:bg-white/10">
            Explore Our Services
          </ButtonLink>
        </div>
        <ul className="reveal reveal-delay-3 mt-12 flex flex-wrap gap-x-6 gap-y-2 border-t border-white/15 pt-6 text-xs font-medium uppercase tracking-[0.16em] text-cream/65">
          {pillars.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
