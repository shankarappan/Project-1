import Link from "next/link";
import { AppNav } from "@/components/layout/app-nav";
import { DashboardCards } from "@/components/dashboard/dashboard-cards";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { GroupList } from "@/components/groups/group-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentProfile, seedDemoDataAction } from "@/actions/auth";
import { getUserGroups } from "@/actions/groups";
import { getRecentActivity } from "@/actions/expenses";
import { getDashboardBalances } from "@/actions/balances";
import { Plus, Sparkles } from "lucide-react";

export default async function DashboardPage() {
  const [profile, groups, activity, balances] = await Promise.all([
    getCurrentProfile(),
    getUserGroups(),
    getRecentActivity(),
    getDashboardBalances(),
  ]);

  const typedGroups = groups;

  return (
    <div className="min-h-screen bg-muted/20">
      <AppNav profile={profile} />

      <main className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              Hello{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}
            </h1>
            <p className="text-muted-foreground">Your expense overview across all groups.</p>
          </div>
          <div className="flex gap-2">
            {typedGroups.length === 0 && (
              <form action={seedDemoDataAction}>
                <Button type="submit" variant="outline" size="sm">
                  <Sparkles className="mr-2 h-4 w-4" />
                  Load demo data
                </Button>
              </form>
            )}
            <Button asChild>
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
          <Card>
            <CardHeader>
              <CardTitle>Your groups</CardTitle>
            </CardHeader>
            <CardContent>
              <GroupList groups={typedGroups} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent activity</CardTitle>
            </CardHeader>
            <CardContent>
              <RecentActivity items={activity} />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
