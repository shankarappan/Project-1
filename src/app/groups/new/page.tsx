import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { CreateGroupForm } from "@/components/groups/create-group-form";
import { Button } from "@/components/ui/button";
import { getCurrentProfile } from "@/actions/auth";
import { ArrowLeft } from "lucide-react";

export default async function NewGroupPage() {
  const profile = await getCurrentProfile();

  return (
    <AppShell profile={profile} maxWidth="lg">
      <Button variant="ghost" size="sm" asChild className="mb-6 -ml-2 text-brand-muted">
        <Link href="/dashboard">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to dashboard
        </Link>
      </Button>

      <div className="rounded-2xl border border-border/80 bg-card p-8 shadow-card">
        <h1 className="text-2xl font-bold">Create a group</h1>
        <p className="mt-2 text-sm text-brand-muted">
          Start splitting expenses with flatmates, friends, or travel companions.
        </p>
        <div className="mt-8">
          <CreateGroupForm />
        </div>
      </div>
    </AppShell>
  );
}
