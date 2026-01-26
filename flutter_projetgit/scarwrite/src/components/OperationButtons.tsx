import { Button } from "@/components/ui/button";
import { ArrowRightLeft, PiggyBank, Wallet } from "@/lib/lucide-react";
import { OperationType } from "@/lib/storage";

interface OperationButtonsProps {
  onSelectOperation: (type: OperationType) => void;
}

export function OperationButtons({ onSelectOperation }: OperationButtonsProps) {
  return (
    <div className="grid grid-cols-3 gap-3 mb-6">
      <Button
        variant="outline"
        className="h-20 flex-col gap-2 border-primary/30 hover:bg-primary/10"
        onClick={() => onSelectOperation('transfer')}
      >
        <ArrowRightLeft className="h-5 w-5 text-primary" />
        <span className="text-xs">Transfert</span>
      </Button>
      <Button
        variant="outline"
        className="h-20 flex-col gap-2 border-green-500/30 hover:bg-green-500/10"
        onClick={() => onSelectOperation('deposit')}
      >
        <PiggyBank className="h-5 w-5 text-green-500" />
        <span className="text-xs">Dépôt</span>
      </Button>
      <Button
        variant="outline"
        className="h-20 flex-col gap-2 border-orange-500/30 hover:bg-orange-500/10"
        onClick={() => onSelectOperation('withdrawal')}
      >
        <Wallet className="h-5 w-5 text-orange-500" />
        <span className="text-xs">Retrait</span>
      </Button>
    </div>
  );
}