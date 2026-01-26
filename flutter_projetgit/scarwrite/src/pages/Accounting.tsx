import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { DialogContent, DialogTitle, Dialog } from "@/components/ui/dialog";
import { TransactionForm } from "@/components/TransactionForm";
import { getTrialBalance, getJournalEntriesByDate } from "@/lib/storage";
import type { AccountingEntry } from "@/lib/database";

interface TrialBalanceEntry {
  account_code: string;
  account_name: string;
  debit: number;
  credit: number;
}

export default function Accounting(): JSX.Element {
  const [showExpense, setShowExpense] = useState(false);
  const [trial, setTrial] = useState<TrialBalanceEntry[]>([]);
  const [journal, setJournal] = useState<AccountingEntry[]>([]);
  const [loading, setLoading] = useState(true);

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
          <h1 className="text-2xl font-bold">Comptabilité</h1>
          <button
            onClick={() => setShowExpense(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Nouvelle Opération
          </button>
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
                        <td className="text-slate-800 text-sm py-2">{j.journal_date}</td>
                        <td className="text-slate-800 text-sm py-2">{j.account_code || '—'}</td>
                        <td className="text-right text-slate-800 text-sm py-2 font-mono">{(j.debit || 0).toFixed(2)}</td>
                        <td className="text-right text-slate-800 text-sm py-2 font-mono">{(j.credit || 0).toFixed(2)}</td>
                        <td className="text-slate-800 text-sm py-2">{j.description || '—'}</td>
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

          {/* Section 4: États Financiers */}
          <div className="border-l-4 border-amber-600 pl-4">
            <h2 className="font-display text-2xl font-bold text-slate-900 mb-1">
              4. États Financiers
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              États financiers complets : Bilan détaillé, Compte de Résultat (P&L), Bénéfices Non Répartis (BNR) et Flux de Trésorerie.
            </p>
            <div className="mt-3 bg-slate-50 rounded-lg p-6 space-y-4">
              <div className="grid grid-cols-2 gap-6">
                <div className="border-l-2 border-amber-500 pl-4">
                  <p className="text-sm text-muted-foreground">Total Actifs</p>
                  <p className="font-display text-2xl font-bold text-slate-900 font-mono">
                    {(trial.reduce((s, r) => s + (r.debit||0), 0)).toFixed(2)}
                  </p>
                </div>
                <div className="border-l-2 border-amber-500 pl-4">
                  <p className="text-sm text-muted-foreground">Total Passifs</p>
                  <p className="font-display text-2xl font-bold text-slate-900 font-mono">
                    {(trial.reduce((s, r) => s + (r.credit||0), 0)).toFixed(2)}
                  </p>
                </div>
              </div>
              <div className="border-t-2 border-slate-300 pt-4">
                <p className="text-sm text-muted-foreground">Équilibre (Débit - Crédit)</p>
                <p className={`font-display text-xl font-bold font-mono ${
                  Math.abs(trial.reduce((s, r) => s + (r.debit||0), 0) - trial.reduce((s, r) => s + (r.credit||0), 0)) < 0.01
                    ? 'text-green-600'
                    : 'text-red-600'
                }`}>
                  {(trial.reduce((s, r) => s + (r.debit||0), 0) - trial.reduce((s, r) => s + (r.credit||0), 0)).toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </div>

        <Dialog open={showExpense} onOpenChange={setShowExpense}>
          <DialogContent>
            <DialogTitle>Nouvelle Opération</DialogTitle>
            <TransactionForm onClose={() => setShowExpense(false)} onSuccess={() => setShowExpense(false)} />
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
