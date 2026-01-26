import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Calendar, FileText, TrendingUp, Download, Edit, Trash2 } from "@/lib/lucide-react";
import {
  getOperationsByDateRange,
  getSettings,
  deleteOperation,
  TransferType,
  getTypeBalanceFromAccounting
} from "@/lib/storage";
import { generateFinancialOperationsPDF, generateFluxTresorerieWithCashTrackingPDF, sharePDF, downloadPDF } from "@/lib/pdf";
import { FinancialOperation } from "@/lib/database";
import { useToast } from "@/hooks/use-toast";

const MONTHS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

const SERVICE_NAMES: Record<TransferType, string> = {
  'zelle': 'Zelle',
  'moncash': 'MonCash',
  'natcash': 'NatCash',
  'cam_transfert': 'Cam Transfert',
  'western_union': 'Western Union',
  'moneygram': 'MoneyGram',
  'autre': 'Autre',
};

export default function TransferReports() {
  const { toast } = useToast();
  const settings = getSettings();
  const today = new Date();
  const [operations, setOperations] = useState<FinancialOperation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Filtres
  const [selectedService, setSelectedService] = useState<TransferType | 'all'>('all');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => today.toISOString().split('T')[0]);

  // Charger les opérations
  useEffect(() => {
    const loadOperations = async () => {
      try {
        setIsLoading(true);
        const ops = await getOperationsByDateRange(startDate, endDate);
        setOperations(ops);
      } catch (error) {
        console.error('Erreur chargement opérations:', error);
        toast({
          title: "Erreur",
          description: "Impossible de charger les opérations",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadOperations();
  }, [startDate, endDate, toast]);

  // Filtrer les opérations par service
  const filteredOperations = useMemo(() => {
    if (selectedService === 'all') return operations;
    return operations.filter(op => op.service_name === selectedService);
  }, [operations, selectedService]);

  // Calculs des totaux
  const totals = useMemo(() => {
    const cashIn = filteredOperations.reduce((sum, op) => sum + (op.cash_after - op.cash_before), 0);
    const digitalIn = filteredOperations.reduce((sum, op) => sum + (op.digital_after - op.digital_before), 0);
    const totalFees = filteredOperations.reduce((sum, op) => sum + (op.fees || 0), 0);
    const totalCommission = filteredOperations.reduce((sum, op) => sum + (op.commission || 0), 0);

    return { cashIn, digitalIn, totalFees, totalCommission };
  }, [filteredOperations]);

  const formatCurrency = (amount: number): string => {
    return amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleGeneratePDF = async () => {
    try {
      const opts = (() => { try { return JSON.parse(localStorage.getItem('reportOptions') || 'null'); } catch { return null; } })();
      const doc = generateFinancialOperationsPDF(filteredOperations, startDate, endDate, opts || undefined);
      const filename = `operations-${startDate}-to-${endDate}.pdf`;

      // Essayer de partager d'abord, sinon télécharger
      try {
        await sharePDF(doc, filename);
      } catch {
        downloadPDF(doc, filename);
      }

      toast({
        title: "PDF généré",
        description: `Rapport sauvegardé: ${filename}`,
      });
    } catch (error) {
      console.error('Erreur génération PDF:', error);
      toast({
        title: "Erreur",
        description: "Impossible de générer le PDF",
        variant: "destructive",
      });
    }
  };

  const handleGenerateFluxTresoreriePDF = async () => {
    try {
      // Récupérer les balances actuelles (au moment de la génération)
      const cashBalance = await getTypeBalanceFromAccounting('zelle'); // Using 'zelle' as default, can be parameterized
      const digitalBalance = await getTypeBalanceFromAccounting('moncash');
      
      const doc = generateFluxTresorerieWithCashTrackingPDF(
        filteredOperations,
        cashBalance.cash_balance,
        digitalBalance.digital_balance,
        startDate,
        endDate
      );
      const filename = `flux-tresorerie-${startDate}-to-${endDate}.pdf`;

      // Essayer de partager d'abord, sinon télécharger
      try {
        await sharePDF(doc, filename);
      } catch {
        downloadPDF(doc, filename);
      }

      toast({
        title: "PDF Flux & Trésorerie généré",
        description: `Rapport sauvegardé: ${filename}`,
      });
    } catch (error) {
      console.error('Erreur génération PDF Flux:', error);
      toast({
        title: "Erreur",
        description: "Impossible de générer le PDF Flux & Trésorerie",
        variant: "destructive",
      });
    }
  };

  const handleDeleteOperation = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette opération ?')) return;
    
    try {
      await deleteOperation(id);
      setOperations(operations.filter(op => op.id !== id));
      toast({
        title: "Opération supprimée",
        description: "L'opération a été supprimée avec succès",
      });
    } catch (error) {
      console.error('Erreur suppression:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'opération",
        variant: "destructive",
      });
    }
  };

  const reloadOperations = async () => {
    try {
      const ops = await getOperationsByDateRange(startDate, endDate);
      setOperations(ops);
      setEditingId(null);
    } catch (error) {
      console.error('Erreur rechargement:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-1/3 -top-1/3 h-2/3 w-2/3 rounded-full bg-primary/3 blur-3xl" />
      </div>

      <div className="relative z-10">
        <header className="border-b border-border/50 bg-card/50 backdrop-blur-xl">
          <div className="container flex h-16 items-center gap-4">
            <Button asChild variant="ghost" size="icon" className="text-yellow-400 border-2 border-white hover:border-yellow-400 hover:bg-slate-800">
              <Link to="/transfers">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <h1 className="font-display text-xl font-bold">
              <span className="text-gradient-gold">Rapports Financiers</span>
            </h1>
          </div>
        </header>

        <main className="container py-8 space-y-6">
          {/* Filtres */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Service</label>
              <Select value={selectedService} onValueChange={(v) => setSelectedService(v as TransferType | 'all')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les services</SelectItem>
                  {Object.entries(SERVICE_NAMES).map(([key, name]) => (
                    <SelectItem key={key} value={key}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Date début</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-border bg-background"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Date fin</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-border bg-background"
              />
            </div>
          </div>

          {/* Résumé des totaux */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="card-premium p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/20">
                  <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Flux Cash</p>
                  <p className="font-semibold text-green-600 dark:text-green-400">
                    {formatCurrency(totals.cashIn)} {settings.currency_symbol}
                  </p>
                </div>
              </div>
            </div>

            <div className="card-premium p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/20">
                  <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Flux Numérique</p>
                  <p className="font-semibold text-blue-600 dark:text-blue-400">
                    {formatCurrency(totals.digitalIn)} {settings.currency_symbol}
                  </p>
                </div>
              </div>
            </div>

            <div className="card-premium p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/20">
                  <FileText className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Frais</p>
                  <p className="font-semibold text-orange-600 dark:text-orange-400">
                    {formatCurrency(totals.totalFees)} {settings.currency_symbol}
                  </p>
                </div>
              </div>
            </div>

            <div className="card-premium p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/20">
                  <FileText className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Commission</p>
                  <p className="font-semibold text-purple-600 dark:text-purple-400">
                    {formatCurrency(totals.totalCommission)} {settings.currency_symbol}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Liste des opérations */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h2 className="font-display text-lg font-semibold text-foreground">
                Opérations ({filteredOperations.length})
              </h2>
              <div className="flex gap-2">
                <Button onClick={handleGenerateFluxTresoreriePDF} disabled={filteredOperations.length === 0} className="bg-gradient-gold hover:bg-gradient-gold/90">
                  <Download className="mr-2 h-4 w-4" />
                  PDF Flux & Trésorerie
                </Button>
              </div>
            </div>

            {isLoading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Chargement...</p>
              </div>
            ) : filteredOperations.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Aucune opération trouvée</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredOperations.slice(0, 10).map((op) => (
                  <div key={op.id} className="card-premium p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-muted/50">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">
                            {SERVICE_NAMES[op.service_name]} - {op.operation_type}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {op.sender_name} → {op.receiver_name}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="font-semibold text-primary">
                            {formatCurrency(op.amount_gdes)} {settings.currency_symbol}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(op.operation_date).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingId(op.id)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteOperation(op.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {filteredOperations.length > 10 && (
                  <p className="text-center text-sm text-muted-foreground">
                    Et {filteredOperations.length - 10} autres opérations...
                  </p>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}