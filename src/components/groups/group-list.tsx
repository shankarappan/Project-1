import Link from "next/link";
import { Users, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { DeleteGroupButton } from "@/components/groups/delete-group-button";

interface GroupListItem {
  id: string;
  name: string;
  created_at: string;
  canDelete?: boolean;
}

interface GroupListProps {
  groups: GroupListItem[];
}

export function GroupList({ groups }: GroupListProps) {
  if (groups.length === 0) {
    return (
      <EmptyState
        title="No groups yet"
        description="Create a group to start splitting expenses with friends, flatmates, or travel buddies."
        action={
          <Button asChild>
            <Link href="/groups/new">Create your first group</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-2">
      {groups.map((group) => (
        <div
          key={group.id}
          className="flex items-center gap-2 rounded-xl border border-border/80 bg-card p-2 shadow-sm transition-all hover:border-brand-blue/30 hover:shadow-card sm:gap-3 sm:p-3"
        >
          <Link
            href={`/groups/${group.id}`}
            className="group flex min-w-0 flex-1 items-center gap-4 rounded-lg p-2"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-teal/20 to-brand-blue/20 text-brand-blue">
              <Users className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-brand-navy group-hover:text-brand-blue">
                {group.name}
              </p>
              <p className="text-xs text-brand-muted">
                Created{" "}
                {new Date(group.created_at).toLocaleDateString("en-NZ", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-brand-muted transition-transform group-hover:translate-x-0.5 group-hover:text-brand-blue" />
          </Link>
          {group.canDelete ? (
            <DeleteGroupButton
              groupId={group.id}
              groupName={group.name}
              variant="icon"
            />
          ) : null}
        </div>
      ))}
    </div>
  );
}
