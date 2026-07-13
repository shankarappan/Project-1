import Link from "next/link";
import { AppNav } from "@/components/layout/app-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentProfile } from "@/actions/auth";
import { CreateGroupForm } from "@/components/groups/create-group-form";
import { ArrowLeft } from "lucide-react";

export default async function NewGroupPage() {
  const profile = await getCurrentProfile();

  return (
    <div className="min-h-screen bg-muted/20">
      <AppNav profile={profile} />

      <main className="mx-auto max-w-lg px-4 py-8 sm:px-6">
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link href="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to dashboard
          </Link>
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Create a group</CardTitle>
            <CardDescription>
              Start splitting expenses with flatmates, friends, or travel companions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CreateGroupForm />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
