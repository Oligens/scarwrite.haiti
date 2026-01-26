import { LucideIcon } from "@/lib/lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface QuickActionButtonProps {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
  className?: string;
}

export function QuickActionButton({
  icon: Icon,
  label,
  onClick,
  className,
}: QuickActionButtonProps) {
  return (
    <Button
      variant="outline"
      onClick={onClick}
      className={cn(
        "h-auto flex-col gap-3 py-6 px-8 bg-white border border-silver-light text-card-foreground",
        "hover:bg-silver-light/30 hover:border-primary hover:shadow-sm transition-all duration-200",
        "group rounded-xl",
        className
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
        <Icon className="h-6 w-6 text-primary group-hover:scale-110 transition-transform" />
      </div>
      <span className="text-sm font-semibold text-center">{label}</span>
    </Button>
  );
}
