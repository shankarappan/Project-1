import type { Metadata } from "next";
import Link from "next/link";
import { Section, SectionHeading } from "@/components/layout/section";
import { Reveal } from "@/components/motion/reveal";
import { articles } from "@/content/articles";

export const metadata: Metadata = {
  title: "Articles",
  description:
    "Insights from Meridian Partners on tax disputes, student loans, property, estate planning, and more.",
};

export default function ArticlesPage() {
  const sorted = [...articles].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <Section className="!pt-20">
      <Reveal>
        <SectionHeading
          eyebrow="Articles"
          title="Insights and commentary"
          description="Practical writing on tax, student loans, property, and the issues our clients face."
        />
      </Reveal>
      <div className="divide-y divide-border border-y border-border">
        {sorted.map((article) => (
          <Reveal key={article.slug}>
            <Link
              href={`/articles/${article.slug}`}
              className="group grid gap-2 py-7 sm:grid-cols-[8rem_1fr] sm:gap-8"
            >
              <time
                dateTime={article.date}
                className="text-sm text-muted-foreground"
              >
                {new Date(article.date).toLocaleDateString("en-NZ", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </time>
              <div>
                <h2 className="font-display text-2xl text-ink transition-colors group-hover:text-brass-deep">
                  {article.title}
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  {article.excerpt}
                </p>
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
