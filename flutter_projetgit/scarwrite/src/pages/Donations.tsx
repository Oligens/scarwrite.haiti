import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Plus } from "@/lib/lucide-react";

/**
 * Page de gestion des dons et apports (pour ONG, Fondations, etc.)
 * Remplace "Transactions" pour les entités sociales
 */
export default function Donations() {
  return (
    <AppLayout title="Dons et Apports">
      <div className="space-y-6">
        {/* Header */}
        <div className="card-premium p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-2xl font-bold text-card-foreground">
                Dons et Apports
              </h1>
              <p className="text-sm text-muted-foreground mt-2">
                Enregistrez les fonds reçus et les contributions
              </p>
            </div>
            <Button className="bg-primary text-primary-foreground">
              <Plus className="mr-2 h-4 w-4" />
              Enregistrer un don
            </Button>
          </div>
        </div>

        {/* Content Placeholder */}
        <div className="card-premium p-6 text-center">
          <p className="text-muted-foreground">
            Cette fonctionnalité sera mise à jour bientôt avec la gestion complète des dons et apports.
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
