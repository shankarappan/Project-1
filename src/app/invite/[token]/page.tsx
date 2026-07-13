import { acceptInvite } from "@/actions/groups";

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
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold">Invite error</h1>
          <p className="mt-2 text-muted-foreground">{result.error}</p>
        </div>
      </div>
    );
  }

  return null;
}
