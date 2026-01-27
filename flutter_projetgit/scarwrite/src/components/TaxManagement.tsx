import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash, Plus } from "@/lib/lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  getTaxConfigs,
  addTaxConfig,
  updateTaxConfig,
  deleteTaxConfig,
  TaxConfig,
} from "@/lib/storage";

export function TaxManagement() {
  const { toast } = useToast();
  const [taxes, setTaxes] = useState<TaxConfig[]>([]);
  const [newTaxName, setNewTaxName] = useState("");
  const [newTaxPercentage, setNewTaxPercentage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTaxes();
  }, []);

  const loadTaxes = async () => {
    try {
      const taxesData = await getTaxConfigs();
      setTaxes(taxesData);
    } catch (error) {
      console.error('Erreur chargement taxes:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les taxes",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddTax = async () => {
    if (!newTaxName.trim()) {
      toast({
        title: "Erreur",
        description: "Le nom de la taxe est obligatoire",
        variant: "destructive",
      });
      return;
    }

    const percentage = parseFloat(newTaxPercentage);
    if (isNaN(percentage) || percentage < 0 || percentage > 100) {
      toast({
        title: "Erreur",
        description: "Le pourcentage doit être entre 0 et 100",
        variant: "destructive",
      });
      return;
    }

    try {
      await addTaxConfig(newTaxName, percentage);
      setNewTaxName("");
      setNewTaxPercentage("");
      toast({ title: "Taxe ajoutée avec succès" });
      loadTaxes();
    } catch (error) {
      console.error('Erreur ajout taxe:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter la taxe",
        variant: "destructive",
      });
    }
  };

  const handleDeleteTax = async (id: string) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette taxe?")) {
      return;
    }

    try {
      await deleteTaxConfig(id);
      toast({ title: "Taxe supprimée" });
      loadTaxes();
    } catch (error) {
      console.error('Erreur suppression taxe:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la taxe",
        variant: "destructive",
      });
    }
  };

  const handleToggleTax = async (tax: TaxConfig) => {
    try {
      await updateTaxConfig(tax.id, { is_active: !tax.is_active });
      toast({ 
        title: tax.is_active ? "Taxe désactivée" : "Taxe activée"
      });
      loadTaxes();
    } catch (error) {
      console.error('Erreur mise à jour taxe:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour la taxe",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="card-premium p-6">
        <p className="text-center text-muted-foreground">Chargement des taxes...</p>
      </div>
    );
  }

  return (
    <div className="card-premium p-6">
      <h2 className="font-display text-lg font-semibold text-card-foreground mb-4 flex items-center gap-2">
        💰 Gestion des Taxes
      </h2>
      <p className="text-sm text-muted-foreground mb-4">
        Configurez toutes les taxes applicables à votre activité. Vous pouvez en ajouter autant que nécessaire.
      </p>

      {/* Formulaire ajout taxe */}
      <div className="mb-6 p-4 rounded-lg bg-muted/30 border border-border">
        <h3 className="text-sm font-semibold text-card-foreground mb-3">
          Ajouter une nouvelle taxe
        </h3>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-sm">Nom de la taxe</Label>
              <Input
                placeholder="Ex: TVA, TPS, TCA, Impôt..."
                value={newTaxName}
                onChange={(e) => setNewTaxName(e.target.value)}
                className="bg-background border-border"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Pourcentage (%)</Label>
              <Input
                type="number"
                placeholder="18"
                value={newTaxPercentage}
                onChange={(e) => setNewTaxPercentage(e.target.value)}
                min="0"
                max="100"
                step="0.01"
                className="bg-background border-border"
              />
            </div>
          </div>
          <Button
            onClick={handleAddTax}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="mr-2 h-4 w-4" />
            Ajouter la taxe
          </Button>
        </div>
      </div>

      {/* Liste des taxes */}
      {taxes.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground">
          Aucune taxe configurée. Cliquez sur [+] pour en ajouter une.
        </div>
      ) : (
        <div className="space-y-2">
          {taxes.map((tax) => (
            <div
              key={tax.id}
              className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                tax.is_active
                  ? "bg-primary/5 border-primary/20"
                  : "bg-muted/30 border-muted-foreground/20 opacity-60"
              }`}
            >
              <div className="flex-1">
                <div className="font-semibold text-card-foreground">
                  {tax.name}
                </div>
                <div className="text-sm text-muted-foreground">
                  {tax.percentage.toFixed(2)}%
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={tax.is_active ? "default" : "outline"}
                  onClick={() => handleToggleTax(tax)}
                  className="text-xs"
                >
                  {tax.is_active ? "Actif" : "Inactif"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  onClick={() => handleDeleteTax(tax.id)}
                >
                  <Trash className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {taxes.length > 0 && (
        <div className="mt-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
          <p className="text-xs text-blue-900 dark:text-blue-200">
            ℹ️ {taxes.filter(t => t.is_active).length} taxe(s) active(s) seront appliquées aux transactions.
          </p>
        </div>
      )}
    </div>
  );
}
