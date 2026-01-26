import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Plus } from "@/lib/lucide-react";

/**
 * Page de gestion des membres (pour ONG, Fondations, etc.)
 * Nouvelle page pour les entités sociales
 */
export default function Members() {
  return (
    <AppLayout title="Membres">
      <div className="space-y-6">
        {/* Header */}
        <div className="card-premium p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-2xl font-bold text-card-foreground">
                Membres et Donateurs
              </h1>
              <p className="text-sm text-muted-foreground mt-2">
                Gérez la liste des adhérents et donateurs de l'organisation
              </p>
            </div>
            <Button className="bg-primary text-primary-foreground">
              <Plus className="mr-2 h-4 w-4" />
              Ajouter un membre
            </Button>
          </div>
        </div>

        {/* Content Placeholder */}
        <div className="card-premium p-6 text-center">
          <p className="text-muted-foreground">
            Cette fonctionnalité sera mise à jour bientôt avec la gestion complète des membres.
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
