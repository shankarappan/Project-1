import Image from "next/image";
import Link from "next/link";
import { Hero } from "@/components/home/hero";
import { Section, SectionHeading } from "@/components/layout/section";
import { Reveal } from "@/components/motion/reveal";
import { ButtonLink } from "@/components/ui/button-link";
import { services } from "@/content/services";
import { featuredTeam } from "@/content/team";

export default function HomePage() {
  return (
    <>
      <Hero />

      <Section>
        <Reveal>
          <SectionHeading
            eyebrow="Meet Our Team"
            title="Experienced lawyers. Practical representation."
            description="Our team combines legal expertise with practical experience across several areas of law — with clear advice, careful preparation, and strong advocacy."
          />
        </Reveal>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {featuredTeam.map((member, i) => (
            <Reveal key={member.slug} className={i % 2 ? "sm:mt-6" : undefined}>
              <Link href={`/team/${member.slug}`} className="group block">
                <div className="relative mb-4 aspect-[4/5] overflow-hidden bg-stone-deep">
                  <Image
                    src={member.image}
                    alt={member.name}
                    fill
                    className="object-cover object-top transition duration-500 group-hover:scale-[1.03]"
                    sizes="(max-width: 768px) 100vw, 25vw"
                  />
                </div>
                <h3 className="font-display text-xl text-ink">{member.name}</h3>
                <p className="mt-1 text-sm font-medium text-brass-deep">{member.role}</p>
                <p className="mt-1 text-sm text-muted-foreground">{member.focus}</p>
              </Link>
            </Reveal>
          ))}
        </div>
        <div className="mt-10">
          <ButtonLink href="/about" variant="ghost">
            View the full team
          </ButtonLink>
        </div>
      </Section>

      <Section tone="stone">
        <Reveal>
          <SectionHeading
            eyebrow="What We Do"
            title="Legal services for people and business"
            description="Advice and representation across property, commercial disputes, tax, family, employment, and estate planning."
          />
        </Reveal>
        <div className="grid gap-x-10 gap-y-8 md:grid-cols-2">
          {services.slice(0, 6).map((service) => (
            <Reveal key={service.slug}>
              <Link
                href={`/services/${service.slug}`}
                className="group block border-t border-border pt-5"
              >
                <h3 className="font-display text-2xl text-ink transition-colors group-hover:text-brass-deep">
                  {service.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {service.summary}
                </p>
                <span className="mt-3 inline-block text-sm font-semibold text-ink underline-offset-4 group-hover:underline">
                  Learn more
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section>
        <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <Reveal>
            <SectionHeading
              eyebrow="Our Approach"
              title="Legal advice that is accessible, clear, and genuinely useful."
              description="We offer a free 10-minute phone consultation to learn about your situation and help you understand the next steps — with no obligation and no pressure."
            />
            <ul className="mt-2 space-y-3 text-sm text-ink/80">
              {[
                "10-minute phone call, no charge",
                "Clear guidance on your next steps",
                "Fixed fee pricing available",
                "No unexpected legal bills",
              ].map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brass" />
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <ButtonLink href="/book">Book a Free Consultation</ButtonLink>
            </div>
          </Reveal>
          <Reveal>
            <div className="relative aspect-[4/3] overflow-hidden">
              <Image
                src="/images/hero/lawyers.jpg"
                alt="Professional legal counsel"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 45vw"
              />
            </div>
          </Reveal>
        </div>
      </Section>

      <Section tone="ink" className="!py-20">
        <Reveal>
          <div className="max-w-2xl">
            <h2 className="font-display text-3xl tracking-tight text-cream sm:text-4xl">
              Not sure where to start? Let’s talk.
            </h2>
            <p className="mt-4 text-cream/75">
              Book a free 10-minute phone consultation to explain your situation
              and understand your options.
            </p>
            <div className="mt-8">
              <ButtonLink href="/book" variant="onDark">
                Book a Free Consultation
              </ButtonLink>
            </div>
          </div>
        </Reveal>
      </Section>
    </>
  );
}
