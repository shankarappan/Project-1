import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Section, SectionHeading } from "@/components/layout/section";
import { Reveal } from "@/components/motion/reveal";
import { ButtonLink } from "@/components/ui/button-link";

export const metadata: Metadata = {
  title: "Notary Public Auckland",
  description:
    "Notary Public services in Auckland with Adelina Ong — witnessing, certification, and authentication of documents for use overseas.",
};

export default function NotaryPage() {
  return (
    <>
      <Section className="!pt-20">
        <div className="grid items-start gap-12 lg:grid-cols-[1.2fr_0.8fr]">
          <Reveal>
            <SectionHeading
              eyebrow="Notary Public"
              title="Notarial services for documents used overseas"
              description="Adelina Ong is a Notary Public of New Zealand, appointed by the Faculty Office in the United Kingdom. She provides notarial services by appointment in Auckland."
            />
            <div className="space-y-5 text-base leading-relaxed text-ink/85">
              <p>
                Notarial acts can include witnessing signatures, certifying
                photocopies as true copies, and authenticating the legitimacy of
                documents being produced for use overseas.
              </p>
              <p>
                Adelina is one of the younger lawyers in New Zealand to be
                appointed as a Notary Public after a stringent application
                process, including endorsement by peers and being sworn in by a
                High Court judge.
              </p>
              <p>
                This service is provided within Auckland and by appointment
                only. Please contact Adelina by phone or email to arrange a
                time.
              </p>
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/book">Book an Appointment</ButtonLink>
              <ButtonLink href="/team/adelina-ong" variant="ghost">
                Meet Adelina Ong
              </ButtonLink>
            </div>
          </Reveal>
          <Reveal>
            <div className="border border-border bg-stone/40 p-6 sm:p-8">
              <div className="relative mb-5 aspect-square overflow-hidden bg-stone-deep">
                <Image
                  src="/images/team/adelina-ong.png"
                  alt="Adelina Ong, Notary Public"
                  fill
                  className="object-cover object-top"
                  sizes="400px"
                />
              </div>
              <h2 className="font-display text-2xl text-ink">Adelina Ong</h2>
              <p className="mt-1 text-sm text-brass-deep">Partner and Notary Public</p>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="tel:02102198883" className="hover:text-ink">
                    021 0219 8883
                  </a>
                </li>
                <li>
                  <a href="mailto:adelina@mplaw.nz" className="hover:text-ink">
                    adelina@mplaw.nz
                  </a>
                </li>
                <li>
                  <Link href="/team/adelina-ong" className="font-medium text-ink underline-offset-4 hover:underline">
                    View full profile
                  </Link>
                </li>
              </ul>
            </div>
          </Reveal>
        </div>
      </Section>
    </>
  );
}
