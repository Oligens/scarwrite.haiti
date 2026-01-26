import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import jsPDF from 'jspdf';
import { Printer } from "@/lib/lucide-react";
import { getSettings } from "@/lib/storage";

interface ReceiptData {
  operationNumber: string;
  operationDate: string;
  operationType: 'retrait' | 'depot' | 'transfert';
  serviceType: string; // Zelle, MonCash, NatCash, etc.
  principalAmount: number;
  fees: number;
  senderName?: string;
  receiverName?: string;
  description?: string;
  account?: string;
  taxes?: string;
}

interface ReceiptGeneratorProps {
  data: ReceiptData;
  autoDownload?: boolean;
}

export function ReceiptGenerator({ data, autoDownload }: ReceiptGeneratorProps) {
  const [showPreview, setShowPreview] = useState(false);
  const settings = getSettings();

  const isWithdrawal = data.operationType.toLowerCase() === 'retrait';
  const totalAmount = isWithdrawal ? data.fees : (data.principalAmount + data.fees);

  const formatCurrency = (amount: number): string => {
    const formatted = amount.toLocaleString('fr-FR', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
    const symbol = settings.currency_symbol || 'G';
    return `${formatted} ${symbol}`;
  };

  const getOperationTypeLabel = (type: string): string => {
    switch (type.toLowerCase()) {
      case 'retrait':
        return 'RETRAIT DE FONDS';
      case 'depot':
        return 'DÉPÔT DE FONDS';
      case 'transfert':
        return 'TRANSFERT';
      default:
        return type.toUpperCase();
    }
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const generatePDF = async () => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'A4',
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 12;
      const contentWidth = pageWidth - 2 * margin;

      let yPosition = margin;

      // Header: optional logo then restaurant name
      if (settings.logo_url) {
        try {
          // load image as data URL
          const toDataUrl = async (url: string): Promise<string> => {
            const res = await fetch(url);
            const blob = await res.blob();
            return await new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(String(reader.result));
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });
          };

          const imgData = await toDataUrl(settings.logo_url);
          const imgWidth = 30;
          const imgHeight = 30;
          doc.addImage(imgData, 'PNG', margin, yPosition, imgWidth, imgHeight);
        } catch (err) {
          // ignore logo errors
          console.warn('Logo non chargé:', err);
        }
      }

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(18);
      doc.text(settings.restaurant_name || 'ScarWrite', pageWidth / 2, yPosition + 6, { align: 'center' });
      yPosition += 12;

      // Receipt title
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('RECU DE TRANSACTION', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 10;

      // Separator line
      doc.setDrawColor(180, 180, 180);
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 6;

      // Date and Operation Number (date + time)
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(10);
      const now = new Date();
      const dateTimeStr = `${formatDate(data.operationDate)} ${now.toLocaleTimeString('fr-FR')}`;
      doc.text(`Date: ${dateTimeStr}`, margin, yPosition);
      yPosition += 5;
      doc.text(`No. Operation: ${data.operationNumber}`, margin, yPosition);
      yPosition += 8;

      // Operation type and service
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(getOperationTypeLabel(data.operationType), margin, yPosition);
      yPosition += 6;

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Service: ${data.serviceType}`, margin, yPosition);
      yPosition += 6;

      if (data.account) {
        doc.text(`Compte: ${data.account}`, margin, yPosition);
        yPosition += 6;
      }

      if (data.senderName) {
        doc.text(`Expediteur: ${data.senderName}`, margin, yPosition);
        yPosition += 5;
      }

      if (data.receiverName) {
        doc.text(`Recepteur: ${data.receiverName}`, margin, yPosition);
        yPosition += 5;
      }

      yPosition += 4;

      // Separator
      doc.setDrawColor(180, 180, 180);
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 8;

      // Amount details table
      const tableStartY = yPosition;
      const col1Width = contentWidth * 0.6;
      const col2Width = contentWidth * 0.4;

      // Headers
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('Description', margin, yPosition);
      doc.text('Montant', margin + col1Width, yPosition, { align: 'right' });
      yPosition += 6;

      // Separator
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 4;

      // Amount rows
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(10);

      const principalAmountStr = formatCurrency(data.principalAmount);
      const feesAmountStr = formatCurrency(data.fees);
      // Compute total according to operation type rules:
      // DEPOT / TRANSFERT: client pays principal + fees
      // RETRAIT: client receives principal but only pays fees (so amount due = fees)
      const isWithdrawal = data.operationType.toLowerCase() === 'retrait';
      const totalAmount = isWithdrawal ? data.fees : (data.principalAmount + data.fees);
      const totalAmountStr = formatCurrency(totalAmount);

      // Principal amount (for withdrawal we still show received amount)
      doc.text(isWithdrawal ? 'Montant Retiré' : 'Montant Principal', margin, yPosition);
      doc.text(principalAmountStr, margin + col1Width, yPosition, { align: 'right' });
      yPosition += 6;

      // Fees
      if (data.fees > 0) {
        doc.text('Frais / Commission (706)', margin, yPosition);
        doc.text(feesAmountStr, margin + col1Width, yPosition, { align: 'right' });
        yPosition += 6;
      }

      // Separator before total
      doc.setDrawColor(150, 150, 150);
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 4;

      // Total (Amount due)
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(11);
      const totalLabel = isWithdrawal ? 'MONTANT DÛ (FRAIS)' : 'TOTAL TTC';
      doc.text(totalLabel, margin, yPosition);
      doc.text(totalAmountStr, margin + col1Width, yPosition, { align: 'right' });
      yPosition += 8;

      // Footer
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8);
      doc.text('Compte 53 (Caisse) / 51 (Numerique)', pageWidth / 2, pageHeight - 12, { align: 'center' });
      doc.text('Merci de votre confiance', pageWidth / 2, pageHeight - 8, { align: 'center' });

      // Signature line
      const sigY = pageHeight - 36;
      doc.setDrawColor(200,200,200);
      doc.line(margin, sigY, margin + 80, sigY);
      doc.setFontSize(9);
      doc.text('Signature client', margin, sigY + 6);

      // Download PDF
      const fileName = `Recu_${data.operationNumber.replace('#', '')}_${data.operationDate}.pdf`;
      doc.save(fileName);
    } catch (err) {
      console.error('Erreur generation PDF:', err);
      alert('Erreur lors de la generation du recu PDF');
    }
  };

  const previewReceipt = () => {
    setShowPreview(true);
  };

  return (
    <>
      <Button
        onClick={async () => {
          if (autoDownload) {
            await generatePDF();
            return;
          }
          previewReceipt();
        }}
        className="bg-blue-600 text-white hover:bg-blue-700 hover:scale-[1.02] transition-transform cursor-pointer font-semibold flex items-center gap-2 min-h-10 px-4"
        title="Générer et télécharger le reçu PDF"
      >
        <Printer className="h-5 w-5" />
        <span>Générer Reçu PDF</span>
      </Button>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-md max-h-96 overflow-y-auto">
          <DialogTitle className="font-display text-lg font-bold">Aperçu du Reçu</DialogTitle>

          <div className="space-y-4 mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200 font-mono text-sm">
            {/* Receipt content */}
            <div className="text-center">
              <p className="font-bold text-base">{settings.restaurant_name || 'ScarWrite'}</p>
              <p className="font-bold text-sm mt-2">RECU DE TRANSACTION</p>
            </div>

            <div className="border-t border-gray-300 pt-3">
              <p>Date: {formatDate(data.operationDate)} {new Date().toLocaleTimeString('fr-FR')}</p>
              <p>No. Operation: {data.operationNumber}</p>
              {data.account && <p>Compte: {data.account}</p>}
            </div>

            <div className="border-t border-gray-300 pt-3">
              <p className="font-bold text-base">{getOperationTypeLabel(data.operationType)}</p>
              <p>Service: {data.serviceType}</p>
              {data.senderName && <p>Expediteur: {data.senderName}</p>}
              {data.receiverName && <p>Recepteur: {data.receiverName}</p>}
            </div>

            <div className="border-t border-gray-300 pt-3">
              <div className="flex justify-between">
                <span>{isWithdrawal ? 'Montant Retiré:' : 'Montant Principal:'}</span>
                <span className="font-bold">{formatCurrency(data.principalAmount)}</span>
              </div>
              {data.fees > 0 && (
                <div className="flex justify-between">
                  <span>Frais / Commission:</span>
                  <span className="font-bold">{formatCurrency(data.fees)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-gray-300 pt-2 mt-2 font-bold">
                <span>{isWithdrawal ? 'MONTANT DÛ (FRAIS):' : 'TOTAL:'}</span>
                <span>{formatCurrency(totalAmount)}</span>
              </div>
            </div>

            <div className="border-t border-gray-300 pt-3">
              <p className="text-xs text-center text-gray-600">Compte 53 (Caisse) / 51 (Numerique)</p>
              <div className="mt-4">
                <div className="border-t border-gray-300 w-40 mx-auto h-0" />
                <p className="text-center text-xs mt-1">Signature client</p>
              </div>
            </div>
          </div>

          <div className="flex gap-2 justify-end mt-6">
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Fermer
            </Button>
            <Button
              onClick={() => {
                generatePDF();
                setShowPreview(false);
              }}
              className="bg-green-600 text-white hover:bg-green-700 font-bold"
            >
              📥 Télécharger PDF
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
