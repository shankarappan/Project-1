import type { Metadata } from "next";
import Link from "next/link";
import { Section, SectionHeading } from "@/components/layout/section";
import { Reveal } from "@/components/motion/reveal";
import { ButtonLink } from "@/components/ui/button-link";
import { services } from "@/content/services";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Comprehensive legal services from Meridian Partners — property, litigation, tax disputes, family law, employment, estate planning, and more.",
};

export default function ServicesPage() {
  return (
    <>
      <Section className="!pt-20">
        <Reveal>
          <SectionHeading
            eyebrow="What We Do"
            title="Comprehensive legal services"
            description="Meridian Partners provides legal advice and representation across key areas of law for individuals, families, and businesses throughout New Zealand."
          />
        </Reveal>
        <div className="grid gap-6 md:grid-cols-2">
          {services.map((service) => (
            <Reveal key={service.slug}>
              <Link
                href={`/services/${service.slug}`}
                className="group block h-full border border-border bg-cream/60 p-6 transition hover:border-brass/50 hover:bg-white/70 sm:p-8"
              >
                <h2 className="font-display text-2xl text-ink group-hover:text-brass-deep">
                  {service.title}
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {service.summary}
                </p>
                <span className="mt-5 inline-block text-sm font-semibold text-ink underline-offset-4 group-hover:underline">
                  Learn more
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
        <div className="mt-12">
          <ButtonLink href="/book">Book a Free Consultation</ButtonLink>
        </div>
      </Section>
    </>
  );
}
