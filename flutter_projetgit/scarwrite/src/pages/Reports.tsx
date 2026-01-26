import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CalendarDays, TrendingUp, Download } from "@/lib/lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { generateFinancialOperationsPDF } from "@/lib/pdf";
import { getOperationsByService } from "@/lib/storage";
import { TransferType } from "@/lib/storage";

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
      const services: TransferType[] = ['zelle', 'moncash', 'natcash', 'cam_transfert', 'western_union', 'moneygram', 'autre'];
      const allOperations = [];

      for (const service of services) {
        const operations = await getOperationsByService(service);
        const dailyOps = operations.filter(op => op.operation_date === todayStr);
        allOperations.push(...dailyOps);
      }

      if (allOperations.length === 0) {
        alert('Aucune opération trouvée pour aujourd\'hui');
        return;
      }

      const opts = (() => { try { return JSON.parse(localStorage.getItem('reportOptions') || 'null'); } catch { return null; } })();
      const doc = generateFinancialOperationsPDF(allOperations, todayStr, todayStr, opts || undefined);
      doc.save(`rapport-journalier-${todayStr}.pdf`);
    } catch (error) {
      console.error('Erreur génération PDF:', error);
      alert('Erreur lors de la génération du rapport');
    }
  };

  const downloadMonthlyReport = async (year: number, month: number) => {
    try {
      const services: TransferType[] = ['zelle', 'moncash', 'natcash', 'cam_transfert', 'western_union', 'moneygram', 'autre'];
      const allOperations = [];

      for (const service of services) {
        const operations = await getOperationsByService(service);
        const monthlyOps = operations.filter(op => {
          const opDate = new Date(op.operation_date);
          return opDate.getFullYear() === year && opDate.getMonth() === month - 1;
        });
        allOperations.push(...monthlyOps);
      }

      if (allOperations.length === 0) {
        alert('Aucune opération trouvée pour ce mois');
        return;
      }

      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDate = new Date(year, month, 0).toISOString().split('T')[0];
      const opts = (() => { try { return JSON.parse(localStorage.getItem('reportOptions') || 'null'); } catch { return null; } })();
      const doc = generateFinancialOperationsPDF(allOperations, startDate, endDate, opts || undefined);
      doc.save(`rapport-mensuel-${MONTHS_FR[month - 1].toLowerCase()}-${year}.pdf`);
    } catch (error) {
      console.error('Erreur génération PDF:', error);
      alert('Erreur lors de la génération du rapport');
    }
  };

  const downloadAnnualReport = async () => {
    try {
      const services: TransferType[] = ['zelle', 'moncash', 'natcash', 'cam_transfert', 'western_union', 'moneygram', 'autre'];
      const allOperations = [];

      for (const service of services) {
        const operations = await getOperationsByService(service);
        const annualOps = operations.filter(op => {
          const opDate = new Date(op.operation_date);
          const opFiscalYear = opDate.getMonth() >= 9 ? opDate.getFullYear() : opDate.getFullYear() - 1;
          return opFiscalYear === fiscalYearStart;
        });
        allOperations.push(...annualOps);
      }

      if (allOperations.length === 0) {
        alert('Aucune opération trouvée pour cette année fiscale');
        return;
      }

      const startDate = `${fiscalYearStart}-10-01`;
      const endDate = `${fiscalYearStart + 1}-09-30`;
      const opts = (() => { try { return JSON.parse(localStorage.getItem('reportOptions') || 'null'); } catch { return null; } })();
      const doc = generateFinancialOperationsPDF(allOperations, startDate, endDate, opts || undefined);
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
