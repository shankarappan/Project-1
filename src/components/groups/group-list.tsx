import Link from "next/link";
import { Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

interface GroupListItem {
  id: string;
  name: string;
  created_at: string;
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
    <div className="grid gap-3 sm:grid-cols-2">
      {groups.map((group) => (
        <Link key={group.id} href={`/groups/${group.id}`}>
          <Card className="transition-colors hover:bg-muted/50">
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                <Users className="h-5 w-5" />
              </div>
              <CardTitle className="text-base">{group.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Created {new Date(group.created_at).toLocaleDateString()}
              </p>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
