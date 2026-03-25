import { useState, useMemo, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  Plus, Calendar, BarChart3, Pencil, Trash, PiggyBank, Wallet, 
  ArrowLeft, DollarSign, TrendingUp, Smartphone, FileText 
} from "lucide-react"; // Correction de l'import (lib/lucide-react n'existe pas souvent)
import { TransferTypeSelector } from "@/components/TransferTypeSelector";
import { TransferForm } from "@/components/TransferForm";
import { BalanceHeader } from "@/components/BalanceHeader";
import { OperationButtons } from "@/components/OperationButtons";
import { OperationForm } from "@/components/OperationForm";
import { getTransferTypeName } from "@/components/TransferTypeSelector";
import { AppLayout } from "@/components/layout/AppLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { QuickActionButton } from "@/components/dashboard/QuickActionButton";
import { 
  TransferType, 
  OperationType,
  Transfer,
  FinancialOperation,
  getSettings, 
  getDailyTransferRevenue, 
  getMonthlyTransferRevenue, 
  getFiscalYearTransferRevenue,
  getTransfersByDate,
  deleteTransfer,
  getOperationsByService,
  deleteOperation
} from "@/lib/storage";
import { useToast } from "@/hooks/use-toast";

type ViewMode = 'menu' | 'select-type' | 'form' | 'type-detail' | 'operation-form' | 'edit-form' | 'operations-list' | 'edit-operation';

export default function Transfers() {
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // 1. GESTION DE L'ENTITÉ ACTIVE (Silos)
  const [activeEntity] = useState(() => localStorage.getItem("scarwrite_active_entity") || "SA");
  
  const [viewMode, setViewMode] = useState<ViewMode>('menu');
  const [selectedType, setSelectedType] = useState<TransferType | null>(null);
  const [selectedOperation, setSelectedOperation] = useState<OperationType | null>(null);
  const [editingTransfer, setEditingTransfer] = useState<Transfer | null>(null);
  const [editingOperation, setEditingOperation] = useState<FinancialOperation | null>(null);
  const [operations, setOperations] = useState<FinancialOperation[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [todayTransfers, setTodayTransfers] = useState<Transfer[]>([]);
  
  const [revenues, setRevenues] = useState({ daily: 0, monthly: 0, annual: 0 });
  const settings = getSettings();

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const fiscalYearStart = currentMonth >= 9 ? currentYear : currentYear - 1;

  // 2. CHARGEMENT DES DONNÉES AVEC ISOLATION
  useEffect(() => {
    const loadAllData = async () => {
      try {
        // On passe activeEntity aux fonctions si elles le supportent, 
        // ou on s'assure que refreshKey force le rechargement depuis le localStorage préfixé
        const daily = await getDailyTransferRevenue(todayStr);
        const monthly = await getMonthlyTransferRevenue(currentYear, currentMonth + 1);
        const annual = await getFiscalYearTransferRevenue(fiscalYearStart);
        const transfers = await getTransfersByDate(todayStr);

        setRevenues({ daily, monthly, annual });
        setTodayTransfers(transfers);
      } catch (error) {
        console.error("Erreur lors du chargement des données de transfert:", error);
      }
    };
    loadAllData();
  }, [activeEntity, refreshKey, todayStr]);

  // 3. HANDLERS CORRIGÉS
  const handleSelectType = (type: TransferType) => {
    setSelectedType(type);
    setViewMode('form');
  };

  const handleFormSuccess = () => {
    setViewMode('menu');
    setSelectedType(null);
    setEditingTransfer(null);
    setRefreshKey(k => k + 1);
    toast({ title: "Transaction enregistrée avec succès" });
  };

  const handleOperationSuccess = () => {
    setViewMode('type-detail');
    setSelectedOperation(null);
    setRefreshKey(k => k + 1);
    toast({ title: "Opération mise à jour" });
  };

  const handleDeleteTransfer = (id: string) => {
    if (confirm("Supprimer ce transfert ?")) {
      deleteTransfer(id);
      setRefreshKey(k => k + 1);
      toast({ title: "Transfert supprimé", variant: "destructive" });
    }
  };

  const handleBack = () => {
    if (['form', 'edit-form'].includes(viewMode)) setViewMode('select-type');
    else if (['operation-form', 'edit-operation'].includes(viewMode)) setViewMode('type-detail');
    else setViewMode('menu');
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: settings.currency_symbol || 'HTG',
    }).format(amount);
  };

  return (
    <AppLayout title={`Transactions - ${activeEntity}`}>
      {!settings.transfer_house_enabled ? (
        <div className="card-premium p-8 text-center space-y-4">
          <h1 className="text-2xl font-bold">Module Désactivé</h1>
          <p className="text-muted-foreground">Activez la 'Maison de Transfert' dans les réglages de l'entité {activeEntity}.</p>
          <Button onClick={() => navigate("/settings")}>Paramètres</Button>
        </div>
      ) : (
        <div className="space-y-6 animate-in fade-in duration-500">
          
          {/* MENU PRINCIPAL */}
          {viewMode === 'menu' && (
            <>
              <div className="grid gap-4 md:grid-cols-3">
                <StatCard title="Recette Jour" amount={revenues.daily} icon={DollarSign} currency={settings.currency_symbol} />
                <StatCard title="Recette Mois" amount={revenues.monthly} icon={TrendingUp} currency={settings.currency_symbol} />
                <StatCard title="Recette Annuelle" amount={revenues.annual} icon={TrendingUp} currency={settings.currency_symbol} />
              </div>

              <div className="card-premium p-6">
                <h2 className="text-lg font-bold mb-4">Actions Rapides</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <QuickActionButton icon={Plus} label="Transfert" onClick={() => setViewMode('select-type')} />
                  <QuickActionButton icon={PiggyBank} label="Dépôt" onClick={() => { setSelectedOperation('deposit'); setViewMode('type-detail'); }} />
                  <QuickActionButton icon={Wallet} label="Retrait" onClick={() => { setSelectedOperation('withdrawal'); setViewMode('type-detail'); }} />
                  <QuickActionButton icon={Calendar} label="Historique" onClick={() => navigate("/transfers/calendar")} />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Button className="h-16 bg-amber-400 text-black font-bold hover:bg-amber-500" onClick={() => setViewMode('type-detail')}>
                  <Smartphone className="mr-2 h-5 w-5" /> Gérer les soldes ({activeEntity})
                </Button>
                <Button asChild variant="outline" className="h-16 border-primary/30">
                  <Link to="/transfers/reports">
                    <BarChart3 className="mr-2 h-5 w-5 text-primary" /> Rapports PDF
                  </Link>
                </Button>
              </div>

              {/* LISTE DU JOUR */}
              {todayTransfers.length > 0 && (
                <div className="card-premium p-6">
                  <h2 className="font-bold mb-4">Transferts du jour ({activeEntity})</h2>
                  <div className="space-y-3">
                    {todayTransfers.map((t) => (
                      <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border">
                        <div>
                          <p className="font-bold text-sm">N° {t.report_number} - {getTransferTypeName(t.transfer_type, t.custom_type_name)}</p>
                          <p className="text-xs text-muted-foreground">{t.sender_name} ➔ {t.receiver_name}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-primary">{t.amount_gdes} HTG</span>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteTransfer(t.id)} className="text-destructive"><Trash className="h-4 w-4" /></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* SÉLECTION TYPE */}
          {viewMode === 'select-type' && (
            <div className="max-w-md mx-auto space-y-4">
              <Button variant="ghost" onClick={handleBack}><ArrowLeft className="mr-2" /> Retour</Button>
              <div className="card-premium p-6">
                <TransferTypeSelector onSelect={handleSelectType} />
              </div>
            </div>
          )}

          {/* FORMULAIRE TRANSFERT */}
          {['form', 'edit-form'].includes(viewMode) && selectedType && (
            <div className="max-w-lg mx-auto card-premium p-6">
               <h2 className="text-xl font-bold mb-6 text-center">Nouveau Transfert {activeEntity}</h2>
               <TransferForm 
                type={selectedType} 
                onBack={handleBack} 
                onSuccess={handleFormSuccess} 
                editTransfer={editingTransfer || undefined}
              />
            </div>
          )}

          {/* GESTION DES SOLDES / OPÉRATIONS */}
          {viewMode === 'type-detail' && (
            <div className="max-w-md mx-auto space-y-4">
              <Button variant="ghost" onClick={handleBack}><ArrowLeft className="mr-2" /> Retour</Button>
              <div className="card-premium p-6">
                {!selectedType ? (
                  <TransferTypeSelector onSelect={(type) => { setSelectedType(type); if (selectedOperation) setViewMode('operation-form'); }} />
                ) : (
                  <>
                    <BalanceHeader 
                      transferType={selectedType} 
                      onBalanceChange={() => setRefreshKey(k => k + 1)} 
                      refreshKey={refreshKey}
                    />
                    <OperationButtons onSelectOperation={(op) => { setSelectedOperation(op); setViewMode('operation-form'); }} />
                    <Button variant="link" className="w-full mt-4" onClick={() => setSelectedType(null)}>Changer de service</Button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* FORMULAIRE DÉPÔT/RETRAIT */}
          {viewMode === 'operation-form' && selectedType && selectedOperation && (
            <div className="max-w-lg mx-auto card-premium p-6">
               <h2 className="text-xl font-bold mb-6 text-center capitalize">{selectedOperation === 'deposit' ? 'Dépôt' : 'Retrait'} - {selectedType}</h2>
               <OperationForm
                operationType={selectedOperation}
                transferType={selectedType}
                onBack={handleBack}
                onSuccess={handleOperationSuccess}
              />
            </div>
          )}
        </div>
      )}
    </AppLayout>
  );
}
