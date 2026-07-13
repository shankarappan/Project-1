import { AppNav } from "@/components/layout/app-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getCurrentProfile, updateProfile, seedDemoDataAction } from "@/actions/auth";
import { Sparkles } from "lucide-react";

export default async function SettingsPage() {
  const profile = await getCurrentProfile();

  return (
    <div className="min-h-screen bg-muted/20">
      <AppNav profile={profile} />

      <main className="mx-auto max-w-lg space-y-6 px-4 py-8 sm:px-6">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Manage your profile and app preferences.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Update how your name appears in groups.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={updateProfile} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={profile?.email ?? ""} disabled />
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
              <Button type="submit">Save profile</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Demo data</CardTitle>
            <CardDescription>
              Seed a sample group with expenses for testing the app.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={seedDemoDataAction}>
              <Button type="submit" variant="outline">
                <Sparkles className="mr-2 h-4 w-4" />
                Load demo data
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Google OAuth setup</CardTitle>
            <CardDescription>
              To enable Google sign-in, configure these redirect URLs in Supabase
              Auth and Google Cloud Console.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              <strong className="text-foreground">Local:</strong>{" "}
              http://localhost:3000/auth/callback
            </p>
            <p>
              <strong className="text-foreground">Production:</strong>{" "}
              https://your-app.vercel.app/auth/callback
            </p>
            <p className="pt-2">
              In Supabase Dashboard → Authentication → Providers → Google, add
              your Client ID and Secret. Magic link auth works without Google
              credentials.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
