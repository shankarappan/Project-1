import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppNav } from "@/components/layout/app-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
    <div className="min-h-screen bg-muted/20">
      <AppNav profile={profile} />

      <main className="mx-auto max-w-2xl space-y-6 px-4 py-8 sm:px-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/groups/${groupId}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to group
          </Link>
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle>{expense.title}</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatDate(expense.expense_date)} · Paid by{" "}
                  {expense.paid_by_profile?.full_name ??
                    expense.paid_by_profile?.email}
                </p>
              </div>
              <Badge>{expense.split_type}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="text-3xl font-bold">
                {formatCurrency(Number(expense.amount), expense.currency)}
              </p>
              {expense.description && (
                <p className="mt-2 text-sm text-muted-foreground">
                  {expense.description}
                </p>
              )}
            </div>

            <div>
              <h3 className="mb-2 text-sm font-medium">Split breakdown</h3>
              <ul className="divide-y rounded-lg border">
                {participants.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between px-3 py-2 text-sm"
                  >
                    <span>
                      {p.profiles?.full_name ?? p.profiles?.email}
                      {p.share_percentage != null && (
                        <span className="ml-2 text-muted-foreground">
                          ({p.share_percentage}%)
                        </span>
                      )}
                    </span>
                    <span className="font-medium">
                      {formatCurrency(Number(p.share_amount), expense.currency)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <form action={handleDelete}>
              <Button type="submit" variant="destructive" size="sm">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete expense
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
