import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Section } from "@/components/layout/section";
import { Reveal } from "@/components/motion/reveal";
import { ButtonLink } from "@/components/ui/button-link";
import { getTeamMember, team } from "@/content/team";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return team.map((m) => ({ slug: m.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const member = getTeamMember(slug);
  if (!member) return {};
  return {
    title: `${member.name} — ${member.role}`,
    description: `${member.name}, ${member.role} at Meridian Partners. ${member.focus}.`,
  };
}

export default async function TeamMemberPage({ params }: Props) {
  const { slug } = await params;
  const member = getTeamMember(slug);
  if (!member) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Attorney",
    name: member.name,
    jobTitle: member.role,
    email: member.email,
    telephone: member.phone,
    worksFor: {
      "@type": "LegalService",
      name: "Meridian Partners",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Section className="!pt-20">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.3fr] lg:gap-14">
          <Reveal>
            <div className="relative aspect-[4/5] overflow-hidden bg-stone-deep">
              <Image
                src={member.image}
                alt={member.name}
                fill
                className="object-cover object-top"
                sizes="(max-width: 1024px) 100vw, 40vw"
                priority
              />
            </div>
          </Reveal>
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brass-deep">
              Our Team
            </p>
            <h1 className="mt-3 font-display text-4xl tracking-tight text-ink sm:text-5xl">
              {member.name}
            </h1>
            <p className="mt-3 text-lg font-medium text-brass-deep">{member.role}</p>
            <p className="mt-1 text-muted-foreground">{member.focus}</p>
            {member.credentials ? (
              <p className="mt-2 text-sm text-ink/70">{member.credentials}</p>
            ) : null}

            <div className="mt-6 space-y-2 text-sm">
              {member.phone ? (
                <p>
                  <a href={`tel:${member.phone.replace(/\s/g, "")}`} className="hover:text-brass-deep">
                    {member.phone}
                  </a>
                </p>
              ) : null}
              {member.email ? (
                <p>
                  <a href={`mailto:${member.email}`} className="hover:text-brass-deep">
                    {member.email}
                  </a>
                </p>
              ) : null}
            </div>

            {member.memberships.length ? (
              <div className="mt-8 border-t border-border pt-6">
                <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-ink">
                  Professional Memberships
                </h2>
                <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                  {member.memberships.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </Reveal>
        </div>

        <Reveal>
          <div className="mt-12 max-w-3xl space-y-5 text-base leading-relaxed text-ink/85">
            {member.bio.map((para) => (
              <p key={para.slice(0, 48)}>{para}</p>
            ))}
          </div>
        </Reveal>

        <div className="mt-10">
          <ButtonLink href="/book">Book a Free Consultation</ButtonLink>
        </div>
      </Section>
    </>
  );
}
