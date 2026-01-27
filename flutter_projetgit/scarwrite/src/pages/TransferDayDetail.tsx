import { useParams, Link, useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, Share2, Download, Trash, Pencil } from "@/lib/lucide-react";
import { getTransfersByDate, deleteTransfer, getSettings, Transfer } from "@/lib/storage";
import { getTransferTypeName } from "@/components/TransferTypeSelector";
import { generateTransferDayPDF, sharePDF, downloadPDF } from "@/lib/pdf";
import { TransferForm } from "@/components/TransferForm";
import { useToast } from "@/hooks/use-toast";

const DAYS_FR = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
const MONTHS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

export default function TransferDayDetail() {
  const { date } = useParams<{ date: string }>();
  const { toast } = useToast();
  const navigate = useNavigate();
  const settings = getSettings();
  const [refreshKey, setRefreshKey] = useState(0);
  const [editingTransfer, setEditingTransfer] = useState<Transfer | null>(null);

  const transfers = useMemo(() => {
    return date ? getTransfersByDate(date) : [];
  }, [date, refreshKey]);

  const totalRevenue = useMemo(() => {
    return transfers.reduce((sum, t) => sum + t.transfer_fee, 0);
  }, [transfers]);

  const formatDate = (dateStr: string): string => {
    const d = new Date(dateStr + 'T00:00:00');
    return `${DAYS_FR[d.getDay()]} ${d.getDate()} ${MONTHS_FR[d.getMonth()]} ${d.getFullYear()}`;
  };

  const formatCurrency = (amount: number): string => {
    return amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleDelete = (id: string) => {
    if (confirm("Supprimer ce transfert ?")) {
      deleteTransfer(id);
      setRefreshKey(k => k + 1);
      toast({ title: "Transfert supprimé" });
    }
  };

  const handleEdit = (transfer: Transfer) => {
    setEditingTransfer(transfer);
  };

  const handleEditSuccess = () => {
    setEditingTransfer(null);
    setRefreshKey(k => k + 1);
  };

  const handleShare = async () => {
    if (!date) return;
    const doc = generateTransferDayPDF(date, transfers);
    await sharePDF(doc, `transferts-${date}.pdf`);
  };

  const handleDownload = () => {
    if (!date) return;
    const doc = generateTransferDayPDF(date, transfers);
    downloadPDF(doc, `transferts-${date}.pdf`);
  };

  if (!date) return null;

  // Show edit form if editing
  if (editingTransfer) {
    return (
      <div className="min-h-screen bg-background">
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute -left-1/3 -top-1/3 h-2/3 w-2/3 rounded-full bg-primary/3 blur-3xl" />
        </div>
        <div className="relative z-10">
          <header className="border-b border-border/50 bg-card/50 backdrop-blur-xl">
            <div className="container flex h-16 items-center gap-4">
                <Button size="icon" onClick={() => setEditingTransfer(null)} className="bg-amber-400 text-black hover:bg-amber-500 rounded-lg">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              <h1 className="font-display text-lg font-bold text-gradient-gold">
                Modifier le transfert
              </h1>
            </div>
          </header>
          <main className="container py-8">
            <div className="max-w-lg mx-auto card-premium p-6">
              <TransferForm
                type={editingTransfer.transfer_type}
                onBack={() => setEditingTransfer(null)}
                onSuccess={handleEditSuccess}
                editTransfer={editingTransfer}
              />
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-1/3 -top-1/3 h-2/3 w-2/3 rounded-full bg-primary/3 blur-3xl" />
      </div>

      <div className="relative z-10">
        <header className="border-b border-border/50 bg-card/50 backdrop-blur-xl">
          <div className="container flex h-16 items-center gap-4">
            <Button asChild size="icon" className="bg-amber-400 text-black hover:bg-amber-500 rounded-lg">
              <Link to="/transfers/calendar">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div className="flex-1">
              <h1 className="font-display text-lg font-bold text-gradient-gold">
                {formatDate(date)}
              </h1>
              <p className="text-xs text-muted-foreground">
                {transfers.length} transfert{transfers.length > 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </header>

        <main className="container py-8 space-y-6">
          {/* Total revenue */}
          <div className="card-premium p-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">Recette du jour (Frais)</p>
              <p className="text-4xl font-bold text-primary">
                {formatCurrency(totalRevenue)} {settings.currency_symbol}
              </p>
            </div>
          </div>

          {/* PDF actions */}
          <div className="flex gap-3">
            <Button onClick={handleShare} variant="outline" className="flex-1 border-primary/30">
              <Share2 className="mr-2 h-4 w-4" />
              Partager PDF
            </Button>
            <Button onClick={handleDownload} variant="outline" className="flex-1 border-primary/30">
              <Download className="mr-2 h-4 w-4" />
              Télécharger
            </Button>
          </div>

          {/* Transfers list */}
          <div className="space-y-4">
            {transfers.map((transfer) => (
              <TransferCard 
                key={transfer.id} 
                transfer={transfer} 
                currencySymbol={settings.currency_symbol}
                onEdit={() => handleEdit(transfer)}
                onDelete={() => handleDelete(transfer.id)}
              />
            ))}
          </div>

          {transfers.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              Aucun transfert pour cette date
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

interface TransferCardProps {
  transfer: Transfer;
  currencySymbol: string;
  onEdit: () => void;
  onDelete: () => void;
}

function TransferCard({ transfer, currencySymbol, onEdit, onDelete }: TransferCardProps) {
  const formatCurrency = (amount: number): string => {
    return amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const isUsdType = ['zelle', 'cam_transfert', 'western_union', 'moneygram', 'autre'].includes(transfer.transfer_type);
  const isPhoneType = ['moncash', 'natcash'].includes(transfer.transfer_type);

  return (
    <div className="card-premium p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full">
              N° {transfer.report_number}
            </span>
            <span className="font-medium text-foreground">
              {getTransferTypeName(transfer.transfer_type, transfer.custom_type_name)}
            </span>
          </div>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={onEdit} className="text-primary">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onDelete} className="text-destructive">
            <Trash className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        {!isPhoneType && (
          <>
            <div>
              <span className="text-muted-foreground">Expéditeur: </span>
              <span className="text-foreground">{transfer.sender_name}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Bénéficiaire: </span>
              <span className="text-foreground">{transfer.receiver_name}</span>
            </div>
          </>
        )}
        {isPhoneType && (
          <>
            <div>
              <span className="text-muted-foreground">Tél. Exp: </span>
              <span className="text-foreground">{transfer.sender_phone}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Tél. Bén: </span>
              <span className="text-foreground">{transfer.receiver_phone}</span>
            </div>
          </>
        )}
      </div>

      <div className="border-t border-border/50 pt-3 space-y-1">
        {isUsdType && transfer.amount_usd && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Montant USD</span>
            <span className="text-foreground">${formatCurrency(transfer.amount_usd)}</span>
          </div>
        )}
        {isUsdType && transfer.exchange_rate && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Taux</span>
            <span className="text-foreground">{transfer.exchange_rate}</span>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Montant Gourdes</span>
          <span className="text-foreground">{formatCurrency(transfer.amount_gourdes)} {currencySymbol}</span>
        </div>
        <div className="flex justify-between font-semibold">
          <span className="text-primary">💼 Frais (Recette)</span>
          <span className="text-primary">{formatCurrency(transfer.transfer_fee)} {currencySymbol}</span>
        </div>
      </div>
    </div>
  );
}