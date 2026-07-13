import { formatCurrency } from "@/lib/format";
import { ArrowDownLeft, ArrowUpRight, Scale } from "lucide-react";

interface DashboardCardsProps {
  totalOwed: number;
  totalOwing: number;
  netBalance: number;
  currency?: string;
}

export function DashboardCards({
  totalOwed,
  totalOwing,
  netBalance,
  currency = "NZD",
}: DashboardCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <BalanceCard
        label="You are owed"
        amount={formatCurrency(totalOwed, currency)}
        icon={<ArrowUpRight className="h-4 w-4" />}
        variant="positive"
      />
      <BalanceCard
        label="You owe"
        amount={formatCurrency(totalOwing, currency)}
        icon={<ArrowDownLeft className="h-4 w-4" />}
        variant="negative"
      />
      <BalanceCard
        label="Net balance"
        amount={formatCurrency(netBalance, currency)}
        icon={<Scale className="h-4 w-4" />}
        variant={
          netBalance > 0 ? "positive" : netBalance < 0 ? "negative" : "neutral"
        }
      />
    </div>
  );
}

function BalanceCard({
  label,
  amount,
  icon,
  variant,
}: {
  label: string;
  amount: string;
  icon: React.ReactNode;
  variant: "positive" | "negative" | "neutral";
}) {
  const styles = {
    positive: "border-brand-teal/20 bg-gradient-to-br from-brand-teal/5 to-card",
    negative: "border-red-200/60 bg-gradient-to-br from-red-50/80 to-card",
    neutral: "border-border/80 bg-card",
  };

  const amountStyles = {
    positive: "text-balance-positive",
    negative: "text-balance-negative",
    neutral: "text-brand-navy",
  };

  const iconStyles = {
    positive: "bg-brand-teal/15 text-brand-teal",
    negative: "bg-red-100 text-red-500",
    neutral: "bg-muted text-brand-muted",
  };

  return (
    <div
      className={`rounded-2xl border p-5 shadow-card transition-shadow hover:shadow-card-hover ${styles[variant]}`}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-brand-muted">{label}</p>
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-lg ${iconStyles[variant]}`}
        >
          {icon}
        </div>
      </div>
      <p className={`mt-3 text-2xl font-bold tracking-tight ${amountStyles[variant]}`}>
        {amount}
      </p>
    </div>
  );
}
