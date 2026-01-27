import { Link, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Share2 } from "@/lib/lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getDailyTotals, getSettings } from "@/lib/storage";
import { generateMonthlyPDF, sharePDF, downloadPDF } from "@/lib/pdf";
import { useToast } from "@/hooks/use-toast";

const MONTHS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

export default function MonthlyReport() {
  const { monthYear } = useParams<{ monthYear: string }>();
  const { toast } = useToast();
  const settings = getSettings();
  const [dailySales, setDailySales] = useState<Array<{ date: string; total: number; dayName: string; dayNum: number }>>([]);

  useEffect(() => {
    if (monthYear) {
      loadData();
    }
  }, [monthYear]);

  const loadData = async () => {
    try {
      const [year, month] = monthYear!.split("-").map(Number);
      const data = await getDailyTotals(year, month);
      setDailySales(data || []);
    } catch (error) {
      console.error('Erreur chargement données:', error);
      setDailySales([]);
    }
  };

  if (!monthYear) return null;

  const [year, month] = monthYear.split("-").map(Number);
  const monthName = MONTHS_FR[month - 1];
  const totalRevenue = dailySales.reduce((sum, d) => sum + (d?.total || 0), 0);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount) + ` ${settings.currency_symbol}`;

  const handleGeneratePDF = () => {
    const doc = generateMonthlyPDF(year, month, dailySales);
    downloadPDF(doc, `rapport-${monthYear}.pdf`);
    toast({ title: "PDF généré" });
  };

  const handleSharePDF = async () => {
    const doc = generateMonthlyPDF(year, month, dailySales);
    await sharePDF(doc, `rapport-${monthYear}.pdf`);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-1/3 -top-1/3 h-2/3 w-2/3 rounded-full bg-primary/3 blur-3xl" />
      </div>

      <div className="relative z-10">
        <header className="border-b border-border/50 bg-card/50 backdrop-blur-xl">
          <div className="container flex h-16 items-center gap-4">
            <Button onClick={() => window.history.back()} className="inline-flex items-center gap-2 bg-card/80 hover:bg-card px-3 py-1 rounded">
              <ArrowLeft className="h-5 w-5" />
              Retour
            </Button>
            <h1 className="font-display text-xl font-bold">
              <span className="text-gradient-gold">Recette — {monthName} {year}</span>
            </h1>
          </div>
        </header>

        <main className="container py-8">
          {/* Total Card */}
          <div className="card-premium mb-8 p-8 text-center shimmer-gold">
            <p className="text-sm text-muted-foreground">Total du mois</p>
            <p className="revenue-number mt-2 text-5xl">{formatCurrency(totalRevenue)}</p>
          </div>

          {/* Export Buttons */}
          <div className="mb-6 flex flex-wrap gap-2 justify-end">
            <Button
              onClick={handleGeneratePDF}
              variant="outline"
              className="border-primary/30 hover:bg-primary/10"
              disabled={dailySales.length === 0}
            >
              <Download className="mr-2 h-4 w-4" />
              Exporter PDF
            </Button>
            <Button
              onClick={handleSharePDF}
              variant="outline"
              className="border-primary/30 hover:bg-primary/10"
              disabled={dailySales.length === 0}
            >
              <Share2 className="mr-2 h-4 w-4" />
              Partager
            </Button>
          </div>

          {/* Daily Breakdown Table */}
          <div className="card-premium overflow-hidden">
            {dailySales.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                Aucune vente pour ce mois
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50 hover:bg-transparent">
                    <TableHead className="text-muted-foreground">Date</TableHead>
                    <TableHead className="text-right text-muted-foreground">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dailySales.map(day => (
                    <TableRow key={day.date} className="border-border/50">
                      <TableCell className="text-foreground">
                        <Link
                          to={`/day/${day.date}`}
                          className="hover:text-primary hover:underline"
                        >
                          {new Date(day.date + "T00:00:00").toLocaleDateString("fr-FR", {
                            weekday: "long",
                            day: "numeric",
                          })}
                        </Link>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-primary">
                        {formatCurrency(day.total)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
