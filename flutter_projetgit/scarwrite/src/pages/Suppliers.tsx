import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogTitle 
} from "@/components/ui/dialog";
import { 
  getSuppliers, 
  addSupplier, 
  updateSupplier, 
  deleteSupplier,
  createAccountingTransaction,
  getSettings,
  formatCurrency 
} from "@/lib/storage";
import { useToast } from "@/hooks/use-toast";

interface Supplier {
  id?: string;
  name: string;
  amount_owed: number;
  due_date: string;
  status: 'active' | 'settled';
  created_at?: string;
  updated_at?: string;
}

interface SupplierForm {
  name: string;
  amount: string;
  due_date: string;
}

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState<SupplierForm>({ name: "", amount: "", due_date: "" });
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'digital'>('cash');
  const { toast } = useToast();

  useEffect(() => {
    loadSuppliers();
  }, []);

  useEffect(() => {
    const handler = () => loadSuppliers();
    window.addEventListener('ledger-updated', handler);
    window.addEventListener('financials-updated', handler);
    return () => {
      window.removeEventListener('ledger-updated', handler);
      window.removeEventListener('financials-updated', handler);
    };
  }, []);

  const loadSuppliers = async () => {
    try {
      const data = await getSuppliers();
      setSuppliers(data.filter((s: Supplier) => s.status === 'active'));
    } catch (err) {
      console.error(err);
      toast({ title: "Erreur", description: "Impossible de charger les fournisseurs", variant: "destructive" });
    }
  };

  const handleAddSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.amount || !formData.due_date) {
      toast({ title: "Erreur", description: "Tous les champs sont requis", variant: "destructive" });
      return;
    }

    try {
      // Create accounting entry for purchase on credit
      // Débit 601 (Achats) / Crédit 401 (Fournisseurs)
      const today = new Date().toISOString().slice(0, 10);
      await createAccountingTransaction([
        {
          journal_date: today,
          transaction_type: 'supplier_purchase',
          account_code: '601',
          account_name: 'Achats de marchandises',
          debit: parseFloat(formData.amount),
          credit: 0,
          description: `Achat à crédit: ${formData.name}`
        },
        {
          journal_date: today,
          transaction_type: 'supplier_purchase',
          account_code: '401',
          account_name: 'Fournisseurs',
          debit: 0,
          credit: parseFloat(formData.amount),
          description: `Dette: ${formData.name}`
        }
      ]);

      // Add supplier
      await addSupplier({
        name: formData.name,
        amount_owed: parseFloat(formData.amount),
        due_date: formData.due_date,
        status: 'active'
      });

      toast({ title: "Succès", description: "Fournisseur ajouté et comptabilisé" });
      setFormData({ name: "", amount: "", due_date: "" });
      setShowDialog(false);
      loadSuppliers();
      window.dispatchEvent(new Event('ledger-updated'));
    } catch (err) {
      console.error(err);
      toast({ title: "Erreur", description: "Impossible d'ajouter le fournisseur", variant: "destructive" });
    }
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplier || !paymentAmount) {
      toast({ title: "Erreur", description: "Veuillez saisir le montant", variant: "destructive" });
      return;
    }

    const amount = parseFloat(paymentAmount);
    if (amount <= 0 || amount > selectedSupplier.amount_owed) {
      toast({ title: "Erreur", description: "Montant invalide", variant: "destructive" });
      return;
    }

    try {
      const today = new Date().toISOString().slice(0, 10);
      const accountDebit = paymentMethod === 'cash' ? '5311' : '517';
      const accountName = paymentMethod === 'cash' ? 'Caisse Centrale' : 'Argent Numérique';

      // Accounting entry: Débit 401 (Dette diminue) / Crédit 53 ou 51 (Caisse/Banque)
      await createAccountingTransaction([
        {
          journal_date: today,
          transaction_type: 'supplier_payment',
          account_code: '401',
          account_name: 'Fournisseurs',
          debit: amount,
          credit: 0,
          description: `Paiement (${paymentMethod}): ${selectedSupplier.name} - ${amount.toFixed(2)}`
        },
          {
            journal_date: today,
            transaction_type: 'supplier_payment',
            account_code: accountDebit,
            account_name: accountName,
            debit: 0,
            credit: amount,
            description: `Paiement fournisseur: ${selectedSupplier.name}`
          }
      ]);

      // Update supplier
      const newAmount = selectedSupplier.amount_owed - amount;
      if (newAmount === 0) {
        // Mark as settled
        await updateSupplier(selectedSupplier.id!, {
          ...selectedSupplier,
          amount_owed: 0,
          status: 'settled'
        });
        toast({ title: "Succès", description: `Fournisseur ${selectedSupplier.name} soldé!` });
      } else {
        // Partial payment
        await updateSupplier(selectedSupplier.id!, {
          ...selectedSupplier,
          amount_owed: newAmount
        });
        toast({ title: "Succès", description: `Paiement partiel de ${formatCurrency(amount)} effectué` });
      }

      setPaymentAmount("");
      setShowPaymentDialog(false);
      setSelectedSupplier(null);
      loadSuppliers();
      window.dispatchEvent(new Event('ledger-updated'));
    } catch (err) {
      console.error(err);
      toast({ title: "Erreur", description: "Impossible d'effectuer le paiement", variant: "destructive" });
    }
  };

  const handleDeleteSupplier = async (id: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer ce fournisseur?")) {
      try {
        await deleteSupplier(id);
        toast({ title: "Succès", description: "Fournisseur supprimé" });
        loadSuppliers();
      } catch (err) {
        console.error(err);
        toast({ title: "Erreur", description: "Impossible de supprimer le fournisseur", variant: "destructive" });
      }
    }
  };

  const totalDue = suppliers.reduce((sum, s) => sum + s.amount_owed, 0);

  return (
    <AppLayout title="Gestion Fournisseurs">
      <div className="space-y-6">
        {/* Header */}
        <div className="card-premium p-6 flex items-center justify-between border-b-2 border-red-600">
          <div>
            <h1 className="font-display text-3xl font-bold text-card-foreground">Gestion Fournisseurs</h1>
            <p className="text-sm text-muted-foreground mt-2">Gérez les dettes fournisseurs et les paiements avec suivi comptable automatique</p>
          </div>
          <Button 
            onClick={() => {
              setFormData({ name: "", amount: "", due_date: "" });
              setShowDialog(true);
            }}
            className="bg-blue-700 text-white hover:bg-blue-600 font-semibold"
          >
            ➕ Ajouter Fournisseur
          </Button>
        </div>

        {/* Summary Card */}
        <div className="card-premium p-6 bg-gradient-to-r from-red-50 to-orange-50">
          <div className="grid grid-cols-3 gap-6">
            <div className="border-l-4 border-red-500 pl-4">
              <p className="text-sm text-muted-foreground font-semibold">Nombre de Fournisseurs</p>
              <p className="font-display text-3xl font-bold text-slate-900">{suppliers.length}</p>
            </div>
            <div className="border-l-4 border-orange-500 pl-4">
              <p className="text-sm text-muted-foreground font-semibold">Total Dû</p>
              <p className="font-display text-3xl font-bold text-slate-900 font-mono">{formatCurrency(totalDue)}</p>
            </div>
            <div className="border-l-4 border-yellow-500 pl-4">
              <p className="text-sm text-muted-foreground font-semibold">Urgents (Due Today)</p>
              <p className="font-display text-3xl font-bold text-red-600">
                {suppliers.filter(s => new Date(s.due_date) <= new Date()).length}
              </p>
            </div>
          </div>
        </div>

        {/* Suppliers Table */}
        <div className="card-premium p-6">
          <h2 className="font-display text-2xl font-bold text-slate-900 mb-4">Dettes Actives</h2>
          {suppliers.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-lg">Aucun fournisseur enregistré</p>
            </div>
          ) : (
            <div className="overflow-x-auto bg-slate-50 rounded-lg p-4">
              <table className="w-full font-sans">
                <thead>
                  <tr className="border-b-2 border-slate-300">
                    <th className="text-left text-slate-700 font-bold text-sm py-3 px-2">Nom du Fournisseur</th>
                    <th className="text-right text-slate-700 font-bold text-sm py-3 px-2">Montant Dû</th>
                    <th className="text-center text-slate-700 font-bold text-sm py-3 px-2">Date d'Échéance</th>
                    <th className="text-center text-slate-700 font-bold text-sm py-3 px-2">État</th>
                    <th className="text-center text-slate-700 font-bold text-sm py-3 px-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {suppliers.map((supplier) => {
                    const isOverdue = new Date(supplier.due_date) < new Date();
                    return (
                      <tr 
                        key={supplier.id} 
                        className={`border-b border-slate-200 hover:bg-red-50 ${isOverdue ? 'bg-red-50' : ''}`}
                      >
                        <td className="text-slate-800 text-sm py-3 px-2 font-semibold">{supplier.name}</td>
                        <td className="text-right text-slate-800 text-sm py-3 px-2 font-mono font-bold text-red-600">
                          {formatCurrency(supplier.amount_owed)}
                        </td>
                        <td className={`text-center text-sm py-3 px-2 font-semibold ${isOverdue ? 'text-red-600' : 'text-slate-800'}`}>
                          {new Date(supplier.due_date).toLocaleDateString('fr-FR')}
                          {isOverdue && <span className="ml-2 text-red-600">⚠️ RETARD</span>}
                        </td>
                        <td className="text-center text-sm py-3 px-2">
                          <span className="bg-yellow-200 text-yellow-900 px-3 py-1 rounded-full text-xs font-semibold">
                            Actif
                          </span>
                        </td>
                        <td className="text-center text-sm py-3 px-2 space-x-2 flex justify-center gap-1 flex-wrap">
                          <Button
                            onClick={() => {
                              setSelectedSupplier(supplier);
                              setPaymentAmount("");
                              setShowPaymentDialog(true);
                            }}
                            size="sm"
                            className="bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-700 hover:to-green-800 font-bold shadow-md hover:shadow-lg transition-all py-2 px-3 min-h-10 text-base"
                          >
                            💰 Décaisser
                          </Button>
                          <Button
                            onClick={() => handleDeleteSupplier(supplier.id!)}
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-300 hover:bg-red-50 font-medium"
                          >
                            🗑️
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Add Supplier Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-md">
            <DialogTitle className="font-display text-xl font-bold">Ajouter un Fournisseur</DialogTitle>
            <form onSubmit={handleAddSupplier} className="space-y-4 mt-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Nom du Fournisseur</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Boucherie Martin"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Montant Dû</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Date d'Échéance</label>
                <input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-2 justify-end mt-6">
                <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                  Annuler
                </Button>
                <Button type="submit" className="bg-blue-700 text-white hover:bg-blue-600">
                  Ajouter
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Payment Dialog */}
        <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
          <DialogContent className="max-w-md">
            <DialogTitle className="font-display text-xl font-bold">
              Régler Facture - {selectedSupplier?.name}
            </DialogTitle>
            <form onSubmit={handlePayment} className="space-y-4 mt-4">
              <div>
                <p className="text-sm text-muted-foreground">Montant Dû</p>
                <p className="font-display text-2xl font-bold text-red-600 font-mono">
                  {formatCurrency(selectedSupplier?.amount_owed || 0)}
                </p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Montant à Payer</label>
                <input
                  type="number"
                  step="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="0.00"
                  max={selectedSupplier?.amount_owed}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Mode de Paiement</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as 'cash' | 'digital')}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="cash">Espèces (53 Caisse)</option>
                  <option value="digital">Virement (51 Banque)</option>
                </select>
              </div>
              <div className="flex gap-2 justify-end mt-6">
                <Button type="button" variant="outline" onClick={() => setShowPaymentDialog(false)}>
                  Annuler
                </Button>
                <Button type="submit" className="bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-700 hover:to-green-800 font-bold min-h-10 text-base px-6">
                  ✓ Confirmer Paiement
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
