import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import { ArrowDownLeft, ArrowUpRight, Scale } from "lucide-react";

interface DashboardCardsProps {
  totalOwed: number;
  totalOwing: number;
  netBalance: number;
  currency?: string;
}

export function DashboardCards({
  totalOwed,
  totalOwing,
  netBalance,
  currency = "NZD",
}: DashboardCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            You are owed
          </CardTitle>
          <ArrowUpRight className="h-4 w-4 text-emerald-600" />
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-emerald-600">
            {formatCurrency(totalOwed, currency)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            You owe
          </CardTitle>
          <ArrowDownLeft className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-red-500">
            {formatCurrency(totalOwing, currency)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Net balance
          </CardTitle>
          <Scale className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <p
            className={`text-2xl font-bold ${
              netBalance > 0
                ? "text-emerald-600"
                : netBalance < 0
                  ? "text-red-500"
                  : ""
            }`}
          >
            {formatCurrency(netBalance, currency)}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
