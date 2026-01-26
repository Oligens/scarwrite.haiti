import { Link, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Share2 } from "lucide-react";
import { getMonthlyTotals, getSettings } from "@/lib/storage";
import { generateAnnualPDF, sharePDF, downloadPDF } from "@/lib/pdf";
import { useToast } from "@/hooks/use-toast";

export default function AnnualReport() {
  const { year: yearParam } = useParams<{ year: string }>();
  const { toast } = useToast();
  const settings = getSettings();
  const [monthlyTotals, setMonthlyTotals] = useState<Array<{ month: number; year: number; total: number; label: string; value: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fiscalYearStart = parseInt(yearParam || new Date().getFullYear().toString());

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      const totals = await getMonthlyTotals(fiscalYearStart);
      setMonthlyTotals(totals);
      setIsLoading(false);
    };
    loadData();
  }, [fiscalYearStart]);

  const totalRevenue = monthlyTotals.reduce((sum, m) => sum + m.total, 0);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount) + ` ${settings.currency_symbol}`;

  const handleGeneratePDF = () => {
    const doc = generateAnnualPDF(fiscalYearStart, monthlyTotals);
    downloadPDF(doc, `rapport-annuel-${fiscalYearStart}.pdf`);
    toast({ title: "PDF généré" });
  };

  const handleSharePDF = async () => {
    const doc = generateAnnualPDF(fiscalYearStart, monthlyTotals);
    await sharePDF(doc, `rapport-annuel-${fiscalYearStart}.pdf`);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -right-1/3 -top-1/3 h-2/3 w-2/3 rounded-full bg-primary/3 blur-3xl" />
      </div>

      <div className="relative z-10">
        <header className="border-b border-border/50 bg-card/50 backdrop-blur-xl">
          <div className="container flex h-16 items-center gap-4">
            <Button asChild variant="ghost" size="icon">
              <Link to="/reports">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <h1 className="font-display text-lg font-bold">
                <span className="text-gradient-gold">Recette annuelle</span>
              </h1>
              <p className="text-xs text-muted-foreground">
                Octobre {fiscalYearStart} — Septembre {fiscalYearStart + 1}
              </p>
            </div>
          </div>
        </header>

        <main className="container py-8">
          {isLoading ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Chargement du rapport annuel...</p>
              </div>
            </div>
          ) : (
            <>
              {/* Total Card */}
          <div className="card-premium mb-8 p-8 text-center shimmer-gold">
            <p className="text-sm text-muted-foreground">Total annuel</p>
            <p className="revenue-number mt-2 text-5xl">{formatCurrency(totalRevenue)}</p>
          </div>

          {/* Export Buttons */}
          <div className="mb-6 flex flex-wrap gap-2 justify-end">
            <Button
              onClick={handleGeneratePDF}
              variant="outline"
              className="border-primary/30 hover:bg-primary/10"
            >
              <Download className="mr-2 h-4 w-4" />
              Exporter PDF
            </Button>
            <Button
              onClick={handleSharePDF}
              variant="outline"
              className="border-primary/30 hover:bg-primary/10"
            >
              <Share2 className="mr-2 h-4 w-4" />
              Partager
            </Button>
          </div>

          {/* Monthly Cards Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {monthlyTotals.map((m, index) => (
              <Link
                key={m.value}
                to={`/reports/month/${m.value}`}
                className="card-premium hover-lift p-4 opacity-0 animate-fade-in"
                style={{ animationDelay: `${index * 50}ms`, animationFillMode: "forwards" }}
              >
                <p className="text-sm text-muted-foreground">{m.label} {m.year}</p>
                <p className="mt-2 text-xl font-bold text-primary">
                  {formatCurrency(m.total)}
                </p>
              </Link>
            ))}
          </div>
          </>
          )}
        </main>
      </div>
    </div>
  );
}
