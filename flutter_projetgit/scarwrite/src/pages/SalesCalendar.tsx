import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "@/lib/lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  getDatesWithSales,
  getMonthlyRevenue,
  getSettings,
} from "@/lib/storage";

const MONTHS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

const DAYS_FR = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export default function SalesCalendar() {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [salesDays, setSalesDays] = useState<Set<string>>(new Set());
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  const [companyType, setCompanyType] = useState<string | null>(null);
  const settings = getSettings();

  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  useEffect(() => {
    loadMonthData();
    // load company type for Caméléon behavior
    (async () => {
      try {
        const { getCompanyType } = await import("@/lib/storage");
        const ct = await getCompanyType();
        setCompanyType(ct);
      } catch (err) {
        console.error('Erreur récupération company type:', err);
      }
    })();
  }, [currentMonth, currentYear]);

  const loadMonthData = async () => {
    const daysWithSales = await getDatesWithSales();
    setSalesDays(new Set(daysWithSales));
    const revenue = await getMonthlyRevenue(currentYear, currentMonth + 1);
    setMonthlyRevenue(revenue);
  };

  const navigateMonth = (delta: number) => {
    setCurrentDate(new Date(currentYear, currentMonth + delta, 1));
  };

  const getDaysInMonth = () => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const startDayOfWeek = (firstDay.getDay() + 6) % 7; // Monday = 0
    
    const days: (number | null)[] = [];
    
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }
    
    for (let day = 1; day <= lastDay.getDate(); day++) {
      days.push(day);
    }
    
    return days;
  };

  const handleDayClick = (day: number) => {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    navigate(`/day/${dateStr}`);
  };

  const days = getDaysInMonth();

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("fr-FR").format(amount) + ` ${settings.currency_symbol}`;

  // Determine labels and colors based on company type
  const isMerchant = companyType && [
    'Entreprise Individuelle',
    'Societe Anonyme',
    'Societe par Actions Simplifiee',
    'Societe a Responsabilite Limitee'
  ].includes(companyType);

  const isNonProfit = companyType && [
    'Organisation Non Gouvernementale',
    'Fondation',
    'Organisation Internationale'
  ].includes(companyType);

  const pageTitle = isNonProfit ? (
    companyType === 'Fondation' ? 'Suivi des Dotations' : 'Journal des Missions'
  ) : 'Calendrier des Ventes';

  const actionButtonLabel = isNonProfit
    ? (companyType === 'Fondation' ? 'Nouvel Octroi' : 'Nouveau Rapport')
    : 'Nouvelle Vente';

  const pointColorClass = isNonProfit
    ? (companyType === 'Fondation' ? 'bg-sky-600' : 'bg-emerald-500')
    : 'bg-amber-500';

  return (
    <AppLayout title={pageTitle}>
      <div className="space-y-6">
        {/* Header Card */}
        <div className="card-premium p-6">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigateMonth(-1)}
              className="text-card-foreground"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            
            <div className="text-center">
              <h2 className="font-display text-2xl font-semibold text-card-foreground">
                {MONTHS_FR[currentMonth]} {currentYear}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {isNonProfit ? `Fonds mobilisés: ${formatCurrency(monthlyRevenue)}` : `Recette: ${formatCurrency(monthlyRevenue)}`}
              </p>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigateMonth(1)}
              className="text-card-foreground"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
            {/* Primary action changes per Caméléon */}
            <div className="ml-4">
              <Button
                onClick={() => {
                  // Navigate to appropriate creation pages depending on type
                  if (isNonProfit) {
                    navigate(companyType === 'Fondation' ? '/projects' : '/donations');
                  } else {
                    // For merchants open today's sales day so user can add a new sale
                    const today = new Date().toISOString().slice(0, 10);
                    navigate(`/day/${today}`);
                  }
                }}
                className={`${isNonProfit ? 'bg-emerald-500 text-white' : 'bg-yellow-500 text-black'} hidden md:inline-flex`}
              >
                {actionButtonLabel}
              </Button>
            </div>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="card-premium p-4">
          {/* Day headers */}
          <div className="mb-2 grid grid-cols-7 gap-1">
            {DAYS_FR.map(day => (
              <div key={day} className="p-2 text-center text-xs font-medium text-muted-foreground">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, index) => {
              if (day === null) {
                return <div key={`empty-${index}`} className="p-2" />;
              }

              const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const hasSales = salesDays.has(dateStr);
              const isToday = new Date().toISOString().split("T")[0] === dateStr;

              return (
                <button
                  key={day}
                  onClick={() => handleDayClick(day)}
                  className={`
                    relative flex h-12 items-center justify-center rounded-lg
                    text-sm font-medium transition-all
                    hover:bg-muted
                    ${isToday ? "bg-primary/10 text-primary" : "text-card-foreground"}
                  `}
                >
                  {day}
                  {hasSales && (
                    <span className={`absolute bottom-1 h-1.5 w-1.5 rounded-full ${pointColorClass}`} />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Monthly report link */}
        <div className="text-center">
          <Button asChild className="bg-slate-800 text-black px-4 py-2 rounded-md shadow-md">
            <Link to={`/reports/month/${currentYear}-${String(currentMonth + 1).padStart(2, "0")}`}>
              Voir le rapport du mois
            </Link>
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
