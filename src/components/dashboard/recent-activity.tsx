import Link from "next/link";
import { formatCurrency, formatRelativeDate } from "@/lib/format";
import type { ActivityItem } from "@/lib/types/database";
import { Receipt, HandCoins } from "lucide-react";

interface RecentActivityProps {
  items: ActivityItem[];
}

export function RecentActivity({ items }: RecentActivityProps) {
  if (items.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-brand-muted">
        No recent activity yet. Add an expense to get started.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border/60">
      {items.map((item) => (
        <li key={`${item.type}-${item.id}`}>
          <Link
            href={`/groups/${item.group_id}`}
            className="flex items-center gap-3 rounded-lg py-3.5 transition-colors hover:bg-muted/40"
          >
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                item.type === "expense"
                  ? "bg-brand-blue/10 text-brand-blue"
                  : "bg-brand-teal/10 text-brand-teal"
              }`}
            >
              {item.type === "expense" ? (
                <Receipt className="h-4 w-4" />
              ) : (
                <HandCoins className="h-4 w-4" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-brand-navy">{item.title}</p>
              <p className="text-xs text-brand-muted">
                {item.group_name}
                {item.actor_name ? ` · ${item.actor_name}` : ""}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-brand-navy">
                {formatCurrency(item.amount, item.currency)}
              </p>
              <p className="text-xs text-brand-muted">
                {formatRelativeDate(item.created_at)}
              </p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
