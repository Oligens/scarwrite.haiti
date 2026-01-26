import { LucideIcon } from "@/lib/lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface StatCardProps {
  title: string;
  amount: number;
  icon: LucideIcon;
  currency?: string;
  isLoading?: boolean;
  delay?: number;
}

export function StatCard({
  title,
  amount,
  icon: Icon,
  currency = "HTG",
  isLoading = false,
  delay = 0,
}: StatCardProps) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("fr-FR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value) + ` ${currency}`;

  return (
    <div
      className="card-premium hover-lift p-6 opacity-0 animate-fade-in"
      style={{ animationDelay: `${delay}ms`, animationFillMode: "forwards" }}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground mb-1 uppercase tracking-wide">
            {title}
          </p>
          {isLoading ? (
            <Skeleton className="h-8 w-32 bg-muted" />
          ) : (
            <p className="text-3xl font-bold text-card-foreground font-display">
              {formatCurrency(amount)}
            </p>
          )}
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 ml-4">
          <Icon className="h-6 w-6 text-primary" />
        </div>
      </div>
    </div>
  );
}
