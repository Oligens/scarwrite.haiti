import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Save, ArrowLeft, ArrowRightLeft, PiggyBank, Wallet, Printer } from "lucide-react";
import { generateClientReceipt } from "@/lib/pdf";
import { cn } from "@/lib/utils";
import { getTransferTypeName } from "@/components/TransferTypeSelector";
import { 
  TransferType, 
  OperationType,
  parseDecimalInput,
  addOperation,
  updateOperation,
  getSettings,
  getCurrentBalancesForService
} from "@/lib/storage";
import { FinancialOperation } from "@/lib/database";
import { getLastOperationForService } from "@/lib/database";
import { ReceiptGenerator } from "./ReceiptGenerator";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";

interface OperationFormProps {
  operationType: OperationType;
  transferType: TransferType;
  customTypeName?: string;
  onBack: () => void;
  onSuccess: () => void;
  editingOperation?: FinancialOperation;
}

const operationLabels: Record<OperationType, { title: string; icon: React.ReactNode; description: string }> = {
  transfer: { title: "Transfert", icon: <ArrowRightLeft className="h-5 w-5" />, description: "Numérique ↓ | Cash ↑" },
  deposit: { title: "Dépôt", icon: <PiggyBank className="h-5 w-5" />, description: "Cash ↓ | Numérique ↑" },
  withdrawal: { title: "Retrait", icon: <Wallet className="h-5 w-5" />, description: "Numérique ↓ | Cash ↑" },
};

export function OperationForm({ operationType, transferType, customTypeName, onBack, onSuccess, editingOperation }: OperationFormProps) {
  const { toast } = useToast();
  const settings = getSettings();
  const [currentBalances, setCurrentBalances] = useState({ cash: 0, digital: 0 });
  const [isLoadingBalances, setIsLoadingBalances] = useState(true);
  
  const [date, setDate] = useState<Date>(editingOperation ? new Date(editingOperation.operation_date) : new Date());
  const [amountGdes, setAmountGdes] = useState(editingOperation ? editingOperation.amount_gdes.toString() : '');
  const [amountUsd, setAmountUsd] = useState(editingOperation?.amount_usd?.toString() || '');
  const [exchangeRate, setExchangeRate] = useState(editingOperation?.exchange_rate?.toString() || '');
  const [fees, setFees] = useState(editingOperation?.fees?.toString() || '');
  const [commission, setCommission] = useState(editingOperation?.commission?.toString() || '');
  const [senderName, setSenderName] = useState(editingOperation?.sender_name || '');
  const [senderPhone, setSenderPhone] = useState(editingOperation?.sender_phone || '');
  const [receiverName, setReceiverName] = useState(editingOperation?.receiver_name || '');
  const [receiverPhone, setReceiverPhone] = useState(editingOperation?.receiver_phone || '');
  const [note, setNote] = useState(editingOperation?.notes || '');
  const [operationNumber, setOperationNumber] = useState(editingOperation?.operation_number || '');

  const [reportOptions, setReportOptions] = useState({
    totalOperations: true, totalCash: true, totalDigital: true, totalFees: true, totalCommissions: true,
    showCashAfter: true, showDigitalAfter: true, showBalanceCash: true, showBalanceDigital: true,
  });

  const [showCashBalance, setShowCashBalance] = useState(true);
  const [showDigitalBalance, setShowDigitalBalance] = useState(true);

  useEffect(() => {
    const loadBalances = async () => {
      try {
        const balances = await getCurrentBalancesForService(transferType, customTypeName);
        console.log(`[OperationForm] Loaded balances for ${transferType}/${customTypeName}:`, balances);
        setCurrentBalances(balances);
      } catch (error) { console.error(error); }
      finally { setIsLoadingBalances(false); }
    };
    loadBalances();
  }, [transferType, customTypeName]);

  const config = operationLabels[operationType];
  const typeName = getTransferTypeName(transferType, customTypeName);
  const isEditMode = !!editingOperation;
  const [lastOperation, setLastOperation] = useState<FinancialOperation | null>(editingOperation || null);

  const parsedAmountGdes = parseDecimalInput(amountGdes) || 0;
  const parsedFees = parseDecimalInput(fees) || 0;
  const parsedCommission = parseDecimalInput(commission) || 0;

  const calculatePreviewBalances = () => {
    const cashBefore = currentBalances.cash;
    const digitalBefore = currentBalances.digital;
    let cashAfter = cashBefore;
    let digitalAfter = digitalBefore;

    if (operationType === 'withdrawal') {
      cashAfter = cashBefore - parsedAmountGdes;
      digitalAfter = digitalBefore + parsedAmountGdes + parsedFees + parsedCommission;
    } else {
      cashAfter = cashBefore + parsedAmountGdes + parsedFees + parsedCommission;
      digitalAfter = digitalBefore - parsedAmountGdes;
    }
    return { cashAfter, digitalAfter };
  };

  const { cashAfter: previewCash, digitalAfter: previewDigital } = calculatePreviewBalances();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = {
        operation_type: operationType,
        service_name: transferType,
        custom_service_name: customTypeName,
        operation_date: date.toISOString().slice(0, 10),
        sender_name: senderName,
        receiver_name: receiverName,
        amount_gdes: parsedAmountGdes,
        fees: parsedFees,
        commission: parsedCommission,
        notes: note
      };
      console.log(`[OperationForm] Submitting operation:`, data);
      if (isEditMode && editingOperation) {
        await updateOperation(editingOperation.id, data);
      } else {
        await addOperation(data);
      }
      console.log(`[OperationForm] Operation submitted successfully`);
      onSuccess();
    } catch (err) { 
      console.error(`[OperationForm] Error submitting:`, err);
      toast({ title: "Erreur", variant: "destructive" }); 
    }
  };

  // Cast pour corriger l'erreur 2786
  const PopoverComp = Popover as any;

  return (
    <form onSubmit={handleSubmit} className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <Button type="button" variant="ghost" onClick={onBack}><ArrowLeft /> Retour</Button>
        <h2 className="text-xl font-bold">{config.title} - {typeName}</h2>
        <Button type="submit" className="bg-blue-600"><Save className="mr-2" /> Enregistrer</Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="font-semibold text-white">Date</Label>
          <PopoverComp>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date.toLocaleDateString()}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} /></PopoverContent>
          </PopoverComp>
        </div>
        <div className="space-y-2">
          <Label className="font-semibold text-white">N° Rapport</Label>
          <Input value={operationNumber} disabled className="border-slate-400" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input placeholder="Expéditeur" value={senderName} onChange={(e) => setSenderName(e.target.value)} className="border-slate-400 text-white" />
        <Input placeholder="Bénéficiaire" value={receiverName} onChange={(e) => setReceiverName(e.target.value)} className="border-slate-400 text-white" />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div><Label className="font-semibold text-white">Montant</Label><Input value={amountGdes} onChange={(e) => setAmountGdes(e.target.value)} className="border-slate-400 text-white" /></div>
        <div><Label className="font-semibold text-white">Frais</Label><Input value={fees} onChange={(e) => setFees(e.target.value)} className="border-slate-400 text-white" /></div>
        <div><Label className="font-semibold text-white">Commission</Label><Input value={commission} onChange={(e) => setCommission(e.target.value)} className="border-slate-400 text-white" /></div>
      </div>

      <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg">
        <div>
          <p className="text-sm font-bold">Balance Cash</p>
          <p className="text-lg">{previewCash.toLocaleString()} GDES</p>
        </div>
        <div>
          <p className="text-sm font-bold">Balance Numérique</p>
          <p className="text-lg">{previewDigital.toLocaleString()} GDES</p>
        </div>
      </div>
    </form>
  );
}