import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Check, X, CreditCard, Banknote, PlusCircle } from "@/lib/lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  TransferType, 
  TypeBalance,
  getTypeBalance, 
  getTypeBalanceFromAccounting,
  updateTypeBalance, 
  updateBalanceWithEntry,
  parseDecimalInput,
  getSettings
} from "@/lib/storage";
import { getTransferTypeName } from "./TransferTypeSelector";

interface BalanceHeaderProps {
  transferType: TransferType;
  customTypeName?: string;
  onBalanceChange?: () => void;
  refreshKey?: number;
}

export function BalanceHeader({ transferType, customTypeName, onBalanceChange, refreshKey }: BalanceHeaderProps) {
  const settings = getSettings();
  const { toast } = useToast();
  const [balance, setBalance] = useState<TypeBalance>(() => getTypeBalance(transferType, customTypeName));
  const [editingDigital, setEditingDigital] = useState(false);
  const [editingCash, setEditingCash] = useState(false);
  const [digitalValue, setDigitalValue] = useState('');
  const [cashValue, setCashValue] = useState('');

  // NEW: Reapprovisionning dialog state
  const [showReapprovisionDialog, setShowReapprovisionDialog] = useState(false);
  const [reapprovisionType, setReapprovisionType] = useState<'cash' | 'digital'>('cash');
  const [reapprovisionAmount, setReapprovisionAmount] = useState('');
  const [reapprovisionSource, setReapprovisionSource] = useState<'apport' | 'virement'>('apport');
  const [isSubmittingReapprovision, setIsSubmittingReapprovision] = useState(false);

  // Load balance from accounting_entries (single source of truth)
  useEffect(() => {
    const loadBalance = async () => {
      const computed = await getTypeBalanceFromAccounting(transferType, customTypeName);
      setBalance({
        cash_balance: computed.cash_balance,
        digital_balance: computed.digital_balance,
      });
      console.log(`[BalanceHeader] Loaded computed balance for ${transferType}:`, computed);
    };
    loadBalance().catch(err => console.error('Error loading balance:', err));
  }, [transferType, customTypeName, refreshKey]);

  // Listen to global events to refresh balances when operations are recorded elsewhere
  useEffect(() => {
    const handler = async () => {
      const computed = await getTypeBalanceFromAccounting(transferType, customTypeName);
      setBalance({
        cash_balance: computed.cash_balance,
        digital_balance: computed.digital_balance,
      });
    };
    try {
      window.addEventListener('financials-updated', handler);
      window.addEventListener('ledger-updated', handler);
    } catch (e) {
      // ignore in non-browser env
    }
    return () => {
      try {
        window.removeEventListener('financials-updated', handler);
        window.removeEventListener('ledger-updated', handler);
      } catch (e) {
        // ignore
      }
    };
  }, [transferType, customTypeName]);

  const formatCurrency = (amount: number): string => {
    return amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleStartEditDigital = () => {
    setDigitalValue(balance.digital_balance.toString());
    setEditingDigital(true);
  };

  const handleStartEditCash = () => {
    setCashValue(balance.cash_balance.toString());
    setEditingCash(true);
  };

  const handleSaveDigital = () => {
    const newBalance = updateTypeBalance(transferType, customTypeName, {
      digital_balance: parseDecimalInput(digitalValue),
    });
    setBalance(newBalance);
    setEditingDigital(false);
    onBalanceChange?.();
  };

  const handleSaveCash = () => {
    const newBalance = updateTypeBalance(transferType, customTypeName, {
      cash_balance: parseDecimalInput(cashValue),
    });
    setBalance(newBalance);
    setEditingCash(false);
    onBalanceChange?.();
  };

  // NEW: Handle reapprovisionning dialog open
  const handleOpenReapprovisionDialog = (type: 'cash' | 'digital') => {
    setReapprovisionType(type);
    setReapprovisionAmount('');
    setReapprovisionSource('apport');
    setShowReapprovisionDialog(true);
  };

  // NEW: Handle reapprovisionning submission
  const handleSubmitReapprovision = async () => {
    try {
      const amount = parseDecimalInput(reapprovisionAmount);
      if (amount <= 0) {
        toast({
          description: 'Le montant doit être positif',
          variant: 'destructive'
        });
        return;
      }

      setIsSubmittingReapprovision(true);

      await updateBalanceWithEntry({
        transferType,
        customServiceName: customTypeName,
        balanceType: reapprovisionType,
        amount,
        sourceAccount: reapprovisionSource,
        description: `Réapprovisionnement ${reapprovisionType === 'cash' ? 'Cash' : 'Digital'}`
      });

      toast({
        description: `✅ Réapprovisionnement de ${formatCurrency(amount)} ${reapprovisionType === 'cash' ? 'Cash' : 'Digital'} enregistré`
      });

      setShowReapprovisionDialog(false);
      setReapprovisionAmount('');
    } catch (error) {
      console.error('Error submitting reapprovision:', error);
      toast({
        description: 'Erreur lors de l\'enregistrement',
        variant: 'destructive'
      });
    } finally {
      setIsSubmittingReapprovision(false);
    }
  };

  return (
    <>
      <div className="card-premium p-4 mb-6">
        <h3 className="text-sm font-semibold text-white mb-3 text-center">
          Soldes - {getTransferTypeName(transferType, customTypeName)}
        </h3>
        
        <div className="grid grid-cols-2 gap-4">
          {/* Digital Balance */}
          <div className="bg-muted/30 rounded-lg p-3">
            <div className="flex items-center gap-2 text-xs text-white mb-1">
              <CreditCard className="h-3 w-3" />
              <span>Argent numérique</span>
            </div>
            {editingDigital ? (
              <div className="flex items-center gap-1">
                <Input
                  type="text"
                  inputMode="decimal"
                  value={digitalValue}
                  onChange={(e) => setDigitalValue(e.target.value)}
                  className="h-8 text-sm bg-background"
                  autoFocus
                />
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleSaveDigital}>
                  <Check className="h-4 w-4 text-green-500" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingDigital(false)}>
                  <X className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-primary">
                  {formatCurrency(balance.digital_balance)} {settings.currency_symbol}
                </span>
                <div className="flex gap-1">
                  <Button 
                    size="icon" 
                    className="h-8 w-8 bg-blue-600 text-white font-bold rounded-lg shadow-md hover:bg-blue-700 hover:shadow-lg transition-all"
                    onClick={() => handleOpenReapprovisionDialog('digital')}
                    title="Ajouter des fonds"
                  >
                    <PlusCircle className="h-5 w-5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleStartEditDigital}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Cash Balance */}
          <div className="bg-muted/30 rounded-lg p-3">
            <div className="flex items-center gap-2 text-xs text-white mb-1">
              <Banknote className="h-3 w-3" />
              <span>Argent cash</span>
            </div>
            {editingCash ? (
              <div className="flex items-center gap-1">
                <Input
                  type="text"
                  inputMode="decimal"
                  value={cashValue}
                  onChange={(e) => setCashValue(e.target.value)}
                  className="h-8 text-sm bg-background"
                  autoFocus
                />
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleSaveCash}>
                  <Check className="h-4 w-4 text-green-500" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingCash(false)}>
                  <X className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-green-600">
                  {formatCurrency(balance.cash_balance)} {settings.currency_symbol}
                </span>
                <div className="flex gap-1">
                  <Button 
                    size="icon" 
                    className="h-8 w-8 bg-blue-600 text-white font-bold rounded-lg shadow-md hover:bg-blue-700 hover:shadow-lg transition-all"
                    onClick={() => handleOpenReapprovisionDialog('cash')}
                    title="Ajouter des espèces"
                  >
                    <PlusCircle className="h-5 w-5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleStartEditCash}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* NEW: Reapprovision Dialog */}
      <Dialog open={showReapprovisionDialog} onOpenChange={setShowReapprovisionDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>
              Réapprovisionnement {reapprovisionType === 'cash' ? '💰 Cash' : '📱 Digital'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Amount Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Montant à ajouter ({settings.currency_symbol})</label>
              <Input
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={reapprovisionAmount}
                onChange={(e) => setReapprovisionAmount(e.target.value)}
                className="text-lg font-bold"
                autoFocus
              />
            </div>

            {/* Source Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Source des fonds</label>
              <select
                value={reapprovisionSource}
                onChange={(e) => setReapprovisionSource(e.target.value as 'apport' | 'virement')}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
              >
                <option value="apport">🏦 Apport personnel (Compte 101)</option>
                <option value="virement">🔄 Virement interne (Compte 58)</option>
              </select>
            </div>

            {/* Info text */}
            <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
              ℹ️ Cette opération créera une écriture comptable pour tracer la source des fonds.
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowReapprovisionDialog(false)}
              disabled={isSubmittingReapprovision}
            >
              Annuler
            </Button>
            <Button
              type="button"
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={handleSubmitReapprovision}
              disabled={isSubmittingReapprovision || !reapprovisionAmount || parseDecimalInput(reapprovisionAmount) <= 0}
            >
              {isSubmittingReapprovision ? 'Enregistrement...' : 'Ajouter les fonds'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}