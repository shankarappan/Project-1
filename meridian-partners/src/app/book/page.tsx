import type { Metadata } from "next";
import { InquiryForm } from "@/components/forms/inquiry-form";
import { Section, SectionHeading } from "@/components/layout/section";
import { Reveal } from "@/components/motion/reveal";

export const metadata: Metadata = {
  title: "Book a Consultation",
  description:
    "Book a free 10-minute phone consultation with Meridian Partners. Understand your options with no obligation.",
};

export default function BookPage() {
  return (
    <Section className="!pt-20">
      <div className="grid gap-12 lg:grid-cols-[0.95fr_1.05fr]">
        <Reveal>
          <SectionHeading
            eyebrow="Book a Consultation"
            title="Getting clear advice early can save you time, stress, and money."
            description="We offer a free 10-minute phone call to get an overview of your situation."
          />
          <ul className="space-y-3 text-sm text-ink/80">
            {[
              "Understand your situation",
              "Confirm if we can help",
              "Explain the next steps",
              "Outline likely costs",
            ].map((item) => (
              <li key={item} className="flex gap-3">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brass" />
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm text-muted-foreground">
            There’s no obligation. If we’re not the right fit, we’ll point you
            in the right direction.
          </p>
        </Reveal>
        <Reveal>
          <InquiryForm formType="consultation" />
        </Reveal>
      </div>
    </Section>
  );
}
