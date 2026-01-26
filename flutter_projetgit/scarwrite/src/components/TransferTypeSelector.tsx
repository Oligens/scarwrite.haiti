import { TransferType } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { CreditCard, Smartphone, ArrowRightLeft, Globe, HelpCircle } from "@/lib/lucide-react";

interface TransferTypeSelectorProps {
  onSelect: (type: TransferType) => void;
}

const TRANSFER_TYPES = [
  { type: 'zelle' as TransferType, label: 'Zelle', icon: CreditCard, color: 'text-purple-400' },
  { type: 'moncash' as TransferType, label: 'MonCash', icon: Smartphone, color: 'text-orange-400' },
  { type: 'natcash' as TransferType, label: 'NatCash', icon: Smartphone, color: 'text-green-400' },
  { type: 'cam_transfert' as TransferType, label: 'Cam Transfert', icon: ArrowRightLeft, color: 'text-blue-400' },
  { type: 'western_union' as TransferType, label: 'Western Union', icon: Globe, color: 'text-yellow-400' },
  { type: 'moneygram' as TransferType, label: 'MoneyGram', icon: Globe, color: 'text-red-400' },
  { type: 'autre' as TransferType, label: 'Autre', icon: HelpCircle, color: 'text-muted-foreground' },
];

export function TransferTypeSelector({ onSelect }: TransferTypeSelectorProps) {
  return (
    <div className="space-y-4">
      <h2 className="font-display text-xl font-semibold text-center text-foreground">
        Type de transfert
      </h2>
      <p className="text-sm text-center text-muted-foreground">
        Sélectionnez le type de service de transfert
      </p>
      <div className="grid gap-3">
        {TRANSFER_TYPES.map(({ type, label, icon: Icon, color }) => (
          <Button
            key={type}
            variant="outline"
            className="h-16 justify-start gap-4 border-border/50 hover:bg-primary/10 hover:border-primary/50 transition-all"
            onClick={() => onSelect(type)}
          >
            <div className={`p-2 rounded-lg bg-muted/50 ${color}`}>
              <Icon className="h-6 w-6" />
            </div>
            <span className="text-lg font-medium">{label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}

export const getTransferTypeName = (type: TransferType, customName?: string): string => {
  const typeMap: Record<TransferType, string> = {
    zelle: 'Zelle',
    moncash: 'MonCash',
    natcash: 'NatCash',
    cam_transfert: 'Cam Transfert',
    western_union: 'Western Union',
    moneygram: 'MoneyGram',
    autre: customName || 'Autre',
  };
  return typeMap[type];
};