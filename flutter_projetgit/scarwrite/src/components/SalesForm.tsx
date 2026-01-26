import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
// icons replaced by inline image
import { getActiveProducts, addSale, getSettings, Product, parseDecimalInput, updateProduct, getTaxConfigs, recordTaxedTransaction, addOrUpdateThirdParty, TaxConfig, TransferType } from "@/lib/storage";

interface SalesFormProps {
  date: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function SalesForm({ date, onClose, onSuccess }: SalesFormProps) {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [taxes, setTaxes] = useState<TaxConfig[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1);
  const [isCredit, setIsCredit] = useState<boolean>(false);
  const [clientName, setClientName] = useState<string>('');
  const [paidAmount, setPaidAmount] = useState<string>('0');
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<'cash'|'digital'>('cash');
  const [paymentService, setPaymentService] = useState<TransferType | undefined>(undefined);
  const [serviceFeePercent, setServiceFeePercent] = useState<number>(0);
  const settings = getSettings();

  useEffect(() => {
    const loadProductsAndTaxes = async () => {
      try {
        const activeProducts = await getActiveProducts();
        const taxConfigs = await getTaxConfigs();
        setProducts(activeProducts);
        setTaxes(taxConfigs);
      } catch (error) {
        console.error('Erreur chargement données:', error);
        toast({
          title: "Erreur",
          description: "Impossible de charger les données",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadProductsAndTaxes();
  }, [toast]);

  useEffect(() => {
    if (selectedProductData) {
      setServiceFeePercent(typeof selectedProductData.service_fee_percentage === 'number' ? selectedProductData.service_fee_percentage : 0);
    }
  }, [selectedProduct]);

  const selectedProductData = products.find(p => p.id === selectedProduct);
  const unitPrice = selectedProductData?.unit_price || 0;
  const quantityAvailable = selectedProductData?.quantity_available || 0;
  const subTotal = Math.round(unitPrice * quantity * 100) / 100;
  
  // Calcul des taxes
  const taxDetails = taxes.map(tax => ({
    ...tax,
    amount: Math.round(subTotal * (tax.percentage / 100) * 100) / 100,
  }));
  const totalTaxes = taxDetails.reduce((sum, tax) => sum + tax.amount, 0);
  const total = subTotal + totalTaxes;

  // Filtrer les produits basé sur la recherche
  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProduct || quantity < 1 || !selectedProductData) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un produit et une quantité valide",
        variant: "destructive",
      });
      return;
    }

    if (!selectedProductData.is_service && quantity > quantityAvailable) {
      toast({
        title: "Erreur",
        description: `Quantité insuffisante. Disponible: ${quantityAvailable}`,
        variant: "destructive",
      });
      return;
    }

    try {
      // If credit, require client name
      if (isCredit && !clientName.trim()) {
        toast({ title: 'Erreur', description: 'Nom du client requis pour vente à crédit', variant: 'destructive' });
        return;
      }

      // Compute paid amount
      const paid = isCredit ? parseDecimalInput(paidAmount) : total;
      // Ajouter la vente et récupérer l'ID créé (incluant nom client et acompte si crédit)
      const saleId = await addSale(
        selectedProduct,
        selectedProductData.name,
        quantity,
        unitPrice,
        date,
        isCredit,
        isCredit ? clientName.trim() : undefined,
        paid,
        paymentMethod,
        paymentService,
        serviceFeePercent
      );

      // Enregistrer les taxes
      for (const tax of taxDetails) {
        if (tax.amount > 0) {
          await recordTaxedTransaction('sale', saleId, date, subTotal, tax.name, tax.percentage);
        }
      }

      // If credit sale, update client balance by unpaid amount (total including taxes - paid)
      if (isCredit) {
        const totalWithTax = total;
        const paidVal = parseDecimalInput(paidAmount);
        const unpaid = Math.round((totalWithTax - paidVal) * 100) / 100;
        if (unpaid > 0) {
          await addOrUpdateThirdParty(clientName.trim(), 'client', unpaid);
        }
      }
      
      // Décrémenter le stock uniquement si c'est un produit (pas un service)
      if (!selectedProductData.is_service) {
        const newQuantity = quantityAvailable - quantity;
        await updateProduct(selectedProduct, {
          quantity_available: newQuantity,
          updated_at: new Date().toISOString(),
        });

        toast({ title: "Vente enregistrée", description: `Stock mis à jour: ${newQuantity} restant(s)` });
      } else {
        toast({ title: "Vente enregistrée", description: `${selectedProductData.name} (service) enregistré` });
      }
      onSuccess();
    } catch (error) {
      console.error('Erreur ajout vente:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer la vente",
        variant: "destructive",
      });
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number.isFinite(amount) ? amount : 0) + ` ${settings.currency_symbol}`;

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
        <div className="card-premium w-full max-w-md p-6">
          <p className="text-center text-muted-foreground">Chargement des produits...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="card-premium w-full max-w-md p-6 animate-scale-in">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold text-foreground">
            Nouvelle vente
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <img src="/scarwrite.png" className="h-5 w-5" alt="Logo" />
          </Button>
        </div>

        {products.length === 0 ? (
          <div className="text-center text-muted-foreground">
            Aucun produit disponible. Ajoutez d'abord des produits.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Recherche d'article (produit ou service) */}
            <div className="space-y-2">
              <Label className="font-semibold text-white">🔍 Rechercher un article</Label>
              <div className="relative">
                <img src="/scarwrite.png" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" alt="Logo" />
                <Input
                  type="text"
                  placeholder="Rechercher..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-muted/50 border-border pl-10 placeholder:text-black placeholder-opacity-80"
                />
              </div>
            </div>

            {/* Sélection produit/service */}
            <div className="space-y-2">
              <Label className="font-semibold text-white">📦 Produit / Service</Label>
              <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                <SelectTrigger className="bg-white border-slate-300 text-slate-900 font-semibold hover:border-slate-400">
                  <SelectValue placeholder="Sélectionner un produit" className="text-slate-900 font-bold" />
                </SelectTrigger>
                <SelectContent>
                  {filteredProducts.map(product => (
                    <SelectItem key={product.id} value={product.id}>
                      <div className="flex items-center gap-2">
                        <span>{product.name}</span>
                        {product.is_service ? (
                          <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">Service</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">({product.quantity_available} dispo)</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedProductData && (
              <>
                {/* Prix et (si produit) stock */}
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label className="font-semibold text-white text-sm">Prix unitaire</Label>
                    <div className="rounded-lg bg-muted/30 p-2 text-center">
                      <span className="font-bold text-black">{formatCurrency(unitPrice)}</span>
                    </div>
                  </div>
                </div>
                {!selectedProductData?.is_service && (
                  <div className="space-y-2 mt-3">
                    <Label className="font-semibold text-white text-sm">Stock disponible</Label>
                    <div className="rounded-lg bg-muted/30 p-2 text-center">
                      <span className={`font-bold ${quantityAvailable <= 5 ? 'text-orange-500' : 'text-black'}`}>{quantityAvailable}</span>
                    </div>
                  </div>
                )}

                {/* Quantité */}
                <div className="space-y-2">
                  <Label className="font-semibold text-white">📊 Quantité à vendre</Label>
                  <Input
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 1;
                      if (selectedProductData?.is_service) {
                        setQuantity(Math.max(val, 1));
                      } else {
                        setQuantity(Math.min(Math.max(val, 1), quantityAvailable));
                      }
                    }}
                    className="bg-background border-slate-400 text-white"
                  />
                </div>

                {/* Total */}
                <div className="space-y-2">
                  <Label className="font-semibold text-white">💰 Total</Label>
                  <div className="rounded-lg bg-primary/10 p-4 text-center">
                    <span className="text-3xl font-bold text-black">
                      {formatCurrency(total)}
                    </span>
                  </div>
                </div>

                {/* Crédit */}
                <div className="flex items-center gap-3 rounded-lg bg-muted/30 p-3">
                  <Checkbox
                    id="credit"
                    checked={isCredit}
                    onCheckedChange={(checked) => setIsCredit(checked as boolean)}
                  />
                  <Label htmlFor="credit" className="cursor-pointer flex-1 font-semibold text-white">
                    ✏️ Vente à crédit
                  </Label>
                </div>

                {isCredit && (
                  <div className="space-y-2 mt-2">
                    <Label className="font-semibold text-white">Nom du client (obligatoire)</Label>
                    <Input
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="Nom du client"
                      className="bg-background border-slate-400 text-white"
                    />
                  </div>
                )}
                {isCredit && (
                  <div className="space-y-2 mt-2">
                    <Label className="font-semibold text-white">Montant payé maintenant (acompte)</Label>
                    <Input
                      value={paidAmount}
                      onChange={(e) => setPaidAmount(e.target.value)}
                      placeholder="0"
                      inputMode="decimal"
                      className="bg-background border-slate-400 text-white"
                    />
                    <p className="text-xs text-muted-foreground">La différence sera enregistrée comme créance client.</p>
                  </div>
                )}
                <div className="space-y-2 mt-2">
                  <Label className="font-semibold text-white">Méthode de paiement</Label>
                  <div className="flex gap-3">
                    <Button variant={paymentMethod === 'cash' ? 'default' : 'outline'} onClick={() => setPaymentMethod('cash')}>Espèces</Button>
                    <Button variant={paymentMethod === 'digital' ? 'default' : 'outline'} onClick={() => setPaymentMethod('digital')}>Argent Numérique</Button>
                  </div>
                </div>

                {paymentMethod === 'digital' && (
                  <>
                    <div className="space-y-2 mt-2">
                      <Label className="font-semibold text-white">Service de paiement</Label>
                      <Select value={paymentService} onValueChange={(v) => setPaymentService(v as TransferType)}>
                        <SelectTrigger className="bg-white border-slate-300 text-slate-900 font-semibold hover:border-slate-400">
                          <SelectValue placeholder="Sélectionner un service" className="text-slate-900 font-bold" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="moncash">MonCash</SelectItem>
                          <SelectItem value="natcash">NatCash</SelectItem>
                          <SelectItem value="zelle">Zelle</SelectItem>
                          <SelectItem value="western_union">Western Union</SelectItem>
                          <SelectItem value="moneygram">MoneyGram</SelectItem>
                          <SelectItem value="cam_transfert">Cam Transfert</SelectItem>
                          <SelectItem value="autre">Autre</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 mt-2">
                      <Label className="font-semibold text-white">Frais de service %</Label>
                      <Input type="number" value={serviceFeePercent} onChange={(e) => setServiceFeePercent(Number(e.target.value) || 0)} inputMode="decimal" />
                    </div>
                  </>
                )}
              </>
            )}

            <Button
              type="submit"
              disabled={!selectedProduct || (selectedProductData && !selectedProductData.is_service && quantity > quantityAvailable)}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Enregistrer la vente
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
            
