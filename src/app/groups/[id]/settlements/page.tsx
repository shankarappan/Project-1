import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { SettlementForm } from "@/components/settlements/settlement-form";
import { Button } from "@/components/ui/button";
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
    <AppShell profile={profile} maxWidth="lg">
      <Button variant="ghost" size="sm" asChild className="mb-6 -ml-2 text-brand-muted">
        <Link href={`/groups/${id}`}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to {group.name}
        </Link>
      </Button>

      <div className="space-y-6">
        <section className="rounded-2xl border border-border/80 bg-card p-8 shadow-card">
          <h1 className="text-2xl font-bold">Record settlement</h1>
          <p className="mt-2 text-sm text-brand-muted">
            Log a payment between group members.
          </p>
          <div className="mt-8">
            <SettlementForm groupId={id} members={members} />
          </div>
        </section>

        <section className="rounded-2xl border border-border/80 bg-card p-6 shadow-card">
          <h2 className="font-semibold">Settlement history</h2>
          {(settlements as Settlement[]).length === 0 ? (
            <p className="mt-4 text-sm text-brand-muted">
              No settlements recorded yet.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-border/60">
              {(settlements as Settlement[]).map((s) => (
                <li key={s.id} className="py-3 text-sm">
                  <p className="font-medium text-brand-navy">
                    {s.payer?.full_name ?? s.payer?.email} paid{" "}
                    {s.receiver?.full_name ?? s.receiver?.email}{" "}
                    <span className="text-brand-blue">
                      {formatCurrency(Number(s.amount), s.currency)}
                    </span>
                  </p>
                  <p className="text-xs text-brand-muted">
                    {formatDate(s.settled_at)}
                    {s.note ? ` · ${s.note}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AppShell>
  );
}
