import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { ExpenseForm } from "@/components/expenses/expense-form";
import { Button } from "@/components/ui/button";
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
    <AppShell profile={profile} maxWidth="lg">
      <Button variant="ghost" size="sm" asChild className="mb-6 -ml-2 text-brand-muted">
        <Link href={`/groups/${id}`}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to {group.name}
        </Link>
      </Button>

      <div className="rounded-2xl border border-border/80 bg-card p-8 shadow-card">
        <h1 className="text-2xl font-bold">Add expense</h1>
        <p className="mt-2 text-sm text-brand-muted">
          Record a shared cost and choose how to split it among members.
        </p>
        <div className="mt-8">
          <ExpenseForm groupId={id} members={members} />
        </div>
      </div>
    </AppShell>
  );
}
