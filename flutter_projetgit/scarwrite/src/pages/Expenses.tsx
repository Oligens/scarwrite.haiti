import { AppLayout } from "@/components/layout/AppLayout";

// Page 'Dépenses' supprimée — placeholder kept to avoid import errors in other branches.
export default function Expenses() {
  return (
    <AppLayout title="Dépenses">
      <div className="space-y-6">
        <div className="card-premium p-6 text-center">
          <p className="text-muted-foreground">Page supprimée — utilisez les rapports et la comptabilité.</p>
        </div>
      </div>
    </AppLayout>
  );
}
