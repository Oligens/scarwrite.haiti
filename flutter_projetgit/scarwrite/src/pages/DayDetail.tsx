import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, FileText, Share2, Printer } from "@/lib/lucide-react";
import { SalesTable } from "@/components/SalesTable";
import { SalesForm } from "@/components/SalesForm";
import {
  getSalesByDate,
  getSettings,
  Sale,
} from "@/lib/storage";
import { generateDailyPDF, generateClientReceipt, sharePDF, downloadPDF } from "@/lib/pdf";
import { useToast } from "@/hooks/use-toast";
import MissionReportForm from '@/components/MissionReportForm';

const DAYS_FR = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
const MONTHS_FR = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre"
];

export default function DayDetail() {
  const { date } = useParams<{ date: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [sales, setSales] = useState<Sale[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const [showMissionForm, setShowMissionForm] = useState(false);
  const [companyType, setCompanyType] = useState<string | null>(null);
  const settings = getSettings();

  useEffect(() => {
    if (date) {
      loadSales();
    }
    (async () => {
      try {
        const { getCompanyType } = await import('@/lib/storage');
        const ct = await getCompanyType();
        setCompanyType(ct);
      } catch (err) {
        console.error('Erreur getCompanyType:', err);
      }
    })();
  }, [date]);

  const loadSales = async () => {
    if (!date) return;
    try {
      const salesData = await getSalesByDate(date);
      setSales(salesData);
    } catch (error) {
      console.error('Erreur chargement ventes:', error);
      setSales([]); // Fallback
    }
  };

  if (!date) {
    navigate("/calendar");
    return null;
  }

  const parsedDate = new Date(date + "T00:00:00");
  const dayName = DAYS_FR[parsedDate.getDay()];
  const dayNum = parsedDate.getDate();
  const monthName = MONTHS_FR[parsedDate.getMonth()];
  const year = parsedDate.getFullYear();

  const totalRevenue = sales.reduce((sum, s) => sum + s.total, 0);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount) + ` ${settings.currency_symbol}`;

  const handleGeneratePDF = () => {
    const doc = generateDailyPDF(date, sales);
    downloadPDF(doc, `rapport-${date}.pdf`);
    toast({ title: "PDF généré" });
  };

  const handleSharePDF = async () => {
    const doc = generateDailyPDF(date, sales);
    await sharePDF(doc, `rapport-${date}.pdf`);
  };

  const handlePrintReceipt = () => {
    if (!lastSale) {
      toast({ title: "Erreur", description: "Aucune vente à imprimer", variant: "destructive" });
      return;
    }
    const doc = generateClientReceipt(
      lastSale.product_name,
      lastSale.quantity,
      lastSale.unit_price,
      lastSale.total,
      date
    );
    downloadPDF(doc, `recu-${lastSale.id.slice(0, 8)}.pdf`);
    toast({ title: "Reçu généré", description: "Le reçu client a été téléchargé" });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -right-1/3 -top-1/3 h-2/3 w-2/3 rounded-full bg-primary/3 blur-3xl" />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-border/50 bg-card/50 backdrop-blur-xl">
          <div className="container flex h-16 items-center gap-4">
            <Button onClick={() => window.history.back()} className="inline-flex items-center gap-2 bg-card/80 hover:bg-card px-3 py-1 rounded">
              <ArrowLeft className="h-5 w-5" />
              Retour
            </Button>
            <div>
              <h1 className="font-display text-lg font-bold text-foreground">
                {dayName} {dayNum} {monthName}
              </h1>
              <p className="text-xs text-muted-foreground">{year}</p>
            </div>
          </div>
        </header>

        <main className="container py-8">
          {/* Action buttons */}
          <div className="mb-6 flex flex-wrap gap-2">
            {companyType && ['Organisation Non Gouvernementale', 'Fondation', 'Organisation Internationale'].includes(companyType) ? (
              <>
                <Button
                  onClick={() => setShowMissionForm(true)}
                  className="bg-emerald-500 text-white hover:bg-emerald-600"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Nouveau Rapport
                </Button>
              </>
            ) : (
              <Button
                onClick={() => setShowForm(true)}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Plus className="mr-2 h-4 w-4" />
                Ajouter une vente
              </Button>
            )}
            {lastSale && (
              <Button
                onClick={handlePrintReceipt}
                variant="outline"
                className="border-amber-600/30 hover:bg-amber-600/10"
              >
                <Printer className="mr-2 h-4 w-4" />
                Imprimer le reçu
              </Button>
            )}
            {sales.length > 0 && (
              <>
                <Button
                  onClick={handleGeneratePDF}
                  variant="outline"
                  className="border-primary/30 hover:bg-primary/10"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Générer PDF
                </Button>
                <Button
                  onClick={handleSharePDF}
                  variant="outline"
                  className="border-primary/30 hover:bg-primary/10"
                >
                  <Share2 className="mr-2 h-4 w-4" />
                  Partager
                </Button>
              </>
            )}
          </div>

          {/* Sales Table */}
          <div className="card-premium mb-6 overflow-hidden">
            {sales.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                Aucune vente enregistrée pour cette journée
              </div>
            ) : (
              <SalesTable sales={sales} onUpdate={loadSales} />
            )}
          </div>

          {/* Total */}
          <div className="card-premium p-6 text-center">
            <p className="text-sm text-muted-foreground">Recette totale du jour</p>
            <p className="revenue-number mt-2">{formatCurrency(totalRevenue)}</p>
          </div>

          {/* Sales Form Modal */}
          {showForm && (
            <SalesForm
              date={date}
              onClose={() => setShowForm(false)}
              onSuccess={() => {
                setShowForm(false);
                loadSales().then(() => {
                  // Récupérer la dernière vente ajoutée
                  getSalesByDate(date).then(salesData => {
                    if (salesData.length > 0) {
                      setLastSale(salesData[salesData.length - 1]);
                    }
                  });
                });
              }}
            />
          )}

          {/* Mission report form for non-profits */}
          {showMissionForm && date && (
            <MissionReportForm date={date} onClose={() => setShowMissionForm(false)} onSuccess={() => { setShowMissionForm(false); loadSales(); }} />
          )}
        </main>
      </div>
    </div>
  );
}
