import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { parseDecimalInput, createAccountingTransaction, addOrUpdateThirdParty, getSettings, addAccount } from '@/lib/storage';
import { AccountCombobox } from '@/components/ui/account-combobox';

interface ExpenseFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function ExpenseForm({ onClose, onSuccess }: ExpenseFormProps) {
  const { toast } = useToast();
  const settings = getSettings();
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [isCredit, setIsCredit] = useState(false);
  const [downPayment, setDownPayment] = useState('');
  const [thirdPartyName, setThirdPartyName] = useState('');
  const [expenseAccount, setExpenseAccount] = useState<string>('601');
  const [paymentAccount, setPaymentAccount] = useState<string>('5311');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseDecimalInput(amount);
    if (amt <= 0) {
      toast({ title: 'Erreur', description: 'Montant invalide', variant: 'destructive' });
      return;
    }
    if (isCredit && !thirdPartyName.trim()) {
      toast({ title: 'Erreur', description: 'Nom du fournisseur requis pour charge à crédit', variant: 'destructive' });
      return;
    }

    // If credit with down payment, validate down payment
    let cashPaid = amt;
    let creditAmount = 0;
    
    if (isCredit) {
      const downPaymentAmount = downPayment ? parseDecimalInput(downPayment) : 0;
      if (downPaymentAmount < 0 || downPaymentAmount > amt) {
        toast({ title: 'Erreur', description: 'Acompte invalide', variant: 'destructive' });
        return;
      }
      cashPaid = downPaymentAmount;
      creditAmount = amt - downPaymentAmount;
    }

    try {
      const date = new Date().toISOString().slice(0,10);
      const entries: Array<{
        journal_date: string;
        transaction_type: string;
        account_code: string;
        account_name: string;
        debit?: number;
        credit?: number;
        description?: string;
      }> = [];

      // Debit selected expense account
      entries.push({
        journal_date: date,
        transaction_type: 'expense',
        account_code: expenseAccount || '601',
        account_name: 'Dépense',
        debit: amt,
        credit: 0,
        description: `Achat: ${description}`,
      });

      if (isCredit && creditAmount > 0) {
        // Credit Caisse 53 (cash payment - acompte)
        if (cashPaid > 0) {
          entries.push({
            journal_date: date,
            transaction_type: 'expense',
            account_code: paymentAccount || '5311',
            account_name: 'Caisse',
            debit: 0,
            credit: cashPaid,
            description: `Paiement comptant: ${description}`,
          });
        }
        
        // Credit Fournisseurs 401 (remaining debt)
        entries.push({
          journal_date: date,
          transaction_type: 'expense',
          account_code: '401',
          account_name: 'Fournisseurs',
          debit: 0,
          credit: creditAmount,
          description: `Dette fournisseur (${thirdPartyName}): ${description}`,
        });
      } else {
        // Full payment - Credit Caisse 53
        entries.push({
          journal_date: date,
          transaction_type: 'expense',
          account_code: paymentAccount || '5311',
          account_name: 'Caisse',
          debit: 0,
          credit: amt,
          description: `Paiement comptant: ${description}`,
        });
      }

      await createAccountingTransaction(entries);

      if (isCredit && creditAmount > 0) {
        // Update supplier balance (we owe them)
        await addOrUpdateThirdParty(thirdPartyName.trim(), 'supplier', creditAmount);
      }

      toast({ 
        title: 'Charge enregistrée', 
        description: `${amt.toFixed(2)} ${settings.currency_symbol}${isCredit && creditAmount > 0 ? ` (Acompte: ${cashPaid.toFixed(2)}, Dette: ${creditAmount.toFixed(2)})` : ''}` 
      });
      onSuccess();
    } catch (err) {
      console.error(err);
      toast({ title: 'Erreur', description: 'Impossible d\'enregistrer la charge', variant: 'destructive' });
    }
  };

  const totalAmount = parseDecimalInput(amount) || 0;
  const downPaymentAmount = downPayment ? parseDecimalInput(downPayment) : 0;
  const creditBalance = Math.max(0, totalAmount - downPaymentAmount);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label className="font-semibold text-white">Description</Label>
        <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex: Facture EDH" className="bg-background border-slate-400 text-white" />
      </div>

      <div className="space-y-2">
        <Label className="font-semibold text-white">Montant Total</Label>
        <Input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Ex: 1500" className="bg-background border-slate-400 text-white" />
      </div>

      <div className="flex items-center gap-2">
        <Checkbox id="credit-expense" checked={isCredit} onCheckedChange={(v) => setIsCredit(!!v)} />
        <Label htmlFor="credit-expense" className="font-semibold text-white">À Crédit</Label>
      </div>

      {isCredit && (
        <>
          <div className="space-y-2">
            <Label className="font-semibold text-white">Acompte versé (Comptant)</Label>
            <Input 
              value={downPayment} 
              onChange={(e) => setDownPayment(e.target.value)} 
              placeholder="Ex: 4000 (optionnel)" 
              className="bg-background border-slate-400 text-white" />
            />
            {totalAmount > 0 && (
              <p className="text-xs text-slate-600">
                Montant total: {totalAmount.toFixed(2)} {settings.currency_symbol} | 
                Acompte: {downPaymentAmount.toFixed(2)} {settings.currency_symbol} | 
                Reste dû: {creditBalance.toFixed(2)} {settings.currency_symbol}
              </p>
            )}
          </div>

              <div className="space-y-2">
                <Label className="font-semibold text-white">Nom du fournisseur</Label>
                <Input value={thirdPartyName} onChange={(e) => setThirdPartyName(e.target.value)} placeholder="Nom du fournisseur..." className="bg-background border-slate-400 text-white" />
              </div>
        </>
      )}

          <div className="space-y-2 mt-2">
            <Label className="font-semibold text-white">Compte de charge</Label>
            <AccountCombobox value={expenseAccount} onChange={(code) => setExpenseAccount(code || '601')} onCreate={async (typed) => {
              const code = typed.trim();
              const name = await Promise.resolve(window.prompt('Intitulé du compte pour ' + code, code) || code);
              await addAccount(code, name);
              setExpenseAccount(code);
            }} />
          </div>

          <div className="space-y-2 mt-2">
            <Label className="font-semibold text-white">Compte paiement</Label>
            <AccountCombobox value={paymentAccount} onChange={(code) => setPaymentAccount(code || '5311')} onCreate={async (typed) => {
              const code = typed.trim();
              const name = await Promise.resolve(window.prompt('Intitulé du compte pour ' + code, code) || code);
              await addAccount(code, name);
              setPaymentAccount(code);
            }} />
          </div>

      <div className="flex gap-2">
        <Button type="submit" className="bg-primary text-primary-foreground">Enregistrer la charge</Button>
        <Button type="button" variant="ghost" onClick={onClose}>Annuler</Button>
      </div>
    </form>
  );
}
