import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Trash2 } from "@/lib/lucide-react";
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
            <TableCell>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(sale.id)}
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
