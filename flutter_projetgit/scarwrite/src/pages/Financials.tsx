import React, { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// Removed Radix tooltips to avoid runtime issues inside charts/UI
import { HelpCircle } from '@/lib/lucide-react';
import { getDynamicProfitAndLoss, getRetainedEarnings, getBalanceSheet, createAccountingTransaction, addFixedAsset, calculateTaxesFromAccounting } from '@/lib/storage';
import { payDividends, transferUndistributedToBNR } from '@/lib/storage';
import jsPDF from 'jspdf';
import { downloadPDF } from '@/lib/pdf';

export default function Financials({ onClose }: { onClose?: () => void }) {
  const [tab, setTab] = useState<'pl' | 'bnr' | 'bilan'>('pl');
  const [startDate, setStartDate] = useState<string>(new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0,10));
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().slice(0,10));
  const [pl, setPl] = useState<any>(null);
  const [bnr, setBnr] = useState<any>(null);
  const [bal, setBal] = useState<any>(null);
  const [showNewCharge, setShowNewCharge] = useState(false);

  const load = async () => {
    try {
      const p = await getDynamicProfitAndLoss(startDate, endDate);
      setPl(p);
      const b = await getRetainedEarnings(startDate, endDate);
      setBnr(b);
      const bs = await getBalanceSheet(endDate + 'T23:59:59');
      setBal(bs);
    } catch (e) {
      console.error('Erreur chargement états financiers:', e);
    }
  };

  useEffect(() => {
    load();
  }, [startDate, endDate]);

  useEffect(() => {
    const handler = () => load();
    window.addEventListener('financials-updated', handler as any);
    return () => window.removeEventListener('financials-updated', handler as any);
  }, []);

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text('États Financiers', 14, 20);
    if (tab === 'pl' && pl) {
      doc.setFontSize(12);
      doc.text(`P&L ${startDate} → ${endDate}`, 14, 32);
      doc.text(`CA produits: ${pl.revenuesProducts || 0}`, 14, 44);
      doc.text(`CA services: ${pl.revenuesServices || 0}`, 14, 50);
      doc.text(`CMV: (calculé depuis achats)`, 14, 56);
      doc.text(`Amortissement (simulé): ${pl.amortization || 0}`, 14, 62);
      doc.text(`Charges: ${pl.expenses || 0}`, 14, 68);
      doc.text(`Résultat net: ${pl.netAfterTaxes || 0}`, 14, 74);
    }
    if (tab === 'bnr' && bnr) {
      doc.text(`BNR`, 14, 32);
      doc.text(`Ouverture: ${bnr.opening || 0}`, 14, 44);
      doc.text(`Résultat période: ${bnr.netIncome || 0}`, 14, 50);
      doc.text(`Dividendes: ${bnr.dividends || 0}`, 14, 56);
      doc.text(`Clôture: ${bnr.closing || 0}`, 14, 62);
    }
    if (tab === 'bilan' && bal) {
      doc.text(`Bilan au ${endDate}`, 14, 32);
      doc.text(`Actifs: ${bal.assets || 0}`, 14, 44);
      doc.text(`Passifs: ${bal.liabilities || 0}`, 14, 50);
      doc.text(`Capitaux: ${bal.equity || 0}`, 14, 56);
    }
    downloadPDF(doc, `etats-${tab}-${startDate}-to-${endDate}.pdf`);
  };

  return (
    <div className="fixed inset-0 z-50 bg-white overflow-auto">
      <AppLayout title="États Financiers">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold">États Financiers</h1>
              <p className="text-sm text-gray-600">Période</p>
            </div>
            <div className="flex items-center gap-2">
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="p-2 border rounded" />
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="p-2 border rounded" />
              <Button onClick={exportPDF} className="bg-blue-700 text-white">⬇️ Export PDF</Button>
              <Button onClick={() => { if (onClose) onClose(); else window.dispatchEvent(new CustomEvent('close-financials')); }} className="bg-slate-700 text-white">✖️ Fermer</Button>
            </div>
          </div>

          <div className="mb-4">
            <Button onClick={() => setTab('pl')} className={`${tab === 'pl' ? 'bg-yellow-500 text-black' : 'bg-slate-200 text-black'}`}>📊 État des Résultats</Button>
            <Button onClick={() => setTab('bnr')} className={`${tab === 'bnr' ? 'bg-yellow-500 text-black' : 'bg-slate-200 text-black'} ml-2`}>📈 BNR</Button>
            <Button onClick={() => setTab('bilan')} className={`${tab === 'bilan' ? 'bg-yellow-500 text-black' : 'bg-slate-200 text-black'} ml-2`}>⚖️ Bilan</Button>
          </div>

          {tab === 'pl' && (
            <div className="space-y-6">
              {/* 1. Performance Opérationnelle */}
              <Card>
                <CardHeader>
                  <CardTitle>1. Performance Opérationnelle</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="w-full overflow-x-auto">
                    <table className="w-full text-sm table-auto">
                      <thead>
                        <tr className="text-left text-xs text-muted-foreground border-b">
                          <th className="py-2">Libellé</th>
                          <th className="py-2 text-right">Montant</th>
                          <th className="py-2 text-right">% du CA</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="py-2">Chiffre d'Affaires (Ventes de produits)</td>
                          <td className="py-2 text-right font-mono text-black">{(pl?.revenuesProducts ?? 0).toFixed(2)}</td>
                          <td className="py-2 text-right font-mono text-black">{pl?.totalRevenues ? ((pl.revenuesProducts / pl.totalRevenues) * 100).toFixed(1) + '%' : '—'}</td>
                        </tr>
                        <tr>
                          <td className="py-2">Chiffre d'Affaires (Prestations / Services)</td>
                          <td className="py-2 text-right font-mono text-black">{(pl?.revenuesServices ?? 0).toFixed(2)}</td>
                          <td className="py-2 text-right font-mono text-black">{pl?.totalRevenues ? ((pl.revenuesServices / pl.totalRevenues) * 100).toFixed(1) + '%' : '—'}</td>
                        </tr>
                        <tr>
                          <td className="py-2">Frais & Commissions (7xx)</td>
                          <td className="py-2 text-right font-mono text-black">{(pl?.feesAndCommissions ?? 0).toFixed(2)}</td>
                          <td className="py-2 text-right font-mono text-black">{pl?.totalRevenues ? ((pl.feesAndCommissions / pl.totalRevenues) * 100).toFixed(1) + '%' : '—'}</td>
                        </tr>
                        <tr className="border-t bg-blue-50 font-semibold">
                          <td className="py-2">MARGE BRUTE</td>
                          <td className="py-2 text-right font-mono text-black">{((pl?.totalRevenues ?? 0) - (pl?.cmv ?? 0)).toFixed(2)}</td>
                          <td className="py-2 text-right font-mono text-black">{pl?.totalRevenues ? (((pl.totalRevenues - (pl.cmv||0)) / pl.totalRevenues) * 100).toFixed(1) + '%' : '—'}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* 2. Charges & Amortissements */}
              <Card>
                <CardHeader>
                  <CardTitle>2. Charges & Amortissements</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="w-full overflow-x-auto">
                    <table className="w-full text-sm table-auto">
                      <thead>
                        <tr className="text-left text-xs text-muted-foreground border-b">
                          <th className="py-2">Libellé</th>
                          <th className="py-2 text-right">Montant</th>
                          <th className="py-2 text-right">% du CA</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="py-2">Charges d'exploitation (6xx)</td>
                          <td className="py-2 text-right font-mono text-black">{(pl?.expenses ?? 0).toFixed(2)}</td>
                          <td className="py-2 text-right font-mono text-black">{pl?.totalRevenues ? ((pl.expenses / pl.totalRevenues) * 100).toFixed(1) + '%' : '—'}</td>
                        </tr>
                        <tr>
                          <td className="py-2 pl-6 text-sm text-muted-foreground">• Dotations aux amortissements (simulé)</td>
                          <td className="py-2 text-right font-mono text-black">{(pl?.amortization ?? 0).toFixed(2)}</td>
                          <td className="py-2 text-right font-mono text-black">{pl?.totalRevenues ? ((pl.amortization / pl.totalRevenues) * 100).toFixed(1) + '%' : '—'}</td>
                        </tr>
                        <tr className="border-t">
                          <td className="py-2 font-semibold">TOTAL CHARGES</td>
                          <td className="py-2 text-right font-mono text-black">{((pl?.expenses ?? 0)).toFixed(2)}</td>
                          <td className="py-2 text-right font-mono text-black">{pl?.totalRevenues ? (((pl.expenses) / pl.totalRevenues) * 100).toFixed(1) + '%' : '—'}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* 3. Résultat Net & Fiscalité */}
              <Card>
                <CardHeader>
                  <CardTitle>3. Résultat Net & Fiscalité</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="w-full overflow-x-auto">
                    <table className="w-full text-sm table-auto">
                      <thead>
                        <tr className="text-left text-xs text-muted-foreground border-b">
                          <th className="py-2">Libellé</th>
                          <th className="py-2 text-right">Montant</th>
                          <th className="py-2 text-right">% du CA</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="py-2">Coût des Marchandises Vendues (CMV)</td>
                          <td className="py-2 text-right font-mono text-black">{(pl?.cmv ?? 0).toFixed(2)}</td>
                          <td className="py-2 text-right font-mono text-black">{pl?.totalRevenues ? ((pl.cmv / pl.totalRevenues) * 100).toFixed(1) + '%' : '—'}</td>
                        </tr>
                        <tr>
                          <td className="py-2">Résultat d'exploitation</td>
                          <td className="py-2 text-right font-mono text-black">{(pl?.netBeforeTaxes ?? 0).toFixed(2)}</td>
                          <td className="py-2 text-right font-mono text-black">{pl?.totalRevenues ? ((pl.netBeforeTaxes / pl.totalRevenues) * 100).toFixed(1) + '%' : '—'}</td>
                        </tr>
                        <tr>
                          <td className="py-2 flex items-center gap-2">Taxes collectées (TCA)
                            <span title="Les TCA sont extraites du module Fiscalité (registre des taxes collectées sur ventes)." className="inline-flex items-center"><HelpCircle className="w-4 h-4 text-muted-foreground"/></span>
                          </td>
                          <td className="py-2 text-right font-mono text-black">{(pl?.taxes ?? 0).toFixed(2)}</td>
                          <td className="py-2 text-right font-mono text-black">{pl?.totalRevenues ? ((pl.taxes / pl.totalRevenues) * 100).toFixed(1) + '%' : '—'}</td>
                        </tr>
                        <tr>
                          <td className="py-2 flex items-center gap-2">Impôt sur le résultat
                            <span title="Impôt simulé calculé automatiquement (taux utilisé: 30% par défaut)." className="inline-flex items-center"><HelpCircle className="w-4 h-4 text-muted-foreground"/></span>
                          </td>
                          <td className="py-2 text-right font-mono text-black">{(pl?.incomeTax ?? 0).toFixed(2)}</td>
                          <td className="py-2 text-right font-mono text-black">{pl?.totalRevenues ? ((pl.incomeTax / pl.totalRevenues) * 100).toFixed(1) + '%' : '—'}</td>
                        </tr>
                        <tr className="border-t bg-gradient-gold">
                          <td className="py-3 font-bold">BÉNÉFICE NET (APRÈS IMPÔTS)</td>
                          <td className={`py-3 text-right font-mono text-xl ${pl?.netAfterTaxes >= 0 ? 'text-emerald-800' : 'text-rose-700'}`} style={{fontWeight:700}}>{(pl?.netAfterTaxes ?? 0).toFixed(2)}</td>
                          <td className="py-3 text-right font-mono text-black">{pl?.totalRevenues ? ((pl.netAfterTaxes / pl.totalRevenues) * 100).toFixed(1) + '%' : '—'}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-4 flex gap-3">
                    <Button onClick={() => setShowNewCharge(true)} className="bg-emerald-600 text-white">+ Nouvelle Charge/Investissement</Button>
                    <Button onClick={async () => { try { await payDividends(pl?.dividendsDistributed || 0); await load(); alert('Dividendes payés'); } catch(e){ alert('Erreur paiement dividendes'); } }} className="bg-rose-600 text-white">Payer les dividendes</Button>
                    <Button onClick={async () => { try { const res = await transferUndistributedToBNR(startDate, endDate); await load(); alert(`Transféré aux BNR: ${res.transferred}`); } catch(e){ alert('Erreur affectation BNR'); } }} className="bg-slate-700 text-white">Affecter reste aux BNR</Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* New Charge / Investment Modal */}
          {showNewCharge && (
            <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/40">
              <div className="bg-white rounded shadow-lg w-full max-w-2xl p-6">
                <h3 className="text-lg font-bold mb-4 text-black">Nouvelle Charge / Investissement</h3>
                <NewChargeModal onClose={() => setShowNewCharge(false)} onSaved={async () => { setShowNewCharge(false); await load(); try { window.dispatchEvent(new Event('ledger-updated')); window.dispatchEvent(new Event('financials-updated')); } catch(e){} }} />
              </div>
            </div>
          )}

          {tab === 'bnr' && (
            <Card>
              <CardHeader>
                <CardTitle>État des Bénéfices (BNR)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-4 text-black">
                  <div className="flex justify-between mb-2"><span>Ouverture</span><span className="font-mono">{bnr?.opening ?? 0}</span></div>
                  <div className="flex justify-between mb-2"><span>Résultat période</span><span className="font-mono">{bnr?.netIncome ?? 0}</span></div>
                  <div className="flex justify-between mb-2"><span>Dividendes</span><span className="font-mono">{bnr?.dividends ?? 0}</span></div>
                  <div className="flex justify-between font-bold"><span>Clôture</span><span className="font-mono">{bnr?.closing ?? 0}</span></div>
                </div>
              </CardContent>
            </Card>
          )}

          {tab === 'bilan' && (
            <Card>
              <CardHeader>
                <CardTitle>Bilan</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 text-black">
                    <h4 className="font-semibold">ACTIF</h4>
                    <div className="mt-2 font-mono">Total Actifs: {bal?.assets ?? 0}</div>
                  </div>
                  <div className="p-4 text-black">
                    <h4 className="font-semibold">PASSIF + CAPITAUX PROPRES</h4>
                    <div className="mt-2 font-mono">Total Passifs: {bal?.liabilities ?? 0}</div>
                    <div className="mt-2 font-mono">Fournisseurs (401): {bal?.passif401 ?? 0}</div>
                    <div className="mt-2 font-mono">Capital social (101): {bal?.apports ?? 0}</div>
                    <div className="mt-2 font-mono">Résultat Net / BNR: {bal?.resultNet ?? bal?.bnr ?? 0}</div>
                    <div className="mt-2 font-mono">Total Capitaux: {bal?.equity ?? 0}</div>
                    <div className="mt-3 text-sm font-mono">Identité comptable: <span className="font-semibold">{bal?.balanced ? 'OK' : 'NON'}</span> (écart: {bal?.discrepancy ?? 0})</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

        </div>
      </AppLayout>
    </div>
  );
}

function NewChargeModal({ onClose, onSaved }: { onClose?: () => void; onSaved?: () => Promise<void> | void }) {
  const [type, setType] = useState<'charge' | 'investment'>('charge');
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<'cash' | 'digital'>('cash');
  const [lifeYears, setLifeYears] = useState<number>(1);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const journalDate = new Date().toISOString().slice(0,10);
      const paidAccount = paymentMode === 'cash' ? '5311' : '517';

      if (type === 'charge') {
        // Debit expense (6xx) / Credit cash/bank
        const entries = [
          { journal_date: journalDate, transaction_type: 'expense', account_code: '601', account_name: label || 'Charge', debit: amount, credit: 0, description: label },
          { journal_date: journalDate, transaction_type: 'expense', account_code: paidAccount, account_name: paymentMode === 'cash' ? 'Caisse' : 'Argent Numérique', debit: 0, credit: amount, description: `Paiement charge: ${label}` },
        ];
        await createAccountingTransaction(entries as any);
      } else {
        // Investment/Asset: add fixed asset (creates purchase journal entry inside)
        const purchaseDate = journalDate;
        const lifeMonths = Math.max(1, Math.round(lifeYears * 12));
        await addFixedAsset(label || 'Immobilisation', amount, purchaseDate, lifeMonths, paidAccount);
      }

      if (onSaved) await onSaved();
      try { if (onClose) onClose(); } catch(e){}
    } catch (err) {
      console.error('Erreur sauvegarde charge/investissement:', err);
      alert('Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        <div>
          <label className="block text-sm font-medium text-black">Type</label>
          <select value={type} onChange={(e) => setType(e.target.value as any)} className="w-full p-2 border rounded text-black">
            <option value="charge">Charge d'exploitation</option>
            <option value="investment">Investissement / Immobilisation</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-black">Libellé</label>
          <input value={label} onChange={(e) => setLabel(e.target.value)} className="w-full p-2 border rounded text-black" />
        </div>
        <div>
          <label className="block text-sm font-medium text-black">Montant (HTG)</label>
          <input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="w-full p-2 border rounded text-black" />
        </div>
        <div>
          <label className="block text-sm font-medium text-black">Mode de paiement</label>
          <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value as any)} className="w-full p-2 border rounded text-black">
            <option value="cash">Caisse (5311)</option>
            <option value="digital">Argent Numérique (517)</option>
          </select>
        </div>
      </div>

      {type === 'investment' && (
        <div className="mb-3">
          <label className="block text-sm font-medium text-black">Durée de vie (années)</label>
          <input type="number" min={1} value={lifeYears} onChange={(e) => setLifeYears(Number(e.target.value))} className="w-40 p-2 border rounded text-black" />
        </div>
      )}

      <div className="flex justify-end gap-2 mt-4">
        <Button onClick={() => { if (onClose) onClose(); }} className="bg-slate-200 text-black">Annuler</Button>
        <Button onClick={handleSubmit} disabled={saving} className="bg-emerald-600 text-white">Enregistrer</Button>
      </div>
    </div>
  );
}
