import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatCurrency } from "@/lib/format";
import { describeBalance } from "@/lib/balance/engine";
import { getInitials } from "@/lib/format";
import type { UserBalance } from "@/lib/types/database";

interface BalanceSummaryProps {
  balances: UserBalance[];
  currentUserId?: string;
  currency?: string;
}

export function BalanceSummary({
  balances,
  currentUserId,
  currency = "NZD",
}: BalanceSummaryProps) {
  if (balances.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 px-4 py-8 text-center">
        <p className="text-sm font-medium text-brand-navy">All settled up</p>
        <p className="mt-1 text-xs text-brand-muted">
          No outstanding balances in this group.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {balances.map((entry) => (
        <li
          key={entry.user_id}
          className="flex items-center justify-between rounded-xl border border-border/60 bg-background/60 px-4 py-3"
        >
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9 ring-2 ring-border/40">
              <AvatarFallback className="bg-brand-blue/10 text-xs font-semibold text-brand-blue">
                {getInitials(entry.full_name, entry.email)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium text-brand-navy">
                {entry.full_name ?? entry.email}
                {entry.user_id === currentUserId && (
                  <span className="ml-2 text-xs font-normal text-brand-muted">
                    (you)
                  </span>
                )}
              </p>
              <p className="text-xs text-brand-muted">
                {describeBalance(entry.balance)}
              </p>
            </div>
          </div>
          <p
            className={`text-sm font-bold ${
              entry.balance > 0
                ? "text-balance-positive"
                : entry.balance < 0
                  ? "text-balance-negative"
                  : "text-brand-navy"
            }`}
          >
            {formatCurrency(Math.abs(entry.balance), currency)}
          </p>
        </li>
      ))}
    </ul>
  );
}
