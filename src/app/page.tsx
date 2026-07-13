import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Wallet, Users, Receipt, Scale } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6 sm:px-6">
        <div className="flex items-center gap-2 font-semibold">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white">
            <Wallet className="h-5 w-5" />
          </div>
          Lets Split
        </div>
        <Button asChild>
          <Link href="/login">Sign in</Link>
        </Button>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6 sm:pt-16">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Split expenses without the spreadsheet stress
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Lets Split helps groups track shared costs, split bills fairly, and
            settle up — just like Splitwise, built for quick demos and real use.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Button size="lg" asChild>
              <Link href="/login">Get started free</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/login">Sign in with magic link</Link>
            </Button>
          </div>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-3">
          <FeatureCard
            icon={<Users className="h-6 w-6 text-emerald-600" />}
            title="Create groups"
            description="Flatmates, trips, dinners — organise expenses by group and invite members."
          />
          <FeatureCard
            icon={<Receipt className="h-6 w-6 text-emerald-600" />}
            title="Split any way"
            description="Equal, exact amounts, or percentages with validation and rounding handled."
          />
          <FeatureCard
            icon={<Scale className="h-6 w-6 text-emerald-600" />}
            title="Settle up"
            description="See who owes whom, record payments, and keep balances accurate."
          />
        </div>
      </main>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
        {icon}
      </div>
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
