import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Plus } from "@/lib/lucide-react";

/**
 * Page de gestion des projets (pour ONG, Fondations, etc.)
 * Nouvelle page pour les entités sociales
 */
export default function Projects() {
  return (
    <AppLayout title="Projets">
      <div className="space-y-6">
        {/* Header */}
        <div className="card-premium p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-2xl font-bold text-card-foreground">
                Projets et Missions
              </h1>
              <p className="text-sm text-muted-foreground mt-2">
                Suivez les budgets et l'avancement de vos projets humanitaires
              </p>
            </div>
            <Button className="bg-primary text-primary-foreground">
              <Plus className="mr-2 h-4 w-4" />
              Créer un projet
            </Button>
          </div>
        </div>

        {/* Content Placeholder */}
        <div className="card-premium p-6 text-center">
          <p className="text-muted-foreground">
            Cette fonctionnalité sera mise à jour bientôt avec la gestion complète des projets.
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
