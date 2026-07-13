import Link from "next/link";
import { notFound } from "next/navigation";
import { AppNav } from "@/components/layout/app-nav";
import { BalanceSummary } from "@/components/groups/balance-summary";
import { ExpenseList } from "@/components/expenses/expense-list";
import { InviteDialog } from "@/components/groups/invite-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  return (
    <div className="min-h-screen bg-muted/20">
      <AppNav profile={profile} />

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2">
              <Link href="/dashboard">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Dashboard
              </Link>
            </Button>
            <h1 className="text-2xl font-bold">{group.name}</h1>
            <p className="text-sm text-muted-foreground">
              {members.length} member{members.length !== 1 ? "s" : ""}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <InviteDialog groupId={id} />
            <Button variant="outline" size="sm" asChild>
              <Link href={`/groups/${id}/settlements`}>
                <HandCoins className="mr-2 h-4 w-4" />
                Settle up
              </Link>
            </Button>
            <Button size="sm" asChild>
              <Link href={`/groups/${id}/expenses/new`}>
                <Plus className="mr-2 h-4 w-4" />
                Add expense
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-base">Members</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {members.map((member) => (
                  <li key={member.id} className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-muted text-xs">
                        {getInitials(
                          member.profiles?.full_name,
                          member.profiles?.email
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">
                      {member.profiles?.full_name ?? member.profiles?.email}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Balances</CardTitle>
            </CardHeader>
            <CardContent>
              <BalanceSummary
                balances={balances}
                currentUserId={user?.id}
              />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <ExpenseList
              expenses={expenses as Expense[]}
              groupId={id}
            />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
