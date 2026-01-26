import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DollarSign, CreditCard, TrendingUp, Plus, FileText, Receipt, Printer } from "@/lib/lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  getTypeBalance,
  getDailyRevenue,
  getMonthlyRevenue,
  getSettings,
  TransferType,
} from "@/lib/storage";

export default function Dashboard() {
  const navigate = useNavigate();
  const settings = getSettings();
  const [isLoading, setIsLoading] = useState(true);
  const [cashBalance, setCashBalance] = useState(0);
  const [digitalBalance, setDigitalBalance] = useState(0);
  const [revenueToday, setRevenueToday] = useState(0);
  const [revenueMonth, setRevenueMonth] = useState(0);
  const [companyType, setCompanyType] = useState<string | null>(null);

  // Fonction sécurisée de formatage
  const safeCurrency = (amount: unknown): string => {
    const num = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
    return num.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const ct = await (await import("@/lib/storage")).getCompanyType();
        setCompanyType(ct);
        // Récupérer les balances consolidées de tous les services
        const services: TransferType[] = ['zelle', 'moncash', 'natcash', 'cam_transfert', 'western_union', 'moneygram', 'autre'];
        let totalCash = 0;
        let totalDigital = 0;

        for (const service of services) {
          const balance = getTypeBalance(service);
          totalCash += balance.cash_balance;
          totalDigital += balance.digital_balance;
        }

        setCashBalance(totalCash);
        setDigitalBalance(totalDigital);

        // Récupérer les revenus
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        const monthlyRevenue = await getMonthlyRevenue(today.getFullYear(), today.getMonth() + 1);
        const dailyRevenue = await getDailyRevenue(todayStr);

        setRevenueMonth(monthlyRevenue);
        setRevenueToday(dailyRevenue);
      } catch (error) {
        console.error('Erreur chargement dashboard:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  if (isLoading) {
    return (
      <AppLayout title="Dashboard">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Chargement du dashboard...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Dashboard">
      <div className="space-y-6">
        <div className="card-premium p-6">
          <h1 className="font-display text-2xl font-bold text-card-foreground">
            Dashboard
          </h1>
        </div>

        {/* Stats Grid - conditional tiles based on company type */}
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          {companyType && (function renderTiles() {
            const type = companyType;
            if ([
              'Entreprise Individuelle',
              'Societe Anonyme',
              'Societe par Actions Simplifiee',
              'Societe a Responsabilite Limitee'
            ].includes(type)) {
              return (
                <>
                  <div className="card-premium p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <TrendingUp className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground">Chiffre d&apos;Affaires (mois)</h3>
                        <p className="financial-amount text-2xl text-black font-bold">{safeCurrency(revenueMonth)} {settings.currency_symbol}</p>
                      </div>
                    </div>
                  </div>

                  <div className="card-premium p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <DollarSign className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground">Marge nette (est.)</h3>
                        <p className="financial-amount text-2xl text-black font-bold">{safeCurrency(revenueMonth * 0.15)} {settings.currency_symbol}</p>
                      </div>
                    </div>
                  </div>

                  <div className="card-premium p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground">Provision IS (est.)</h3>
                        <p className="financial-amount text-2xl text-black font-bold">{safeCurrency(revenueMonth * 0.25)} {settings.currency_symbol}</p>
                      </div>
                    </div>
                  </div>
                </>
              );
            }

            if (['Organisation Non Gouvernementale', 'Fondation', 'Organisation Internationale'].includes(type)) {
              return (
                <>
                  <div className="card-premium p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <TrendingUp className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground">Ressources mobilisées (mois)</h3>
                        <p className="financial-amount text-2xl text-black font-bold">{safeCurrency(revenueMonth)} {settings.currency_symbol}</p>
                      </div>
                    </div>
                  </div>

                  <div className="card-premium p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground">Taux d'exécution projets</h3>
                        <p className="financial-amount text-2xl text-black font-bold">{safeCurrency( (revenueMonth > 0 ? (revenueMonth - cashBalance) / revenueMonth : 0) * 100 )}%</p>
                      </div>
                    </div>
                  </div>
                </>
              );
            }

            return (
              <>
                <div className="card-premium p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <DollarSign className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground">Revenu net</h3>
                      <p className="financial-amount text-2xl text-black font-bold">{safeCurrency(revenueMonth - (cashBalance * 0.1))} {settings.currency_symbol}</p>
                    </div>
                  </div>
                </div>
              </>
            );
          })()}
        </div>

        {/* Quick Actions */}
        <div className="card-premium p-8">
          <h2 className="text-luxury-title mb-6 text-center text-card-foreground">Actions rapides</h2>
          <div className="grid grid-cols-2 sm:grid-cols-2 md:flex md:justify-center gap-4">
            {companyType && (function renderQuickActions() {
              const isNonProfit = ['Organisation Non Gouvernementale', 'Fondation', 'Organisation Internationale'].includes(companyType);
              const isFoundation = companyType === 'Fondation';
              const isMerchant = ['Societe Anonyme', 'Societe par Actions Simplifiee', 'Societe a Responsabilite Limitee', 'Entreprise Individuelle'].includes(companyType);

              if (isNonProfit) {
                // ONG / OI
                if (!isFoundation) {
                  return (
                    <>
                      <button onClick={() => navigate('/transfers')} className="btn-gold-outline h-16 sm:h-18 px-4 sm:px-6 rounded-xl flex flex-col gap-2 items-center justify-center bg-emerald-50 sm:text-sm md:text-base">
                        <Plus className="h-5 w-5 text-emerald-600" />
                        <span className="text-xs sm:text-sm md:text-base">Nouveau décaissement</span>
                      </button>
                      <button onClick={() => navigate('/donations')} className="btn-gold-outline h-16 sm:h-18 px-4 sm:px-6 rounded-xl flex flex-col gap-2 items-center justify-center bg-emerald-50 sm:text-sm md:text-base">
                        <FileText className="h-5 w-5 text-emerald-600" />
                        <span className="text-xs sm:text-sm md:text-base">Rapport de mission</span>
                      </button>
                      <button onClick={() => navigate('/products')} className="btn-gold-outline h-16 sm:h-18 px-4 sm:px-6 rounded-xl flex flex-col gap-2 items-center justify-center bg-emerald-50 sm:text-sm md:text-base">
                        <Printer className="h-5 w-5 text-emerald-600" />
                        <span className="text-xs sm:text-sm md:text-base">Inventaire Dons</span>
                      </button>
                    </>
                  );
                }

                // Foundation
                return (
                  <>
                    <button onClick={() => navigate('/projects')} className="btn-gold-outline h-16 sm:h-18 px-4 sm:px-6 rounded-xl flex flex-col gap-2 items-center justify-center bg-sky-50 sm:text-sm md:text-base">
                      <Plus className="h-5 w-5 text-sky-600" />
                      <span className="text-xs sm:text-sm md:text-base">Nouvel octroi</span>
                    </button>
                    <button onClick={() => navigate('/reports')} className="btn-gold-outline h-16 sm:h-18 px-4 sm:px-6 rounded-xl flex flex-col gap-2 items-center justify-center bg-sky-50 sm:text-sm md:text-base">
                      <FileText className="h-5 w-5 text-sky-600" />
                      <span className="text-xs sm:text-sm md:text-base">Bilan philanthropique</span>
                    </button>
                    <button onClick={() => navigate('/members')} className="btn-gold-outline h-16 sm:h-18 px-4 sm:px-6 rounded-xl flex flex-col gap-2 items-center justify-center bg-sky-50 sm:text-sm md:text-base">
                      <Printer className="h-5 w-5 text-sky-600" />
                      <span className="text-xs sm:text-sm md:text-base">Bénéficiaires</span>
                    </button>
                  </>
                );
              }

              if (isMerchant) {
                // SA / SAS
                if (['Societe Anonyme', 'Societe par Actions Simplifiee'].includes(companyType)) {
                  return (
                    <>
                      <button onClick={() => navigate('/transfers')} className="btn-gold-outline h-20 px-6 rounded-xl flex flex-col gap-2 items-center justify-center bg-amber-50">
                        <Plus className="h-5 w-5 text-amber-600" />
                        <span className="text-xs">Flux de trésorerie</span>
                      </button>
                      <button onClick={() => navigate('/reports')} className="btn-gold-outline h-20 px-6 rounded-xl flex flex-col gap-2 items-center justify-center bg-amber-50">
                        <FileText className="h-5 w-5 text-amber-600" />
                        <span className="text-xs">États financiers</span>
                      </button>
                      <button onClick={() => navigate('/products')} className="btn-gold-outline h-20 px-6 rounded-xl flex flex-col gap-2 items-center justify-center bg-amber-50">
                        <Printer className="h-5 w-5 text-amber-600" />
                        <span className="text-xs">Gestion Stock</span>
                      </button>
                    </>
                  );
                }

                // SARL / EI
                return (
                  <>
                    <button onClick={() => navigate('/transfers')} className="btn-gold-outline h-20 px-6 rounded-xl flex flex-col gap-2 items-center justify-center bg-amber-50">
                      <Plus className="h-5 w-5 text-amber-600" />
                      <span className="text-xs">Vente rapide</span>
                    </button>
                    <button onClick={() => navigate('/reports')} className="btn-gold-outline h-20 px-6 rounded-xl flex flex-col gap-2 items-center justify-center bg-amber-50">
                      <FileText className="h-5 w-5 text-amber-600" />
                      <span className="text-xs">Ticket de caisse</span>
                    </button>
                    <button onClick={() => navigate('/products')} className="btn-gold-outline h-20 px-6 rounded-xl flex flex-col gap-2 items-center justify-center bg-amber-50">
                      <Printer className="h-5 w-5 text-amber-600" />
                      <span className="text-xs">Catalogue Produits</span>
                    </button>
                  </>
                );
              }

              // Fallback
              return (
                <>
                  <button onClick={() => navigate('/transfers')} className="btn-gold-outline h-20 px-6 rounded-xl flex flex-col gap-2 items-center justify-center">
                    <Plus className="h-5 w-5 text-primary" />
                    <span className="text-xs">Action 1</span>
                  </button>
                  <button onClick={() => navigate('/reports')} className="btn-gold-outline h-20 px-6 rounded-xl flex flex-col gap-2 items-center justify-center">
                    <FileText className="h-5 w-5 text-primary" />
                    <span className="text-xs">Action 2</span>
                  </button>
                  <button onClick={() => navigate('/calendar')} className="btn-gold-outline h-20 px-6 rounded-xl flex flex-col gap-2 items-center justify-center">
                    <Printer className="h-5 w-5 text-primary" />
                    <span className="text-xs">Action 3</span>
                  </button>
                </>
              );
            })()}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
