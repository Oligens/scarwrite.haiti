import { useState } from "react";
import { X, AlertCircle } from "@/lib/lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  updateProduct,
  parseDecimalInput,
  createAccountingTransaction,
  Product,
  getSettings,
  addOrUpdateThirdParty,
  getSuppliers,
  addSupplier,
  updateSupplier,
} from "@/lib/storage";

interface RestockFormProps {
  product: Product;
  onClose: () => void;
  onSuccess: () => void;
}

export function RestockForm({ product, onClose, onSuccess }: RestockFormProps) {
  const { toast } = useToast();
  const settings = getSettings();
  
  const [quantityAdded, setQuantityAdded] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [isCredit, setIsCredit] = useState(false);
  const [amountPaid, setAmountPaid] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleQuantityChange = (value: string) => {
    const sanitized = value.replace(/[^0-9]/g, "");
    setQuantityAdded(sanitized);
  };

  const handleCostPriceChange = (value: string) => {
    const sanitized = value.replace(/[^0-9.,]/g, "");
    setCostPrice(sanitized);
  };

  const handleAmountPaidChange = (value: string) => {
    const sanitized = value.replace(/[^0-9.,]/g, "");
    setAmountPaid(sanitized);
  };

  const calculateValues = () => {
    const qty = parseInt(quantityAdded, 10) || 0;
    const cost = parseDecimalInput(costPrice) || 0;
    const totalCost = qty * cost;
    const paid = parseDecimalInput(amountPaid) || 0;
    const debt = totalCost - paid;

    return { qty, cost, totalCost, paid, debt };
  };

  const { qty, cost, totalCost, paid, debt } = calculateValues();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!quantityAdded || !costPrice) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir la quantité et le prix d'achat",
        variant: "destructive",
      });
      return;
    }

    if (qty <= 0 || cost <= 0) {
      toast({
        title: "Erreur",
        description: "La quantité et le prix doivent être supérieurs à 0",
        variant: "destructive",
      });
      return;
    }

    if (isCredit && !amountPaid) {
      toast({
        title: "Erreur",
        description: "Veuillez indiquer le montant payé pour un achat à crédit",
        variant: "destructive",
      });
      return;
    }

    if (isCredit && paid > totalCost) {
      toast({
        title: "Erreur",
        description: "Le montant payé ne peut pas dépasser le coût total",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Update product stock: ADD to existing, don't replace
      const newQuantity = product.quantity_available + qty;
      await updateProduct(product.id, {
        quantity_available: newQuantity,
      });

      // Generate accounting entries ONLY for the restocked quantity
      const date = new Date().toISOString().slice(0, 10);
      const entries: Array<{
        journal_date: string;
        transaction_type: string;
        account_code: string;
        account_name: string;
        debit?: number;
        credit?: number;
        description?: string;
      }> = [];

      // DEBIT 31 (Stocks marchandises) - Full restocked value
      // For cash purchases (not credit), we will consider the paid amount = totalCost
      const effectivePaid = isCredit ? paid : totalCost;
      const effectiveDebt = Math.round((totalCost - effectivePaid) * 100) / 100;

      entries.push({
        journal_date: date,
        transaction_type: "product_restock",
        account_code: "31",
        account_name: "Stocks de marchandises",
        debit: totalCost,
        credit: 0,
        description: `Réapprovisionnement: ${product.name} (${qty} unités @ ${cost.toFixed(2)} ${settings.currency_symbol})`,
      });
      // CREDIT 53 (Caisse) - Amount paid immediately (for cash purchases this equals totalCost)
      if (effectivePaid > 0) {
        entries.push({
          journal_date: date,
          transaction_type: "product_restock",
          account_code: "53",
          account_name: "Caisse",
          debit: 0,
          credit: effectivePaid,
          description: `Paiement réapprovisionnement: ${product.name} (comptant)`,
        });
      }

      // CREDIT 401 (Fournisseurs) - If credit purchase (debt > 0)
      if (isCredit && effectiveDebt > 0) {
        entries.push({
          journal_date: date,
          transaction_type: "product_restock",
          account_code: "401",
          account_name: "Fournisseurs",
          debit: 0,
          credit: effectiveDebt,
          description: `Dette réapprovisionnement: ${product.name} (à crédit)`,
        });

        // Update third-party quick ledger and suppliers table only for credit purchases
        if (supplierName.trim()) {
          await addOrUpdateThirdParty(supplierName.trim(), "supplier", effectiveDebt);
          // Also add or update in suppliers table so it appears on Suppliers page
          try {
            const existing = await getSuppliers();
            const found = existing.find(s => s.name.toLowerCase() === supplierName.trim().toLowerCase());
            if (found) {
              await updateSupplier(found.id!, { amount_owed: found.amount_owed + effectiveDebt, due_date: date, status: 'active' });
            } else {
              await addSupplier({ name: supplierName.trim(), amount_owed: effectiveDebt, due_date: date, status: 'active' });
            }
          } catch (err) {
            console.warn('Impossible de créer/mettre à jour fournisseur dans suppliers table:', err);
          }
        }
      }

      // Record all accounting entries
      if (entries.length > 0) {
        await createAccountingTransaction(entries);
      }

      toast({
        title: "Réapprovisionnement enregistré",
        description: `${qty} unités ajoutées (Total: ${totalCost.toFixed(2)} ${settings.currency_symbol})`,
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Erreur réapprovisionnement:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer le réapprovisionnement",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-deep/80 backdrop-blur-sm">
      <div className="card-premium w-full max-w-md p-6 animate-scale-in max-h-[90vh] overflow-y-auto bg-white">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold text-navy-deep">
            Réapprovisionnement
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Product Info */}
        <div className="mb-6 rounded-lg bg-yellow-50 p-4 border border-yellow-200">
          <p className="font-semibold text-navy-deep">{product.name}</p>
          <p className="text-sm text-gray-600">
            Quantité actuelle: <span className="font-bold text-navy-deep">{product.quantity_available} unités</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Quantity Added */}
          <div className="space-y-2">
            <Label className="font-semibold text-black">Quantité ajoutée</Label>
            <Input
              type="text"
              inputMode="numeric"
              value={quantityAdded}
              onChange={(e) => handleQuantityChange(e.target.value)}
              placeholder="ex: 100"
              className="bg-background border-slate-400 text-black"
            />
            {quantityAdded && (
              <p className="text-xs text-gray-600">
                Nouveau total: {product.quantity_available + (parseInt(quantityAdded, 10) || 0)} unités
              </p>
            )}
          </div>

          {/* Cost Price */}
          <div className="space-y-2">
            <Label className="font-semibold text-black">
              Prix d'achat unitaire ({settings.currency_symbol})
            </Label>
            <Input
              type="text"
              inputMode="decimal"
              value={costPrice}
              onChange={(e) => handleCostPriceChange(e.target.value)}
              placeholder="ex: 10.5 ou 10,5"
              className="bg-background border-slate-400 text-black"
            />
            {costPrice && quantityAdded && (
              <p className="text-xs text-gray-600">
                Coût total: {totalCost.toFixed(2)} {settings.currency_symbol}
              </p>
            )}
          </div>

          {/* Credit Checkbox */}
          <div className="flex items-center gap-3 rounded-lg bg-yellow-50 p-3 border border-yellow-200">
            <Checkbox
              id="is-credit"
              checked={isCredit}
              onCheckedChange={(checked) => {
                setIsCredit(checked as boolean);
                if (!checked) setAmountPaid("");
              }}
              className="h-5 w-5"
            />
            <Label htmlFor="is-credit" className="mb-0 cursor-pointer text-sm font-semibold text-black">
              À crédit (achat mixte)
            </Label>
          </div>

          {/* Amount Paid (visible only if credit) */}
          {isCredit && (
            <>
              <div className="space-y-2">
                <Label className="font-semibold text-black">
                  Montant payé immédiatement ({settings.currency_symbol})
                </Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={amountPaid}
                  onChange={(e) => handleAmountPaidChange(e.target.value)}
                  placeholder="ex: 400"
                  className="bg-background border-slate-400 text-black"
                />
              </div>

              {/* Supplier Name */}
              <div className="space-y-2">
                <Label className="font-semibold text-black">Nom du fournisseur</Label>
                <Input
                  type="text"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  placeholder="ex: Boucherie Martin"
                  className="bg-background border-slate-400 text-black"
                />
              </div>

              {/* Credit Summary */}
              {amountPaid && totalCost > 0 && (
                <div className="space-y-2 rounded-lg bg-gray-50 p-3 border border-gray-200">
                  <p className="flex justify-between text-sm">
                    <span className="text-gray-600">Coût total:</span>
                    <span className="font-semibold text-black">
                      {totalCost.toFixed(2)} {settings.currency_symbol}
                    </span>
                  </p>
                  <p className="flex justify-between text-sm">
                    <span className="text-green-700 font-semibold">Payé (5311 - Caisse):</span>
                    <span className="font-bold text-green-700">{paid.toFixed(2)} {settings.currency_symbol}</span>
                  </p>
                  <p className="flex justify-between text-sm border-t border-gray-300 pt-2">
                    <span className="text-orange-700 font-semibold">Dette (401 - Fournisseur):</span>
                    <span className="font-bold text-orange-700">{debt.toFixed(2)} {settings.currency_symbol}</span>
                  </p>
                </div>
              )}

              {/* Info Alert */}
              <div className="flex gap-2 rounded-lg bg-blue-50 p-3 border border-blue-200">
                <AlertCircle className="h-5 w-5 flex-shrink-0 text-blue-700" />
                <p className="text-xs text-blue-700">
                  Écriture: Débit 31 ({totalCost.toFixed(2)}) / Crédit 5311 ({paid.toFixed(2)}) + Crédit 401 ({debt.toFixed(2)})
                </p>
              </div>
            </>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={loading || !quantityAdded || !costPrice}
            className="w-full bg-yellow-500 text-navy-deep hover:bg-yellow-600 font-semibold disabled:opacity-50"
          >
            {loading ? "Enregistrement..." : "Enregistrer le réapprovisionnement"}
          </Button>
        </form>
      </div>
    </div>
  );
}
