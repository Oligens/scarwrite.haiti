import { useParams, Link } from "react-router-dom";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Share2, Download, TrendingUp } from "@/lib/lucide-react";
import { getTransferMonthlyTotals, getFiscalYearTransferRevenue, getSettings } from "@/lib/storage";
import { generateTransferAnnualPDF, sharePDF, downloadPDF } from "@/lib/pdf";

const MONTHS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

export default function TransferAnnualReport() {
  const { year } = useParams<{ year: string }>();
  const settings = getSettings();
  const startYear = parseInt(year || '0');

  const monthlyTotals = useMemo(() => {
    return getTransferMonthlyTotals(startYear);
  }, [startYear]);

  const annualTotal = useMemo(() => {
    return getFiscalYearTransferRevenue(startYear);
  }, [startYear]);

  const formatCurrency = (amount: number): string => {
    return amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleShare = async () => {
    const doc = generateTransferAnnualPDF(startYear, monthlyTotals);
    await sharePDF(doc, `transferts-annuel-${startYear}-${startYear + 1}.pdf`);
  };

  const handleDownload = () => {
    const doc = generateTransferAnnualPDF(startYear, monthlyTotals);
    downloadPDF(doc, `transferts-annuel-${startYear}-${startYear + 1}.pdf`);
  };

  if (!year) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-1/3 -top-1/3 h-2/3 w-2/3 rounded-full bg-primary/3 blur-3xl" />
      </div>

      <div className="relative z-10">
        <header className="border-b border-border/50 bg-card/50 backdrop-blur-xl">
          <div className="container flex h-16 items-center gap-4">
            <Button asChild variant="ghost" size="icon">
              <Link to="/transfers/reports">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <h1 className="font-display text-xl font-bold">
              <span className="text-gradient-gold">
                Rapport annuel {startYear}-{startYear + 1}
              </span>
            </h1>
          </div>
        </header>

        <main className="container py-8 space-y-6">
          {/* Annual total */}
          <div className="card-premium p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/20">
                <TrendingUp className="h-8 w-8 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Recette annuelle (Frais)</p>
                <p className="text-3xl font-bold text-primary">
                  {formatCurrency(annualTotal)} {settings.currency_symbol}
                </p>
                <p className="text-xs text-muted-foreground">
                  Octobre {startYear} – Septembre {startYear + 1}
                </p>
              </div>
            </div>
          </div>

          {/* PDF actions */}
          <div className="flex gap-3">
            <Button onClick={handleShare} variant="outline" className="flex-1 border-primary/30">
              <Share2 className="mr-2 h-4 w-4" />
              Partager PDF
            </Button>
            <Button onClick={handleDownload} variant="outline" className="flex-1 border-primary/30">
              <Download className="mr-2 h-4 w-4" />
              Télécharger
            </Button>
          </div>

          {/* Monthly breakdown */}
          <div className="space-y-3">
            <h2 className="font-display text-lg font-semibold text-foreground">
              Récapitulatif mensuel
            </h2>
            <div className="card-premium overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left p-4 text-sm font-semibold text-foreground">Mois</th>
                    <th className="text-right p-4 text-sm font-semibold text-foreground">Recette</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyTotals.map((month, index) => (
                    <tr 
                      key={month.value}
                      className={index % 2 === 0 ? 'bg-muted/20' : ''}
                    >
                      <td className="p-4 text-foreground">
                        {month.label} {month.year}
                      </td>
                      <td className={`p-4 text-right font-medium ${month.total > 0 ? 'text-primary' : 'text-muted-foreground'}`}>
                        {formatCurrency(month.total)} {settings.currency_symbol}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-primary/30 bg-primary/10">
                    <td className="p-4 font-bold text-foreground">TOTAL</td>
                    <td className="p-4 text-right font-bold text-primary text-lg">
                      {formatCurrency(annualTotal)} {settings.currency_symbol}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}