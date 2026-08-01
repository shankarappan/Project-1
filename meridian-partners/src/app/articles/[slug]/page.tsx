import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Section } from "@/components/layout/section";
import { Reveal } from "@/components/motion/reveal";
import { ButtonLink } from "@/components/ui/button-link";
import { articles, getArticle } from "@/content/articles";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return articles.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) return {};
  return {
    title: article.title,
    description: article.excerpt,
  };
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) notFound();

  const paragraphs = article.body
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <Section className="!pt-20">
      <Reveal>
        <p className="mb-4 text-sm">
          <Link href="/articles" className="text-muted-foreground hover:text-ink">
            ← Articles
          </Link>
        </p>
        <time
          dateTime={article.date}
          className="text-sm font-medium uppercase tracking-[0.14em] text-brass-deep"
        >
          {new Date(article.date).toLocaleDateString("en-NZ", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </time>
        <h1 className="mt-3 max-w-3xl font-display text-4xl tracking-tight text-ink sm:text-5xl">
          {article.title}
        </h1>
      </Reveal>

      <Reveal>
        <article className="prose-meridian mt-10 max-w-3xl space-y-5 text-base leading-relaxed text-ink/85">
          {paragraphs.map((para) =>
            para.startsWith("- ") ? (
              <ul key={para.slice(0, 40)} className="list-disc space-y-2 pl-5">
                {para
                  .split("\n")
                  .filter((l) => l.startsWith("- "))
                  .map((l) => (
                    <li key={l}>{l.replace(/^- /, "")}</li>
                  ))}
              </ul>
            ) : (
              <p key={para.slice(0, 48)}>{para}</p>
            ),
          )}
        </article>
      </Reveal>

      <div className="mt-12 border-t border-border pt-8">
        <p className="mb-4 text-muted-foreground">
          Need advice on a similar matter?
        </p>
        <ButtonLink href="/book">Book a Free Consultation</ButtonLink>
      </div>
    </Section>
  );
}
