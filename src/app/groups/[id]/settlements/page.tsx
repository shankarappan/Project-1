import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { SettlementForm } from "@/components/settlements/settlement-form";
import { VoidSettlementButton } from "@/components/settlements/void-settlement-button";
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
  const rows = (settlements as Settlement[]) ?? [];

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
            Log a payment between group members. Amounts cannot exceed what the
            payer currently owes in this group. To change a settlement, void it
            and record a new one.
          </p>
          <div className="mt-8">
            <SettlementForm groupId={id} members={members} />
          </div>
        </section>

        <section className="rounded-2xl border border-border/80 bg-card p-6 shadow-card">
          <h2 className="font-semibold">Settlement history</h2>
          {rows.length === 0 ? (
            <p className="mt-4 text-sm text-brand-muted">
              No settlements recorded yet.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-border/60">
              {rows.map((s) => {
                const voided = s.status === "voided";
                const label = `${s.payer?.full_name ?? s.payer?.email} paid ${s.receiver?.full_name ?? s.receiver?.email} ${formatCurrency(Number(s.amount), s.currency)}`;
                return (
                  <li
                    key={s.id}
                    className="flex flex-col gap-2 py-3 text-sm sm:flex-row sm:items-start sm:justify-between"
                  >
                    <div>
                      <p
                        className={
                          voided
                            ? "font-medium text-brand-muted line-through"
                            : "font-medium text-brand-navy"
                        }
                      >
                        {s.payer?.full_name ?? s.payer?.email} paid{" "}
                        {s.receiver?.full_name ?? s.receiver?.email}{" "}
                        <span className={voided ? "" : "text-brand-blue"}>
                          {formatCurrency(Number(s.amount), s.currency)}
                        </span>
                        {voided && (
                          <span className="ml-2 text-xs font-semibold uppercase tracking-wide text-brand-muted no-underline">
                            Voided
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-brand-muted">
                        {formatDate(s.settled_at)}
                        {s.note ? ` · ${s.note}` : ""}
                        {voided && s.voided_at
                          ? ` · Voided ${formatDate(s.voided_at)}`
                          : ""}
                        {voided && s.void_reason ? ` · ${s.void_reason}` : ""}
                      </p>
                    </div>
                    {!voided && (
                      <VoidSettlementButton
                        settlementId={s.id}
                        groupId={id}
                        label={label}
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </AppShell>
  );
}
