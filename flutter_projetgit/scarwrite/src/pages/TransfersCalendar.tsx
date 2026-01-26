import { useState, useMemo, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Download } from "@/lib/lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { getDatesWithTransfers, getTransfersByMonth, getSettings, getTypeBalance, Transfer } from "@/lib/storage";
import { generateTransferCalendarMonthlyPDF, downloadPDF } from "@/lib/pdf";
import { toast } from "sonner";

const MONTHS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

const DAYS_FR = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export default function TransfersCalendar() {
  const navigate = useNavigate();
  const settings = getSettings();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [datesWithTransfers, setDatesWithTransfers] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Charger les transferts et dates à la volée
  useEffect(() => {
    const loadTransferData = async () => {
      setIsLoading(true);
      try {
        const allDates = await getDatesWithTransfers();
        setDatesWithTransfers(new Set(allDates));
        
        const monthTransfers = await getTransfersByMonth(year, month + 1);
        setTransfers(monthTransfers);
      } catch (error) {
        console.error('Erreur chargement transferts:', error);
        toast.error('Erreur lors du chargement des transferts');
      } finally {
        setIsLoading(false);
      }
    };

    loadTransferData();
  }, [year, month]);

  const monthlyTotal = useMemo(() => 
    transfers.reduce((sum, t) => sum + (t.fees || 0), 0), 
    [transfers]
  );

  const getBalanceAfterTransfer = useCallback((transferId: string) => {
    const transfer = transfers.find(t => t.id === transferId);
    if (!transfer) return { cash: 0, digital: 0 };
    const balance = getTypeBalance(transfer.transfer_type, transfer.custom_type_name);
    return { cash: balance.cash_balance, digital: balance.digital_balance };
  }, [transfers]);

  const handleDownloadMonthlyReport = () => {
    if (transfers.length === 0) { toast.error("Aucun transfert ce mois-ci"); return; }
    const pdf = generateTransferCalendarMonthlyPDF(year, month + 1, transfers, getBalanceAfterTransfer);
    downloadPDF(pdf, `rapport-transferts-${MONTHS_FR[month].toLowerCase()}-${year}.pdf`);
    toast.success("Rapport téléchargé");
  };

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    let startDayOfWeek = firstDay.getDay() - 1;
    if (startDayOfWeek < 0) startDayOfWeek = 6;
    const days: Array<{ date: Date | null; dateStr: string; hasTransfers: boolean }> = [];
    for (let i = 0; i < startDayOfWeek; i++) days.push({ date: null, dateStr: '', hasTransfers: false });
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month, day);
      const dateStr = date.toISOString().split('T')[0];
      days.push({ date, dateStr, hasTransfers: datesWithTransfers.has(dateStr) });
    }
    return days;
  }, [year, month, datesWithTransfers]);

  const formatCurrency = (amount: number) => amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <AppLayout title="Calendrier Transferts">
      <div className="space-y-6">
        <div className="card-premium p-6">
          <div className="flex items-center justify-between">
            <Button size="icon" onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="text-black bg-amber-400 hover:bg-amber-500 rounded-lg">
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h2 className="font-display text-xl font-semibold text-card-foreground">{MONTHS_FR[month]} {year}</h2>
            <Button size="icon" onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="text-black bg-amber-400 hover:bg-amber-500 rounded-lg">
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="card-premium p-4">
          <div className="flex justify-between items-center mb-4">
            <div>
              <span className="text-muted-foreground text-sm">Recette du mois</span>
              <div className="text-2xl font-bold text-primary">{formatCurrency(monthlyTotal)} {settings.currency_symbol}</div>
            </div>
            {transfers.length > 0 && (
              <Button onClick={handleDownloadMonthlyReport} variant="outline" size="sm" className="border-primary/30 bg-card">
                <Download className="h-4 w-4 mr-2 text-primary" /> Télécharger
              </Button>
            )}
          </div>
          <div className="grid grid-cols-7 gap-1 mb-2">
            {DAYS_FR.map(day => <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">{day}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, index) => (
              <div key={index}>
                {day.date ? (
                  <button
                    onClick={() => day.hasTransfers && navigate(`/transfers/day/${day.dateStr}`)}
                    className={`w-full aspect-square rounded-lg flex items-center justify-center text-sm transition-all ${day.hasTransfers ? 'bg-primary/20 text-primary font-semibold hover:bg-primary/30 cursor-pointer ring-1 ring-primary/30' : 'text-card-foreground hover:bg-muted/50'}`}
                  >
                    {day.date.getDate()}
                  </button>
                ) : <div className="w-full aspect-square" />}
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
