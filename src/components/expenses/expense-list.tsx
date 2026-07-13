import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Expense } from "@/lib/types/database";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";

interface ExpenseListProps {
  expenses: Expense[];
  groupId: string;
}

const splitLabels: Record<string, string> = {
  equal: "Equal",
  exact: "Exact",
  percentage: "%",
};

export function ExpenseList({ expenses, groupId }: ExpenseListProps) {
  if (expenses.length === 0) {
    return (
      <EmptyState
        title="No expenses yet"
        description="Add your first shared expense to start tracking who owes what."
        action={
          <Button asChild className="bg-brand-blue hover:bg-brand-blue/90">
            <Link href={`/groups/${groupId}/expenses/new`}>Add expense</Link>
          </Button>
        }
      />
    );
  }

  return (
    <ul className="divide-y divide-border/60">
      {expenses.map((expense) => (
        <li key={expense.id}>
          <Link
            href={`/groups/${groupId}/expenses/${expense.id}`}
            className="group flex items-center justify-between gap-4 py-4 transition-colors hover:bg-muted/30 -mx-2 rounded-xl px-2"
          >
            <div className="min-w-0">
              <p className="font-medium text-brand-navy group-hover:text-brand-blue">
                {expense.title}
              </p>
              <p className="text-xs text-brand-muted">
                {expense.paid_by_profile?.full_name ??
                  expense.paid_by_profile?.email ??
                  "Unknown"}{" "}
                paid · {formatDate(expense.expense_date)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-brand-muted">
                {splitLabels[expense.split_type] ?? expense.split_type}
              </span>
              <p className="font-semibold text-brand-navy">
                {formatCurrency(Number(expense.amount), expense.currency)}
              </p>
              <ChevronRight className="h-4 w-4 text-brand-muted opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
