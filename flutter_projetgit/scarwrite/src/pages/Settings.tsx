import { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Save, Download, Upload, Lock, Unlock } from "@/lib/lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { AppLayout } from "@/components/layout/AppLayout";
import { TaxManagement } from "@/components/TaxManagement";
import {
  getSettings,
  saveSettings,
  getPIN,
  setPIN,
  clearPIN,
  exportAllData,
  importAllData,
  getCompanyProfile,
  saveCompanyProfile,
  clearAllTransactions,
  CompanyType,
  getShareholders,
  saveShareholders,
} from "@/lib/storage";
import { ShareholderManager } from "@/components/ShareholderManager";

const COMPANY_TYPES: CompanyType[] = [
  "Entreprise Individuelle",
  "Societe Anonyme",
  "Societe par Actions Simplifiee",
  "Societe a Responsabilite Limitee",
  "Organisation Non Gouvernementale",
  "Fondation",
  "Organisation Internationale",
];

export default function Settings() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [settings, setSettings] = useState(getSettings());
  const [companyType, setCompanyType] = useState<CompanyType | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [newPIN, setNewPIN] = useState("");
  const [loading, setLoading] = useState(true);
  const hasPIN = getPIN() !== null;

  useEffect(() => {
    const loadCompanyProfile = async () => {
      const profile = await getCompanyProfile();
      if (profile) {
        setCompanyType(profile.company_type);
        setCompanyName(profile.company_name);
      }
      setLoading(false);
    };
    loadCompanyProfile();
  }, []);

  const handleSaveSettings = () => {
    saveSettings(settings);
    toast({ title: "Paramètres sauvegardés" });
  };

  const handleSaveCompanyProfile = async () => {
    if (!companyType || !companyName.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs",
        variant: "destructive",
      });
      return;
    }

    try {
      await saveCompanyProfile({
        company_type: companyType,
        company_name: companyName,
        fiscal_year_start: 10, // Octobre par défaut
        // keep existing initial_capital if present
        initial_capital: (await getCompanyProfile())?.initial_capital || 0,
      });
      toast({ title: "Profil entreprise sauvegardé" });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder le profil",
        variant: "destructive",
      });
    }
  };

  const handleSetPIN = () => {
    if (newPIN.length >= 4) {
      setPIN(newPIN);
      setNewPIN("");
      toast({ title: "Code PIN défini" });
    } else {
      toast({
        title: "Erreur",
        description: "Le PIN doit avoir au moins 4 caractères",
        variant: "destructive",
      });
    }
  };

  const handleClearPIN = () => {
    clearPIN();
    toast({ title: "Code PIN supprimé" });
  };

  const handleExport = () => {
    const data = exportAllData();
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `scarwrite-backup-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Sauvegarde exportée" });
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (importAllData(content)) {
        setSettings(getSettings());
        toast({ title: "Données importées avec succès" });
      } else {
        toast({
          title: "Erreur",
          description: "Fichier invalide",
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
  };

  if (loading) {
    return (
      <AppLayout title="Paramètres">
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Paramètres">
      <div className="space-y-6 max-w-2xl">
        {/* Header */}
        <div className="card-premium p-6">
          <h1 className="font-display text-2xl font-bold text-card-foreground">
            Paramètres
          </h1>
        </div>

        {/* Company Profile - Le Cerveau */}
        <div className="card-premium p-6 border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
          <h2 className="font-display text-lg font-semibold text-card-foreground mb-4 flex items-center gap-2">
            🧠 Profil Entreprise (Le Cerveau)
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Sélectionnez le type d'entité pour adapter automatiquement la navigation et les fonctionnalités.
          </p>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-card-foreground font-semibold">Type d'entité</Label>
              <Select value={companyType || ""} onValueChange={(value) => setCompanyType(value as CompanyType)}>
                <SelectTrigger className="bg-muted border-border">
                  <SelectValue placeholder="Sélectionnez un type d'entité" />
                </SelectTrigger>
                <SelectContent>
                  {COMPANY_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-card-foreground font-semibold">Nom de l'entité</Label>
              <Input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Ex: ScarWrite SARL"
                className="bg-muted border-border"
              />
            </div>

            {companyType && ['Organisation Non Gouvernementale', 'Fondation', 'Organisation Internationale'].includes(companyType) && (
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
                <p className="text-sm text-blue-900 dark:text-blue-200">
                  ✓ Mode entité sociale détecté: Le menu s'adaptera pour afficher "Dons et Apports", "Membres" et "Projets".
                </p>
              </div>
            )}

            <Button onClick={handleSaveCompanyProfile} className="bg-primary text-primary-foreground w-full">
              <Save className="mr-2 h-4 w-4" />
              Configurer le profil entreprise
            </Button>
          </div>
        </div>

        {/* Tax Management */}
        <TaxManagement />

        {/* Restaurant Settings */}
        <div className="card-premium p-6">
          <h2 className="font-display text-lg font-semibold text-card-foreground mb-4">
            Entreprise
          </h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-card-foreground">Nom de l'entreprise (pour les rapports)</Label>
              <Input
                value={settings.restaurant_name}
                onChange={(e) => setSettings({ ...settings, restaurant_name: e.target.value })}
                className="bg-muted border-border"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-card-foreground">Symbole de devise</Label>
              <Input
                value={settings.currency_symbol}
                onChange={(e) => setSettings({ ...settings, currency_symbol: e.target.value })}
                placeholder="G"
                className="bg-muted border-border"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-card-foreground">Activer Maison de Transfert</Label>
              <div className="flex items-center gap-3">
                <input
                  id="transfer-house-toggle"
                  type="checkbox"
                  checked={!!settings.transfer_house_enabled}
                  onChange={(e) => setSettings({ ...settings, transfer_house_enabled: e.target.checked })}
                />
                <label htmlFor="transfer-house-toggle" className="text-sm">Module Maison de Transfert</label>
              </div>
            </div>
            <Button onClick={handleSaveSettings} className="bg-primary text-primary-foreground">
              <Save className="mr-2 h-4 w-4" />
              Sauvegarder
            </Button>
          </div>
        </div>

        {/* Shareholders manager for SA/SAS */}
        {companyType && ['Societe Anonyme', 'Societe par Actions Simplifiee'].includes(companyType) && (
          <div className="card-premium p-6">
            <h2 className="font-display text-lg font-semibold text-card-foreground mb-4">Actionnaires (SA)</h2>
            <ShareholderManager />
          </div>
        )}

        {/* Transfer Settings */}
        <div className="card-premium p-6">
          <h2 className="font-display text-lg font-semibold text-card-foreground mb-4">
            💱 Paramètres de transfert
          </h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-card-foreground">Taux de change USD → Gourdes</Label>
              <Input
                type="text"
                inputMode="decimal"
                value={settings.exchange_rate || ""}
                onChange={(e) => {
                  const value = e.target.value.replace(",", ".");
                  const parsed = parseFloat(value);
                  if (!isNaN(parsed) || value === "" || value === ".") {
                    setSettings({
                      ...settings,
                      exchange_rate: isNaN(parsed) ? 0 : parsed,
                    });
                  }
                }}
                placeholder="133"
                className="bg-muted border-border"
              />
              <p className="text-xs text-muted-foreground">
                Modifiable quotidiennement selon le taux du jour
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-card-foreground">
                Frais de transfert par défaut (Gourdes)
              </Label>
              <Input
                type="text"
                inputMode="decimal"
                value={settings.default_transfer_fee || ""}
                onChange={(e) => {
                  const value = e.target.value.replace(",", ".");
                  const parsed = parseFloat(value);
                  if (!isNaN(parsed) || value === "" || value === ".") {
                    setSettings({
                      ...settings,
                      default_transfer_fee: isNaN(parsed) ? 0 : parsed,
                    });
                  }
                }}
                placeholder="0"
                className="bg-muted border-border"
              />
            </div>
            <Button onClick={handleSaveSettings} className="bg-primary text-primary-foreground">
              <Save className="mr-2 h-4 w-4" />
              Sauvegarder
            </Button>
          </div>
        </div>

        {/* PIN Security */}
        <div className="card-premium p-6">
          <h2 className="font-display text-lg font-semibold text-card-foreground mb-4">
            Sécurité
          </h2>
          {hasPIN ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Un code PIN est actuellement défini.
              </p>
              <Button
                onClick={handleClearPIN}
                variant="outline"
                className="border-destructive text-destructive"
              >
                <Unlock className="mr-2 h-4 w-4" />
                Supprimer le code PIN
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-card-foreground">Définir un code PIN</Label>
                <Input
                  type="password"
                  value={newPIN}
                  onChange={(e) => setNewPIN(e.target.value)}
                  placeholder="Minimum 4 caractères"
                  className="bg-muted border-border"
                />
              </div>
              <Button
                onClick={handleSetPIN}
                variant="outline"
                className="border-primary/30"
              >
                <Lock className="mr-2 h-4 w-4" />
                Définir le PIN
              </Button>
            </div>
          )}
        </div>

        {/* Backup & Restore */}
        <div className="card-premium p-6">
          <h2 className="font-display text-lg font-semibold text-card-foreground mb-4">
            Sauvegarde
          </h2>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={handleExport}
              variant="outline"
              className="border-primary/30 bg-card"
            >
              <Download className="mr-2 h-4 w-4 text-primary" />
              Exporter les données
            </Button>
            <label>
              <Button
                asChild
                variant="outline"
                className="border-primary/30 bg-card cursor-pointer"
              >
                <span>
                  <Upload className="mr-2 h-4 w-4 text-primary" />
                  Importer les données
                </span>
              </Button>
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
              />
            </label>
          </div>
        </div>
        {/* Reset transactional data */}
        <div className="card-premium p-6">
          <h2 className="font-display text-lg font-semibold text-card-foreground mb-4">Réinitialisation</h2>
          <p className="text-sm text-muted-foreground mb-4">Remet toutes les opérations à zéro sans toucher au plan comptable ni aux paramètres.</p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button className="bg-destructive text-destructive-foreground w-full">Réinitialiser toutes les opérations</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Attention — action irréversible</AlertDialogTitle>
                <AlertDialogDescription>Toutes vos écritures comptables seront supprimées. Continuer ?</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction
                  onClick={async () => {
                    try {
                      await clearAllTransactions();
                      // redirect to dashboard and notify
                      navigate('/dashboard');
                      toast({ title: 'Toutes les opérations ont été supprimées' });
                    } catch (err) {
                      console.error('Reset failed', err);
                      toast({ title: 'Erreur', description: 'Impossible de réinitialiser', variant: 'destructive' });
                    }
                  }}
                >
                  Confirmer
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </AppLayout>
  );
}
