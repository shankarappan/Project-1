import Link from "next/link";
import { notFound } from "next/navigation";
import { AppNav } from "@/components/layout/app-nav";
import { ExpenseForm } from "@/components/expenses/expense-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentProfile } from "@/actions/auth";
import { getGroup } from "@/actions/groups";
import type { GroupMember } from "@/lib/types/database";
import { ArrowLeft } from "lucide-react";

export default async function NewExpensePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [profile, group] = await Promise.all([
    getCurrentProfile(),
    getGroup(id),
  ]);

  if (!group) notFound();

  const members = (group.group_members as GroupMember[]) ?? [];

  return (
    <div className="min-h-screen bg-muted/20">
      <AppNav profile={profile} />

      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link href={`/groups/${id}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to {group.name}
          </Link>
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Add expense</CardTitle>
            <CardDescription>
              Record a shared cost and choose how to split it among members.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ExpenseForm groupId={id} members={members} />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
