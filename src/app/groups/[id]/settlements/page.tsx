import Link from "next/link";
import { notFound } from "next/navigation";
import { AppNav } from "@/components/layout/app-nav";
import { SettlementForm } from "@/components/settlements/settlement-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentProfile } from "@/actions/auth";
import { getGroup } from "@/actions/groups";
import { getGroupSettlements } from "@/actions/balances";
import { formatCurrency, formatDate } from "@/lib/format";
import type { GroupMember, Settlement } from "@/lib/types/database";
import { ArrowLeft } from "lucide-react";

export default async function SettlementsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [profile, group, settlements] = await Promise.all([
    getCurrentProfile(),
    getGroup(id),
    getGroupSettlements(id),
  ]);

  if (!group) notFound();

  const members = (group.group_members as GroupMember[]) ?? [];

  return (
    <div className="min-h-screen bg-muted/20">
      <AppNav profile={profile} />

      <main className="mx-auto max-w-2xl space-y-6 px-4 py-8 sm:px-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/groups/${id}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to {group.name}
          </Link>
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Record settlement</CardTitle>
          </CardHeader>
          <CardContent>
            <SettlementForm groupId={id} members={members} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Settlement history</CardTitle>
          </CardHeader>
          <CardContent>
            {(settlements as Settlement[]).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No settlements recorded yet.
              </p>
            ) : (
              <ul className="divide-y rounded-lg border">
                {(settlements as Settlement[]).map((s) => (
                  <li key={s.id} className="px-3 py-3 text-sm">
                    <p className="font-medium">
                      {s.payer?.full_name ?? s.payer?.email} paid{" "}
                      {s.receiver?.full_name ?? s.receiver?.email}{" "}
                      {formatCurrency(Number(s.amount), s.currency)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(s.settled_at)}
                      {s.note ? ` · ${s.note}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
