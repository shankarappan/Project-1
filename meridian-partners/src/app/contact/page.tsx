import type { Metadata } from "next";
import { InquiryForm } from "@/components/forms/inquiry-form";
import { Section, SectionHeading } from "@/components/layout/section";
import { Reveal } from "@/components/motion/reveal";
import { site } from "@/content/site";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Contact Meridian Partners in Epsom, Auckland. Fill out the form and our team will arrange a time to talk.",
};

export default function ContactPage() {
  return (
    <Section className="!pt-20">
      <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr]">
        <Reveal>
          <SectionHeading
            eyebrow="Contact"
            title="We’re here to help"
            description="Fill out the form and one of our team will be in touch to arrange a time to talk. Consultations are held by phone or WhatsApp."
          />
          <dl className="space-y-5 text-sm">
            <div>
              <dt className="font-semibold uppercase tracking-[0.14em] text-brass-deep">
                Email
              </dt>
              <dd className="mt-1">
                <a href={`mailto:${site.email}`} className="text-ink hover:underline">
                  {site.email}
                </a>
              </dd>
            </div>
            <div>
              <dt className="font-semibold uppercase tracking-[0.14em] text-brass-deep">
                Location
              </dt>
              <dd className="mt-1 text-ink/80">
                {site.address.street}
                <br />
                {site.address.suburb}, {site.address.city} {site.address.postcode}
              </dd>
            </div>
          </dl>
        </Reveal>
        <Reveal>
          <InquiryForm formType="contact" />
        </Reveal>
      </div>
    </Section>
  );
}
