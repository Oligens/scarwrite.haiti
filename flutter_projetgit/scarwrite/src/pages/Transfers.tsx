import { useState, useMemo, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus, Calendar, BarChart3, Pencil, Trash2, PiggyBank, Wallet, ArrowLeft, DollarSign, TrendingUp, Smartphone, FileText } from "@/lib/lucide-react";
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
  const [viewMode, setViewMode] = useState<ViewMode>('menu');
  const [selectedType, setSelectedType] = useState<TransferType | null>(null);
  const [selectedOperation, setSelectedOperation] = useState<OperationType | null>(null);
  const [editingTransfer, setEditingTransfer] = useState<Transfer | null>(null);
  const [editingOperation, setEditingOperation] = useState<FinancialOperation | null>(null);
  const [operations, setOperations] = useState<FinancialOperation[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [dailyRevenue, setDailyRevenue] = useState(0);
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  const [annualRevenue, setAnnualRevenue] = useState(0);
  const settings = getSettings();

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const fiscalYearStart = currentMonth >= 9 ? currentYear : currentYear - 1;

  useEffect(() => {
    const loadRevenues = async () => {
      const daily = await getDailyTransferRevenue(todayStr);
      const monthly = await getMonthlyTransferRevenue(currentYear, currentMonth + 1);
      const annual = await getFiscalYearTransferRevenue(fiscalYearStart);
      setDailyRevenue(daily);
      setMonthlyRevenue(monthly);
      setAnnualRevenue(annual);
    };
    loadRevenues();
  }, [todayStr, currentYear, currentMonth, fiscalYearStart, refreshKey]);

  useEffect(() => {
    const loadTodayTransfers = async () => {
      const transfers = await getTransfersByDate(todayStr);
      setTodayTransfers(transfers);
    };
    loadTodayTransfers();
  }, [todayStr, refreshKey]);

  const [todayTransfers, setTodayTransfers] = useState<Transfer[]>([]);

  const handleSelectType = (type: TransferType) => {
    setSelectedType(type);
    setViewMode('form');
  };

  const handleSelectTypeForOperations = (type: TransferType) => {
    setSelectedType(type);
    setViewMode('type-detail');
  };

  const handleSelectOperation = (opType: OperationType) => {
    setSelectedOperation(opType);
    setViewMode('operation-form');
  };

  const handleFormSuccess = () => {
    setViewMode('menu');
    setSelectedType(null);
    setEditingTransfer(null);
    setRefreshKey(k => k + 1);
  };

  const handleOperationSuccess = () => {
    setViewMode('type-detail');
    setSelectedOperation(null);
    setRefreshKey(k => k + 1);
  };

  const handleEditTransfer = (transfer: Transfer) => {
    setEditingTransfer(transfer);
    setSelectedType(transfer.transfer_type);
    setViewMode('edit-form');
  };

  const handleDeleteTransfer = (id: string) => {
    if (confirm("Supprimer ce transfert ?")) {
      deleteTransfer(id);
      setRefreshKey(k => k + 1);
      toast({ title: "Transfert supprimé" });
    }
  };

  const handleViewOperations = async () => {
    try {
      // Charger toutes les opérations de tous les services
      const allOperations: FinancialOperation[] = [];
      const services: TransferType[] = ['zelle', 'moncash', 'natcash', 'cam_transfert', 'western_union', 'moneygram', 'autre'];
      
      for (const service of services) {
        const serviceOperations = await getOperationsByService(service);
        allOperations.push(...serviceOperations);
      }
      
      // Trier par date décroissante
      allOperations.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      setOperations(allOperations);
      setViewMode('operations-list');
    } catch (error) {
      console.error('Erreur chargement opérations:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les opérations",
        variant: "destructive",
      });
    }
  };

  const handleEditOperation = (operation: FinancialOperation) => {
    setEditingOperation(operation);
    setSelectedType(operation.service_name as TransferType);
    setSelectedOperation(operation.operation_type as OperationType);
    setViewMode('edit-operation');
  };

  const handleDeleteOperation = (id: string) => {
    if (confirm("Supprimer cette opération ?")) {
      deleteOperation(id);
      setRefreshKey(k => k + 1);
      toast({ title: "Opération supprimée" });
    }
  };

  const handleBack = () => {
    if (viewMode === 'form' || viewMode === 'edit-form') {
      setViewMode('select-type');
      setEditingTransfer(null);
    } else if (viewMode === 'operation-form' || viewMode === 'edit-operation') {
      setViewMode('type-detail');
      setSelectedOperation(null);
      setEditingOperation(null);
    } else if (viewMode === 'type-detail') {
      setViewMode('menu');
      setSelectedType(null);
    } else {
      setViewMode('menu');
    }
  };

  const formatCurrency = (amount: number): string => {
    return amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <AppLayout title="Transactions">
      {!settings.transfer_house_enabled && (
        <div className="space-y-6">
          <div className="card-premium p-6">
            <h1 className="font-display text-2xl font-bold text-card-foreground">Module Maison de Transfert désactivé</h1>
            <p className="text-sm text-muted-foreground mt-2">Vous pouvez activer la Maison de Transfert dans les Paramètres pour accéder aux transferts, dépôts et retraits.</p>
            <div className="mt-4">
              <Button asChild>
                <a href="/settings">Ouvrir les Paramètres</a>
              </Button>
            </div>
          </div>
        </div>
      )}

      {settings.transfer_house_enabled && viewMode === 'menu' && (
        <div className="space-y-6">
          {/* Header */}
          <div className="card-premium p-6">
            <h1 className="font-display text-2xl font-bold text-card-foreground">
              Transactions
            </h1>
          </div>

          {/* Revenue Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard
              title="Recette du jour"
              amount={dailyRevenue}
              icon={DollarSign}
              currency={settings.currency_symbol}
              isLoading={false}
              delay={0}
            />
            <StatCard
              title="Recette du mois"
              amount={monthlyRevenue}
              icon={TrendingUp}
              currency={settings.currency_symbol}
              isLoading={false}
              delay={50}
            />
            <StatCard
              title="Recette annuelle"
              amount={annualRevenue}
              icon={TrendingUp}
              currency={settings.currency_symbol}
              isLoading={false}
              delay={100}
            />
          </div>

          {/* Quick Actions */}
          <div className="card-premium p-6">
            <h2 className="font-display text-lg font-semibold text-card-foreground mb-4">
              Actions rapides
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <QuickActionButton
                icon={Plus}
                label="Nouveau transfert"
                onClick={() => setViewMode('select-type')}
              />
              <QuickActionButton
                icon={PiggyBank}
                label="Nouveau Dépôt"
                onClick={() => {
                  setSelectedOperation('deposit');
                  setViewMode('type-detail');
                }}
              />
              <QuickActionButton
                icon={Wallet}
                label="Nouveau Retrait"
                onClick={() => {
                  setSelectedOperation('withdrawal');
                  setViewMode('type-detail');
                }}
              />
              <QuickActionButton
                icon={Calendar}
                label="Calendrier"
                onClick={() => navigate("/transfers/calendar")}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Button 
              variant="outline"
              className="h-16 border-primary/30 bg-card hover:bg-primary/5"
              onClick={() => setViewMode('type-detail')}
            >
              <Smartphone className="mr-3 h-5 w-5 text-primary" />
              <span className="text-black font-bold">Gérer les soldes par type</span>
            </Button>

            <Button 
              asChild
              variant="outline"
              className="h-16 border-primary/30 bg-card hover:bg-primary/5"
            >
              <Link to="/transfers/reports">
                <BarChart3 className="mr-3 h-5 w-5 text-primary" />
                <span className="text-black font-bold">Rapports de transferts</span>
              </Link>
            </Button>
            <Button 
              variant="outline"
              className="h-16 border-primary/30 bg-card hover:bg-primary/5"
              onClick={handleViewOperations}
            >
              <FileText className="mr-3 h-5 w-5 text-primary" />
              <span className="text-black font-bold">Voir toutes les opérations</span>
            </Button>
          </div>

          {/* Today's transfers preview */}
          {todayTransfers.length > 0 && (
            <div className="card-premium p-6">
              <h2 className="font-display text-lg font-semibold text-card-foreground mb-4">
                Transferts d'aujourd'hui
              </h2>
              <div className="space-y-2">
                {todayTransfers.slice(0, 3).map((transfer) => (
                  <div key={transfer.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
                    <div>
                      <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full mr-2">
                        N° {transfer.report_number}
                      </span>
                      <span className="text-sm text-card-foreground">
                        {getTransferTypeName(transfer.transfer_type, transfer.custom_type_name)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-primary">
                        {formatCurrency(transfer.fees || 0)} {settings.currency_symbol}
                      </span>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => handleEditTransfer(transfer)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-destructive"
                        onClick={() => handleDeleteTransfer(transfer.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {todayTransfers.length > 3 && (
                  <Link 
                    to={`/transfers/day/${todayStr}`}
                    className="block text-center text-sm text-primary hover:underline"
                  >
                    Voir tous ({todayTransfers.length})
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {viewMode === 'select-type' && (
        <div className="max-w-md mx-auto">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleBack}
            className="mb-4 text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="card-premium p-6">
            <TransferTypeSelector onSelect={handleSelectType} />
          </div>
        </div>
      )}

      {viewMode === 'type-detail' && (
        <div className="max-w-md mx-auto">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleBack}
            className="mb-4 text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="card-premium p-6">
            {!selectedType ? (
              <>
                {selectedOperation && (
                  <div className="mb-4 p-3 rounded-lg bg-primary/10 border border-primary/20 text-center">
                    <p className="text-sm text-muted-foreground">Sélectionnez le type de transaction pour</p>
                    <p className="font-semibold text-primary">
                      {selectedOperation === 'deposit' ? '💰 Nouveau Dépôt' : '🏧 Nouveau Retrait'}
                    </p>
                  </div>
                )}
                <TransferTypeSelector onSelect={(type) => {
                  setSelectedType(type);
                  if (selectedOperation) {
                    setViewMode('operation-form');
                  }
                }} />
              </>
            ) : (
              <>
                <BalanceHeader 
                  transferType={selectedType} 
                  customTypeName={undefined}
                  onBalanceChange={() => setRefreshKey(k => k + 1)}
                  refreshKey={refreshKey}
                />
                <OperationButtons onSelectOperation={handleSelectOperation} />
                <Button
                  variant="outline" 
                  className="w-full mt-4"
                  onClick={() => setSelectedType(null)}
                >
                  Changer de type
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {viewMode === 'form' && selectedType && (
        <div className="max-w-lg mx-auto card-premium p-6">
          <TransferForm 
            type={selectedType} 
            onBack={handleBack}
            onSuccess={handleFormSuccess}
          />
        </div>
      )}

      {viewMode === 'edit-form' && selectedType && editingTransfer && (
        <div className="max-w-lg mx-auto card-premium p-6">
          <TransferForm 
            type={selectedType} 
            onBack={handleBack}
            onSuccess={handleFormSuccess}
            editTransfer={editingTransfer}
          />
        </div>
      )}

      {viewMode === 'operation-form' && selectedType && selectedOperation && (
        <div className="max-w-lg mx-auto card-premium p-6">
          <OperationForm
            operationType={selectedOperation}
            transferType={selectedType}
            customTypeName={undefined}
            onBack={handleBack}
            onSuccess={handleOperationSuccess}
          />
        </div>
      )}

      {viewMode === 'operations-list' && (
        <div className="space-y-6">
          {/* Header */}
          <div className="card-premium p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-display text-2xl font-bold text-card-foreground">
                  Toutes les opérations
                </h1>
                <p className="text-muted-foreground mt-1">
                  {operations.length} opération{operations.length !== 1 ? 's' : ''} trouvée{operations.length !== 1 ? 's' : ''}
                </p>
              </div>
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour
              </Button>
            </div>
          </div>

          {/* Operations List */}
          <div className="space-y-4">
            {operations.map((operation) => (
              <div key={operation.id} className="card-premium p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-2">
                      <span className="text-sm bg-primary/20 text-primary px-2 py-1 rounded-full">
                        N° {operation.operation_number}
                      </span>
                      <span className="text-sm font-medium text-card-foreground">
                        {operation.operation_type === 'transfer' ? 'Transfert' :
                         operation.operation_type === 'deposit' ? 'Dépôt' : 'Retrait'}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {getTransferTypeName(operation.service_name, operation.custom_service_name)}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Expéditeur:</span>
                        <p className="font-medium">{operation.sender_name || '-'}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Bénéficiaire:</span>
                        <p className="font-medium">{operation.receiver_name || '-'}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Montant:</span>
                        <p className="font-medium">{formatCurrency(operation.amount_gdes)} {settings.currency_symbol}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Cash après:</span>
                        <p className="font-medium">{formatCurrency(operation.cash_after)} {settings.currency_symbol}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditOperation(operation)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteOperation(operation.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {viewMode === 'edit-operation' && editingOperation && selectedType && selectedOperation && (
        <div className="max-w-lg mx-auto card-premium p-6">
          <OperationForm
            operationType={selectedOperation}
            transferType={selectedType}
            customTypeName={editingOperation.custom_service_name}
            onBack={handleBack}
            onSuccess={handleOperationSuccess}
            editingOperation={editingOperation}
          />
        </div>
      )}
    </AppLayout>
  );
}
