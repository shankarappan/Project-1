import Link from "next/link";
import { LogoLockup } from "@/components/brand/logo-lockup";
import { Button } from "@/components/ui/button";
import { Users, Receipt, Scale, ArrowRight, Sparkles } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-hero-gradient">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <LogoLockup href="/" showTagline />
        <Button asChild className="shadow-sm">
          <Link href="/login">Sign in</Link>
        </Button>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-4 pb-20 pt-12 sm:px-6 sm:pt-20">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-8 flex justify-center">
              <LogoLockup size="lg" showTagline />
            </div>
            <h1 className="text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
              Shared costs,{" "}
              <span className="bg-gradient-to-r from-brand-teal to-brand-blue bg-clip-text text-transparent">
                clearly split
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-brand-muted">
              Track group expenses, split bills fairly, and settle up without
              spreadsheets or awkward maths.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button size="lg" asChild className="h-11 px-8 text-base shadow-card">
                <Link href="/login">
                  Get started free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="h-11 px-8 text-base">
                <Link href="/login">Sign in with magic link</Link>
              </Button>
            </div>
          </div>

          <div className="mx-auto mt-16 grid max-w-4xl gap-4 sm:grid-cols-3">
            <StatPill label="Split modes" value="3" />
            <StatPill label="Setup time" value="< 2 min" />
            <StatPill label="Cost" value="Free" />
          </div>
        </section>

        <section className="border-t border-border/60 bg-card/50 py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mb-12 text-center">
              <p className="text-sm font-semibold tracking-wide text-brand-blue uppercase">
                How it works
              </p>
              <h2 className="mt-2 text-3xl font-bold">Everything you need to split fairly</h2>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              <FeatureCard
                icon={<Users className="h-6 w-6" />}
                accent="teal"
                title="Create groups"
                description="Flatmates, trips, dinners — organise expenses by group and invite members with a link."
              />
              <FeatureCard
                icon={<Receipt className="h-6 w-6" />}
                accent="blue"
                title="Split any way"
                description="Equal, exact amounts, or percentages. Validation and rounding handled automatically."
              />
              <FeatureCard
                icon={<Scale className="h-6 w-6" />}
                accent="navy"
                title="Settle up"
                description="See who owes whom at a glance, record payments, and keep balances accurate."
              />
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="mx-auto max-w-2xl px-4 text-center sm:px-6">
            <Sparkles className="mx-auto h-8 w-8 text-brand-teal" />
            <h2 className="mt-4 text-2xl font-bold">Ready to split smarter?</h2>
            <p className="mt-2 text-brand-muted">
              Sign in with a magic link — no password required.
            </p>
            <Button size="lg" asChild className="mt-6">
              <Link href="/login">Start now</Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6">
          <LogoLockup href="/" size="sm" />
          <p className="text-sm text-brand-muted">
            One off spending. Clearly split.
          </p>
        </div>
      </footer>
    </div>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/80 bg-card px-6 py-4 text-center shadow-card">
      <p className="text-2xl font-bold text-brand-navy">{value}</p>
      <p className="mt-1 text-sm text-brand-muted">{label}</p>
    </div>
  );
}

function FeatureCard({
  icon,
  accent,
  title,
  description,
}: {
  icon: React.ReactNode;
  accent: "teal" | "blue" | "navy";
  title: string;
  description: string;
}) {
  const accentStyles = {
    teal: "bg-brand-teal/10 text-brand-teal",
    blue: "bg-brand-blue/10 text-brand-blue",
    navy: "bg-brand-navy/10 text-brand-navy",
  };

  return (
    <div className="group rounded-2xl border border-border/80 bg-card p-6 shadow-card transition-shadow hover:shadow-card-hover">
      <div
        className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${accentStyles[accent]}`}
      >
        {icon}
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-brand-muted">{description}</p>
    </div>
  );
}
