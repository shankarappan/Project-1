import Link from "next/link";
import { LogOut, Settings, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogoLockup } from "@/components/brand/logo-lockup";
import { getInitials } from "@/lib/format";
import { signOut } from "@/actions/auth";
import type { Profile } from "@/lib/types/database";

interface AppNavProps {
  profile: Profile | null;
}

export function AppNav({ profile }: AppNavProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-card/90">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <LogoLockup href="/dashboard" size="sm" />

        <nav className="flex items-center gap-2">
          <Button
            size="sm"
            asChild
            className="hidden bg-brand-blue hover:bg-brand-blue/90 sm:inline-flex"
          >
            <Link href="/groups/new">
              <Plus className="mr-1.5 h-4 w-4" />
              New group
            </Link>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full ring-2 ring-border/60"
              >
                <Avatar className="h-9 w-9">
                  <AvatarImage src={profile?.avatar_url ?? undefined} />
                  <AvatarFallback className="bg-brand-blue/10 text-sm font-semibold text-brand-blue">
                    {getInitials(profile?.full_name, profile?.email)}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-3 py-2">
                <p className="font-medium text-brand-navy">
                  {profile?.full_name ?? "User"}
                </p>
                <p className="text-xs text-brand-muted">{profile?.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/settings">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <form action={signOut}>
                <DropdownMenuItem asChild>
                  <button type="submit" className="w-full cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </button>
                </DropdownMenuItem>
              </form>
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>
      </div>
    </header>
  );
}
