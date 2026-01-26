import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { parseDecimalInput, createAccountingTransaction, addOrUpdateThirdParty, getSettings } from '@/lib/storage';

interface TransactionFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function TransactionForm({ onClose, onSuccess }: TransactionFormProps) {
  const { toast } = useToast();
  const settings = getSettings();
  const [active, setActive] = useState<'A'|'B'|'C'|'D'>('A');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [creditAmount, setCreditAmount] = useState('');
  const [isCredit, setIsCredit] = useState(false);
  const [thirdPartyName, setThirdPartyName] = useState('');
  const [senderName, setSenderName] = useState('');
  const [receiverName, setReceiverName] = useState('');
  const [showCashBalances, setShowCashBalances] = useState(true);
  const [showDigitalBalances, setShowDigitalBalances] = useState(true);

  // mapping of groups to default debit/credit accounts
  interface GroupCfg { label: string; debit: string; debit_name: string; credit?: string; credit_name?: string; tierType: 'supplier' | 'client' | string }
  const groupConfig: Record<string, GroupCfg> = {
    A: { label: "Charges d'Exploitation", debit: '6010', debit_name: 'Dépenses courantes', tierType: 'supplier' },
    B: { label: 'Achats de Matériel', debit: '2150', debit_name: 'Immobilisations', tierType: 'supplier' },
    C: { label: 'Produits & Revenus', debit: '5311', debit_name: 'Caisse Centrale', credit: '7010', credit_name: 'Ventes', tierType: 'client' },
    D: { label: 'Apports & Autres', debit: '5311', debit_name: 'Caisse Centrale', credit: '1010', credit_name: 'Apports', tierType: 'client' },
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseDecimalInput(amount);
    if (amt <= 0) {
      toast({ title: 'Erreur', description: 'Montant invalide', variant: 'destructive' });
      return;
    }
    if (isCredit && !thirdPartyName.trim()) {
      toast({ title: 'Erreur', description: 'Nom du Tiers requis', variant: 'destructive' });
      return;
    }
    if (!senderName.trim()) {
      toast({ title: 'Erreur', description: 'Nom de l\'expéditeur requis', variant: 'destructive' });
      return;
    }
    if (!receiverName.trim()) {
      toast({ title: 'Erreur', description: 'Nom du bénéficiaire requis', variant: 'destructive' });
      return;
    }

    try {
      const date = new Date().toISOString().slice(0,10);
      const cfg = groupConfig[active];
      const entries: Array<{
        journal_date: string;
        transaction_type: string;
        account_code: string;
        account_name: string;
        debit?: number;
        credit?: number;
        description?: string;
      }> = [];

      // When group is C or D (revenues/apports) we often credit revenue/capital and debit cash/client
      if (active === 'C' || active === 'D') {
        if (isCredit) {
          const creditAmt = parseDecimalInput(creditAmount || amount);
          if (creditAmt <= 0) {
            toast({ title: 'Erreur', description: 'Montant crédit invalide', variant: 'destructive' });
            return;
          }
          // Debit client (4110)
          entries.push({
            journal_date: date,
            transaction_type: 'transaction',
            account_code: '4110',
            account_name: 'Clients',
            debit: creditAmt,
            credit: 0,
            description: `${cfg.label} - Client: ${thirdPartyName} - ${description}`,
          });

          // Credit revenue account (707 for ventes à crédit)
          const creditAccount = active === 'C' ? '707' : (cfg.credit || cfg.debit);
          const creditName = active === 'C' ? 'Ventes' : (cfg.credit_name || cfg.debit_name);
          entries.push({
            journal_date: date,
            transaction_type: 'transaction',
            account_code: creditAccount,
            account_name: creditName,
            debit: 0,
            credit: creditAmt,
            description,
          });

          // update client balance
          await addOrUpdateThirdParty(thirdPartyName.trim(), 'client', creditAmt);
        } else {
          // cash sale/apport: debit cash, credit revenue/capital
          entries.push({
            journal_date: date,
            transaction_type: 'transaction',
            account_code: cfg.debit,
            account_name: cfg.debit_name,
            debit: amt,
            credit: 0,
            description,
          });
          const creditAccount = cfg.credit || (active === 'C' ? '7010' : '1010');
          const creditName = cfg.credit_name || (active === 'C' ? 'Ventes' : 'Apports');
          entries.push({
            journal_date: date,
            transaction_type: 'transaction',
            account_code: creditAccount,
            account_name: creditName,
            debit: 0,
            credit: amt,
            description,
          });
        }
      } else {
        // Groups A or B: expense or asset purchase
        // Debit chosen account (expense or asset)
        entries.push({
          journal_date: date,
          transaction_type: 'transaction',
          account_code: cfg.debit,
          account_name: cfg.debit_name,
          debit: amt,
          credit: 0,
          description,
        });

        if (isCredit) {
          // Credit suppliers (4010)
          entries.push({
            journal_date: date,
            transaction_type: 'transaction',
            account_code: '4010',
            account_name: 'Fournisseurs',
            debit: 0,
            credit: amt,
            description: `Dette fournisseur: ${thirdPartyName}`,
          });

          await addOrUpdateThirdParty(thirdPartyName.trim(), 'supplier', amt);
        } else {
          // Credit cash
          entries.push({
            journal_date: date,
            transaction_type: 'transaction',
            account_code: '5311',
            account_name: 'Caisse Centrale',
            debit: 0,
            credit: amt,
            description,
          });
        }
      }

      await createAccountingTransaction(entries);

      toast({ title: 'Opération enregistrée', description: `${amt.toFixed(2)} ${settings.currency_symbol}` });
      onSuccess();
    } catch (err) {
      console.error(err);
      toast({ title: 'Erreur', description: 'Impossible d\'enregistrer l\'opération', variant: 'destructive' });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Tabs value={active} onValueChange={(v) => setActive(v as 'A'|'B'|'C'|'D')}>
        <TabsList>
          <TabsTrigger value="A">Charges</TabsTrigger>
          <TabsTrigger value="B">Matériel</TabsTrigger>
          <TabsTrigger value="C">Produits</TabsTrigger>
          <TabsTrigger value="D">Apports</TabsTrigger>
        </TabsList>

        <TabsContent value="A" className="pt-4">
          <div className="space-y-2">
            <Label className="font-semibold text-white">Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex: Loyer" className="bg-background border-slate-400 text-white" />
          </div>
        </TabsContent>

        <TabsContent value="B" className="pt-4">
          <div className="space-y-2">
            <Label className="font-semibold text-white">Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex: Achat d'ordinateur" className="bg-background border-slate-400 text-white" />
          </div>
        </TabsContent>

        <TabsContent value="C" className="pt-4">
          <div className="space-y-2">
            <Label className="font-semibold text-white">Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex: Vente de repas" className="bg-background border-slate-400 text-white" />
          </div>
        </TabsContent>

        <TabsContent value="D" className="pt-4">
          <div className="space-y-2">
            <Label className="font-semibold text-white">Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex: Apport du gérant" className="bg-background border-slate-400 text-white" />
          </div>
        </TabsContent>
      </Tabs>

      <div className="space-y-2">
        <Label className="font-semibold text-white">Montant</Label>
        <Input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Ex: 1500" className="bg-background border-slate-400 text-white" />
      </div>

      <div className="flex items-center gap-2">
        <Checkbox id="credit-transaction" checked={isCredit} onCheckedChange={(v) => setIsCredit(!!v)} />
        <Label htmlFor="credit-transaction" className="font-semibold text-white">À Crédit</Label>
      </div>

      {isCredit && (
        <div className="space-y-2">
          <Label className="font-semibold text-white">Nom du Tiers (Obligatoire)</Label>
          <Input value={thirdPartyName} onChange={(e) => setThirdPartyName(e.target.value)} placeholder="Nom du client ou fournisseur..." className="bg-background border-slate-400 text-white" />
        </div>
      )}

      {isCredit && (
        <div className="space-y-2 mt-2">
          <Label className="font-semibold text-white">Montant Crédit</Label>
          <Input value={creditAmount} onChange={(e) => setCreditAmount(e.target.value)} placeholder="Montant attribué au crédit" className="bg-background border-slate-400 text-white" />
          <p className="text-xs text-muted-foreground">Pour les ventes à crédit, ce montant sera enregistré en compte Clients (411) et en produit (707).</p>
        </div>
      )}

      {/* Sender and Receiver names */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="font-semibold text-white">👤 Nom de l'expéditeur</Label>
          <Input value={senderName} onChange={(e) => setSenderName(e.target.value)} placeholder="Expéditeur" className="bg-background border-slate-400 text-white" required />
        </div>
        <div className="space-y-2">
          <Label className="font-semibold text-white">👤 Nom du bénéficiaire</Label>
          <Input value={receiverName} onChange={(e) => setReceiverName(e.target.value)} placeholder="Bénéficiaire" className="bg-background border-slate-400 text-white" required />
        </div>
      </div>

      {/* Display options for before/after */}
      <div className="p-4 rounded-lg bg-card border border-border space-y-3">
        <h3 className="text-sm font-semibold text-white">Afficher les soldes</h3>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex items-center gap-2">
            <Checkbox checked={showCashBalances} onCheckedChange={(v) => setShowCashBalances(!!v)} />
            <span className="text-sm font-semibold text-white">Soldes Cash</span>
          </label>
          <label className="flex items-center gap-2">
            <Checkbox checked={showDigitalBalances} onCheckedChange={(v) => setShowDigitalBalances(!!v)} />
            <span className="text-sm font-semibold text-white">Soldes Numérique</span>
          </label>
        </div>
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={isCredit && !thirdPartyName.trim()}>Enregistrer</Button>
        <Button type="button" variant="ghost" onClick={onClose}>Annuler</Button>
      </div>
    </form>
  );
}
