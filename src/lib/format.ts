export function formatCurrency(amount: number, currency = "NZD"): string {
  return new Intl.NumberFormat("en-NZ", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-NZ", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}

export function formatRelativeDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return formatDate(d);
}

export function getInitials(name: string | null | undefined, email?: string): string {
  if (name?.trim()) {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }
  return (email?.[0] ?? "?").toUpperCase();
}

/** Round a dollar amount to 2dp via integer cents (half-up). */
export function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}

export function formatCents(cents: number, currency = "NZD"): string {
  return formatCurrency(cents / 100, currency);
}
