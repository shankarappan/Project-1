"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createInvite } from "@/actions/groups";
import { Copy, Link2, UserPlus } from "lucide-react";
import { toast } from "sonner";

interface InviteDialogProps {
  groupId: string;
  canInvite: boolean;
}

export function InviteDialog({ groupId, canInvite }: InviteDialogProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!canInvite) {
    return null;
  }

  async function handleCreateInvite() {
    setLoading(true);
    const result = await createInvite(groupId, email || undefined);
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    if (result.inviteUrl) {
      setInviteUrl(result.inviteUrl);
      toast.success("Invite link created");
    }
  }

  function copyLink() {
    if (!inviteUrl) return;
    navigator.clipboard.writeText(inviteUrl);
    toast.success("Link copied to clipboard");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <UserPlus className="mr-2 h-4 w-4" />
          Invite
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite members</DialogTitle>
          <DialogDescription>
            Share a link or optionally note an email for your records. Anyone with
            the link can join after signing in.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email (optional)</Label>
            <Input
              id="email"
              type="email"
              placeholder="friend@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {!inviteUrl ? (
            <Button onClick={handleCreateInvite} disabled={loading} className="w-full">
              <Link2 className="mr-2 h-4 w-4" />
              {loading ? "Creating..." : "Generate invite link"}
            </Button>
          ) : (
            <div className="space-y-2">
              <Label>Invite link</Label>
              <div className="flex gap-2">
                <Input readOnly value={inviteUrl} />
                <Button type="button" variant="outline" onClick={copyLink}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
