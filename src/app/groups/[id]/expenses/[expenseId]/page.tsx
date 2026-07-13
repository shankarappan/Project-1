import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { getCurrentProfile } from "@/actions/auth";
import { getExpense, deleteExpense } from "@/actions/expenses";
import { formatCurrency, formatDate } from "@/lib/format";
import type { ExpenseParticipant } from "@/lib/types/database";
import { ArrowLeft, Trash2 } from "lucide-react";

export default async function ExpenseDetailPage({
  params,
}: {
  params: Promise<{ id: string; expenseId: string }>;
}) {
  const { id: groupId, expenseId } = await params;
  const [profile, expense] = await Promise.all([
    getCurrentProfile(),
    getExpense(expenseId),
  ]);

  if (!expense || expense.group_id !== groupId) notFound();

  async function handleDelete() {
    "use server";
    await deleteExpense(expenseId, groupId);
    redirect(`/groups/${groupId}`);
  }

  const participants = (expense.expense_participants ?? []) as ExpenseParticipant[];

  return (
    <AppShell profile={profile} maxWidth="lg">
      <Button variant="ghost" size="sm" asChild className="mb-6 -ml-2 text-brand-muted">
        <Link href={`/groups/${groupId}`}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to group
        </Link>
      </Button>

      <div className="rounded-2xl border border-border/80 bg-card p-8 shadow-card">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{expense.title}</h1>
            <p className="mt-1 text-sm text-brand-muted">
              {formatDate(expense.expense_date)} · Paid by{" "}
              {expense.paid_by_profile?.full_name ?? expense.paid_by_profile?.email}
            </p>
          </div>
          <span className="rounded-lg bg-brand-blue/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-brand-blue">
            {expense.split_type}
          </span>
        </div>

        <p className="mt-6 text-4xl font-bold tracking-tight text-brand-navy">
          {formatCurrency(Number(expense.amount), expense.currency)}
        </p>
        {expense.description && (
          <p className="mt-2 text-sm text-brand-muted">{expense.description}</p>
        )}

        <div className="mt-8">
          <h2 className="text-sm font-semibold text-brand-navy">Split breakdown</h2>
          <ul className="mt-3 divide-y divide-border/60 rounded-xl border border-border/80">
            {participants.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between px-4 py-3 text-sm"
              >
                <span className="text-brand-navy">
                  {p.profiles?.full_name ?? p.profiles?.email}
                  {p.share_percentage != null && (
                    <span className="ml-2 text-brand-muted">
                      ({p.share_percentage}%)
                    </span>
                  )}
                </span>
                <span className="font-semibold">
                  {formatCurrency(Number(p.share_amount), expense.currency)}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <form action={handleDelete} className="mt-8">
          <Button type="submit" variant="destructive" size="sm">
            <Trash2 className="mr-2 h-4 w-4" />
            Delete expense
          </Button>
        </form>
      </div>
    </AppShell>
  );
}
