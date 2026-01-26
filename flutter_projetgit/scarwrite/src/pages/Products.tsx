import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, X, PlusCircle } from "@/lib/lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { AppLayout } from "@/components/layout/AppLayout";
import { RestockForm } from "@/components/RestockForm";
import {
  getProducts,
  addProduct,
  addService,
  updateProduct,
  deleteProduct,
  getSettings,
  parseDecimalInput,
  Product,
  createAccountingTransaction,
} from "@/lib/storage";

export default function Products() {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [restockProduct, setRestockProduct] = useState<Product | null>(null);
  const [formName, setFormName] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formCostPrice, setFormCostPrice] = useState("");
  const [formQuantity, setFormQuantity] = useState("");
  const [formServiceFee, setFormServiceFee] = useState<string>('2');
  const [formServiceName, setFormServiceName] = useState("");
  const [formServicePrice, setFormServicePrice] = useState("");
  const [formServiceFeeService, setFormServiceFeeService] = useState<string>('2');
  const settings = getSettings();

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const data = await getProducts();
      setProducts(data);
    } catch (error) {
      console.error('Erreur chargement produits:', error);
      setProducts([]); // Fallback à liste vide
    }
  };

  const openAddForm = () => {
    setEditingProduct(null);
    setFormName("");
    setFormPrice("");
    setFormCostPrice("");
    setFormQuantity("");
    setShowForm(true);
  };

  const openAddServiceForm = () => {
    setFormServiceName("");
    setFormServicePrice("");
    setShowServiceForm(true);
  };

  const openEditForm = (product: Product) => {
    setEditingProduct(product);
    setFormName(product.name);
    setFormPrice(product.unit_price.toString());
    setFormCostPrice(product.cost_price.toString());
    setFormQuantity(product.quantity_available.toString());
    setShowForm(true);
  };

  const handlePriceChange = (value: string) => {
    const sanitized = value.replace(/[^0-9.,]/g, '');
    setFormPrice(sanitized);
  };

  const handleCostPriceChange = (value: string) => {
    const sanitized = value.replace(/[^0-9.,]/g, '');
    setFormCostPrice(sanitized);
  };

  const handleQuantityChange = (value: string) => {
    const sanitized = value.replace(/[^0-9]/g, '');
    setFormQuantity(sanitized);
  };

  const handleServicePriceChange = (value: string) => {
    const sanitized = value.replace(/[^0-9.,]/g, '');
    setFormServicePrice(sanitized);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formName.trim() || !formPrice || !formCostPrice || !formQuantity) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs",
        variant: "destructive",
      });
      return;
    }

    const price = parseDecimalInput(formPrice);
    const costPrice = parseDecimalInput(formCostPrice);
    const quantity = parseInt(formQuantity, 10);

    if (price <= 0) {
      toast({
        title: "Erreur",
        description: "Le prix de vente doit être supérieur à 0",
        variant: "destructive",
      });
      return;
    }

    if (costPrice < 0) {
      toast({
        title: "Erreur",
        description: "Le prix d'achat ne peut pas être négatif",
        variant: "destructive",
      });
      return;
    }

    if (quantity < 0) {
      toast({
        title: "Erreur",
        description: "La quantité ne peut pas être négative",
        variant: "destructive",
      });
      return;
    }

    try {
      // Calculate stock value for accounting entry
      const stockValue = costPrice * quantity;
      
      if (editingProduct) {
        await updateProduct(editingProduct.id, {
          name: formName.trim(),
          unit_price: price,
          cost_price: costPrice,
          quantity_available: quantity,
        });
        toast({ title: "Produit modifié" });
      } else {
        await addProduct(formName.trim(), price, costPrice, quantity, Number(formServiceFee) || 2);
        
        // Generate accounting entries for new product stock
        if (stockValue > 0) {
          const date = new Date().toISOString().slice(0, 10);
          const entries = [
            {
              journal_date: date,
              transaction_type: 'product_stock',
              account_code: '31',
              account_name: 'Stocks de marchandises',
              debit: stockValue,
              credit: 0,
              description: `Stock initial: ${formName.trim()} (${quantity} unités @ ${costPrice.toFixed(2)} ${settings.currency_symbol})`,
            },
              {
                journal_date: date,
                transaction_type: 'product_stock',
                account_code: '5311',
                account_name: 'Caisse Centrale',
                debit: 0,
                credit: stockValue,
                description: `Paiement stock: ${formName.trim()}`,
              },
          ];
          
          await createAccountingTransaction(entries);
          toast({ 
            title: "Produit ajouté avec écriture comptable", 
            description: `Stock: ${stockValue.toFixed(2)} ${settings.currency_symbol}`
          });
        } else {
          toast({ title: "Produit ajouté" });
        }
      }

      setShowForm(false);
      await loadProducts();
    } catch (error) {
      console.error('Erreur enregistrement produit:', error);
      toast({ title: "Erreur", description: "Impossible d'enregistrer le produit", variant: "destructive" });
    }
  };

  const handleSubmitService = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formServiceName.trim() || !formServicePrice) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs",
        variant: "destructive",
      });
      return;
    }

    const price = parseDecimalInput(formServicePrice);

    if (price <= 0) {
      toast({
        title: "Erreur",
        description: "Le prix du service doit être supérieur à 0",
        variant: "destructive",
      });
      return;
    }

    try {
      await addService(formServiceName.trim(), price, Number(formServiceFeeService) || 2);
      toast({ title: "Service ajouté", description: `${formServiceName.trim()} enregistré` });
      setShowServiceForm(false);
      await loadProducts();
    } catch (error) {
      console.error('Erreur enregistrement service:', error);
      toast({ title: "Erreur", description: "Impossible d'enregistrer le service", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce produit ?")) return;
    try {
      await deleteProduct(id);
      toast({ title: "Produit supprimé" });
      await loadProducts();
    } catch (error) {
      console.error('Erreur suppression:', error);
      toast({ title: "Erreur", description: "Impossible de supprimer", variant: "destructive" });
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount) + ` ${settings.currency_symbol}`;

  const handleDownloadInventoryPDF = async () => {
    try {
      const { generateInventoryPDF } = await import('@/lib/pdf');
      // Only include physical products with positive stock in inventory
      const itemsForInventory = products.filter(p => !p.is_service && (Number.isFinite(p.quantity_available) ? p.quantity_available > 0 : false));
      if (itemsForInventory.length === 0) {
        toast({ title: 'Aucun article', description: 'Aucun produit physique en stock à exporter', variant: 'destructive' });
        return;
      }
      const doc = generateInventoryPDF(itemsForInventory, settings.currency_symbol);
      doc.save('inventaire-produits.pdf');
      toast({ title: "PDF téléchargé", description: "Inventaire sauvegardé" });
    } catch (error) {
      console.error('Erreur génération PDF:', error);
      toast({ title: "Erreur", description: "Impossible de générer le PDF", variant: "destructive" });
    }
  };

  return (
    <AppLayout title="Produits">
      <div className="space-y-6">
        {/* Header */}
        <div className="card-premium p-6 flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold text-card-foreground">
            Produits et Services
          </h1>
          <div className="flex gap-3 flex-wrap">
            <Button onClick={handleDownloadInventoryPDF} className="bg-amber-600 text-white hover:bg-amber-700">
              📥 Télécharger l'inventaire (PDF)
            </Button>
            <Button onClick={openAddServiceForm} className="bg-[#d4af37] text-navy-deep hover:brightness-90 font-semibold">
              <Plus className="mr-2 h-4 w-4" />
              Ajouter un Service
            </Button>
            <Button onClick={openAddForm} className="bg-primary text-primary-foreground">
              <Plus className="mr-2 h-4 w-4" />
              Ajouter un produit
            </Button>
          </div>
        </div>

        {/* Products Grid */}
        {products.length === 0 ? (
          <div className="card-premium p-8 text-center text-muted-foreground">
            Aucun produit ou service. Commencez par ajouter un produit ou un service.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {products.map(product => (
              <div key={product.id} className="card-premium hover-lift p-5 bg-white border border-gray-200">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-navy-deep">{product.name}</h3>
                      {product.is_service && (
                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">Service</span>
                      )}
                    </div>
                    <p className="mt-2 text-sm text-gray-500">Prix vente</p>
                    <p className="text-lg font-bold text-yellow-600">
                      {formatCurrency(product.unit_price)}
                    </p>
                    {!product.is_service && (
                      <>
                        <p className="mt-2 text-sm text-gray-500">Prix d'achat</p>
                        <p className="text-lg font-semibold text-amber-600">
                          {formatCurrency(product.cost_price)}
                        </p>
                        <p className="mt-2 text-sm text-gray-500">Quantité disponible</p>
                        <p className="text-lg font-bold text-navy-deep">
                          {product.quantity_available} unités
                        </p>
                      </>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditForm(product)}
                        className="h-8 w-8 text-muted-foreground hover:text-card-foreground"
                        title="Modifier"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(product.id)}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        title="Supprimer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    {!product.is_service && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setRestockProduct(product)}
                        className="h-8 gap-1 text-xs border-yellow-400 text-yellow-600 hover:bg-yellow-50 dark:border-yellow-600 dark:text-yellow-500 dark:hover:bg-yellow-900/20 font-semibold"
                        title="Réapprovisionnement"
                      >
                        <PlusCircle className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Réapprox.</span>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

        {/* Service Form Modal */}
        {showServiceForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-deep/80 backdrop-blur-sm">
            <div className="card-premium w-full max-w-md p-6 animate-scale-in bg-white">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="font-display text-xl font-semibold text-navy-deep">Nouveau service</h2>
                <Button variant="ghost" size="icon" onClick={() => setShowServiceForm(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <form onSubmit={handleSubmitService} className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-navy-deep">Nom du service</Label>
                  <Input value={formServiceName} onChange={e => setFormServiceName(e.target.value)} placeholder="ex: Livraison" className="bg-gray-50 border-gray-300 text-navy-deep" />
                </div>

                <div className="space-y-2">
                  <Label className="text-navy-deep">Prix ({settings.currency_symbol})</Label>
                  <Input type="text" inputMode="decimal" value={formServicePrice} onChange={e => handleServicePriceChange(e.target.value)} placeholder="ex: 50" className="bg-gray-50 border-gray-300 text-navy-deep" />
                </div>

                <div className="space-y-2">
                  <Label className="text-navy-deep">Frais de service (%)</Label>
                  <Input type="number" value={formServiceFeeService} onChange={e => setFormServiceFeeService(e.target.value)} className="bg-gray-50 border-gray-300 text-navy-deep" />
                </div>

                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setShowServiceForm(false)}>Annuler</Button>
                  <Button type="submit" className="bg-yellow-500 text-navy-deep hover:bg-yellow-600">Ajouter le service</Button>
                </div>
              </form>
            </div>
          </div>
        )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-deep/80 backdrop-blur-sm">
          <div className="card-premium w-full max-w-md p-6 animate-scale-in bg-white">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="font-display text-xl font-semibold text-navy-deep">
                {editingProduct ? "Modifier le produit" : "Nouveau produit"}
              </h2>
              <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label className="text-navy-deep">Nom du produit</Label>
                <Input
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="ex: Croissant"
                  className="bg-gray-50 border-gray-300 text-navy-deep"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-navy-deep">Prix de vente ({settings.currency_symbol})</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={formPrice}
                  onChange={e => handlePriceChange(e.target.value)}
                  placeholder="ex: 12.5 ou 12,5"
                  className="bg-gray-50 border-gray-300 text-navy-deep"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-navy-deep">Prix d'achat ({settings.currency_symbol})</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={formCostPrice}
                  onChange={e => handleCostPriceChange(e.target.value)}
                  placeholder="ex: 5.0 ou 5,0"
                  className="bg-gray-50 border-gray-300 text-navy-deep"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-navy-deep">Frais de service par défaut (%)</Label>
                <Input
                  type="number"
                  value={formServiceFee}
                  onChange={e => setFormServiceFee(e.target.value)}
                  className="bg-gray-50 border-gray-300 text-navy-deep"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-navy-deep">Quantité disponible</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={formQuantity}
                  onChange={e => handleQuantityChange(e.target.value)}
                  placeholder="ex: 50"
                  className="bg-gray-50 border-gray-300 text-navy-deep"
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-yellow-500 text-navy-deep hover:bg-yellow-600 font-semibold"
              >
                {editingProduct ? "Modifier" : "Ajouter"}
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* Restock Form Modal */}
      {restockProduct && (
        <RestockForm
          product={restockProduct}
          onClose={() => setRestockProduct(null)}
          onSuccess={loadProducts}
        />
      )}
    </AppLayout>
  );
}
