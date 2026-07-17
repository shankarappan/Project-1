"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { updateProfile, seedDemoData } from "@/actions/auth";
import { Sparkles } from "lucide-react";

interface SettingsFormsProps {
  email: string;
  fullName: string;
}

export function SettingsForms({ email, fullName }: SettingsFormsProps) {
  const router = useRouter();
  const [name, setName] = useState(fullName);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const [demoMessage, setDemoMessage] = useState<string | null>(null);
  const [demoError, setDemoError] = useState<string | null>(null);
  const [demoLoading, setDemoLoading] = useState(false);

  async function handleSaveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (profileLoading) return;

    setProfileLoading(true);
    setProfileError(null);
    setProfileMessage(null);

    try {
      const formData = new FormData(event.currentTarget);
      const result = await updateProfile(formData);
      if (result?.error) {
        setProfileError(result.error);
        return;
      }
      setProfileMessage(result?.message ?? "Profile saved.");
    } catch {
      setProfileError("Could not save your profile. Please try again.");
    } finally {
      setProfileLoading(false);
    }
  }

  async function handleSeedDemo() {
    if (demoLoading) return;

    setDemoLoading(true);
    setDemoError(null);
    setDemoMessage(null);

    try {
      const result = await seedDemoData();
      if (result?.error) {
        setDemoError(result.error);
        return;
      }
      setDemoMessage(result?.message ?? "Demo data created.");
    } catch {
      setDemoError("Could not load demo data. Please try again.");
    } finally {
      setDemoLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border/80 bg-card p-6 shadow-card">
        <h2 className="font-semibold">Profile</h2>
        <p className="mt-1 text-sm text-brand-muted">
          Update how your name appears in groups.
        </p>
        <form onSubmit={handleSaveProfile} className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              value={email}
              readOnly
              disabled
              className="bg-muted/50"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="full_name">Display name</Label>
            <Input
              id="full_name"
              name="full_name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Your name"
              disabled={profileLoading}
            />
          </div>
          <Button
            type="submit"
            className="min-h-11 bg-brand-blue hover:bg-brand-blue/90"
            disabled={profileLoading}
            aria-busy={profileLoading}
          >
            {profileLoading ? "Saving..." : "Save profile"}
          </Button>
        </form>
        <div className="mt-4" aria-live="polite" aria-atomic="true">
          {profileMessage && (
            <Alert className="border-brand-teal/30 bg-brand-teal/5">
              <AlertDescription className="text-brand-navy">
                {profileMessage}
              </AlertDescription>
            </Alert>
          )}
          {profileError && (
            <Alert variant="destructive">
              <AlertDescription>{profileError}</AlertDescription>
            </Alert>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-border/80 bg-card p-6 shadow-card">
        <h2 className="font-semibold">Demo data</h2>
        <p className="mt-1 text-sm text-brand-muted">
          Seed a sample group with expenses for testing.
        </p>
        <div className="mt-4">
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            disabled={demoLoading}
            aria-busy={demoLoading}
            onClick={handleSeedDemo}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            {demoLoading ? "Loading demo..." : "Load demo data"}
          </Button>
        </div>
        <div className="mt-4" aria-live="polite" aria-atomic="true">
          {demoMessage && (
            <Alert className="border-brand-teal/30 bg-brand-teal/5">
              <AlertDescription className="text-brand-navy">
                {demoMessage}
              </AlertDescription>
            </Alert>
          )}
          {demoError && (
            <Alert variant="destructive">
              <AlertDescription>{demoError}</AlertDescription>
            </Alert>
          )}
        </div>
      </section>
    </div>
  );
}
