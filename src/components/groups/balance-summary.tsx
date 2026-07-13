import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
      <p className="text-sm text-muted-foreground">
        Everyone is settled up in this group.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {balances.map((entry) => (
        <li
          key={entry.user_id}
          className="flex items-center justify-between rounded-lg border px-3 py-2"
        >
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-muted text-xs">
                {getInitials(entry.full_name, entry.email)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium">
                {entry.full_name ?? entry.email}
                {entry.user_id === currentUserId && (
                  <Badge variant="outline" className="ml-2 text-xs">
                    You
                  </Badge>
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                {describeBalance(entry.balance)}
              </p>
            </div>
          </div>
          <p
            className={`text-sm font-semibold ${
              entry.balance > 0
                ? "text-emerald-600"
                : entry.balance < 0
                  ? "text-red-500"
                  : ""
            }`}
          >
            {formatCurrency(Math.abs(entry.balance), currency)}
          </p>
        </li>
      ))}
    </ul>
  );
}
