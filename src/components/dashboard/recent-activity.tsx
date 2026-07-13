import Link from "next/link";
import { formatCurrency, formatRelativeDate } from "@/lib/format";
import type { ActivityItem } from "@/lib/types/database";
import { Badge } from "@/components/ui/badge";
import { Receipt, HandCoins } from "lucide-react";

interface RecentActivityProps {
  items: ActivityItem[];
}

export function RecentActivity({ items }: RecentActivityProps) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No recent activity yet.</p>
    );
  }

  return (
    <ul className="divide-y rounded-xl border">
      {items.map((item) => (
        <li key={`${item.type}-${item.id}`}>
          <Link
            href={`/groups/${item.group_id}`}
            className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
              {item.type === "expense" ? (
                <Receipt className="h-4 w-4" />
              ) : (
                <HandCoins className="h-4 w-4" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{item.title}</p>
              <p className="text-xs text-muted-foreground">
                {item.group_name}
                {item.actor_name ? ` · ${item.actor_name}` : ""}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">
                {formatCurrency(item.amount, item.currency)}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatRelativeDate(item.created_at)}
              </p>
            </div>
            <Badge variant="secondary" className="hidden sm:inline-flex">
              {item.type}
            </Badge>
          </Link>
        </li>
      ))}
    </ul>
  );
}
