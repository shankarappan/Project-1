import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { BalanceSummary } from "@/components/groups/balance-summary";
import { ExpenseList } from "@/components/expenses/expense-list";
import { InviteDialog } from "@/components/groups/invite-dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getCurrentProfile, getCurrentUser } from "@/actions/auth";
import { getGroup } from "@/actions/groups";
import { getGroupExpenses } from "@/actions/expenses";
import { getGroupBalances } from "@/actions/balances";
import { getInitials } from "@/lib/format";
import type { GroupMember, Expense } from "@/lib/types/database";
import { ArrowLeft, Plus, HandCoins } from "lucide-react";

export default async function GroupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [profile, user, group, expenses, balances] = await Promise.all([
    getCurrentProfile(),
    getCurrentUser(),
    getGroup(id),
    getGroupExpenses(id),
    getGroupBalances(id),
  ]);

  if (!group) notFound();

  const members = (group.group_members as GroupMember[]) ?? [];
  const viewerMembership = members.find((m) => m.user_id === user?.id);
  const canInvite =
    viewerMembership?.role === "admin" || group.created_by === user?.id;

  return (
    <AppShell profile={profile}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Button variant="ghost" size="sm" asChild className="mb-3 -ml-2 text-brand-muted">
              <Link href="/dashboard">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Dashboard
              </Link>
            </Button>
            <h1 className="text-3xl font-bold tracking-tight">{group.name}</h1>
            <p className="mt-1 text-sm text-brand-muted">
              {members.length} member{members.length !== 1 ? "s" : ""}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <InviteDialog groupId={id} canInvite={Boolean(canInvite)} />
            <Button variant="outline" size="sm" asChild>
              <Link href={`/groups/${id}/settlements`}>
                <HandCoins className="mr-2 h-4 w-4" />
                Settle up
              </Link>
            </Button>
            <Button size="sm" asChild className="bg-brand-blue hover:bg-brand-blue/90">
              <Link href={`/groups/${id}/expenses/new`}>
                <Plus className="mr-2 h-4 w-4" />
                Add expense
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <section className="rounded-2xl border border-border/80 bg-card p-6 shadow-card lg:col-span-1">
            <h2 className="font-semibold">Members</h2>
            <ul className="mt-4 space-y-3">
              {members.map((member) => (
                <li key={member.id} className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-brand-teal/10 text-xs font-semibold text-brand-teal">
                      {getInitials(
                        member.profiles?.full_name,
                        member.profiles?.email
                      )}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium text-brand-navy">
                    {member.profiles?.full_name ?? member.profiles?.email}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl border border-border/80 bg-card p-6 shadow-card lg:col-span-2">
            <h2 className="font-semibold">Balances</h2>
            <div className="mt-4">
              <BalanceSummary balances={balances} currentUserId={user?.id} />
            </div>
          </section>
        </div>

        <section className="rounded-2xl border border-border/80 bg-card p-6 shadow-card">
          <h2 className="font-semibold">Expenses</h2>
          <div className="mt-4">
            <ExpenseList expenses={expenses as Expense[]} groupId={id} />
          </div>
        </section>
      </div>
    </AppShell>
  );
}
