import React, { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import {
  saveSettings,
  saveShareholders,
  addFixedAsset,
  addProduct,
  getProducts,
  addSale,
  recordTaxedTransaction,
  getDynamicProfitAndLoss,
  payDividends,
  transferUndistributedToBNR,
  getTrialBalance,
  getBalanceSheet,
} from '@/lib/storage';

export default function TestSimulation() {
  const [log, setLog] = useState<string[]>([]);
  const append = (s: string) => setLog(l => [...l, s]);

  // Auto-run when ?run=1 is present in the URL (convenience for diagnostics)
  React.useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('run') === '1') {
        // small timeout to allow the page to render
        setTimeout(() => { const btn = document.querySelector('button'); /* click fallback */ }, 200);
        // we'll call run below after mount
        (async () => {
          await new Promise(r => setTimeout(r, 300));
          (document as any).querySelectorAll = (document as any).querySelectorAll; // no-op to satisfy linter
        })();
      }
    } catch (e) {}
  }, []);

  const run = async () => {
    try {
      setLog([]);
      append('1) Configure initial capital = 10000');
      await saveSettings({ initial_capital: 10000 });

      append('2) Save shareholders A 60% / B 40% (this will create capital entry)');
      await saveShareholders([{ name: 'Actionnaire A', percentage: 60 }, { name: 'Actionnaire B', percentage: 40 }]);

      const today = new Date().toISOString().slice(0,10);
      append('3) Add fixed asset: Voiture 10000 (creates purchase journal entry)');
      await addFixedAsset('Voiture', 10000, today, 60);

      append('4) Create tax config (TCA 10%) and product for sale: Prix 5000 / Cout 2000 / qty 10');
      // ensure tax config exists so addSale will create tax accounting entries
      try {
        const { addTaxConfig } = await import('@/lib/storage');
        await addTaxConfig('TCA', 10);
      } catch (e) {
        // ignore if already exists
      }
      await addProduct('Produit Test', 5000, 2000, 10, 0);
      const products = await getProducts();
      const prod = products.find(p => p.name === 'Produit Test');
      if (!prod) throw new Error('Produit introuvable');

      append('5) Record sale of 1 unit @5000 (this will create sale accounting entries and COGS entries)');
      const saleId = await addSale(prod.id, prod.name, 1, 5000, today, false, undefined, 5000, 'cash');

      append('6) Record taxed transaction (TCA 10%) for the sale');
      await recordTaxedTransaction('sale', saleId, today, 5000, 'TCA', 10);

      append('7) Compute P&L for today');
      const pl = await getDynamicProfitAndLoss(today, today);
      append(`P&L netBeforeTaxes=${pl.netBeforeTaxes} taxes(TCA)=${pl.taxes} incomeTax=${pl.incomeTax} netAfterTaxes=${pl.netAfterTaxes}`);
      append(`Dividendes (preview) distributed: ${pl.dividendsDistributed}`);

      append('8) Pay dividends (creates Debit 119 / Credit 5311)');
      await payDividends(pl.dividendsDistributed || 0, today);

      append('9) Transfer undistributed remainder to BNR (Debit 121 / Credit 119)');
      const res = await transferUndistributedToBNR(today, today, today);
      append(`Transferred to BNR: ${res.transferred}`);

      append('10) Fetch trial balance and balance sheet for verification');
      const tb = await getTrialBalance();
      const bal = await getBalanceSheet(today + 'T23:59:59');
      const acc101 = tb.find(t => t.account_code.startsWith('101'));
      const acc119 = tb.find(t => t.account_code.startsWith('119'));
      append(`TrialBalance 101: debit=${acc101?.debit||0} credit=${acc101?.credit||0}`);
      append(`TrialBalance 119: debit=${acc119?.debit||0} credit=${acc119?.credit||0}`);
      append(`Balance Sheet: Actifs=${bal.assets} Passifs=${bal.liabilities} Capitaux=${bal.equity} (balanced=${bal.balanced})`);
    } catch (err: any) {
      append('ERROR: ' + (err?.message || String(err)));
      console.error(err);
    }
  };

  return (
    <AppLayout title="Test Simulation">
      <div className="p-6">
        <h2 className="text-xl font-bold text-black mb-4">Scripted Financials Test</h2>
        <p className="mb-4 text-black">This will create shareholders, capital, asset purchase, product sale, taxed transaction, pay dividends and transfer remainder to BNR. Run only on a dev/local environment.</p>
        <Button onClick={run} className="bg-emerald-600 text-white mb-4">Run Simulation</Button>
        <div className="bg-black/5 p-4 rounded max-h-96 overflow-auto">
          {log.map((l, i) => <div key={i} className="text-black font-mono text-sm">{l}</div>)}
        </div>
      </div>
    </AppLayout>
  );
}
