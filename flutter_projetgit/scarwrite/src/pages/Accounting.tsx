import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
// Manual transaction form removed — accounting entries are generated automatically by operations
import { getTrialBalance, getJournalEntriesByDate } from "@/lib/storage";
import Financials from './Financials';
import type { AccountingEntry } from "@/lib/database";

interface TrialBalanceEntry {
  account_code: string;
  account_name: string;
  debit: number;
  credit: number;
}

export default function Accounting(): JSX.Element {
 
  const [trial, setTrial] = useState<TrialBalanceEntry[]>([]);
  const [journal, setJournal] = useState<AccountingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFinancials, setShowFinancials] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const trialData = await getTrialBalance();
        setTrial(trialData);

        // Get journal entries for the last year
        const endDate = new Date().toISOString().split('T')[0];
        const startDate = new Date(new Date().getFullYear() - 1, 0, 1).toISOString().split('T')[0];
        const journalData = await getJournalEntriesByDate(startDate, endDate);
        setJournal(journalData);
      } catch (error) {
        console.error('Error loading accounting data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();

    const openHandler = () => setShowFinancials(true);
    const closeHandler = () => setShowFinancials(false);
    window.addEventListener('open-financials', openHandler as any);
    window.addEventListener('close-financials', closeHandler as any);
    return () => { window.removeEventListener('open-financials', openHandler as any); window.removeEventListener('close-financials', closeHandler as any); };
  }, []);

  if (loading) {
    return (
      <AppLayout title="Comptabilité">
        <div className="p-6">
          <p>Chargement des données comptables...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Comptabilité">
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <Button onClick={() => window.history.back()} className="inline-flex items-center gap-2 bg-card/80 hover:bg-card px-3 py-1 rounded">
              <span className="mr-1">◀</span> Retour
            </Button>
            <h1 className="text-2xl font-bold">Comptabilité</h1>
          </div>
          {/* Button to open full-screen Financials view */}
          <div>
            <button onClick={() => window.dispatchEvent(new CustomEvent('open-financials'))} className="ml-4 bg-yellow-500 text-black font-semibold px-3 py-2 rounded">📦 États Financiers</button>
          </div>
        </div>

        <div className="space-y-8">
          {/* Section 1: Balance Générale (Trial Balance) */}
          <div className="border-l-4 border-blue-600 pl-4">
            <h2 className="font-display text-2xl font-bold text-slate-900 mb-1">
              1. Balance Générale
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              État des comptes avec soldes débit et crédit
            </p>
            <div className="mt-3 overflow-x-auto bg-slate-50 rounded-lg p-4">
              <table className="w-full font-sans">
                <thead>
                  <tr className="border-b-2 border-slate-300">
                    <th className="text-left text-slate-700 font-bold text-sm py-2">Code</th>
                    <th className="text-left text-slate-700 font-bold text-sm py-2">Compte</th>
                    <th className="text-right text-slate-700 font-bold text-sm py-2">Débit</th>
                    <th className="text-right text-slate-700 font-bold text-sm py-2">Crédit</th>
                  </tr>
                </thead>
                <tbody>
                  {trial.map(t => (
                    <tr key={t.account_code} className="border-b border-slate-200 hover:bg-blue-50">
                      <td className="text-slate-800 text-sm py-2">{t.account_code}</td>
                      <td className="text-slate-800 text-sm py-2">{t.account_name}</td>
                      <td className="text-right text-slate-800 text-sm py-2 font-mono">{(t.debit || 0).toFixed(2)}</td>
                      <td className="text-right text-slate-800 text-sm py-2 font-mono">{(t.credit || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-400 bg-slate-100">
                    <td colSpan={2} className="text-right font-bold text-slate-900 text-sm py-3 px-2">TOTAL</td>
                    <td className="text-right font-bold text-slate-900 text-sm py-3 px-2 font-mono">{trial.reduce((s, r) => s + (r.debit || 0), 0).toFixed(2)}</td>
                    <td className="text-right font-bold text-slate-900 text-sm py-3 px-2 font-mono">{trial.reduce((s, r) => s + (r.credit || 0), 0).toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Section 2: Journal Général */}
          <div className="border-l-4 border-purple-600 pl-4">
            <h2 className="font-display text-2xl font-bold text-slate-900 mb-1">
              2. Journal Général
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Enregistrements chronologiques de tous les mouvements (dernière année)
            </p>
            <div className="mt-3 overflow-x-auto bg-slate-50 rounded-lg p-4">
              <table className="w-full font-sans">
                <thead>
                  <tr className="border-b-2 border-slate-300">
                    <th className="text-left text-slate-700 font-bold text-sm py-2">Date</th>
                    <th className="text-left text-slate-700 font-bold text-sm py-2">Compte</th>
                    <th className="text-right text-slate-700 font-bold text-sm py-2">Débit</th>
                    <th className="text-right text-slate-700 font-bold text-sm py-2">Crédit</th>
                    <th className="text-left text-slate-700 font-bold text-sm py-2">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {journal.length > 0 ? (
                    journal.map((j) => (
                      <tr key={j.id} className="border-b border-slate-200 hover:bg-purple-50">
                        <td className="text-black text-sm py-2">{j.journal_date}</td>
                        <td className="text-black text-sm py-2">{j.account_code || '—'}</td>
                        <td className="text-right text-black text-sm py-2 font-mono">{(j.debit || 0).toFixed(2)}</td>
                        <td className="text-right text-black text-sm py-2 font-mono">{(j.credit || 0).toFixed(2)}</td>
                        <td className="text-black text-sm py-2">{j.description || '—'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="text-center py-4 text-muted-foreground">Aucune écriture comptable</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 3: Grand Livre */}
          <div className="border-l-4 border-green-600 pl-4">
            <h2 className="font-display text-2xl font-bold text-slate-900 mb-1">
              3. Grand Livre (Comptes en T)
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Synthèse regroupée par compte avec cumuls débit et crédit
            </p>
            <div className="mt-3 overflow-x-auto bg-slate-50 rounded-lg p-4">
              <table className="w-full font-sans">
                <thead>
                  <tr className="border-b-2 border-slate-300">
                    <th className="text-left text-slate-700 font-bold text-sm py-2">Compte</th>
                    <th className="text-right text-slate-700 font-bold text-sm py-2">Débit</th>
                    <th className="text-right text-slate-700 font-bold text-sm py-2">Crédit</th>
                  </tr>
                </thead>
                <tbody>
                  {trial.map(t => (
                    <tr key={t.account_code} className="border-b border-slate-200 hover:bg-green-50">
                      <td className="text-slate-800 text-sm py-2">{t.account_code} {t.account_name}</td>
                      <td className="text-right text-slate-800 text-sm py-2 font-mono">{(t.debit || 0).toFixed(2)}</td>
                      <td className="text-right text-slate-800 text-sm py-2 font-mono">{(t.credit || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 4 removed — moved to dedicated Financials view */}
        </div>

        {/* Manual transaction dialog removed to prevent manual journal entries. All transactions are recorded automatically. */}
      </div>
      {showFinancials && <Financials onClose={() => setShowFinancials(false)} />}
    </AppLayout>
  );
}
