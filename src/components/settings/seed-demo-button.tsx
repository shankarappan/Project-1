"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { seedDemoData } from "@/actions/auth";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";

interface SeedDemoButtonProps {
  size?: "sm" | "default";
  variant?: "outline" | "default";
  label?: string;
}

export function SeedDemoButton({
  size = "sm",
  variant = "outline",
  label = "Load demo",
}: SeedDemoButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (loading) return;
    setLoading(true);
    try {
      const result = await seedDemoData();
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success(result?.message ?? "Demo data created.");
      router.refresh();
    } catch {
      toast.error("Could not load demo data. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className="min-h-11"
      disabled={loading}
      aria-busy={loading}
      onClick={handleClick}
    >
      <Sparkles className="mr-2 h-4 w-4" />
      {loading ? "Loading..." : label}
    </Button>
  );
}
