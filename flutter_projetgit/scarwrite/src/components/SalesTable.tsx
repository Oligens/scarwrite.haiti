import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Trash, Printer } from "@/lib/lucide-react";
import { generateClientReceiptFromSale } from '@/lib/pdf';
import { downloadPDF } from '@/lib/pdf';
import { useToast } from "@/hooks/use-toast";
import { deleteSale, getSettings, Sale } from "@/lib/storage";

interface SalesTableProps {
  sales: Sale[];
  onUpdate: () => void;
}

export function SalesTable({ sales, onUpdate }: SalesTableProps) {
  const { toast } = useToast();
  const settings = getSettings();

  const handleDelete = (id: string) => {
    deleteSale(id);
    toast({ title: "Vente supprimée" });
    onUpdate();
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount) + ` ${settings.currency_symbol}`;

  return (
    <Table>
      <TableHeader>
        <TableRow className="border-border/50 hover:bg-transparent">
          <TableHead className="text-muted-foreground">Produit</TableHead>
          <TableHead className="text-right text-muted-foreground">PU</TableHead>
          <TableHead className="text-right text-muted-foreground">Qté</TableHead>
          <TableHead className="text-right text-muted-foreground">Total</TableHead>
          <TableHead className="w-12" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {sales.map((sale) => (
          <TableRow key={sale.id} className="border-border/50">
            <TableCell className="font-medium text-foreground">
              {sale.product_name}
            </TableCell>
            <TableCell className="text-right text-muted-foreground">
              {formatCurrency(sale.unit_price)}
            </TableCell>
            <TableCell className="text-right text-foreground">
              {sale.quantity}
            </TableCell>
            <TableCell className="text-right font-semibold text-primary">
              {formatCurrency(sale.total)}
            </TableCell>
            <TableCell className="flex gap-2 justify-end">
              <Button
                size="icon"
                onClick={() => {
                  try {
                    const doc = generateClientReceiptFromSale(sale as any);
                    downloadPDF(doc, `recu-${sale.id.slice(0,8)}.pdf`);
                    toast({ title: 'Reçu généré', description: 'Le reçu a été téléchargé' });
                  } catch (err) {
                    console.error(err);
                    toast({ title: 'Erreur', description: 'Impossible de générer le reçu', variant: 'destructive' });
                  }
                }}
                className="h-8 w-8 bg-yellow-400 text-black hover:bg-yellow-500 rounded-md shadow-md"
                title="Imprimer le reçu"
              >
                <Printer className="h-4 w-4" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(sale.id)}
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
              >
                <Trash className="h-4 w-4" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
