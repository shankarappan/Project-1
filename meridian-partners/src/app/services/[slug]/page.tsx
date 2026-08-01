import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Section, SectionHeading } from "@/components/layout/section";
import { Reveal } from "@/components/motion/reveal";
import { ButtonLink } from "@/components/ui/button-link";
import { getService, services } from "@/content/services";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return services.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const service = getService(slug);
  if (!service) return {};
  return {
    title: service.title,
    description: service.summary,
  };
}

export default async function ServiceDetailPage({ params }: Props) {
  const { slug } = await params;
  const service = getService(slug);
  if (!service) notFound();

  return (
    <>
      <Section className="!pt-20">
        <Reveal>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-brass-deep">
            Services
          </p>
          <h1 className="max-w-3xl font-display text-4xl tracking-tight text-ink sm:text-5xl">
            {service.title}
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
            {service.summary}
          </p>
        </Reveal>

        <div className="mt-12 grid gap-12 lg:grid-cols-[1.4fr_0.8fr]">
          <Reveal>
            <div className="space-y-5 text-base leading-relaxed text-ink/85">
              {service.body.split("\n\n").map((para) => (
                <p key={para.slice(0, 40)}>{para}</p>
              ))}
            </div>
          </Reveal>
          <Reveal>
            <aside className="border border-border bg-stone/50 p-6 sm:p-8">
              <h2 className="font-display text-xl text-ink">How we can help</h2>
              <ul className="mt-5 space-y-3 text-sm text-ink/80">
                {service.highlights.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brass" />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <ButtonLink href="/book" className="w-full">
                  Book a Free Consultation
                </ButtonLink>
              </div>
            </aside>
          </Reveal>
        </div>
      </Section>

      <Section tone="ink">
        <Reveal>
          <SectionHeading
            light
            title="Talk through your situation"
            description="Start with a free 10-minute consultation — clear guidance, no obligation."
          />
          <ButtonLink href="/book" variant="onDark">
            Request a Consultation
          </ButtonLink>
        </Reveal>
      </Section>
    </>
  );
}
