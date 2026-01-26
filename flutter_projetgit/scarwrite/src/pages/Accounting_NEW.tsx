import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "@/lib/lucide-react";
import { getAccounts, getTrialBalance, createAccountingTransaction, addAccount, getSettings, getJournalEntriesByDate, getCompanyProfile } from "@/lib/storage";
import type { Account, AccountingEntry } from "@/lib/database";
import { downloadPDF } from "@/lib/pdf";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
// Manual transaction form removed — transactions are now recorded automatically

interface AccountLedger {
  code: string;
  name: string;
  debits: Array<{ date: string; description: string; amount: number }>;
  credits: Array<{ date: string; description: string; amount: number }>;
  balance: number;
  totalDebit: number;
  totalCredit: number;
}

export default function Accounting() {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [trial, setTrial] = useState<Array<{ account_code: string; account_name: string; debit: number; credit: number }>>([]);
  const [journal, setJournal] = useState<AccountingEntry[]>([]);
  const [ledgers, setLedgers] = useState<AccountLedger[]>([]);
  
  const [section, setSection] = useState<'journal' | 'ledger' | 'bilan' | 'resultat'>('journal');
  
  // NEW: Filters
  const [filterAccountCode, setFilterAccountCode] = useState<string>('');
  const [filterStartDate, setFilterStartDate] = useState<string>(new Date(Date.now() - 365 * 24 * 3600 * 1000).toISOString().slice(0, 10));
  const [filterEndDate, setFilterEndDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [filterTransactionType, setFilterTransactionType] = useState<string>('');

  // Load accounting data
  const loadAccountingData = async () => {
    try {
      const accs = await getAccounts();
      setAccounts(accs);
      const t = await getTrialBalance();
      setTrial(t);

      const j = await getJournalEntriesByDate(filterStartDate, filterEndDate);
      
      // NEW: Apply filters
      let filtered = j;
      if (filterAccountCode) {
        filtered = filtered.filter(e => e.account_code.includes(filterAccountCode));
      }
      if (filterTransactionType) {
        filtered = filtered.filter(e => e.transaction_type === filterTransactionType);
      }
      
      setJournal(filtered);

      // Build ledgers from journal
      const ledgerMap = new Map<string, AccountLedger>();
      filtered.forEach((entry: AccountingEntry) => {
        const key = `${entry.account_code}-${entry.account_name}`;
        if (!ledgerMap.has(key)) {
          ledgerMap.set(key, {
            code: entry.account_code,
            name: entry.account_name,
            debits: [],
            credits: [],
            balance: 0,
            totalDebit: 0,
            totalCredit: 0,
          });
        }
        const ledger = ledgerMap.get(key)!;
        if (entry.debit > 0) {
          ledger.debits.push({
            date: entry.journal_date,
            description: entry.description || '—',
            amount: entry.debit,
          });
        }
        if (entry.credit > 0) {
          ledger.credits.push({
            date: entry.journal_date,
            description: entry.description || '—',
            amount: entry.credit,
          });
        }
      });

      // Calculate balances
      const ledgersArray = Array.from(ledgerMap.values()).map((ledger) => {
        ledger.totalDebit = ledger.debits.reduce((sum, d) => sum + d.amount, 0);
        ledger.totalCredit = ledger.credits.reduce((sum, c) => sum + c.amount, 0);
        ledger.balance = ledger.totalDebit - ledger.totalCredit;
        return ledger;
      });

      setLedgers(ledgersArray.sort((a, b) => parseInt(a.code) - parseInt(b.code)));
    } catch (err) {
      console.error('Error loading accounting data:', err);
    }
  };

  useEffect(() => {
    loadAccountingData();
    const handler = () => loadAccountingData();
    window.addEventListener('ledger-updated', handler);
    return () => window.removeEventListener('ledger-updated', handler);
  }, [filterAccountCode, filterStartDate, filterEndDate, filterTransactionType]);

  const handleAddSampleAccounts = async () => {
    try {
      await addAccount('101', 'Capital social');
      await addAccount('5311', 'Caisse Centrale');
      await addAccount('51', 'Compte Bancaire');
      await addAccount('401', 'Fournisseurs');
      await addAccount('4110', 'Clients');
      await addAccount('601', 'Achats');
      await addAccount('602', 'Loyer');
      await addAccount('707', 'Ventes');
      
      const today = new Date().toISOString().slice(0, 10);
      const yesterday = new Date(Date.now() - 24 * 3600 * 1000).toISOString().slice(0, 10);
      const twoDaysAgo = new Date(Date.now() - 48 * 3600 * 1000).toISOString().slice(0, 10);
      
      await createAccountingTransaction([
        { journal_date: twoDaysAgo, transaction_type: 'opening', account_code: '5311', account_name: 'Caisse Centrale', debit: 10000, credit: 0, description: 'Solde initial Caisse' },
        { journal_date: twoDaysAgo, transaction_type: 'opening', account_code: '101', account_name: 'Capital social', debit: 0, credit: 10000, description: 'Apport initial' },
        { journal_date: yesterday, transaction_type: 'purchase', account_code: '601', account_name: 'Achats', debit: 2000, credit: 0, description: 'Achat marchandises' },
        { journal_date: yesterday, transaction_type: 'purchase', account_code: '401', account_name: 'Fournisseurs', debit: 0, credit: 2000, description: 'Crédit fournisseur' },
        { journal_date: yesterday, transaction_type: 'expense', account_code: '602', account_name: 'Loyer', debit: 1000, credit: 0, description: 'Loyer usine' },
        { journal_date: yesterday, transaction_type: 'expense', account_code: '5311', account_name: 'Caisse Centrale', debit: 0, credit: 1000, description: 'Paiement loyer' },
        { journal_date: today, transaction_type: 'sale', account_code: '5311', account_name: 'Caisse Centrale', debit: 1500, credit: 0, description: 'Vente comptant' },
        { journal_date: today, transaction_type: 'sale', account_code: '707', account_name: 'Ventes', debit: 0, credit: 1500, description: 'Produit de vente' },
      ]);
      
      window.dispatchEvent(new Event('ledger-updated'));
      alert('✅ Données d\'exemple créées!');
    } catch (err) {
      console.error(err);
      alert('Erreur');
    }
  };

  const handleExportPDF = async () => {
    try {
      const settings = getSettings();
      const doc = new jsPDF();
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(`${settings.restaurant_name} - États Comptables`, 14, 20);

      // Journal
      doc.setFontSize(12);
      doc.text('Journal Général', 14, 35);
      autoTable(doc, {
        startY: 40,
        head: [['Date', 'Compte', 'Libellé', 'Débit', 'Crédit']],
        body: journal.map(j => [
          j.journal_date,
          `${j.account_code} ${j.account_name}`,
          j.description || '',
          (j.debit || 0).toFixed(2),
          (j.credit || 0).toFixed(2)
        ]),
        didDrawPage: (data) => {
          doc.addPage();
        }
      });

      doc.addPage();
      doc.setFontSize(12);
      doc.text('Grand Livre - Comptes en T', 14, 20);
      
      let yPos = 30;
      ledgers.forEach(ledger => {
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }
        doc.setFont('helvetica', 'bold');
        doc.text(`${ledger.code} - ${ledger.name}`, 14, yPos);
        yPos += 8;
        doc.setFont('helvetica', 'normal');
        doc.text(`Débits: ${ledger.totalDebit.toFixed(2)} | Crédits: ${ledger.totalCredit.toFixed(2)} | Solde: ${ledger.balance.toFixed(2)}`, 14, yPos);
        yPos += 8;
      });

      downloadPDF(doc, 'comptabilite.pdf');
    } catch (err) {
      console.error(err);
    }
  };

  // Calculate balance sheet values
  const assets = ledgers
    .filter(l => [53, 51, 31].includes(parseInt(l.code)))
    .reduce((sum, l) => sum + Math.max(0, l.balance), 0);
  
  const liabilities = ledgers
    .filter(l => [401].includes(parseInt(l.code)))
    .reduce((sum, l) => sum + Math.max(0, -l.balance), 0);
  
  const equity = ledgers
    .filter(l => [101].includes(parseInt(l.code)))
    .reduce((sum, l) => sum + Math.max(0, -l.balance), 0);

  // Calculate income statement
  const revenues = ledgers
    .filter(l => [707].includes(parseInt(l.code)))
    .reduce((sum, l) => sum + Math.max(0, -l.balance), 0);
  
  const expenses = ledgers
    .filter(l => [601, 602].includes(parseInt(l.code)))
    .reduce((sum, l) => sum + Math.max(0, l.balance), 0);

  const netIncome = revenues - expenses;

  return (
    <AppLayout title="Système Comptable">
      <div className="space-y-6">
        {/* Bouton Retour */}
        <div className="mb-4">
          <Button 
            onClick={() => navigate(-1)} 
            className="border-2 border-white text-white hover:bg-slate-800 hover:border-yellow-400 hover:text-yellow-400"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Button>
        </div>

        {/* Header */}
        <Card className="bg-gradient-to-r from-navy-deep to-navy-light border border-yellow-500/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-3xl">Système Comptable</CardTitle>
            <p className="text-yellow-400 text-sm mt-2">Journal → Grand Livre → États Financiers</p>
          </CardHeader>
        </Card>

        {/* Navigation */}
        <div className="flex flex-wrap gap-2">
          {([
            { value: 'journal', label: '📔 Journal Général', icon: '📝' },
            { value: 'ledger', label: '📊 Grand Livre (Comptes en T)', icon: 'T' },
            { value: 'bilan', label: '⚖️ Bilan', icon: '📋' },
            { value: 'resultat', label: '📈 Compte de Résultat', icon: '📊' },
          ] as Array<{ value: 'journal' | 'ledger' | 'bilan' | 'resultat'; label: string; icon: string }>).map(btn => (
            <Button
              key={btn.value}
              onClick={() => setSection(btn.value)}
              className={`${
                section === btn.value
                  ? 'bg-yellow-500 text-navy-deep'
                  : 'bg-slate-700 text-white hover:bg-slate-600'
              } font-semibold`}
            >
              {btn.label}
            </Button>
          ))}
          <Button
            onClick={handleAddSampleAccounts}
            className="ml-auto bg-emerald-700 text-white hover:bg-emerald-600 font-semibold"
          >
            ➕ Données exemple
          </Button>
          <Button
            onClick={handleExportPDF}
            className="bg-blue-700 text-white hover:bg-blue-600 font-semibold"
          >
            ⬇️ Export PDF
          </Button>
          {/* Manual transaction entry removed — all operations now generate automatic accounting entries */}
        </div>

        {/* NEW: Filters Panel */}
        <Card className="border border-slate-300 bg-slate-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Filtres</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1">Compte (Code)</label>
                <input
                  type="text"
                  placeholder="Ex: 701, 706, 5311"
                  value={filterAccountCode}
                  onChange={(e) => setFilterAccountCode(e.target.value)}
                  className="w-full px-2 py-1 text-sm border border-input rounded"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Date début</label>
                <input
                  type="date"
                  value={filterStartDate}
                  onChange={(e) => setFilterStartDate(e.target.value)}
                  className="w-full px-2 py-1 text-sm border border-input rounded"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Date fin</label>
                <input
                  type="date"
                  value={filterEndDate}
                  onChange={(e) => setFilterEndDate(e.target.value)}
                  className="w-full px-2 py-1 text-sm border border-input rounded"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Type de transaction</label>
                <select
                  value={filterTransactionType}
                  onChange={(e) => setFilterTransactionType(e.target.value)}
                  className="w-full px-2 py-1 text-sm border border-input rounded"
                >
                  <option value="">Tous</option>
                  <option value="sale">Vente</option>
                  <option value="operation">Opération (transfert)</option>
                  <option value="purchase">Achat</option>
                  <option value="expense">Dépense</option>
                  <option value="opening">Ouverture</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content */}
        {/* NEW: Trial Balance */}
        <Card className="border-l-4 border-purple-500 bg-purple-50">
          <CardHeader>
            <CardTitle className="text-navy-deep">Balance d'Essai (Trial Balance)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-purple-200">
                  <tr>
                    <th className="p-3 text-left font-semibold">Code</th>
                    <th className="p-3 text-left font-semibold">Compte</th>
                    <th className="p-3 text-right font-semibold">Débits</th>
                    <th className="p-3 text-right font-semibold">Crédits</th>
                    <th className="p-3 text-right font-semibold">Solde</th>
                  </tr>
                </thead>
                <tbody>
                  {trial.length === 0 ? (
                    <tr className="hover:bg-purple-100">
                      <td colSpan={5} className="p-3 text-center text-gray-500">
                        Aucune balance d'essai disponible.
                      </td>
                    </tr>
                  ) : (
                    <>
                      {trial.map((t, idx) => (
                        <tr key={idx} className="border-b hover:bg-purple-100">
                          <td className="p-3 font-mono font-bold">{t.account_code}</td>
                          <td className="p-3">{t.account_name}</td>
                          <td className="p-3 text-right font-mono text-blue-700">
                            {(t.debit || 0).toFixed(2)}
                          </td>
                          <td className="p-3 text-right font-mono text-red-700">
                            {(t.credit || 0).toFixed(2)}
                          </td>
                          <td className="p-3 text-right font-mono font-bold">
                            {((t.debit || 0) - (t.credit || 0)).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-purple-300 font-bold border-t-2 border-purple-500">
                        <td colSpan={2} className="p-3">TOTAUX</td>
                        <td className="p-3 text-right font-mono text-blue-900">
                          {trial.reduce((s, t) => s + (t.debit || 0), 0).toFixed(2)}
                        </td>
                        <td className="p-3 text-right font-mono text-red-900">
                          {trial.reduce((s, t) => s + (t.credit || 0), 0).toFixed(2)}
                        </td>
                        <td className="p-3 text-right font-mono">
                          {(trial.reduce((s, t) => s + (t.debit || 0), 0) - trial.reduce((s, t) => s + (t.credit || 0), 0)).toFixed(2)}
                        </td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Journal Section */}
        {section === 'journal' && (
          <Card className="border border-navy-light">
            <CardHeader>
              <CardTitle className="text-navy-deep">Journal Général - Enregistrements Chronologiques</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-navy-deep text-white">
                    <tr>
                      <th className="p-3 text-left font-semibold">Date</th>
                      <th className="p-3 text-left font-semibold">Compte</th>
                      <th className="p-3 text-left font-semibold">Libellé (Description)</th>
                      <th className="p-3 text-right font-semibold">Débit</th>
                      <th className="p-3 text-right font-semibold">Crédit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {journal.length === 0 ? (
                      <tr className="hover:bg-gray-50">
                        <td colSpan={5} className="p-3 text-center text-gray-500">
                          Aucune écriture. Cliquez sur "Données exemple" pour commencer.
                        </td>
                      </tr>
                    ) : (
                      journal.map((j, idx) => (
                        <tr key={idx} className="border-b hover:bg-yellow-50">
                          <td className="p-3 text-black">{j.journal_date}</td>
                          <td className="p-3 font-mono text-black">{j.account_code}</td>
                          <td className="p-3 text-black">{j.description || '—'}</td>
                          <td className="p-3 text-right font-mono text-black font-bold">
                            {j.debit > 0 ? j.debit.toFixed(2) : ''}
                          </td>
                          <td className="p-3 text-right font-mono text-black font-bold">
                            {j.credit > 0 ? j.credit.toFixed(2) : ''}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {section === 'ledger' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {ledgers.map(ledger => (
              <Card key={`${ledger.code}-${ledger.name}`} className="border-l-4 border-yellow-500">
                <CardHeader className="pb-2">
                  <CardTitle className="text-navy-deep text-lg">
                    {ledger.code} - {ledger.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    {/* Débits (Left side of T) */}
                    <div className="border-r-2 border-navy-light pr-4">
                      <h4 className="font-bold text-blue-700 text-sm mb-2">Débits</h4>
                      <div className="space-y-1">
                        {ledger.debits.length === 0 ? (
                          <p className="text-gray-400 text-xs">—</p>
                        ) : (
                          ledger.debits.map((d, idx) => (
                            <div key={idx} className="text-xs text-gray-700">
                              <div className="font-mono">{d.amount.toFixed(2)}</div>
                              <div className="text-gray-500">{d.date}</div>
                            </div>
                          ))
                        )}
                      </div>
                      <div className="border-t-2 border-blue-700 mt-2 pt-2 font-bold text-blue-700">
                        {ledger.totalDebit.toFixed(2)}
                      </div>
                    </div>

                    {/* Crédits (Right side of T) */}
                    <div className="pl-4">
                      <h4 className="font-bold text-red-700 text-sm mb-2">Crédits</h4>
                      <div className="space-y-1">
                        {ledger.credits.length === 0 ? (
                          <p className="text-gray-400 text-xs">—</p>
                        ) : (
                          ledger.credits.map((c, idx) => (
                            <div key={idx} className="text-xs text-gray-700">
                              <div className="font-mono">{c.amount.toFixed(2)}</div>
                              <div className="text-gray-500">{c.date}</div>
                            </div>
                          ))
                        )}
                      </div>
                      <div className="border-t-2 border-red-700 mt-2 pt-2 font-bold text-red-700">
                        {ledger.totalCredit.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {/* Solde (Bottom of T in Gold) */}
                  <div className="bg-yellow-50 border-2 border-yellow-400 p-3 rounded">
                    <p className="text-xs text-gray-700 font-semibold">SOLDE</p>
                    <p className={`text-xl font-bold font-mono ${
                      ledger.balance >= 0 ? 'text-yellow-700' : 'text-red-700'
                    }`}>
                      {ledger.balance.toFixed(2)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {section === 'bilan' && (
          <div className="grid grid-cols-2 gap-6">
            <Card className="border-l-4 border-blue-500">
              <CardHeader>
                <CardTitle className="text-navy-deep">ACTIF</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {ledgers
                  .filter(l => [53, 51, 31].some(code => code === parseInt(l.code)))
                  .map(l => (
                    <div key={l.code} className="flex justify-between border-b pb-2">
                      <span className="text-gray-700">{l.name}</span>
                      <span className="font-mono font-bold text-blue-700">{Math.max(0, l.balance).toFixed(2)}</span>
                    </div>
                  ))}
                <div className="border-t-2 border-blue-700 pt-3 flex justify-between font-bold">
                  <span className="text-navy-deep">Total Actif</span>
                  <span className="font-mono text-blue-700">{assets.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-red-500">
              <CardHeader>
                <CardTitle className="text-navy-deep">PASSIF + CAPITAUX PROPRES</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">Dettes</p>
                  {ledgers
                    .filter(l => [401].some(code => code === parseInt(l.code)))
                    .map(l => (
                      <div key={l.code} className="flex justify-between border-b pb-2 ml-2">
                        <span className="text-gray-700">{l.name}</span>
                        <span className="font-mono font-bold text-red-700">{Math.max(0, -l.balance).toFixed(2)}</span>
                      </div>
                    ))}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">Capitaux</p>
                  {ledgers
                    .filter(l => [101].some(code => code === parseInt(l.code)))
                    .map(l => (
                      <div key={l.code} className="flex justify-between border-b pb-2 ml-2">
                        <span className="text-gray-700">{l.name}</span>
                        <span className="font-mono font-bold text-yellow-700">{Math.max(0, -l.balance).toFixed(2)}</span>
                      </div>
                    ))}
                </div>
                <div className="border-t-2 border-red-700 pt-3 flex justify-between font-bold">
                  <span className="text-navy-deep">Total Passif + Capitaux</span>
                  <span className="font-mono text-red-700">{(liabilities + equity).toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {section === 'resultat' && (
          <Card className="border-l-4 border-emerald-500">
            <CardHeader>
              <CardTitle className="text-navy-deep">Compte de Résultat</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="font-bold text-emerald-700 mb-3">REVENUS</p>
                {ledgers
                  .filter(l => [707].some(code => code === parseInt(l.code)))
                  .map(l => (
                    <div key={l.code} className="flex justify-between mb-2 ml-4 text-gray-700">
                      <span>{l.name}</span>
                      <span className="font-mono font-bold text-emerald-700">{Math.max(0, -l.balance).toFixed(2)}</span>
                    </div>
                  ))}
                <div className="border-t-2 border-emerald-700 mt-3 pt-3 ml-4 flex justify-between font-bold">
                  <span>Total Revenus</span>
                  <span className="font-mono text-emerald-700">{revenues.toFixed(2)}</span>
                </div>
              </div>

              <div>
                <p className="font-bold text-red-700 mb-3">CHARGES</p>
                {ledgers
                  .filter(l => [601, 602].some(code => code === parseInt(l.code)))
                  .map(l => (
                    <div key={l.code} className="flex justify-between mb-2 ml-4 text-gray-700">
                      <span>{l.name}</span>
                      <span className="font-mono font-bold text-red-700">{Math.max(0, l.balance).toFixed(2)}</span>
                    </div>
                  ))}
                <div className="border-t-2 border-red-700 mt-3 pt-3 ml-4 flex justify-between font-bold">
                  <span>Total Charges</span>
                  <span className="font-mono text-red-700">{expenses.toFixed(2)}</span>
                </div>
              </div>

              <div className={`border-2 p-4 rounded font-bold text-lg ${
                netIncome >= 0
                  ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                  : 'bg-red-50 border-red-500 text-red-700'
              }`}>
                <div className="flex justify-between">
                  <span>{netIncome >= 0 ? 'Bénéfice Net' : 'Perte Nette'}</span>
                  <span className="font-mono">{netIncome.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Manual transaction dialog removed to prevent manual journal inputs. Use the app flows (Ventes, Réapprovisionnement, Transferts, Paiements) which create automatic journal entries. */}
    </AppLayout>
  );
}
