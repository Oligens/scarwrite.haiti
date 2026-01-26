import { useParams, Link } from "react-router-dom";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Share2, Download, Calendar } from "@/lib/lucide-react";
import { getTransferDailyTotals, getMonthlyTransferRevenue, getSettings } from "@/lib/storage";
import { generateTransferMonthlyPDF, sharePDF, downloadPDF } from "@/lib/pdf";

const MONTHS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

const DAYS_FR = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

export default function TransferMonthlyReport() {
  const { monthYear } = useParams<{ monthYear: string }>();
  const settings = getSettings();

  const [year, month] = useMemo(() => {
    if (!monthYear) return [0, 0];
    const [y, m] = monthYear.split('-').map(Number);
    return [y, m];
  }, [monthYear]);

  const dailyTotals = useMemo(() => {
    return getTransferDailyTotals(year, month);
  }, [year, month]);

  const monthlyTotal = useMemo(() => {
    return getMonthlyTransferRevenue(year, month);
  }, [year, month]);

  const formatCurrency = (amount: number): string => {
    return amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatDate = (dateStr: string): string => {
    const d = new Date(dateStr + 'T00:00:00');
    return `${DAYS_FR[d.getDay()]} ${d.getDate()}`;
  };

  const handleShare = async () => {
    const doc = generateTransferMonthlyPDF(year, month, dailyTotals);
    await sharePDF(doc, `transferts-${monthYear}.pdf`);
  };

  const handleDownload = () => {
    const doc = generateTransferMonthlyPDF(year, month, dailyTotals);
    downloadPDF(doc, `transferts-${monthYear}.pdf`);
  };

  if (!monthYear) return null;

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
                {MONTHS_FR[month - 1]} {year}
              </span>
            </h1>
          </div>
        </header>

        <main className="container py-8 space-y-6">
          {/* Monthly total */}
          <div className="card-premium p-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">Recette du mois (Frais)</p>
              <p className="text-4xl font-bold text-primary">
                {formatCurrency(monthlyTotal)} {settings.currency_symbol}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                {dailyTotals.length} jour{dailyTotals.length > 1 ? 's' : ''} avec transferts
              </p>
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

          {/* Daily breakdown */}
          <div className="space-y-3">
            <h2 className="font-display text-lg font-semibold text-foreground">
              Détail journalier
            </h2>
            <div className="space-y-2">
              {dailyTotals.map((day) => (
                <Link
                  key={day.date}
                  to={`/transfers/day/${day.date}`}
                  className="card-premium p-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted/50">
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <span className="font-medium text-foreground">{formatDate(day.date)}</span>
                      <p className="text-xs text-muted-foreground">{day.count} transfert{day.count > 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <span className="font-semibold text-primary">
                    {formatCurrency(day.total)} {settings.currency_symbol}
                  </span>
                </Link>
              ))}
            </div>

            {dailyTotals.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                Aucun transfert ce mois
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}