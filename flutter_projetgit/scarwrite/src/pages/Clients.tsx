import { useEffect, useState } from 'react';
import type { ThirdParty, Sale } from '@/lib/database';
import { AppLayout } from '@/components/layout/AppLayout';
import { getThirdParties, getSales, getSettings, addOrUpdateThirdParty, createAccountingTransaction, deleteThirdParty, parseDecimalInput } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface ClientRow {
  id: string;
  name: string;
  balance: number;
  last_sale_date: string;
  last_product: string;
  status: string;
}

export default function Clients() {
  const { toast } = useToast();
  const [clients, setClients] = useState<ClientRow[]>([]);
  const settings = getSettings();

  useEffect(() => {
    const load = async () => {
      const all = await getThirdParties('client');
      // filter clients with positive balance (they owe us money)
      const debtors = all.filter(c => (c.balance || 0) > 0);

      // For each debtor, find last sale
      const enriched = await Promise.all(debtors.map(async (d: ThirdParty) => {
        // naive: search sales for client name
        const sales = (await getSales()).filter((s: Sale) => s.client_name && s.client_name.toLowerCase() === d.name.toLowerCase());
        const last = sales.sort((a,b) => new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime())[0];
        return {
          id: d.id,
          name: d.name,
          balance: d.balance,
          last_sale_date: last?.sale_date || '-',
          last_product: last?.product_name || '-',
          status: d.balance > 0 ? (d.balance === 0 ? 'Payé' : 'Non payé') : 'Payé',
        };
      }));
      setClients(enriched);
    };
    load();
    window.addEventListener('ledger-updated', load);
    return () => window.removeEventListener('ledger-updated', load);
  }, []);

  const handleRecouvrement = async (client: ClientRow) => {
    try {
      const product = window.prompt('Nom du produit (optionnel):', '') || '';
      const date = window.prompt('Date (YYYY-MM-DD):', new Date().toISOString().slice(0,10)) || new Date().toISOString().slice(0,10);
      const amountStr = window.prompt('Montant payé:', '0') || '0';
      const paid = parseDecimalInput(amountStr);
      if (paid <= 0) {
        toast({ title: 'Montant invalide', variant: 'destructive' });
        return;
      }

      // Reduce client balance by paid amount (store negative delta)
      const updated = await addOrUpdateThirdParty(client.name, 'client', -paid);

      // Record accounting entries: Debit Caisse (53), Credit Clients (4110)
      await createAccountingTransaction([
        { journal_date: date, transaction_type: 'recouvrement', account_code: '5311', account_name: 'Caisse Centrale', debit: paid, credit: 0, description: `Recouvrement ${product} - ${client.name}` },
        { journal_date: date, transaction_type: 'recouvrement', account_code: '4110', account_name: 'Clients', debit: 0, credit: paid, description: `Recouvrement ${product} - ${client.name}` },
      ]);

      if ((updated.balance || 0) <= 0) {
        // remove client record if fully paid
        await deleteThirdParty(updated.id);
        toast({ title: `Client supprimé (solde soldé): ${client.name}` });
      } else {
        toast({ title: `Recouvrement enregistré: ${paid.toFixed(2)} ${settings.currency_symbol}` });
      }
      // refresh list
      const all = await getThirdParties('client');
      const debtors = all.filter(c => (c.balance || 0) > 0);
      const enriched = await Promise.all(debtors.map(async (d: ThirdParty) => {
        const sales = (await getSales()).filter((s: Sale) => s.client_name && s.client_name.toLowerCase() === d.name.toLowerCase());
        const last = sales.sort((a,b) => new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime())[0];
        return { id: d.id, name: d.name, balance: d.balance, last_sale_date: last?.sale_date || '-', last_product: last?.product_name || '-', status: d.balance > 0 ? (d.balance === 0 ? 'Payé' : 'Non payé') : 'Payé' };
      }));
      setClients(enriched);
    } catch (err) {
      console.error(err);
      toast({ title: 'Erreur recouvrement', variant: 'destructive' });
    }
  };

  return (
    <AppLayout title="Clients">
      <div className="space-y-6 max-w-4xl">
        <div className="card-premium p-6 flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-card-foreground">Gestion des Clients</h1>
            <p className="text-sm text-muted-foreground mt-2">Suivi des dettes et gestion des ventes à crédit</p>
          </div>
          <div>
            <Button onClick={() => window.location.reload()}>Rafraîchir</Button>
          </div>
        </div>

        <div className="card-premium p-6">
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left text-black font-bold">Nom du Client</th>
                <th className="text-left text-black font-bold">Date de l'achat</th>
                <th className="text-left text-black font-bold">Produit</th>
                <th className="text-right text-black font-bold">Montant dû</th>
                <th className="text-left text-black font-bold">Statut</th>
                <th className="text-left text-black font-bold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {clients.map(c => (
                <tr key={c.id}>
                  <td className="text-black">{c.name}</td>
                  <td className="text-black">{c.last_sale_date}</td>
                  <td className="text-black">{c.last_product}</td>
                  <td className="text-right text-black font-bold">{Number(c.balance).toFixed(2)} {settings.currency_symbol}</td>
                  <td className="text-black">{c.status}</td>
                  <td>
                    <Button onClick={() => handleRecouvrement(c)}>Recouvrement</Button>
                  </td>
                </tr>
              ))}
              {clients.length === 0 && (
                <tr><td colSpan={6} className="text-center py-6 text-muted-foreground">Aucun client débiteur</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}
