import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Expense } from "@/lib/types/database";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";

interface ExpenseListProps {
  expenses: Expense[];
  groupId: string;
}

export function ExpenseList({ expenses, groupId }: ExpenseListProps) {
  if (expenses.length === 0) {
    return (
      <EmptyState
        title="No expenses yet"
        description="Add your first shared expense to start tracking who owes what."
        action={
          <Button asChild>
            <Link href={`/groups/${groupId}/expenses/new`}>Add expense</Link>
          </Button>
        }
      />
    );
  }

  return (
    <ul className="divide-y rounded-xl border">
      {expenses.map((expense) => (
        <li key={expense.id}>
          <Link
            href={`/groups/${groupId}/expenses/${expense.id}`}
            className="flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-muted/50"
          >
            <div className="min-w-0">
              <p className="font-medium">{expense.title}</p>
              <p className="text-xs text-muted-foreground">
                Paid by{" "}
                {expense.paid_by_profile?.full_name ??
                  expense.paid_by_profile?.email ??
                  "Unknown"}{" "}
                · {formatDate(expense.expense_date)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{expense.split_type}</Badge>
              <p className="font-semibold">
                {formatCurrency(Number(expense.amount), expense.currency)}
              </p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
