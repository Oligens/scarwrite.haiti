import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CalendarDays, TrendingUp, Download } from "@/lib/lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { generateDailyPDF, generateMonthlyPDF, generateAnnualPDF } from "@/lib/pdf";
import { getSalesByDate, getSalesByMonth, getSalesByFiscalYear } from "@/lib/storage";

const MONTHS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

export default function Reports() {
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const fiscalYearStart = currentMonth >= 9 ? currentYear : currentYear - 1;

  const fiscalMonths = [];
  for (let i = 0; i < 12; i++) {
    const monthIndex = (9 + i) % 12;
    const year = monthIndex >= 9 ? fiscalYearStart : fiscalYearStart + 1;
    fiscalMonths.push({
      month: monthIndex,
      year,
      label: `${MONTHS_FR[monthIndex]} ${year}`,
      value: `${year}-${String(monthIndex + 1).padStart(2, "0")}`,
    });
  }

  const downloadDailyReport = async () => {
    try {
      const todayStr = today.toISOString().split('T')[0];
      const sales = await getSalesByDate(todayStr);
      if (!sales || sales.length === 0) {
        alert('Aucune vente trouvée pour aujourd\'hui');
        return;
      }
      const doc = generateDailyPDF(todayStr, sales);
      doc.save(`rapport-journalier-${todayStr}.pdf`);
    } catch (error) {
      console.error('Erreur génération PDF:', error);
      alert('Erreur lors de la génération du rapport');
    }
  };

  const downloadMonthlyReport = async (year: number, month: number) => {
    try {
      const sales = await getSalesByMonth(year, month);
      if (!sales || sales.length === 0) {
        alert('Aucune vente trouvée pour ce mois');
        return;
      }
      // Build daily totals expected by generateMonthlyPDF
      const map: Record<string, number> = {};
      sales.forEach(s => { map[s.sale_date] = (map[s.sale_date] || 0) + (s.total || 0); });
      const dailyTotals = Object.entries(map).map(([date, total]) => ({ date, total }));
      const doc = generateMonthlyPDF(year, month, dailyTotals);
      doc.save(`rapport-mensuel-${MONTHS_FR[month - 1].toLowerCase()}-${year}.pdf`);
    } catch (error) {
      console.error('Erreur génération PDF:', error);
      alert('Erreur lors de la génération du rapport');
    }
  };

  const downloadAnnualReport = async () => {
    try {
      const sales = await getSalesByFiscalYear(fiscalYearStart);
      if (!sales || sales.length === 0) {
        alert('Aucune vente trouvée pour cette année fiscale');
        return;
      }
      // Build monthly totals expected by generateAnnualPDF
      const monthsMap: Record<string, { label: string; year: number; total: number }> = {};
      for (const s of sales) {
        const d = new Date(s.sale_date);
        const monthIdx = d.getMonth();
        const year = d.getFullYear();
        const key = `${year}-${String(monthIdx+1).padStart(2,'0')}`;
        if (!monthsMap[key]) monthsMap[key] = { label: MONTHS_FR[monthIdx], year, total: 0 };
        monthsMap[key].total += s.total || 0;
      }
      const monthlyTotals = Object.values(monthsMap);
      const doc = generateAnnualPDF(fiscalYearStart, monthlyTotals);
      doc.save(`rapport-annuel-${fiscalYearStart}-${fiscalYearStart + 1}.pdf`);
    } catch (error) {
      console.error('Erreur génération PDF:', error);
      alert('Erreur lors de la génération du rapport');
    }
  };

  return (
    <AppLayout title="Rapports">
      <div className="space-y-6">
        {/* Header */}
        <div className="card-premium p-6">
          <h1 className="font-display text-2xl font-bold text-card-foreground">
            Rapports
          </h1>
        </div>

        {/* Annual Report Link */}
        <Button
          asChild
          variant="outline"
          className="w-full justify-start border-primary/30 bg-card py-6 hover:bg-primary/5"
        >
          <Link to={`/reports/annual/${fiscalYearStart}`}>
            <TrendingUp className="mr-3 h-5 w-5 text-primary" />
            <div className="text-left">
              <p className="font-semibold text-card-foreground">Rapport annuel</p>
              <p className="text-xs text-muted-foreground">
                Octobre {fiscalYearStart} — Septembre {fiscalYearStart + 1}
              </p>
            </div>
          </Link>
        </Button>

        {/* Monthly Reports Grid */}
        <div className="card-premium p-6">
          <h2 className="mb-4 font-display text-lg font-semibold text-card-foreground underline-gold">
            Rapports mensuels
          </h2>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {fiscalMonths.map((m, index) => (
              <Button
                key={m.value}
                asChild
                variant="outline"
                className="justify-start border-border opacity-0 animate-fade-in hover:border-primary/30 hover:bg-primary/5"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <Link to={`/reports/month/${m.value}`}>
                  <CalendarDays className="mr-3 h-4 w-4 text-white" />
                  <span className="text-white font-bold">{m.label}</span>
                </Link>
              </Button>
            ))}
          </div>
        </div>

        {/* PDF Downloads */}
        <div className="card-premium p-6">
          <h2 className="font-display text-xl font-semibold text-card-foreground mb-4">
            Téléchargements PDF
          </h2>
          <div className="mb-4">
            <Button asChild variant="outline" className="w-full justify-start border-border bg-card py-4 hover:bg-primary/5">
              <Link to="/accounting">
                <Download className="mr-3 h-5 w-5 text-primary" />
                <div className="text-left">
                  <p className="font-semibold text-card-foreground">Système Comptable</p>
                  <p className="text-xs text-muted-foreground">Journal, Grand Livre, Balance & États</p>
                </div>
              </Link>
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Button
              variant="outline"
              className="justify-start border-primary/30 bg-card py-4 hover:bg-primary/5"
              onClick={downloadDailyReport}
            >
              <Download className="mr-3 h-5 w-5 text-primary" />
              <div className="text-left">
                <p className="font-semibold text-card-foreground">Rapport journalier</p>
                <p className="text-xs text-muted-foreground">Aujourd'hui</p>
              </div>
            </Button>

            <Button
              variant="outline"
              className="justify-start border-primary/30 bg-card py-4 hover:bg-primary/5"
              onClick={() => downloadMonthlyReport(currentYear, currentMonth + 1)}
            >
              <Download className="mr-3 h-5 w-5 text-primary" />
              <div className="text-left">
                <p className="font-semibold text-card-foreground">Rapport mensuel</p>
                <p className="text-xs text-muted-foreground">{MONTHS_FR[currentMonth]} {currentYear}</p>
              </div>
            </Button>

            <Button
              variant="outline"
              className="justify-start border-primary/30 bg-card py-4 hover:bg-primary/5"
              onClick={downloadAnnualReport}
            >
              <Download className="mr-3 h-5 w-5 text-primary" />
              <div className="text-left">
                <p className="font-semibold text-card-foreground">Rapport annuel</p>
                <p className="text-xs text-muted-foreground">{fiscalYearStart} - {fiscalYearStart + 1}</p>
              </div>
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
