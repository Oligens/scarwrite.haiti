import { Skeleton } from "@/components/ui/skeleton";
import { LucideIcon, DollarSign } from "@/lib/lucide-react";

interface RevenueCardProps {
  title: string;
  amount: number;
  subtitle?: string;
  isLoading?: boolean;
  delay?: number;
  currency?: string;
  icon?: LucideIcon;
}

export function RevenueCard({
  title,
  amount,
  subtitle,
  isLoading = false,
  delay = 0,
  currency = "G",
  icon: Icon = DollarSign,
}: RevenueCardProps) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value) + ` ${currency}`;

  return (
    <div
      className="card-premium hover-lift p-5 opacity-0 animate-fade-in"
      style={{ animationDelay: `${delay}ms`, animationFillMode: "forwards" }}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
          {subtitle && (
            <p className="mb-2 text-xs text-muted-foreground/70">{subtitle}</p>
          )}
          
          {isLoading ? (
            <Skeleton className="h-8 w-32 bg-muted" />
          ) : (
            <p className="revenue-number">{formatCurrency(amount)}</p>
          )}
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
          <Icon className="h-6 w-6 text-primary" />
        </div>
      </div>
    </div>
  );
}
