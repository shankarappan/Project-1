import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getCurrentProfile, updateProfile, seedDemoDataAction } from "@/actions/auth";
import { Sparkles } from "lucide-react";

export default async function SettingsPage() {
  const profile = await getCurrentProfile();

  return (
    <AppShell profile={profile} maxWidth="lg">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="mt-1 text-brand-muted">Manage your profile and preferences.</p>
        </div>

        <section className="rounded-2xl border border-border/80 bg-card p-6 shadow-card">
          <h2 className="font-semibold">Profile</h2>
          <p className="mt-1 text-sm text-brand-muted">
            Update how your name appears in groups.
          </p>
          <form action={updateProfile} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={profile?.email ?? ""} disabled className="bg-muted/50" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="full_name">Display name</Label>
              <Input
                id="full_name"
                name="full_name"
                defaultValue={profile?.full_name ?? ""}
                placeholder="Your name"
              />
            </div>
            <Button type="submit" className="bg-brand-blue hover:bg-brand-blue/90">
              Save profile
            </Button>
          </form>
        </section>

        <section className="rounded-2xl border border-border/80 bg-card p-6 shadow-card">
          <h2 className="font-semibold">Demo data</h2>
          <p className="mt-1 text-sm text-brand-muted">
            Seed a sample group with expenses for testing.
          </p>
          <form action={seedDemoDataAction} className="mt-4">
            <Button type="submit" variant="outline">
              <Sparkles className="mr-2 h-4 w-4" />
              Load demo data
            </Button>
          </form>
        </section>
      </div>
    </AppShell>
  );
}
