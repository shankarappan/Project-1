import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Section, SectionHeading } from "@/components/layout/section";
import { Reveal } from "@/components/motion/reveal";
import { ButtonLink } from "@/components/ui/button-link";
import { team } from "@/content/team";

export const metadata: Metadata = {
  title: "About",
  description:
    "Meet the Meridian Partners team — Auckland barristers and solicitors providing clear, practical legal advice.",
};

export default function AboutPage() {
  return (
    <>
      <Section className="!pt-20 !pb-10">
        <Reveal>
          <SectionHeading
            eyebrow="About Meridian Partners"
            title="Auckland lawyers focused on clear advice and strong outcomes."
            description="Meridian Partners is an Auckland-based firm providing practical legal advice for individuals, families, and businesses across New Zealand."
          />
        </Reveal>
      </Section>

      <Section tone="stone" className="!pt-4">
        <Reveal>
          <SectionHeading
            eyebrow="Meet Our Team"
            title="People who combine expertise with practical experience."
            description="We focus on clear advice, careful preparation, and strong representation across property, commercial, tax, litigation, employment, and family law."
          />
        </Reveal>
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
          {team.map((member) => (
            <Reveal key={member.slug}>
              <Link href={`/team/${member.slug}`} className="group block">
                <div className="relative mb-4 aspect-[4/5] overflow-hidden bg-stone-deep">
                  <Image
                    src={member.image}
                    alt={member.name}
                    fill
                    className="object-cover object-top transition duration-500 group-hover:scale-[1.03]"
                    sizes="(max-width: 1024px) 50vw, 33vw"
                  />
                </div>
                <h2 className="font-display text-2xl text-ink">{member.name}</h2>
                <p className="mt-1 text-sm font-medium text-brass-deep">{member.role}</p>
                <p className="mt-1 text-sm text-muted-foreground">{member.focus}</p>
              </Link>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section>
        <Reveal>
          <div className="max-w-2xl">
            <SectionHeading
              eyebrow="Our Approach"
              title="Legal advice that is accessible, clear, and genuinely useful."
              description="We offer a free 10-minute phone consultation to learn about your situation and help you understand the next steps. This short call gives you the chance to explain your situation, ask initial questions, and hear how we can assist."
            />
            <ButtonLink href="/book">Book a Free Consultation</ButtonLink>
          </div>
        </Reveal>
      </Section>
    </>
  );
}
