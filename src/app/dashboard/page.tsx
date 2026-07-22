import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { DashboardCards } from "@/components/dashboard/dashboard-cards";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { GroupList } from "@/components/groups/group-list";
import { Button } from "@/components/ui/button";
import { getCurrentProfile } from "@/actions/auth";
import { getUserGroups } from "@/actions/groups";
import { getRecentActivity } from "@/actions/expenses";
import { getDashboardBalances } from "@/actions/balances";
import { SeedDemoButton } from "@/components/settings/seed-demo-button";
import { Plus } from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DashboardPage() {
  const [profile, groups, activity, balances] = await Promise.all([
    getCurrentProfile(),
    getUserGroups(),
    getRecentActivity(),
    getDashboardBalances(),
  ]);

  const firstName = profile?.full_name?.split(" ")[0];

  return (
    <AppShell profile={profile}>
      <div className="space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-brand-muted">Dashboard</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">
              {firstName ? `Hello, ${firstName}` : "Hello"}
            </h1>
            <p className="mt-1 text-brand-muted">
              Your expense overview across all groups.
            </p>
          </div>
          <div className="flex gap-2">
            {groups.length === 0 && <SeedDemoButton />}
            <Button asChild size="sm" className="bg-brand-blue hover:bg-brand-blue/90">
              <Link href="/groups/new">
                <Plus className="mr-2 h-4 w-4" />
                New group
              </Link>
            </Button>
          </div>
        </div>

        <DashboardCards
          totalOwed={balances.totalOwed}
          totalOwing={balances.totalOwing}
          netBalance={balances.netBalance}
        />

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-border/80 bg-card p-6 shadow-card">
            <h2 className="text-lg font-semibold">Your groups</h2>
            <p className="mt-1 text-sm text-brand-muted">
              Tap a group to view expenses, or delete ones you admin.
            </p>
            <div className="mt-5">
              <GroupList groups={groups} />
            </div>
          </section>

          <section className="rounded-2xl border border-border/80 bg-card p-6 shadow-card">
            <h2 className="text-lg font-semibold">Recent activity</h2>
            <p className="mt-1 text-sm text-brand-muted">
              Latest expenses and settlements.
            </p>
            <div className="mt-5">
              <RecentActivity items={activity} />
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
