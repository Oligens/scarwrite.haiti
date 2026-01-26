import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Save, ArrowLeft, Printer } from "@/lib/lucide-react";
import { format } from 'date-fns';
import { cn } from "@/lib/utils";
import { 
  TransferType, 
  Transfer, 
  getSettings, 
  getNextReportNumber,
  parseDecimalInput,
  addTransfer,
  addOperation,
  updateTransfer,
  createAccountingTransaction,
  getCurrentBalancesForService,
  addAccount
} from "@/lib/storage";
import { AccountCombobox } from '@/components/ui/account-combobox';
import { useToast } from "@/hooks/use-toast";
import { getTransferTypeName } from "./TransferTypeSelector";
import { Checkbox } from "@/components/ui/checkbox";
import { ReceiptGenerator } from "./ReceiptGenerator";
import { generateClientReceipt } from "@/lib/pdf";

interface TransferFormProps {
  type: TransferType;
  onBack: () => void;
  onSuccess: () => void;
  editTransfer?: Transfer; // If provided, we're editing
}

// Types requiring USD input
const USD_TYPES: TransferType[] = ['zelle', 'cam_transfert', 'western_union', 'moneygram', 'autre'];
// Types requiring phone numbers
const PHONE_TYPES: TransferType[] = ['moncash', 'natcash'];

export function TransferForm({ type, onBack, onSuccess, editTransfer }: TransferFormProps) {
  const { toast } = useToast();
  const settings = getSettings();
  const isUsdType = USD_TYPES.includes(type);
  const isPhoneType = PHONE_TYPES.includes(type);
  const isEditing = !!editTransfer;

  const [date, setDate] = useState<Date>(() => {
    if (editTransfer) {
      return new Date(editTransfer.transfer_date + 'T00:00:00');
    }
    return new Date();
  });
  const [reportNumber] = useState(() => editTransfer?.report_number || getNextReportNumber());
  const [customTypeName, setCustomTypeName] = useState(editTransfer?.custom_type_name || '');
  
  // Sender/Receiver
  const [senderName, setSenderName] = useState(editTransfer?.sender_name || '');
  const [senderPhone, setSenderPhone] = useState(editTransfer?.sender_phone || '');
  const [receiverName, setReceiverName] = useState(editTransfer?.receiver_name || '');
  const [receiverPhone, setReceiverPhone] = useState(editTransfer?.receiver_phone || '');
  
  // Amounts
  const [amountUsd, setAmountUsd] = useState(editTransfer?.amount_usd?.toString() || '');
  const [exchangeRate] = useState(editTransfer?.exchange_rate || settings.exchange_rate || 133);
  const [amountGourdes, setAmountGourdes] = useState(editTransfer?.amount_gourdes?.toString() || '');
  const [transferFee, setTransferFee] = useState(
    editTransfer?.transfer_fee?.toString() || settings.default_transfer_fee?.toString() || ''
  );
  // PDF report options (defaults: all true)
  const [reportOptions, setReportOptions] = useState({
    totalOperations: true,
    totalCash: true,
    totalDigital: true,
    totalFees: true,
    totalCommissions: true,
    showCashAfter: true,
    showDigitalAfter: true,
  });
  
  // State for receipt generation
  const [lastTransferId, setLastTransferId] = useState<string | null>(null);
  const [revenueAccount, setRevenueAccount] = useState<string>('7061');

  // Load balances on component mount
  useEffect(() => {
    const loadBalances = async () => {
      try {
        const b = await getCurrentBalancesForService(type, type === 'autre' ? customTypeName : undefined);
        setBalances(b);
      } catch (err) {
        console.warn('Erreur chargement soldes:', err);
      }
    };
    loadBalances();
  }, [type, customTypeName]);
  const [balances, setBalances] = useState<{ cash: number; digital: number }>({ cash: 0, digital: 0 });

  // Preview after applying logic
  const principal = isUsdType ? (calculatedGourdes || 0) : (parseDecimalInput(amountGourdes) || 0);
  const feesVal = parseDecimalInput(transferFee) || 0;
  const commissionVal = 0;
  const cashAfter = balances.cash + principal + feesVal + commissionVal;
  const digitalAfter = balances.digital - principal + commissionVal;

  // Calculated total for USD types
  const calculatedGourdes = isUsdType && amountUsd 
    ? parseDecimalInput(amountUsd) * exchangeRate 
    : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (type === 'autre' && !customTypeName.trim()) {
      toast({ title: "Erreur", description: "Veuillez spécifier le type de transfert", variant: "destructive" });
      return;
    }

    // Validate sender and receiver
    if (!isPhoneType && !senderName.trim()) {
      toast({ title: "Erreur", description: "Nom de l'expéditeur requis", variant: "destructive" });
      return;
    }

    if (!isPhoneType && !receiverName.trim()) {
      toast({ title: "Erreur", description: "Nom du bénéficiaire requis", variant: "destructive" });
      return;
    }

    if (isPhoneType && !senderPhone.trim()) {
      toast({ title: "Erreur", description: "Téléphone de l'expéditeur requis", variant: "destructive" });
      return;
    }

    if (isPhoneType && !receiverPhone.trim()) {
      toast({ title: "Erreur", description: "Téléphone du bénéficiaire requis", variant: "destructive" });
      return;
    }
    
    if (!transferFee || parseDecimalInput(transferFee) <= 0) {
      toast({ title: "Erreur", description: "Les frais de transfert sont obligatoires", variant: "destructive" });
      return;
    }
    
    const finalAmountGourdes = isUsdType 
      ? calculatedGourdes 
      : parseDecimalInput(amountGourdes);
    
    if (finalAmountGourdes <= 0) {
      toast({ title: "Erreur", description: "Le montant doit être supérieur à 0", variant: "destructive" });
      return;
    }

    const transferData: Omit<Transfer, 'id' | 'created_at'> = {
      transfer_type: type,
      custom_type_name: type === 'autre' ? customTypeName : undefined,
      transfer_date: format(date, 'yyyy-MM-dd'),
      report_number: reportNumber,
      sender_name: isPhoneType ? undefined : senderName,
      sender_phone: isPhoneType ? senderPhone : undefined,
      receiver_name: isPhoneType ? undefined : receiverName,
      receiver_phone: isPhoneType ? receiverPhone : undefined,
      amount_usd: isUsdType ? parseDecimalInput(amountUsd) : undefined,
      amount_gourdes: finalAmountGourdes,
      exchange_rate: isUsdType ? exchangeRate : undefined,
      transfer_fee: parseDecimalInput(transferFee),
    };

    try {
      // load balances to validate
      try {
        const b = await getCurrentBalancesForService(type, customTypeName);
        setBalances(b);
        // Validation: ensure digital has enough for transfers/deposits
        if (b.digital < finalAmountGourdes) {
          toast({ title: 'Erreur', description: 'Solde numérique insuffisant pour cette opération', variant: 'destructive' });
          return;
        }
      } catch (err) {
        console.warn('Impossible de récupérer soldes avant validation:', err);
      }
      if (isEditing && editTransfer) {
        await updateTransfer(editTransfer.id, transferData);
        setLastTransferId(editTransfer.id);
        toast({ title: "Transfert modifié", description: `Rapport N° ${reportNumber}` });
      } else {
        await addTransfer(transferData);
        setLastTransferId(String(reportNumber));
        toast({ title: "Transfert enregistré", description: `Rapport N° ${reportNumber}` });
      }

      // Also record an operational FinancialOperation so balances and journal stay in sync
      try {
        await addOperation({
          operation_type: 'transfer',
          service_name: type,
          custom_service_name: type === 'autre' ? customTypeName : undefined,
          operation_date: transferData.transfer_date,
          sender_name: transferData.sender_name,
          sender_phone: transferData.sender_phone,
          receiver_name: transferData.receiver_name,
          receiver_phone: transferData.receiver_phone,
          amount_gdes: finalAmountGourdes,
          amount_usd: transferData.amount_usd,
          exchange_rate: transferData.exchange_rate,
          fees: transferData.transfer_fee,
          commission: 0,
          notes: undefined,
        });
      } catch (opErr) {
        console.warn('Impossible d\'enregistrer opération associée au transfert:', opErr);
      }

      // Create accounting entries for fees/commissions
      const today = new Date().toISOString().slice(0,10);
      const fee = parseDecimalInput(transferFee);
      if (fee > 0) {
        const entries = [
          { journal_date: today, transaction_type: 'transfer_fee', account_code: '5311', account_name: 'Caisse Centrale', debit: fee, credit: 0, description: `Frais transfert ${getTransferTypeName(type)}` },
          { journal_date: today, transaction_type: 'transfer_fee', account_code: revenueAccount || '7061', account_name: 'Commissions Transferts', debit: 0, credit: fee, description: `Frais transfert ${getTransferTypeName(type)}` },
        ];
        await createAccountingTransaction(entries);
      }
      // Auto-download receipt PDF after successful save
      // After save: enable manual receipt generation (do not auto-download)
    } catch (err) {
      console.error(err);
      toast({ title: 'Erreur', description: 'Problème enregistrement transfert', variant: 'destructive' });
    }
    // Persist the chosen report options (global fallback)
    try {
      localStorage.setItem('reportOptions', JSON.stringify(reportOptions));
    } catch (err) {
      // ignore storage errors
    }

    // Keep form open after save so user can generate receipt; caller can finish when ready
  };

  const formatCurrency = (amount: number): string => {
    return amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const downloadPreviewReceipt = async () => {
    try {
      const principal = calculatedGourdes || parseDecimalInput(amountGourdes);
      if (!principal || principal <= 0) {
        toast({ title: 'Montant requis', description: 'Saisissez un montant pour activer le reçu', variant: 'destructive' });
        return;
      }
      const fees = parseDecimalInput(transferFee) || 0;
      const total = Math.round((principal + fees) * 100) / 100;
      const prodName = customTypeName || getTransferTypeName(type);
      const receiptDoc = generateClientReceipt(prodName, 1, principal, total, format(date, 'yyyy-MM-dd'));
      const fileName = `Recu_Transfert_Preview_${reportNumber}_${format(date, 'yyyy-MM-dd')}.pdf`;
      receiptDoc.save(fileName);
      toast({ title: 'Reçu généré', description: 'Téléchargement du reçu (prévisualisation)', variant: 'default' });
    } catch (err) {
      console.error('Erreur génération reçu preview:', err);
      toast({ title: 'Erreur', description: 'Impossible de générer le reçu', variant: 'destructive' });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Button type="button" size="icon" onClick={onBack} className="bg-amber-400 text-black hover:bg-amber-500 rounded-lg">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="font-display text-xl font-semibold text-foreground">
          {isEditing ? "✏️ Modifier" : ""} {getTransferTypeName(type, customTypeName)}
        </h2>
        <div className="ml-auto">
          {/* If we have a saved transfer, show the existing ReceiptGenerator (auto-download). */}
          {lastTransferId ? (
            <div className="flex items-center gap-2">
              <ReceiptGenerator
                data={{
                  operationNumber: `#OP-${reportNumber}`,
                  operationDate: date.toISOString().split('T')[0],
                  operationType: 'transfert',
                  serviceType: customTypeName || getTransferTypeName(type),
                  principalAmount: calculatedGourdes || parseDecimalInput(amountGourdes),
                  fees: parseDecimalInput(transferFee),
                  senderName: senderName || senderPhone,
                  receiverName: receiverName || receiverPhone,
                  account: revenueAccount,
                }}
              />
              <Button type="button" variant="outline" onClick={() => onSuccess()}>
                Terminer
              </Button>
            </div>
          ) : (
            // Pre-save: enable a gold download button once an amount is entered
            <Button
              onClick={downloadPreviewReceipt}
              disabled={!( (isUsdType && amountUsd) || (!isUsdType && amountGourdes) )}
              title={((isUsdType && amountUsd) || (!isUsdType && amountGourdes)) ? 'Télécharger reçu (prévisualisation)' : 'Saisissez un montant pour activer l\'impression'}
              className={`${((isUsdType && amountUsd) || (!isUsdType && amountGourdes)) ? 'bg-amber-400 text-black hover:bg-amber-500' : 'bg-gray-200 text-muted-foreground'} font-semibold flex items-center gap-2 min-h-10 px-4`}
            >
              <Printer className="h-4 w-4" />
              <span>Générer Reçu</span>
            </Button>
          )}
        </div>
      </div>

      {/* Custom type name for "autre" */}
      {type === 'autre' && (
        <div className="space-y-2">
          <Label className="font-semibold text-black">Nom du service *</Label>
          <Input
            value={customTypeName}
            onChange={(e) => setCustomTypeName(e.target.value)}
            placeholder="Ex: Sendwave, Remitly..."
            className="bg-background border-slate-400 text-black"
            required
          />
        </div>
      )}

      {/* Date & Report Number */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="font-semibold text-white">📅 Date</Label>
          <Label className="font-semibold text-black">📅 Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? date.toLocaleDateString('fr-FR') : "Sélectionner"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(d) => d && setDate(d)}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>
        <div className="space-y-2">
          <Label className="font-semibold text-white">🧾 N° Rapport</Label>
          <Label className="font-semibold text-black">🧾 N° Rapport</Label>
          <Input
            value={reportNumber}
            disabled
            className="bg-muted/30 border-slate-400"
          />
        </div>
      </div>

      {/* Sender/Receiver - Name based */}
      {!isPhoneType && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="font-semibold text-white">👤 Expéditeur</Label>
            <Label className="font-semibold text-black">👤 Expéditeur</Label>
            <Input
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              placeholder="Nom de l'expéditeur"
              className="bg-background border-slate-400 text-black"
              required
            />
          </div>
          <div className="space-y-2">
            <Label className="font-semibold text-white">👤 Bénéficiaire</Label>
            <Label className="font-semibold text-black">👤 Bénéficiaire</Label>
            <Input
              value={receiverName}
              onChange={(e) => setReceiverName(e.target.value)}
              placeholder="Nom du bénéficiaire"
              className="bg-background border-slate-400 text-black"
              required
            />
          </div>
        </div>
      )}

      {/* Sender/Receiver - Phone based (MonCash, NatCash) */}
      {isPhoneType && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="font-semibold text-white">📞 Tél. Expéditeur</Label>
            <Label className="font-semibold text-black">📞 Tél. Expéditeur</Label>
            <Input
              type="tel"
              value={senderPhone}
              onChange={(e) => setSenderPhone(e.target.value)}
              placeholder="Ex: 509 3XXX XXXX"
              className="bg-background border-slate-400 text-black"
              required
            />
          </div>
          <div className="space-y-2">
            <Label className="font-semibold text-white">📞 Tél. Bénéficiaire</Label>
            <Label className="font-semibold text-black">📞 Tél. Bénéficiaire</Label>
            <Input
              type="tel"
              value={receiverPhone}
              onChange={(e) => setReceiverPhone(e.target.value)}
              placeholder="Ex: 509 3XXX XXXX"
              className="bg-background border-slate-400 text-black"
              required
            />
          </div>
        </div>
      )}

      {/* Amount section */}
      {isUsdType ? (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="font-semibold text-white">💵 Montant USD</Label>
              <Label className="font-semibold text-black">💵 Montant USD</Label>
              <Input
                type="text"
                inputMode="decimal"
                value={amountUsd}
                onChange={(e) => setAmountUsd(e.target.value)}
                placeholder="Ex: 150"
                className="bg-background border-slate-400 text-black"
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="font-semibold text-white">💱 Taux du jour</Label>
              <Label className="font-semibold text-black">💱 Taux du jour</Label>
              <Input
                value={exchangeRate}
                disabled
                className="bg-muted/30 border-slate-400"
              />
            </div>
          </div>
          <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">💰 Total en Gourdes</span>
              <span className="text-xl font-bold text-primary">
                {formatCurrency(calculatedGourdes)} {settings.currency_symbol}
              </span>
            </div>
          </div>
        </>
      ) : (
        <div className="space-y-2">
          <Label className="font-semibold text-white">💵 Montant (Gourdes)</Label>
          <Label className="font-semibold text-black">💵 Montant (Gourdes)</Label>
          <Input
            type="text"
            inputMode="decimal"
            value={amountGourdes}
            onChange={(e) => setAmountGourdes(e.target.value)}
            placeholder="Ex: 5000"
            className="bg-background border-slate-400 text-black"
            required
          />
        </div>
      )}

      {/* Transfer fee */}
      <div className="space-y-2">
        <Label className="font-semibold text-white">💼 Frais de transfert (Gourdes) *</Label>
        <Label className="font-semibold text-black">💼 Frais de transfert (Gourdes) *</Label>
        <Input
          type="text"
          inputMode="decimal"
          value={transferFee}
          onChange={(e) => setTransferFee(e.target.value)}
          placeholder="Ex: 500"
          className="bg-background border-slate-400 text-black"
          required
        />
        <p className="text-xs text-muted-foreground">Ces frais constituent la recette du transfert</p>
      </div>

      {/* Preview balances before/after */}
      <div className="p-4 rounded-lg bg-card border border-border space-y-3">
        <h3 className="text-sm font-semibold text-white">Soldes — Avant / Après</h3>
        <h3 className="text-sm font-semibold text-black">Soldes — Avant / Après</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 rounded-lg bg-muted/20 border border-border/50">
            <p className="text-xs text-black font-bold">💳 Cash — Avant</p>
            <p className="font-bold text-black">{balances ? balances.cash.toLocaleString('fr-FR',{minimumFractionDigits:2}) : '...'} {settings.currency_symbol}</p>
            {reportOptions.showCashAfter && (
              <p className="text-sm text-green-700">APRÈS: {cashAfter.toLocaleString('fr-FR',{minimumFractionDigits:2})} {settings.currency_symbol}</p>
            )}
          </div>
          <div className="p-3 rounded-lg bg-muted/20 border border-border/50">
            <p className="text-xs text-black font-bold">💎 Numérique — Avant</p>
            <p className="font-bold text-black">{balances ? balances.digital.toLocaleString('fr-FR',{minimumFractionDigits:2}) : '...'} {settings.currency_symbol}</p>
            {reportOptions.showDigitalAfter && (
              <p className="text-sm text-blue-700">APRÈS: {digitalAfter.toLocaleString('fr-FR',{minimumFractionDigits:2})} {settings.currency_symbol}</p>
            )}
          </div>
        </div>
      </div>

      {/* Options du rapport PDF */}
      <div className="p-4 rounded-lg bg-card border border-border space-y-3">
        <h3 className="text-sm font-semibold text-white">Options du rapport PDF</h3>
        <h3 className="text-sm font-semibold text-black">Options du rapport PDF</h3>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex items-center gap-2">
            <Checkbox checked={reportOptions.totalOperations} onCheckedChange={(v) => setReportOptions(prev => ({ ...prev, totalOperations: !!v }))} />
            <span className="text-sm text-black font-bold">Total opérations</span>
          </label>
          <label className="flex items-center gap-2">
            <Checkbox checked={reportOptions.totalCash} onCheckedChange={(v) => setReportOptions(prev => ({ ...prev, totalCash: !!v }))} />
            <span className="text-sm text-black font-bold">Flux Cash total</span>
          </label>
          <label className="flex items-center gap-2">
            <Checkbox checked={reportOptions.totalDigital} onCheckedChange={(v) => setReportOptions(prev => ({ ...prev, totalDigital: !!v }))} />
            <span className="text-sm text-black font-bold">Flux Numérique total</span>
          </label>
          <label className="flex items-center gap-2">
            <Checkbox checked={reportOptions.totalFees} onCheckedChange={(v) => setReportOptions(prev => ({ ...prev, totalFees: !!v }))} />
            <span className="text-sm text-black font-bold">Total frais</span>
          </label>
          <label className="flex items-center gap-2">
            <Checkbox checked={reportOptions.totalCommissions} onCheckedChange={(v) => setReportOptions(prev => ({ ...prev, totalCommissions: !!v }))} />
            <span className="text-sm text-black font-bold">Total commissions</span>
          </label>
          <label className="flex items-center gap-2">
            <Checkbox checked={reportOptions.showCashAfter} onCheckedChange={(v) => setReportOptions(prev => ({ ...prev, showCashAfter: !!v }))} />
            <span className="text-sm text-black font-bold">Afficher Cash APRÈS</span>
          </label>
          <label className="flex items-center gap-2">
            <Checkbox checked={reportOptions.showDigitalAfter} onCheckedChange={(v) => setReportOptions(prev => ({ ...prev, showDigitalAfter: !!v }))} />
            <span className="text-sm text-black font-bold">Afficher Numérique APRÈS</span>
          </label>
        </div>
      </div>

      {/* Submit */}
      <Button type="submit" className="w-full bg-primary text-primary-foreground">
        <Save className="mr-2 h-4 w-4" />
        {isEditing ? "💾 Enregistrer les modifications" : "Enregistrer le transfert"}
      </Button>
    </form>
  );
}