import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { TaxedTransaction } from '@/lib/database';
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "@/lib/lucide-react";
import { getTaxSummaryByMonth, getTaxSummaryByYear, getTaxedTransactionsByMonth, calculateTaxesFromAccounting, getTaxSummaryByPeriod } from "@/lib/storage";
import { generateTaxCertificatePDF, generateTaxCertificateFromData, downloadPDF } from "@/lib/pdf";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Fiscality() {
  const navigate = useNavigate();
  const today = new Date();
  const [year, setYear] = useState<number>(today.getFullYear());
  const [month, setMonth] = useState<number>(today.getMonth() + 1);
  const [monthlySummary, setMonthlySummary] = useState<Record<string, number>>({});
  const [yearlySummary, setYearlySummary] = useState<Record<string, number>>({});
  const [transactions, setTransactions] = useState<TaxedTransaction[]>([]);
  
  // New: Automated tax calculation from accounting entries
  const [automatedTaxData, setAutomatedTaxData] = useState<any>(null);
  const [taxSummary, setTaxSummary] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      // Legacy method (keep for backward compatibility)
      const ms = await getTaxSummaryByMonth(year, month);
      const ys = await getTaxSummaryByYear(year);
      const tx = await getTaxedTransactionsByMonth(year, month);
      setMonthlySummary(ms);
      setYearlySummary(ys);
      setTransactions(tx);
      
      // New: Automated calculation from accounting_entries
      try {
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const endDate = new Date(year, month, 0).toISOString().split('T')[0];
        const autoData = await calculateTaxesFromAccounting(startDate, endDate);
        setAutomatedTaxData(autoData);
        
        const summary = await getTaxSummaryByPeriod(year, month);
        setTaxSummary(summary);
      } catch (err) {
        console.error('Error loading automated tax data:', err);
      }
    };
    load();
  }, [year, month]);

  const handleExport = async () => {
    // Build a summary from currently filtered transactions (on-screen state)
    const breakdown: Record<string, number> = {};
    let totalTaxes = 0;
    transactions.forEach(t => {
      const amt = Number(t.tax_amount || 0);
      totalTaxes += amt;
      breakdown[t.tax_name] = (breakdown[t.tax_name] || 0) + amt;
    });

    // Use the new PDF generator that accepts provided rows so the exported PDF
    // matches exactly what the user sees on-screen (filtered state)
    const doc = generateTaxCertificateFromData(year, month, transactions.map(t => ({
      transaction_date: t.transaction_date,
      transaction_type: t.transaction_type,
      transaction_id: t.transaction_id,
      base_amount: Number(t.base_amount || 0),
      tax_name: t.tax_name,
      tax_percentage: Number(t.tax_percentage || 0),
      tax_amount: Number(t.tax_amount || 0),
    })), { totalTaxes, breakdown });

    downloadPDF(doc, `certificat-fiscal-${year}-${String(month).padStart(2, '0')}.pdf`);
  };

  const formatCurrency = (amount: number): string => {
    return amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <AppLayout title="Fiscalité">
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

        <div className="card-premium p-6 flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-card-foreground">Fiscalité</h1>
            <p className="text-sm text-muted-foreground mt-2">Suivi automatisé des taxes par compte comptable (701 Produits + 706 Services)</p>
          </div>
          <div className="flex gap-3">
            <Button onClick={handleExport} className="bg-primary text-primary-foreground">📥 Exporter Certificat Fiscal (PDF)</Button>
          </div>
        </div>

        {/* Filtres Mois/Année */}
        <div className="card-premium p-6">
          <h3 className="font-semibold mb-4 text-white">Sélection de Période</h3>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-2 text-white">Mois</label>
              <select 
                value={month} 
                onChange={(e) => setMonth(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
              >
                {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                  <option key={m} value={String(m).padStart(2, '0')}>
                    {new Date(2024, m-1).toLocaleString('fr-FR', {month: 'long'})}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium mb-2 text-white">Année</label>
              <select 
                value={year} 
                onChange={(e) => setYear(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
              >
                {Array.from({length: 5}, (_, i) => new Date().getFullYear() - i).map(y => (
                  <option key={y} value={String(y)}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Résumé Mensuel Automatisé */}
        {automatedTaxData ? (
          <div className="card-premium p-6">
            <h3 className="font-semibold mb-4">Résumé Mensuel - {month}/{year} (Sources Comptables)</h3>
            
            {/* Tableau Produits vs Services */}
            <div className="overflow-auto mb-6 bg-slate-50 rounded-lg border border-slate-200">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-slate-700">
                  <tr>
                    <th className="text-left p-3 border border-slate-300 font-semibold text-white">Compte</th>
                    <th className="text-left p-3 border border-slate-300 font-semibold text-white">Description</th>
                    <th className="text-right p-3 border border-slate-300 font-semibold text-white">Base HT</th>
                    <th className="text-right p-3 border border-slate-300 font-semibold text-white">Taux</th>
                    <th className="text-right p-3 border border-slate-300 font-semibold text-white">Montant Taxe</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Ligne 701 - Ventes de produits */}
                  <tr className="hover:bg-slate-100 bg-white">
                    <td className="text-left p-3 border border-slate-200 font-mono text-xs text-black">701</td>
                    <td className="text-left p-3 border border-slate-200 text-black">Ventes de produits</td>
                    <td className="text-right p-3 border border-slate-200 text-black">
                      {automatedTaxData.breakdown['701_products'] 
                        ? formatCurrency(automatedTaxData.breakdown['701_products'].base)
                        : formatCurrency(0)
                      }
                    </td>
                    <td className="text-right p-3 border border-slate-200 text-black">
                      {automatedTaxData.appliedTaxRate}%
                    </td>
                    <td className="text-right p-3 border border-slate-200 font-semibold text-blue-700 bg-blue-50">
                      {automatedTaxData.breakdown['701_products'] 
                        ? formatCurrency(automatedTaxData.breakdown['701_products'].tax)
                        : formatCurrency(0)
                      }
                    </td>
                  </tr>

                  {/* Ligne 706 - Courtage/Services */}
                  <tr className="hover:bg-slate-100 bg-white">
                    <td className="text-left p-3 border border-slate-200 font-mono text-xs text-black">706</td>
                    <td className="text-left p-3 border border-slate-200 text-black">Courtage & Services (Frais)</td>
                    <td className="text-right p-3 border border-slate-200 text-black">
                      {automatedTaxData.breakdown['706_services'] 
                        ? formatCurrency(automatedTaxData.breakdown['706_services'].base)
                        : formatCurrency(0)
                      }
                    </td>
                    <td className="text-right p-3 border border-slate-200 text-black">
                      {automatedTaxData.appliedTaxRate}%
                    </td>
                    <td className="text-right p-3 border border-slate-200 font-semibold text-blue-700 bg-blue-50">
                      {automatedTaxData.breakdown['706_services'] 
                        ? formatCurrency(automatedTaxData.breakdown['706_services'].tax)
                        : formatCurrency(0)
                      }
                    </td>
                  </tr>

                  {/* Totaux */}
                  <tr className="bg-gradient-gold font-bold">
                    <td colSpan={2} className="text-left p-3 border border-slate-300 text-black font-bold">TOTAL TAXABLE</td>
                    <td className="text-right p-3 border border-slate-300 text-black">
                      {formatCurrency(automatedTaxData.totalTaxableBase)}
                    </td>
                    <td className="text-right p-3 border border-slate-300 text-black">
                      {automatedTaxData.appliedTaxRate}%
                    </td>
                    <td className="text-right p-3 border border-slate-300 text-black">
                      {formatCurrency(automatedTaxData.totalTaxes)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Résumé Textuel */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-muted p-4 rounded-md">
                <p className="text-xs text-muted-foreground">Revenu Total Taxable (HT)</p>
                <p className="text-xl font-bold text-card-foreground">{formatCurrency(automatedTaxData.totalTaxableBase)}</p>
              </div>
              <div className="bg-primary/10 p-4 rounded-md border border-primary">
                <p className="text-xs text-muted-foreground">Taxes Collectées (TPS/TVA)</p>
                <p className="text-xl font-bold text-primary">{formatCurrency(automatedTaxData.totalTaxes)}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="card-premium p-6 text-center text-muted-foreground">
            Aucune donnée fiscale automatisée disponible pour {month}/{year}
          </div>
        )}

        {/* Registre Détaillé (Legacy) */}
        <div className="card-premium p-6">
          <h3 className="font-semibold mb-4">Registre des Taxes - {month}/{year}</h3>
          <div className="overflow-auto bg-slate-50 rounded-lg border border-slate-200">
            <table className="w-full table-auto border-collapse text-sm">
              <thead className="bg-slate-700">
                <tr>
                  <th className="text-left p-3 border border-slate-300 font-semibold text-white">Date</th>
                  <th className="text-left p-3 border border-slate-300 font-semibold text-white">Transaction</th>
                  <th className="text-right p-3 border border-slate-300 font-semibold text-white">Base HT</th>
                  <th className="text-left p-3 border border-slate-300 font-semibold text-white">Taxe</th>
                  <th className="text-right p-3 border border-slate-300 font-semibold text-white">Montant taxe</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(t => (
                  <tr key={t.id} className="hover:bg-slate-100 bg-white">
                    <td className="p-3 border border-slate-200 text-black">{new Date(t.transaction_date).toLocaleDateString('fr-FR')}</td>
                    <td className="p-3 border border-slate-200 text-black">{t.transaction_type}/{t.transaction_id}</td>
                    <td className="text-right p-3 border border-slate-200 text-black">{t.base_amount.toFixed(2)}</td>
                    <td className="p-3 border border-slate-200 text-black">{t.tax_name}</td>
                    <td className="text-right p-3 border border-slate-200 text-black font-semibold">{t.tax_amount.toFixed(2)}</td>
                  </tr>
                ))}
                {transactions.length === 0 && (
                  <tr><td colSpan={5} className="text-center text-black py-4">Aucune transaction fiscale trouvée.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
