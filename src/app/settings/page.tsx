import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { SettingsForms } from "@/components/settings/settings-forms";
import { getCurrentProfile, getCurrentUser } from "@/actions/auth";

export default async function SettingsPage() {
  const [user, profile] = await Promise.all([
    getCurrentUser(),
    getCurrentProfile(),
  ]);

  if (!user) {
    redirect("/login?redirect=/settings");
  }

  return (
    <AppShell profile={profile} maxWidth="lg">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="mt-1 text-brand-muted">
            Manage your profile and preferences.
          </p>
        </div>

        <SettingsForms
          email={profile?.email ?? user.email ?? ""}
          fullName={profile?.full_name ?? ""}
        />
      </div>
    </AppShell>
  );
}
