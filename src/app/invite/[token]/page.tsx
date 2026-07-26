import Link from "next/link";
import { acceptInvite } from "@/actions/groups";
import { Button } from "@/components/ui/button";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await acceptInvite(token);

  if (result?.error) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-md space-y-4 text-center">
          <h1 className="text-xl font-semibold">Invite error</h1>
          <p className="text-muted-foreground">{result.error}</p>
          <Button asChild variant="outline">
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
