import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getSettings, Sale, Transfer, FinancialOperation, decryptData } from './storage';

// Try to load a UTF-8 font (placed in `public/fonts/NotoSans-Regular.ttf`) at runtime.
// If present, register it with jsPDF and map requests for 'helvetica' to the UTF-8 font
// so accented characters and currency symbols render correctly. This attempt is
// non-blocking: the font is fetched/registered asynchronously to avoid blocking
// PDF generation in environments where fetch is not available. For full offline
// reliability, place `NotoSans-Regular.ttf` in `public/fonts/` before building.
const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
};

const tryRegisterUtf8Font = (() => {
  let attempted = false;
  return async (doc: jsPDF) => {
    if (attempted) return;
    attempted = true;
    try {
      if (typeof fetch !== 'function') return;
      const resp = await fetch('/fonts/NotoSans-Regular.ttf');
      if (!resp.ok) return;
      const buf = await resp.arrayBuffer();
      const base64 = arrayBufferToBase64(buf);
      // register font with jsPDF runtime API
      try {
        (jsPDF as any).API.addFileToVFS('NotoSans-Regular.ttf', base64);
        (jsPDF as any).API.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
      } catch (err) {
        // some bundling setups expose addFileToVFS on the instance
        try {
          (doc as any).addFileToVFS('NotoSans-Regular.ttf', base64);
          (doc as any).addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
        } catch (e) {
          return;
        }
      }

      // Monkey-patch the instance setFont so code asking for 'helvetica' uses NotoSans
      const origSetFont = (doc as any).setFont.bind(doc);
      (doc as any).setFont = (fontName: string | undefined, fontStyle?: string) => {
        const mapped = (fontName === 'helvetica' || fontName === 'Helvetica') ? 'NotoSans' : fontName;
        return origSetFont(mapped, fontStyle as any);
      };
      // set current font to NotoSans
      try { (doc as any).setFont('NotoSans', 'normal'); } catch (_) {}
    } catch (err) {
      // ignore failures, fall back to built-in fonts
    }
  };
})();

const createDoc = (...args: any[]): jsPDF => {
  const doc: jsPDF = new (jsPDF as any)(...args);
  // attempt registration asynchronously; not awaited to avoid blocking
  void tryRegisterUtf8Font(doc);
  return doc;
};

const MONTHS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

const DAYS_FR = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

const extractNumberForPdf = (val: unknown): number => {
  if (val == null) return 0;
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    // try direct parse (allow spaces and commas)
    const cleaned = val.replace(/\s/g, '').replace(/,/g, '.');
    const n = Number(cleaned);
    if (Number.isFinite(n)) return n;
    // try decrypt
    const dec = decryptData(val);
    if (dec == null) return 0;
    if (typeof dec === 'number') return dec;
    if (typeof dec === 'string') {
      const nn = Number(dec.replace(/\s/g, '').replace(/,/g, '.'));
      if (Number.isFinite(nn)) return nn;
    }
    // if object, search common numeric keys
    const keys = ['total', 'amount', 'debit', 'credit', 'base_amount', 'tax_amount', 'unit_price', 'amount_gourdes'];
    for (const k of keys) {
      if (dec[k] != null) {
        const candidate = Number(dec[k]);
        if (Number.isFinite(candidate)) return candidate;
      }
    }
    return 0;
  }
  return 0;
};

const formatCurrency = (amount: unknown, symbol: string = 'G'): string => {
  const numeric = extractNumberForPdf(amount);
  const value = Number.isFinite(numeric) ? numeric : 0;
  // Format with space as thousands separator and comma for decimals
  // Use no grouping for PDF exports to avoid viewer-dependent spacing issues
  const formatted = value.toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: false,
  });
  // Replace non-breaking spaces with regular spaces to avoid PDF font rendering issues
  const safe = `${formatted} ${symbol}`.replace(/\u00A0/g, ' ');
  return safe;
};

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr + 'T00:00:00');
  const dayName = DAYS_FR[date.getDay()];
  const dayNum = date.getDate();
  const monthName = MONTHS_FR[date.getMonth()];
  const year = date.getFullYear();
  return `${dayName} ${dayNum} ${monthName} ${year}`;
};

const writeBoldAmount = (doc: jsPDF, x: number, y: number, amount: unknown, symbol: string = 'G', options?: Record<string, unknown>) => {
  const text = formatCurrency(amount, symbol);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  if (options) doc.text(text, x, y, options);
  else doc.text(text, x, y);
  // restore to default
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(45, 45, 48);
};

const addHeader = (doc: jsPDF, title: string): void => {
  // White background (default in jsPDF)
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, 210, 45, 'F');

  // ScarWrite title - Professional font
  doc.setTextColor(45, 45, 48); // Gris anthracite
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('ScarWrite', 15, 18);

  // Restaurant name and date on the right
  doc.setTextColor(100, 100, 100); // Gris plus clair
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  
  const settings = getSettings();
  doc.text(settings.restaurant_name, 195, 15, { align: 'right' });
  
  const today = new Date();
  const dateStr = today.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
  doc.text('Généré le: ' + dateStr, 195, 21, { align: 'right' });

  // Report title - centered
  doc.setTextColor(45, 45, 48);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 105, 32, { align: 'center' });

  // Gold line separator
  doc.setDrawColor(212, 175, 55);
  doc.setLineWidth(1);
  doc.line(10, 40, 200, 40);
};

const addFooter = (doc: jsPDF): void => {
  const pageCount = doc.getNumberOfPages();
  const settings = getSettings();
  
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    
    // Ligne de séparation
    doc.setDrawColor(212, 175, 55);
    doc.setLineWidth(0.5);
    doc.line(10, 280, 200, 280);
    
    // Footer text
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    doc.text(
      `${settings.restaurant_name} - Généré le ${new Date().toLocaleDateString('fr-FR')}`,
      15,
      285
    );
    doc.text(`Page ${i} / ${pageCount}`, 195, 285, { align: 'right' });
  }
};

export const generateDailyPDF = (date: string, sales: Sale[]): jsPDF => {
  const doc = createDoc();
  const settings = getSettings();
  const total = sales.reduce((sum, s) => sum + s.total, 0);
  
  addHeader(doc, `Rapport de ventes - ${formatDate(date)}`);
  
  // Sales table with professional styling
  autoTable(doc, {
    startY: 50,
    head: [['Produit', 'Prix unitaire', 'Quantité', 'Total']],
    body: sales.map(s => [
      s.product_name,
      formatCurrency(s.unit_price, settings.currency_symbol),
      s.quantity.toString(),
      formatCurrency(s.total, settings.currency_symbol),
    ]),
    foot: [['', '', 'TOTAL', formatCurrency(total, settings.currency_symbol)]],
    theme: 'grid',
    styles: {
      fontSize: 10,
      cellPadding: 4,
      textColor: [0, 0, 0] as [number, number, number],
      fontStyle: 'normal',
      lineWidth: 0.8,
      lineColor: [200, 200, 200] as [number, number, number],
    },
    headStyles: {
      fillColor: [45, 45, 48] as [number, number, number],
      textColor: [255, 255, 255] as [number, number, number],
      fontStyle: 'bold' as const,
      fontSize: 11,
      lineWidth: 1,
      lineColor: [0, 0, 0] as [number, number, number],
    },
    bodyStyles: {
      fontStyle: 'bold',
    },
    footStyles: {
      fillColor: [220, 220, 220] as [number, number, number],
      textColor: [0, 0, 0] as [number, number, number],
      fontStyle: 'bold' as const,
      fontSize: 12,
      lineWidth: 1,
      lineColor: [0, 0, 0] as [number, number, number],
    },
    alternateRowStyles: {
      fillColor: [250, 250, 250] as [number, number, number],
    },
  });
  
  addFooter(doc);
  return doc;
};

// Génère un certificat fiscal (mensuel) listant les taxes collectées
export const generateTaxCertificatePDF = async (year: number, month: number, opts?: { currency?: string }) : Promise<jsPDF> => {
  const doc = createDoc();
  const settings = getSettings();
  const currency = opts?.currency || settings.currency_symbol;

  // Header
  addHeader(doc, `Certificat Fiscal - ${MONTHS_FR[month - 1]} ${year}`);

  // Recalculer dynamiquement les taxes à partir des ventes et des configurations actives
  try {
    const { getSalesByMonth, getTaxConfigs } = await import('./storage');
    const sales = await getSalesByMonth(year, month);
    const taxes = await getTaxConfigs();

    // Construire résumé par taxe
    const summary: Record<string, number> = {};
    const transactions: Array<{ transaction_date: string; transaction_type: string; transaction_id: string; base_amount: number; tax_name: string; tax_percentage: number; tax_amount: number }> = [];

    sales.forEach((s) => {
      const base = s.total; // total stored as HT
      taxes.forEach(t => {
        if (!t.is_active) return;
        const taxAmt = Math.round(base * (t.percentage / 100) * 100) / 100;
        if (taxAmt <= 0) return;
        summary[t.name] = (summary[t.name] || 0) + taxAmt;
        transactions.push({
          transaction_date: s.sale_date,
          transaction_type: 'sale',
          transaction_id: s.id,
          base_amount: base,
          tax_name: t.name,
          tax_percentage: t.percentage,
          tax_amount: taxAmt,
        });
      });
    });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Résumé des taxes collectées (recalcul dynamique)', 14, 50);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    let y = 58;
    // Afficher résumé par taxe
    Object.entries(summary).forEach(([name, amount]) => {
      doc.text(`${name}:`, 14, y);
      writeBoldAmount(doc, 180, y, amount, currency, { align: 'right' });
      y += 7;
    });

    // Détail ligne par ligne
    y += 8;
    doc.setFont('helvetica', 'bold');
    doc.text('Registre des Taxes (Date | Transaction | Base HT | Taxe | Montant taxe)', 14, y);
    y += 6;
    doc.setFont('helvetica', 'normal');

    transactions.forEach((t) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      const date = new Date(t.transaction_date).toLocaleDateString('fr-FR');
      const tx = `${date} | ${t.transaction_type}/${t.transaction_id}`;
      doc.text(tx, 14, y);
      writeBoldAmount(doc, 100, y, t.base_amount, currency, { align: 'right' });
      doc.text(`${t.tax_name} (${t.tax_percentage}%)`, 130, y);
      writeBoldAmount(doc, 180, y, t.tax_amount, currency, { align: 'right' });
      y += 6;
    });

    // Footer / signature
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.text('Certificat généré par ScarWrite — calculé dynamiquement depuis les ventes', 105, 290, { align: 'center' });
  } catch (err) {
    doc.setFontSize(10);
    doc.text('Impossible de recalculer les données fiscales', 14, 50);
  }

  return doc;
};

// Génère un certificat fiscal (mensuel) en utilisant des lignes de transaction et un résumé fournis
export const generateTaxCertificateFromData = (
  year: number,
  month: number,
  transactions: Array<{ transaction_date: string; transaction_type: string; transaction_id: string; base_amount: number; tax_name: string; tax_percentage: number; tax_amount: number }>,
  summary: { totalTaxes?: number; breakdown?: Record<string, number> } = {},
  opts?: { currency?: string }
): jsPDF => {
  const doc = createDoc();
  const settings = getSettings();
  const currency = opts?.currency || settings.currency_symbol;

  addHeader(doc, `Certificat Fiscal - ${MONTHS_FR[month - 1]} ${year}`);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Résumé des taxes collectées', 14, 50);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  let y = 58;

  // Afficher résumé par taxe si fourni
  if (summary.breakdown) {
    Object.entries(summary.breakdown).forEach(([name, amount]) => {
      doc.text(`${name}:`, 14, y);
      writeBoldAmount(doc, 180, y, amount, currency, { align: 'right' });
      y += 7;
    });
  }

  // Total général
  if (summary.totalTaxes != null) {
    y += 4;
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL TAXES:', 14, y);
    writeBoldAmount(doc, 180, y, summary.totalTaxes, currency, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    y += 8;
  } else {
    y += 8;
  }

  // Détail ligne par ligne (Date | Transaction | Base HT | Taxe | Montant taxe)
  doc.setFont('helvetica', 'bold');
  doc.text('Registre des Taxes (Date | Transaction | Base HT | Taxe | Montant taxe)', 14, y);
  y += 6;
  doc.setFont('helvetica', 'normal');

  transactions.forEach((t) => {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    const date = new Date(t.transaction_date).toLocaleDateString('fr-FR');
    const tx = `${date} | ${t.transaction_type}/${t.transaction_id}`;
    doc.text(tx, 14, y);
    writeBoldAmount(doc, 100, y, t.base_amount, currency, { align: 'right' });
    doc.text(`${t.tax_name} (${t.tax_percentage}%)`, 130, y);
    writeBoldAmount(doc, 180, y, t.tax_amount, currency, { align: 'right' });
    y += 6;
  });

  // Footer / signature
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.text('Certificat généré par ScarWrite — basé sur les données affichées', 105, 290, { align: 'center' });

  return doc;
};

/**
 * Génère un reçu client pour une vente unique
 */
export const generateClientReceipt = (
  productName: string,
  quantity: number,
  unitPrice: number,
  total: number,
  date: string
): jsPDF => {
  const doc = createDoc();
  const settings = getSettings();
  
  let yPos = 15;

  // ===== EN-TÊTE REÇU =====
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, 210, 45, 'F');

  // Symbole de ticket dorée
  doc.setTextColor(212, 175, 55);
  doc.setFontSize(24);
  doc.text('🎫', 15, 22);

  // Titre du reçu
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('REÇU CLIENT', 50, 20);

  // Sous-titre
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('ScarWrite', 50, 27);

  // Date du reçu
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(`Date: ${formatDate(date)}`, 50, 33);
  doc.text(`Heure: ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`, 50, 39);

  // Ligne de séparation
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(15, 48, 195, 48);

  yPos = 58;

  // Détails du produit
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('PRODUIT', 15, yPos);
  yPos += 7;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(productName, 15, yPos);
  yPos += 10;

  // Tableau de détails
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  
  // Quantité
  doc.setTextColor(100, 100, 100);
  doc.text('Quantité:', 15, yPos);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text(quantity.toString(), 80, yPos);
  yPos += 8;

  // Prix unitaire
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'normal');
  doc.text('Prix unitaire:', 15, yPos);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  writeBoldAmount(doc, 80, yPos, unitPrice, settings.currency_symbol);
  yPos += 12;

  // Ligne de séparation
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(15, yPos - 2, 195, yPos - 2);

  yPos += 8;

  // TOTAL
  doc.setFillColor(245, 246, 247);
  doc.rect(15, yPos - 5, 180, 15, 'F');
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.8);
  doc.rect(15, yPos - 5, 180, 15);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('TOTAL À PAYER', 15, yPos + 4);
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  writeBoldAmount(doc, 190, yPos + 4, total, settings.currency_symbol, { align: 'right' });

  yPos += 20;

  // Ligne de séparation finale
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(15, yPos, 195, yPos);

  yPos += 10;

  // Message de remerciement
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 100, 100);
  doc.text('Merci pour votre achat!', 105, yPos, { align: 'center' });

  return doc;
};

// Generate a client receipt from a Sale object (rich metadata)
export const generateClientReceiptFromSale = (sale: any): jsPDF => {
  // Prefer richer layout: include receipt id, seller, payment method, taxes if present
  const doc = createDoc();
  const settings = getSettings();
  const date = sale.sale_date || sale.created_at || new Date().toISOString().slice(0,10);

  // Header
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, 210, 50, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(0,0,0);
  doc.text(settings.restaurant_name || 'ScarWrite', 15, 18);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  if ((settings as any).company_address) doc.text((settings as any).company_address, 15, 24);
  if ((settings as any).company_phone) doc.text((settings as any).company_phone, 15, 30);

  // Receipt meta
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(`Reçu #: ${sale.id?.slice(0,8) || '—'}`, 150, 18);
  doc.setFont('helvetica', 'normal');
  doc.text(`Date: ${new Date(date).toLocaleString('fr-FR')}`, 150, 24);
  if (sale.client_name) doc.text(`Client: ${sale.client_name}`, 150, 30);

  // Items
  let y = 48;
  doc.setFont('helvetica', 'bold');
  doc.text('Désignation', 15, y);
  doc.text('Qté', 110, y, { align: 'right' });
  doc.text('PU', 140, y, { align: 'right' });
  doc.text('Total', 190, y, { align: 'right' });
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.text(sale.product_name || 'Article', 15, y);
  doc.text(String(sale.quantity || 1), 110, y, { align: 'right' });
  writeBoldAmount(doc, 140, y, sale.unit_price || sale.total || 0, settings.currency_symbol);
  writeBoldAmount(doc, 190, y, sale.total || 0, settings.currency_symbol, { align: 'right' });
  y += 12;

  // Subtotal / Taxes / Total
  const subtotal = sale.total || 0;
  const taxed = (() => {
    try {
      // try to pull tax record
      // caller may pass sale._tax or generator can look up taxed_transactions elsewhere
      return sale.tax_amount || 0;
    } catch { return 0; }
  })();

  doc.setFont('helvetica', 'normal');
  doc.text('Sous-total HT', 140, y, { align: 'left' });
  writeBoldAmount(doc, 190, y, subtotal - (taxed || 0), settings.currency_symbol, { align: 'right' });
  y += 6;
  if (taxed && taxed > 0) {
    doc.text('Taxes', 140, y, { align: 'left' });
    writeBoldAmount(doc, 190, y, taxed, settings.currency_symbol, { align: 'right' });
    y += 6;
  }

  doc.setFont('helvetica', 'bold');
  doc.text('Total Net à Payer', 140, y, { align: 'left' });
  writeBoldAmount(doc, 190, y, subtotal, settings.currency_symbol, { align: 'right' });
  y += 12;

  // Payment method
  doc.setFont('helvetica', 'normal');
  const pm = sale.is_credit ? (sale.paid_amount && sale.paid_amount > 0 ? 'Dette (acompte)' : 'Dette') : 'Cash / Numérique';
  doc.text(`Paiement: ${pm}`, 15, y);
  y += 8;

  // Footer
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  doc.text('Merci de votre confiance ! Politique de retour: 7 jours avec reçu.', 105, 285, { align: 'center' });

  return doc;
};

export const generateOperationReceipt = (op: any): jsPDF => {
  const doc = createDoc();
  const settings = getSettings();
  const date = op.operation_date || op.created_at || new Date().toISOString();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(settings.restaurant_name || 'ScarWrite', 15, 18);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  if (op.sender_name || op.receiver_name) {
    doc.text(`${op.sender_name || ''} → ${op.receiver_name || ''}`, 15, 28);
  }
  doc.setFont('helvetica', 'bold');
  doc.text(`Montant: ${op.amount_gdes?.toLocaleString('fr-FR', {minimumFractionDigits:2})} ${settings.currency_symbol}`, 150, 18, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.text(`Date: ${new Date(date).toLocaleString('fr-FR')}`, 150, 24, { align: 'right' });

  doc.setFont('helvetica', 'italic');
  doc.text('Reçu opérationnel — ScarWrite', 105, 285, { align: 'center' });
  return doc;
};

export const generateMonthlyPDF = (
  year: number,
  month: number,
  dailyTotals: Array<{ date: string; total: number }>
): jsPDF => {
  const doc = createDoc();
  const settings = getSettings();
  const monthName = MONTHS_FR[month - 1];
  const total = dailyTotals.reduce((sum, d) => sum + d.total, 0);
  
  addHeader(doc, `Rapport mensuel - ${monthName} ${year}`);
  
  // Total summary card with professional styling
  doc.setFillColor(245, 246, 247);
  doc.rect(20, 50, 170, 25, 'F');
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(1.2);
  doc.rect(20, 50, 170, 25);
  
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Total du mois', 25, 58);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  writeBoldAmount(doc, 25, 70, total, settings.currency_symbol);
  
  // Daily breakdown table with professional styling
  autoTable(doc, {
    startY: 85,
    head: [['Date', 'Recette']],
    body: dailyTotals.map(d => [
      formatDate(d.date),
      formatCurrency(d.total, settings.currency_symbol),
    ]),
    theme: 'grid',
    styles: {
      fontSize: 10,
      cellPadding: 4,
      textColor: [0, 0, 0] as [number, number, number],
      fontStyle: 'bold',
      lineWidth: 0.8,
      lineColor: [200, 200, 200] as [number, number, number],
    },
    headStyles: {
      fillColor: [45, 45, 48] as [number, number, number],
      textColor: [255, 255, 255] as [number, number, number],
      fontStyle: 'bold' as const,
      fontSize: 11,
      lineWidth: 1,
      lineColor: [0, 0, 0] as [number, number, number],
    },
    alternateRowStyles: {
      fillColor: [250, 250, 250] as [number, number, number],
    },
  });
  
  addFooter(doc);
  return doc;
};

export const generateAnnualPDF = (
  startYear: number,
  monthlyTotals: Array<{ label: string; year: number; total: number }>
): jsPDF => {
  const doc = createDoc();
  const settings = getSettings();
  const total = monthlyTotals.reduce((sum, m) => sum + m.total, 0);
  
  addHeader(doc, `Rapport annuel - Octobre ${startYear} à Septembre ${startYear + 1}`);
  
  // Total card
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(20, 50, 170, 30, 3, 3, 'F');
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Total annuel', 105, 62, { align: 'center' });
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  writeBoldAmount(doc, 105, 74, total, settings.currency_symbol, { align: 'center' });
  
  // Monthly breakdown table
  autoTable(doc, {
    startY: 90,
    head: [['Mois', 'Recette']],
    body: monthlyTotals.map(m => [
      `${m.label} ${m.year}`,
      formatCurrency(m.total, settings.currency_symbol),
    ]),
    foot: [['TOTAL', formatCurrency(total, settings.currency_symbol)]],
    theme: 'grid',
    styles: {
      fontSize: 10,
      cellPadding: 4,
      textColor: [0, 0, 0] as [number, number, number],
      fontStyle: 'bold',
      lineWidth: 0.8,
      lineColor: [200, 200, 200] as [number, number, number],
    },
    headStyles: {
      fillColor: [45, 45, 48] as [number, number, number],
      textColor: [255, 255, 255] as [number, number, number],
      fontStyle: 'bold' as const,
      fontSize: 11,
      lineWidth: 1,
      lineColor: [0, 0, 0] as [number, number, number],
    },
    footStyles: {
      fillColor: [220, 220, 220] as [number, number, number],
      textColor: [0, 0, 0] as [number, number, number],
      fontStyle: 'bold' as const,
      fontSize: 12,
      lineWidth: 1,
      lineColor: [0, 0, 0] as [number, number, number],
    },
    alternateRowStyles: {
      fillColor: [250, 250, 250] as [number, number, number],
    },
  });
  
  addFooter(doc);
  return doc;
};

// Transfer PDF functions
const getTransferTypeName = (type: string, customName?: string): string => {
  const typeMap: Record<string, string> = {
    zelle: 'Zelle', moncash: 'MonCash', natcash: 'NatCash',
    cam_transfert: 'Cam Transfert', western_union: 'Western Union',
    moneygram: 'MoneyGram', autre: customName || 'Autre',
  };
  return typeMap[type] || type;
};

export const generateTransferDayPDF = (date: string, transfers: Transfer[]): jsPDF => {
  const doc = createDoc('landscape');
  const settings = getSettings();
  const total = transfers.reduce((sum, t) => sum + (t.fees || 0), 0);
  
  // Professional white header
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, 297, 40, 'F');
  
  doc.setTextColor(45, 45, 48);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('ScarWrite', 15, 16);
  
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(settings.restaurant_name, 280, 14, { align: 'right' });
  
  const today = new Date();
  const dateStr = today.toLocaleDateString('fr-FR');
  doc.text('Généré le: ' + dateStr, 280, 20, { align: 'right' });
  
  doc.setTextColor(45, 45, 48);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`Rapport de transferts - ${formatDate(date)}`, 148.5, 32, { align: 'center' });
  
  // Gold line
  doc.setDrawColor(212, 175, 55);
  doc.setLineWidth(1);
  doc.line(10, 38, 287, 38);
  
  autoTable(doc, {
    startY: 45,
    head: [['N°', 'Type', 'Expéditeur', 'Bénéficiaire', 'Montant USD', 'Montant GDES', 'Frais']],
    body: transfers.map(t => {
      const sender = t.sender_name || t.sender_phone || '-';
      const receiver = t.receiver_name || t.receiver_phone || '-';
      const usdAmount = t.usd_amount ? formatCurrency(t.usd_amount, 'USD') : '-';
      return [
        t.report_number.toString(),
        getTransferTypeName(t.transfer_type, t.custom_type_name),
        sender,
        receiver,
        usdAmount,
        formatCurrency(t.amount, settings.currency_symbol),
        formatCurrency(t.fees || 0, settings.currency_symbol),
      ];
    }),
    foot: [['', '', '', '', '', 'TOTAL FRAIS', formatCurrency(total, settings.currency_symbol)]],
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 3,
      textColor: [0, 0, 0] as [number, number, number],
      fontStyle: 'bold',
      lineWidth: 0.7,
      lineColor: [200, 200, 200] as [number, number, number],
    },
    headStyles: { 
      fillColor: [45, 45, 48] as [number, number, number], 
      textColor: [255, 255, 255] as [number, number, number], 
      fontStyle: 'bold' as const,
      fontSize: 9,
      lineWidth: 1,
      lineColor: [0, 0, 0] as [number, number, number],
    },
    footStyles: { 
      fillColor: [220, 220, 220] as [number, number, number], 
      textColor: [0, 0, 0] as [number, number, number], 
      fontStyle: 'bold' as const,
      fontSize: 9,
      lineWidth: 1,
      lineColor: [0, 0, 0] as [number, number, number],
    },
    alternateRowStyles: {
      fillColor: [250, 250, 250] as [number, number, number],
    },
    margin: { left: 10, right: 10 },
  });
  
  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Reporta - Document généré automatiquement le ${new Date().toLocaleDateString('fr-FR')}`,
      148.5,
      200,
      { align: 'center' }
    );
    doc.text(`Page ${i} / ${pageCount}`, 280, 200, { align: 'right' });
  }
  
  return doc;
};

export const generateTransferMonthlyPDF = (
  year: number, month: number,
  dailyTotals: Array<{ date: string; total: number; count: number }>
): jsPDF => {
  const doc = createDoc();
  const settings = getSettings();
  const monthName = MONTHS_FR[month - 1];
  const total = dailyTotals.reduce((sum, d) => sum + d.total, 0);
  
  addHeader(doc, `Rapport mensuel transferts - ${monthName} ${year}`);
  
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(20, 50, 170, 30, 3, 3, 'F');
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Total du mois (Frais)', 105, 62, { align: 'center' });
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  writeBoldAmount(doc, 105, 74, total, settings.currency_symbol, { align: 'center' });
  
  autoTable(doc, {
    startY: 90,
    head: [['Date', 'Nb transferts', 'Recette (Frais)']],
    body: dailyTotals.map(d => [
      formatDate(d.date), d.count.toString(), formatCurrency(d.total, settings.currency_symbol),
    ]),
    theme: 'grid',
    styles: {
      fontSize: 10,
      cellPadding: 4,
      textColor: [0, 0, 0] as [number, number, number],
      fontStyle: 'bold',
      lineWidth: 0.8,
      lineColor: [200, 200, 200] as [number, number, number],
    },
    headStyles: { 
      fillColor: [45, 45, 48] as [number, number, number], 
      textColor: [255, 255, 255] as [number, number, number], 
      fontStyle: 'bold' as const,
      fontSize: 11,
      lineWidth: 1,
      lineColor: [0, 0, 0] as [number, number, number],
    },
    alternateRowStyles: { 
      fillColor: [250, 250, 250] as [number, number, number],
    },
  });
  
  addFooter(doc);
  return doc;
};

export const generateTransferAnnualPDF = (
  startYear: number,
  monthlyTotals: Array<{ label: string; year: number; total: number }>
): jsPDF => {
  const doc = createDoc();
  const settings = getSettings();
  const total = monthlyTotals.reduce((sum, m) => sum + m.total, 0);
  
  addHeader(doc, `Rapport annuel transferts - Oct ${startYear} à Sep ${startYear + 1}`);
  
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(20, 50, 170, 30, 3, 3, 'F');
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Total annuel (Frais)', 105, 62, { align: 'center' });
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  writeBoldAmount(doc, 105, 74, total, settings.currency_symbol, { align: 'center' });
  
  autoTable(doc, {
    startY: 90,
    head: [['Mois', 'Recette (Frais)']],
    body: monthlyTotals.map(m => [`${m.label} ${m.year}`, formatCurrency(m.total, settings.currency_symbol)]),
    foot: [['TOTAL', formatCurrency(total, settings.currency_symbol)]],
    theme: 'grid',
    styles: {
      fontSize: 10,
      cellPadding: 4,
      textColor: [0, 0, 0] as [number, number, number],
      fontStyle: 'bold',
      lineWidth: 0.8,
      lineColor: [200, 200, 200] as [number, number, number],
    },
    headStyles: { 
      fillColor: [45, 45, 48] as [number, number, number], 
      textColor: [255, 255, 255] as [number, number, number], 
      fontStyle: 'bold' as const,
      fontSize: 11,
      lineWidth: 1,
      lineColor: [0, 0, 0] as [number, number, number],
    },
    footStyles: { 
      fillColor: [220, 220, 220] as [number, number, number], 
      textColor: [0, 0, 0] as [number, number, number], 
      fontStyle: 'bold' as const,
      fontSize: 12,
      lineWidth: 1,
      lineColor: [0, 0, 0] as [number, number, number],
    },
    alternateRowStyles: { 
      fillColor: [250, 250, 250] as [number, number, number],
    },
  });
  
  addFooter(doc);
  return doc;
};

// Detailed monthly transfers report with balances
export const generateTransferCalendarMonthlyPDF = (
  year: number,
  month: number,
  transfers: Transfer[],
  getBalanceAfterTransfer: (transferId: string) => { cash: number; digital: number }
): jsPDF => {
  const doc = createDoc('landscape');
  const settings = getSettings();
  const monthName = MONTHS_FR[month - 1];
  const totalFees = transfers.reduce((sum, t) => sum + (t.fees || 0), 0);
  
  // Header
  doc.setFillColor(28, 28, 30);
  doc.rect(0, 0, 297, 35, 'F');
  doc.setTextColor(212, 175, 55);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Reporta', 148.5, 14, { align: 'center' });
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Rapport mensuel transferts - ${monthName} ${year}`, 148.5, 24, { align: 'center' });
  doc.setFontSize(9);
  doc.setTextColor(180, 180, 180);
  doc.text('Devise: Dollars US | Mode: Hors ligne', 148.5, 31, { align: 'center' });
  
  // Gold line
  doc.setDrawColor(212, 175, 55);
  doc.setLineWidth(0.5);
  doc.line(15, 37, 282, 37);
  
  // Sort transfers by date
  const sortedTransfers = [...transfers].sort((a, b) => a.transfer_date.localeCompare(b.transfer_date));
  
  // Table
  autoTable(doc, {
    startY: 42,
    head: [['N° Rapport', 'Date', 'Expéditeur', 'Bénéficiaire', 'Montant', 'Frais', 'Solde Cash', 'Solde Numérique']],
    body: sortedTransfers.map(t => {
      const balances = getBalanceAfterTransfer(t.id);
      const sender = t.sender_name || t.sender_phone || '-';
      const receiver = t.receiver_name || t.receiver_phone || '-';
      return [
        t.report_number.toString(),
        formatDate(t.transfer_date),
        sender,
        receiver,
        formatCurrency(t.amount, settings.currency_symbol),
        formatCurrency(t.fees || 0, settings.currency_symbol),
        formatCurrency(balances.cash, settings.currency_symbol),
        formatCurrency(balances.digital, settings.currency_symbol),
      ];
    }),
    foot: [['', '', '', 'TOTAL FRAIS', formatCurrency(totalFees, settings.currency_symbol), '', '', '']],
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 3,
      textColor: [0, 0, 0] as [number, number, number],
      fontStyle: 'bold',
      lineWidth: 0.7,
      lineColor: [200, 200, 200] as [number, number, number],
    },
    headStyles: { 
      fillColor: [45, 45, 48] as [number, number, number], 
      textColor: [255, 255, 255] as [number, number, number], 
      fontStyle: 'bold' as const,
      fontSize: 9,
      lineWidth: 1,
      lineColor: [0, 0, 0] as [number, number, number],
    },
    footStyles: { 
      fillColor: [220, 220, 220] as [number, number, number], 
      textColor: [0, 0, 0] as [number, number, number], 
      fontStyle: 'bold' as const,
      fontSize: 9,
      lineWidth: 1,
      lineColor: [0, 0, 0] as [number, number, number],
    },
    alternateRowStyles: { 
      fillColor: [250, 250, 250] as [number, number, number],
    },
    margin: { left: 10, right: 10 },
  });
  
  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Reporta - Document généré automatiquement le ${new Date().toLocaleDateString('fr-FR')}`,
      148.5,
      200,
      { align: 'center' }
    );
    doc.text(`Page ${i} / ${pageCount}`, 280, 200, { align: 'right' });
  }
  
  return doc;
};

// Combined monthly report (Products + Transfers)
export const generateCombinedMonthlyPDF = (
  year: number, 
  month: number,
  productDailyTotals: Array<{ date: string; total: number }>,
  transferDailyTotals: Array<{ date: string; total: number; count: number }>,
  digitalBalance: number,
  cashBalance: number
): jsPDF => {
  const doc = createDoc();
  const settings = getSettings();
  const monthName = MONTHS_FR[month - 1];
  const productTotal = productDailyTotals.reduce((sum, d) => sum + d.total, 0);
  const transferTotal = transferDailyTotals.reduce((sum, d) => sum + d.total, 0);
  const grandTotal = productTotal + transferTotal;
  
  addHeader(doc, `Rapport mensuel complet - ${monthName} ${year}`);
  
  // Summary cards
  let yPos = 50;
  
  // Products total
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(15, yPos, 85, 25, 3, 3, 'F');
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text('Recettes Restaurant', 57.5, yPos + 8, { align: 'center' });
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(28, 28, 30);
  writeBoldAmount(doc, 57.5, yPos + 18, productTotal, settings.currency_symbol, { align: 'center' });
  
  // Transfers total
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(110, yPos, 85, 25, 3, 3, 'F');
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text('Frais Transferts', 152.5, yPos + 8, { align: 'center' });
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(212, 175, 55);
  writeBoldAmount(doc, 152.5, yPos + 18, transferTotal, settings.currency_symbol, { align: 'center' });
  
  // Grand total
  yPos += 30;
  doc.setFillColor(28, 28, 30);
  doc.roundedRect(15, yPos, 180, 25, 3, 3, 'F');
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text('TOTAL GÉNÉRAL', 105, yPos + 8, { align: 'center' });
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(212, 175, 55);
  writeBoldAmount(doc, 105, yPos + 19, grandTotal, settings.currency_symbol, { align: 'center' });
  
  // Balances
  yPos += 30;
  doc.setFontSize(11);
  doc.setTextColor(28, 28, 30);
  doc.text('Soldes finaux:', 15, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(`Argent numérique: ${formatCurrency(digitalBalance, settings.currency_symbol)}`, 15, yPos + 8);
  doc.text(`Argent cash: ${formatCurrency(cashBalance, settings.currency_symbol)}`, 15, yPos + 16);
  
  addFooter(doc);
  return doc;
};

// PDF for financial operations with balances before/after
export const generateOperationsPDF = (
  date: string,
  operations: FinancialOperation[]
): jsPDF => {
  const doc = createDoc('landscape');
  const settings = getSettings();
  
  const operationTypeLabels: Record<string, string> = {
    transfer: 'Transfert',
    deposit: 'Dépôt',
    withdrawal: 'Retrait',
  };
  
  // Header
  doc.setFillColor(28, 28, 30);
  doc.rect(0, 0, 297, 35, 'F');
  doc.setTextColor(212, 175, 55);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Reporta', 148.5, 14, { align: 'center' });
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Rapport des opérations - ${formatDate(date)}`, 148.5, 24, { align: 'center' });
  doc.setFontSize(9);
  doc.setTextColor(180, 180, 180);
  doc.text('Traçabilité comptable complète | Mode: Hors ligne', 148.5, 31, { align: 'center' });
  
  // Gold line
  doc.setDrawColor(212, 175, 55);
  doc.setLineWidth(0.5);
  doc.line(15, 37, 282, 37);
  
  // Sort operations by date
  const sortedOps = [...operations].sort((a, b) => a.created_at.localeCompare(b.created_at));
  
  autoTable(doc, {
    startY: 42,
    head: [['N°', 'Type Op.', 'Type Trans.', 'Expéditeur', 'Bénéficiaire', 'Montant', 'Frais', 'Cash Avant', 'Cash Après', 'Num. Avant', 'Num. Après']],
    body: sortedOps.map(op => {
      return [
        op.operation_number.toString(),
        operationTypeLabels[op.operation_type] || op.operation_type,
        getTransferTypeName(op.service_name, op.custom_service_name),
        op.sender_name || '-',
        op.receiver_name || '-',
        formatCurrency(op.amount_gdes, settings.currency_symbol),
        op.fees ? formatCurrency(op.fees, settings.currency_symbol) : '-',
        formatCurrency(op.cash_before, settings.currency_symbol),
        formatCurrency(op.cash_after, settings.currency_symbol),
        formatCurrency(op.digital_before, settings.currency_symbol),
        formatCurrency(op.digital_after, settings.currency_symbol),
      ];
    }),
    theme: 'grid',
    headStyles: { 
      fillColor: [28, 28, 30] as [number, number, number], 
      textColor: [212, 175, 55] as [number, number, number], 
      fontStyle: 'bold' as const,
      fontSize: 7,
    },
    bodyStyles: {
      fontSize: 7,
    },
    alternateRowStyles: { fillColor: [245, 245, 245] as [number, number, number] },
    margin: { left: 5, right: 5 },
    columnStyles: {
      0: { cellWidth: 12 },
      1: { cellWidth: 22 },
      2: { cellWidth: 28 },
      3: { cellWidth: 30 },
      4: { cellWidth: 30 },
      5: { cellWidth: 28 },
      6: { cellWidth: 22 },
      7: { cellWidth: 28 },
      8: { cellWidth: 28 },
      9: { cellWidth: 28 },
      10: { cellWidth: 28 },
    },
  });
  
  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Reporta - Traçabilité comptable - Généré le ${new Date().toLocaleDateString('fr-FR')}`,
      148.5,
      200,
      { align: 'center' }
    );
    doc.text(`Page ${i} / ${pageCount}`, 280, 200, { align: 'right' });
  }
  
  return doc;
};

export const sharePDF = async (doc: jsPDF, filename: string): Promise<void> => {
  const blob = doc.output('blob');
  const file = new File([blob], filename, { type: 'application/pdf' });
  
  if (navigator.share && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename });
    } catch (err) {
      doc.save(filename);
    }
  } else {
    doc.save(filename);
  }
};

export const downloadPDF = (doc: jsPDF, filename: string): void => {
  doc.save(filename);
};

// Nouvelle fonction pour générer le rapport PDF des opérations financières
// Options pour personnaliser le résumé du PDF
type ReportOptions = {
  totalOperations?: boolean;
  totalCash?: boolean;
  totalDigital?: boolean;
  totalFees?: boolean;
  totalCommissions?: boolean;
  showCashAfter?: boolean;
  showDigitalAfter?: boolean;
};

export const generateFinancialOperationsPDF = (
  operations: FinancialOperation[],
  startDate?: string,
  endDate?: string,
  options?: ReportOptions
): jsPDF => {
  const doc = createDoc('l', 'mm', 'a4'); // Landscape orientation
  const settings = getSettings();

  // Titre du rapport
  const title = startDate && endDate
    ? `Rapport des Opérations Financières (${formatDate(startDate)} - ${formatDate(endDate)})`
    : 'Rapport des Opérations Financières';

  addHeader(doc, title);

  // Préparer les données pour le tableau
  const tableData = operations.map((op, index) => {
    const serviceName = op.custom_service_name || getServiceDisplayName(op.service_name);
    const senderReceiver = `${op.sender_name || ''} → ${op.receiver_name || ''}`.trim();
    const amountDisplay = op.amount_usd
      ? `${formatCurrency(op.amount_gdes, settings.currency_symbol)} / ${formatCurrency(op.amount_usd, 'USD')}`
      : formatCurrency(op.amount_gdes, settings.currency_symbol);

    const feesCommission = [];
    if (op.fees && op.fees > 0) feesCommission.push(`Frais: ${formatCurrency(op.fees, settings.currency_symbol)}`);
    if (op.commission && op.commission > 0) feesCommission.push(`Com: ${formatCurrency(op.commission, settings.currency_symbol)}`);
    const feesCommissionDisplay = feesCommission.join(' | ') || '-';

    return [
      (index + 1).toString(), // N°
      getOperationTypeDisplayName(op.operation_type), // Type
      serviceName, // Service
      op.sender_name || '-', // Expéditeur
      op.receiver_name || '-', // Bénéficiaire
      amountDisplay, // Montant (USD/GDES)
      op.fees ? formatCurrency(op.fees, settings.currency_symbol) : '-', // Frais
      op.commission ? formatCurrency(op.commission, settings.currency_symbol) : '-', // Commission
      formatCurrency(op.cash_after, settings.currency_symbol), // Flux Cash Après l'opération
    ];
  });

  // Configuration du tableau
  const tableConfig = {
    head: [[
      'N°',
      'Type',
      'Service',
      'Expéditeur',
      'Bénéficiaire',
      'Montant (USD/GDES)',
      'Frais',
      'Commission',
      'Flux Cash Après l\'opération'
    ]],
    body: tableData,
    startY: 50,
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [28, 28, 30] as [number, number, number],
      textColor: [212, 175, 55] as [number, number, number],
      fontStyle: 'bold' as const,
      halign: 'center' as const,
    },
    columnStyles: {
      0: { halign: 'center' as const, cellWidth: 10 }, // N°
      1: { halign: 'center' as const, cellWidth: 20 }, // Type
      2: { halign: 'center' as const, cellWidth: 25 }, // Service
      3: { halign: 'left' as const, cellWidth: 35 }, // Expéditeur / Bénéficiaire
      4: { halign: 'right' as const, cellWidth: 30 }, // Montant
      5: { halign: 'center' as const, cellWidth: 30 }, // Frais / Commission
      6: { halign: 'center' as const, cellWidth: 35 }, // Flux Cash
      7: { halign: 'center' as const, cellWidth: 35 }, // Flux Numérique
    },
    alternateRowStyles: {
      fillColor: [248, 249, 250] as [number, number, number],
    },
    margin: { top: 50 },
  };

  // Générer le tableau
  autoTable(doc, tableConfig);

  // Ajouter un résumé à la fin
  const docWithAutoTable = doc as jsPDF & { lastAutoTable: { finalY: number } };
  const finalY = docWithAutoTable.lastAutoTable.finalY + 10;

  // Determine options (passed explicitly or from localStorage). Defaults = all true
  const defaultOptions: Required<ReportOptions> = {
    totalOperations: true,
    totalCash: true,
    totalDigital: true,
    totalFees: true,
    totalCommissions: true,
    showCashAfter: true,
    showDigitalAfter: true,
  };

  let opts: Required<ReportOptions> = { ...defaultOptions };
  if (options) {
    opts = { ...opts, ...options };
  } else {
    try {
      const stored = localStorage.getItem('reportOptions');
      if (stored) {
        const parsed = JSON.parse(stored) as ReportOptions;
        opts = { ...opts, ...parsed };
      }
    } catch (err) {
      // ignore
    }
  }

  if (finalY < 180) { // S'assurer qu'il y a de l'espace
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('📊 RÉSUMÉ DES FLUX', 14, finalY);

    // Calculer les totaux
    const totalCashIn = operations.reduce((sum, op) => sum + (op.cash_after - op.cash_before), 0);
    const totalDigitalIn = operations.reduce((sum, op) => sum + (op.digital_after - op.digital_before), 0);
    const totalFees = operations.reduce((sum, op) => sum + (op.fees || 0), 0);
    const totalCommission = operations.reduce((sum, op) => sum + (op.commission || 0), 0);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    let y = finalY + 8;
    if (opts.totalOperations) {
      doc.text(`Total opérations: ${operations.length}`, 14, y);
      y += 7;
    }
    if (opts.totalCash) {
      doc.text(`Flux Cash total: ${formatCurrency(totalCashIn, settings.currency_symbol)}`, 14, y);
      y += 7;
    }
    if (opts.totalDigital) {
      doc.text(`Flux Numérique total: ${formatCurrency(totalDigitalIn, settings.currency_symbol)}`, 14, y);
      y += 7;
    }
    if (opts.totalFees) {
      doc.text(`Total frais: ${formatCurrency(totalFees, settings.currency_symbol)}`, 14, y);
      y += 7;
    }
    if (opts.totalCommissions) {
      doc.text(`Total commissions: ${formatCurrency(totalCommission, settings.currency_symbol)}`, 14, y);
      y += 7;
    }
    if (opts.showCashAfter) {
      const lastCashAfter = operations.length ? operations[operations.length - 1].cash_after : 0;
      doc.text(`Dernier Cash APRÈS: ${formatCurrency(lastCashAfter, settings.currency_symbol)}`, 14, y);
      y += 7;
    }
    if (opts.showDigitalAfter) {
      const lastDigitalAfter = operations.length ? operations[operations.length - 1].digital_after : 0;
      doc.text(`Dernier Numérique APRÈS: ${formatCurrency(lastDigitalAfter, settings.currency_symbol)}`, 14, y);
      y += 7;
    }
  }

  return doc;
};

// Fonctions utilitaires pour l'affichage
const getServiceDisplayName = (service: string): string => {
  const serviceNames: Record<string, string> = {
    'zelle': 'Zelle',
    'moncash': 'MonCash',
    'natcash': 'NatCash',
    'cam_transfert': 'Cam Transfert',
    'western_union': 'Western Union',
    'moneygram': 'MoneyGram',
    'autre': 'Autre',
  };
  return serviceNames[service] || service;
};

const getOperationTypeDisplayName = (type: string): string => {
  const typeNames: Record<string, string> = {
    'deposit': 'Dépôt',
    'withdrawal': 'Retrait',
    'transfer': 'Transfert',
  };
  return typeNames[type] || type;
};

// ===== RAPPORTS COMPTABLES LUXURY (Étape 4) =====
// Couleurs Luxury: Bleu Marin (#0A1128) et Or (#D4AF37)
const LUXURY_DARK = [10, 17, 40] as const; // Bleu Marin
const LUXURY_GOLD = [212, 175, 55] as const; // Or
const LUXURY_WHITE = [255, 255, 255] as const;
const LUXURY_LIGHT_GRAY = [240, 240, 242] as const;

/**
 * Génère un rapport comptable luxury avec journal général (Date | Description | Débit | Crédit)
 */
export const generateLuxuryGeneralLedgerPDF = (
  companyName: string,
  companyType: string,
  transactions: Array<{
    date: string;
    description: string;
    debit: number;
    credit: number;
  }>,
  fiscalYear: string = '2026'
): jsPDF => {
  const doc = createDoc();
  const settings = getSettings();
  
  // Espacement
  let yPos = 15;

  // ===== EN-TÊTE LUXURY =====
  // Fond blanc pur
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, 210, 60, 'F');

  // Plume dorée symbolique (lettre S dorée)
  doc.setTextColor(212, 175, 55);
  doc.setFontSize(36);
  doc.setFont('helvetica', 'bold');
  doc.text('✦', 20, 25); // Symbole de plume dorée

  // Nom de l'entreprise en majuscules (Bleu Marin)
  doc.setTextColor(10, 17, 40);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(companyName.toUpperCase(), 40, 25);

  // Type d'entité juridique
  doc.setFontSize(10);
  doc.setTextColor(212, 175, 55);
  doc.setFont('helvetica', 'normal');
  doc.text(`${companyType}`, 40, 32);

  // Année fiscale
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(`Année Fiscale ${fiscalYear}`, 195, 25, { align: 'right' });

  // Ligne dorée fine de séparation
  doc.setDrawColor(212, 175, 55);
  doc.setLineWidth(0.3);
  doc.line(15, 58, 195, 58);

  // Titre du rapport - centré, gris foncé
  yPos = 68;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(10, 17, 40);
  doc.text('JOURNAL GÉNÉRAL', 105, yPos, { align: 'center' });

  // Sous-titre
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 120, 120);
  doc.text('État financier détaillé de tous les mouvements', 105, yPos + 6, { align: 'center' });

  // Ligne dorée fine
  doc.setDrawColor(212, 175, 55);
  doc.setLineWidth(0.2);
  doc.line(30, yPos + 10, 180, yPos + 10);

  // ===== TABLEAU AVEC BORDURES FINES DORÉES =====
  yPos = yPos + 15;

  // Totaux pour le pied de tableau
  const totalDebit = transactions.reduce((sum, t) => sum + t.debit, 0);
  const totalCredit = transactions.reduce((sum, t) => sum + t.credit, 0);

  // Données du tableau
  const tableData = transactions.map(t => [
    formatDate(t.date),
    t.description,
    t.debit > 0 ? formatCurrency(t.debit, settings.currency_symbol) : '-',
    t.credit > 0 ? formatCurrency(t.credit, settings.currency_symbol) : '-',
  ]);

  // Ligne de totaux
  tableData.push([
    '',
    'TOTAL',
    formatCurrency(totalDebit, settings.currency_symbol),
    formatCurrency(totalCredit, settings.currency_symbol),
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [['Date', 'Description', 'Débit', 'Crédit']],
    body: tableData,
    theme: 'plain',
    styles: {
      fontSize: 9,
      cellPadding: 4,
      textColor: [45, 45, 48] as [number, number, number],
      lineColor: [212, 175, 55] as [number, number, number],
      lineWidth: 0.15,
    },
    headStyles: {
      fillColor: [245, 245, 242] as [number, number, number],
      textColor: [10, 17, 40] as [number, number, number],
      fontStyle: 'bold' as const,
      fontSize: 10,
      lineColor: [212, 175, 55] as [number, number, number],
      lineWidth: 0.3,
    },
    bodyStyles: {
      textColor: [60, 60, 60] as [number, number, number],
    },
    alternateRowStyles: {
      fillColor: [248, 248, 248] as [number, number, number],
    },
    margin: { left: 15, right: 15 },
    columnStyles: {
      0: { halign: 'center' as const, cellWidth: 35 },
      1: { halign: 'left' as const, cellWidth: 75 },
      2: { halign: 'right' as const, cellWidth: 35 },
      3: { halign: 'right' as const, cellWidth: 35 },
    },
  });

  // ===== PIED DE PAGE AVEC SIGNATURE JURIDIQUE =====
  const pageHeight = doc.internal.pageSize.getHeight();
  const footerY = pageHeight - 30;

  // Ligne dorée de séparation finale
  doc.setDrawColor(212, 175, 55);
  doc.setLineWidth(0.3);
  doc.line(15, footerY - 5, 195, footerY - 5);

  // Signature automatique du statut juridique
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 100, 100);
  doc.text(
    `Rapport certifié pour ${companyType} - Généré le ${new Date().toLocaleDateString('fr-FR')}`,
    105,
    footerY,
    { align: 'center' }
  );

  // Numéro de page
  doc.setFontSize(7);
  doc.text(
    `Page 1 / 1`,
    195,
    footerY + 5,
    { align: 'right' }
  );

  return doc;
};

/**
 * Génère un rapport d'inventaire des produits en PDF
 */
export const generateInventoryPDF = (
  products: Array<{
    id: string;
    name: string;
    unit_price: number;
    cost_price: number;
    quantity_available: number;
  }>,
  currencySymbol: string = 'G'
): jsPDF => {
  const doc = createDoc();
  const settings = getSettings();
  
  let yPos = 15;

  // ===== EN-TÊTE LUXURY =====
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, 210, 50, 'F');

  // Symbole plume dorée
  // Use ASCII fallback for decorative symbol to avoid unicode font issues
  doc.setTextColor(212, 175, 55);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('*', 15, 22);

  // Titre
  doc.setTextColor(10, 17, 40);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Inventaire des Produits', 45, 22);

  // Sous-titre
  doc.setFontSize(9);
  doc.setTextColor(212, 175, 55);
  doc.setFont('helvetica', 'normal');
  doc.text('ScarWrite', 45, 28);

  // Date du rapport
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, 195, 22, { align: 'right' });

  // Ligne dorée
  doc.setDrawColor(212, 175, 55);
  doc.setLineWidth(0.3);
  doc.line(15, 45, 195, 45);

  yPos = 55;

  // Préparer les données du tableau
  const tableData = products.map(p => [
    p.name,
    formatCurrency(p.cost_price, currencySymbol),
    formatCurrency(p.unit_price, currencySymbol),
    p.quantity_available.toString(),
  ]);

  // Totaux
  const totalStockValue = products.reduce((sum, p) => {
    const val = isNaN(p.cost_price) ? 0 : p.cost_price;
    const qty = isNaN(p.quantity_available) ? 0 : p.quantity_available;
    return sum + (val * qty);
  }, 0);

  const totalMarketValue = products.reduce((sum, p) => {
    const val = isNaN(p.unit_price) ? 0 : p.unit_price;
    const qty = isNaN(p.quantity_available) ? 0 : p.quantity_available;
    return sum + (val * qty);
  }, 0);

  // Tableau
  // Force Helvetica (standard built-in font) to avoid UTF-8 embedding issues
  doc.setFont('helvetica', 'normal');
  autoTable(doc, {
    startY: yPos,
    head: [['Nom du produit', 'Prix d\'achat', 'Prix de vente', 'Quantité']],
    body: tableData,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 9,
      cellPadding: 4,
      textColor: [0, 0, 0] as [number, number, number],
      fontStyle: 'bold',
      lineWidth: 0.8,
      lineColor: [200, 200, 200] as [number, number, number],
    },
    headStyles: {
      fillColor: [45, 45, 48] as [number, number, number],
      textColor: [255, 255, 255] as [number, number, number],
      fontStyle: 'bold' as const,
      fontSize: 10,
      lineWidth: 1,
      lineColor: [0, 0, 0] as [number, number, number],
    },
    alternateRowStyles: {
      fillColor: [250, 250, 250] as [number, number, number],
    },
    margin: { left: 15, right: 15 },
    columnStyles: {
      0: { halign: 'left' as const, cellWidth: 65 },
      1: { halign: 'right' as const, cellWidth: 35 },
      2: { halign: 'right' as const, cellWidth: 35 },
      3: { halign: 'center' as const, cellWidth: 25 },
    },
  });

  // Résumé d'inventaire
  const docWithAutoTable = doc as jsPDF & { lastAutoTable: { finalY: number } };
  let summaryY = docWithAutoTable.lastAutoTable.finalY + 15;

  // Ligne dorée de séparation
  doc.setDrawColor(212, 175, 55);
  doc.setLineWidth(0.3);
  doc.line(15, summaryY - 5, 195, summaryY - 5);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(10, 17, 40);
  // Avoid emoji in PDF header to prevent encoding issues with standard fonts
  doc.text('RÉSUMÉ D\'INVENTAIRE', 15, summaryY);

  summaryY += 8;

  // Cartes résumé
  const cardWidth = 55;
  const cardHeight = 18;
  const cardY = summaryY;

  // Carte 1: Valeur stock (coût)
  doc.setFillColor(240, 240, 242);
  doc.roundedRect(15, cardY, cardWidth, cardHeight, 2, 2, 'F');
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'normal');
  doc.text('Valeur stock (coût)', 18, cardY + 4);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(10, 17, 40);
  const stockValueText = formatCurrency(totalStockValue, currencySymbol);
  doc.text(stockValueText, 18, cardY + 13);

  // Carte 2: Valeur marchande
  doc.setFillColor(240, 240, 242);
  doc.roundedRect(75, cardY, cardWidth, cardHeight, 2, 2, 'F');
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'normal');
  doc.text('Valeur marchande', 78, cardY + 4);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(212, 175, 55);
  const marketValueText = formatCurrency(totalMarketValue, currencySymbol);
  doc.text(marketValueText, 78, cardY + 13);

  // Carte 3: Marge potentielle
  const potentialMargin = totalMarketValue - totalStockValue;
  doc.setFillColor(240, 240, 242);
  doc.roundedRect(135, cardY, cardWidth, cardHeight, 2, 2, 'F');
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'normal');
  doc.text('Marge potentielle', 138, cardY + 4);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(potentialMargin >= 0 ? 34 : 220, potentialMargin >= 0 ? 197 : 38, potentialMargin >= 0 ? 94 : 38);
  const marginText = formatCurrency(potentialMargin, currencySymbol);
  doc.text(marginText, 138, cardY + 13);

  // Ligne dorée finale
  const finalY = cardY + cardHeight + 8;
  doc.setDrawColor(212, 175, 55);
  doc.setLineWidth(0.3);
  doc.line(15, finalY, 195, finalY);

  // Footer
  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 100, 100);
  doc.text(
    'Inventaire ScarWrite - Document confidentiel',
    105,
    finalY + 5,
    { align: 'center' }
  );

  return doc;
};

/**
 * Génère un rapport de mission pour les entités sociales (ONG, Fondation, etc.)
 */
export const generateSocialMissionReportPDF = (
  organizationName: string,
  organizationType: string,
  missionData: {
    period: string;
    objectives: string[];
    beneficiaries: number;
    fundingReceived: number;
    fundingSpent: number;
    projects: Array<{ name: string; budget: number; spent: number }>;
  }
): jsPDF => {
  const doc = createDoc();
  const settings = getSettings();

  let yPos = 15;

  // ===== EN-TÊTE LUXURY POUR ONG =====
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, 210, 55, 'F');

  // Logo/Plume dorée
  doc.setTextColor(212, 175, 55);
  doc.setFontSize(32);
  doc.text('❤️', 18, 24);

  // Nom de l'organisation en majuscules
  doc.setTextColor(10, 17, 40);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(organizationName.toUpperCase(), 38, 24);

  // Type d'organisation
  doc.setFontSize(9);
  doc.setTextColor(212, 175, 55);
  doc.setFont('helvetica', 'normal');
  doc.text(`${organizationType}`, 38, 30);

  // Date du rapport
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(`Rapport de mission - ${missionData.period}`, 195, 24, { align: 'right' });

  // Ligne dorée
  doc.setDrawColor(212, 175, 55);
  doc.setLineWidth(0.3);
  doc.line(15, 52, 195, 52);

  yPos = 62;

  // ===== SECTION RÉSUMÉ =====
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(10, 17, 40);
  doc.text('RÉSUMÉ MISSION', 15, yPos);

  yPos += 8;

  // Cartes de résumé (beaucoup d'espace blanc)
  const cardWidth = 40;
  const cardHeight = 20;
  const cardY = yPos;

  // Carte 1: Bénéficiaires
  doc.setFillColor(240, 240, 242);
  doc.roundedRect(15, cardY, cardWidth, cardHeight, 2, 2, 'F');
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'normal');
  doc.text('Bénéficiaires', 16, cardY + 5);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...LUXURY_DARK);
  doc.text(missionData.beneficiaries.toString(), 16, cardY + 14);

  // Carte 2: Fonds reçus
  doc.setFillColor(240, 240, 242);
  doc.roundedRect(60, cardY, cardWidth, cardHeight, 2, 2, 'F');
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'normal');
  doc.text('Fonds reçus', 61, cardY + 5);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...LUXURY_GOLD);
  writeBoldAmount(doc, 61, cardY + 14, missionData.fundingReceived, settings.currency_symbol);

  // Carte 3: Fonds dépensés
  doc.setFillColor(240, 240, 242);
  doc.roundedRect(105, cardY, cardWidth, cardHeight, 2, 2, 'F');
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'normal');
  doc.text('Fonds dépensés', 106, cardY + 5);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(10, 17, 40);
  writeBoldAmount(doc, 106, cardY + 14, missionData.fundingSpent, settings.currency_symbol);

  yPos = cardY + 25;

  // ===== TABLEAU DES PROJETS =====
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(10, 17, 40);
  doc.text('DÉTAIL DES PROJETS', 15, yPos);

  yPos += 8;

  const projectData = missionData.projects.map(p => [
    p.name,
    formatCurrency(p.budget, settings.currency_symbol),
    formatCurrency(p.spent, settings.currency_symbol),
    `${Math.round((p.spent / p.budget) * 100)}%`,
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [['Projet', 'Budget', 'Dépensé', 'Taux']],
    body: projectData,
    theme: 'plain',
    styles: {
      fontSize: 9,
      cellPadding: 4,
      textColor: [45, 45, 48] as [number, number, number],
      lineColor: [212, 175, 55] as [number, number, number],
      lineWidth: 0.15,
    },
    headStyles: {
      fillColor: [245, 245, 242] as [number, number, number],
      textColor: [10, 17, 40] as [number, number, number],
      fontStyle: 'bold' as const,
      lineColor: [212, 175, 55] as [number, number, number],
      lineWidth: 0.3,
    },
    alternateRowStyles: {
      fillColor: [248, 248, 248] as [number, number, number],
    },
    margin: { left: 15, right: 15 },
  });

  // ===== PIED DE PAGE =====
  const pageHeight = doc.internal.pageSize.getHeight();
  const footerY = pageHeight - 20;

  doc.setDrawColor(212, 175, 55);
  doc.setLineWidth(0.3);
  doc.line(15, footerY - 5, 195, footerY - 5);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 100, 100);
  doc.text(
    `Rapport de mission certifié pour ${organizationType}`,
    105,
    footerY,
    { align: 'center' }
  );

  return doc;
};

/**
 * Génère un rapport PDF de Flux & Trésorerie avec suivi dynamique du cash
 * 
 * Structure:
 * - Tableau trié en ordre croissant (ancien → récent)
 * - Colonnes: N°, Type, Service, Expéditeur/Bénéficiaire, Montant, Cash AVANT, Cash APRÈS, Flux Cash
 * - Résumé en pied de page: Total opérations, Balances (numérique + cash), Total frais/commissions
 */
export const generateFluxTresorerieWithCashTrackingPDF = (
  operations: FinancialOperation[],
  cashBalanceAtGeneration: number, // Balance cash actuelle au moment de la génération
  digitalBalanceAtGeneration: number, // Balance numérique actuelle
  startDate?: string,
  endDate?: string
): jsPDF => {
  const doc = createDoc('l', 'mm', 'a4'); // Landscape
  const settings = getSettings();
  
  // Titre
  const title = startDate && endDate
    ? `Flux & Trésorerie (${formatDate(startDate)} - ${formatDate(endDate)})`
    : 'Flux & Trésorerie';
  
  addHeader(doc, title);
  
  // Trier les opérations en ordre croissant (ancien en haut)
  const sortedOperations = [...operations].sort((a, b) => {
    const dateA = new Date(a.operation_date || '').getTime();
    const dateB = new Date(b.operation_date || '').getTime();
    return dateA - dateB;
  });
  
  // CORRECTION: Calculer le Cash AVANT initial (balance au début de la période)
  // = Balance actuelle - somme de tous les flux jusqu'à maintenant
  const totalFluxAllTime = sortedOperations.reduce((sum, op) => sum + (op.cash_after - op.cash_before), 0);
  const initialCashBalance = cashBalanceAtGeneration - totalFluxAllTime;
  
  // Calculer les soldes progressifs pour chaque opération
  let runningCashBalance = initialCashBalance;
  const operationsWithRunningBalance = sortedOperations.map((op, index) => {
    const cashBefore = runningCashBalance;
    
    // Calculer le Cash APRÈS selon le type d'opération
    let cashAfter: number;
    if (op.operation_type === 'withdrawal') {
      // Retrait: Cash APRÈS = Cash AVANT - Montant
      cashAfter = cashBefore - op.amount_gdes;
    } else {
      // Dépôt/Transfert: Cash APRÈS = Cash AVANT + Montant + Frais
      cashAfter = cashBefore + op.amount_gdes + (op.fees || 0);
    }
    
    runningCashBalance = cashAfter;
    const cashFlux = cashAfter - cashBefore;
    
    return {
      ...op,
      index: index + 1,
      cashBefore,
      cashAfter,
      cashFlux,
    };
  });
  
  // Préparer les données pour le tableau
  const tableData = operationsWithRunningBalance.map((op) => {
    const serviceName = op.custom_service_name || getServiceDisplayName(op.service_name);
    const senderReceiverDisplay = [op.sender_name || '', op.receiver_name || '']
      .filter(Boolean)
      .join(' → ') || '-';
    
    const amountDisplay = op.amount_usd
      ? `${formatCurrency(op.amount_gdes, settings.currency_symbol)} / ${formatCurrency(op.amount_usd, 'USD')}`
      : formatCurrency(op.amount_gdes, settings.currency_symbol);
    
    const fluxIndicator = op.cashFlux >= 0 ? `+${formatCurrency(op.cashFlux, settings.currency_symbol)}` : formatCurrency(op.cashFlux, settings.currency_symbol);
    
    return [
      op.index.toString(), // N°
      getOperationTypeDisplayName(op.operation_type), // Type
      serviceName, // Service
      senderReceiverDisplay, // Expéditeur / Bénéficiaire
      amountDisplay, // Montant
      formatCurrency(op.cashBefore, settings.currency_symbol), // Cash AVANT
      formatCurrency(op.cashAfter, settings.currency_symbol), // Cash APRÈS
      fluxIndicator, // Flux Cash (+ ou -)
    ];
  });
  
  // Configuration du tableau avec texte NOIR forcé pour lisibilité
  const tableConfig = {
    head: [[
      'N°',
      'Type',
      'Service',
      'Expéditeur / Bénéficiaire',
      'Montant (GDES/USD)',
      'Cash AVANT',
      'Cash APRÈS',
      'Flux Cash'
    ]],
    body: tableData,
    startY: 50,
    styles: {
      fontSize: 8,
      cellPadding: 2,
      textColor: [0, 0, 0] as [number, number, number], // NOIR pour lisibilité
    },
    headStyles: {
      fillColor: [28, 28, 30] as [number, number, number],
      textColor: [212, 175, 55] as [number, number, number],
      fontStyle: 'bold' as const,
      halign: 'center' as const,
    },
    columnStyles: {
      0: { halign: 'center' as const, cellWidth: 12, textColor: [0, 0, 0] }, // N°
      1: { halign: 'center' as const, cellWidth: 18, textColor: [0, 0, 0] }, // Type
      2: { halign: 'center' as const, cellWidth: 20, textColor: [0, 0, 0] }, // Service
      3: { halign: 'left' as const, cellWidth: 45, textColor: [0, 0, 0] }, // Expéditeur/Bénéficiaire
      4: { halign: 'right' as const, cellWidth: 28, textColor: [0, 0, 0] }, // Montant
      5: { halign: 'right' as const, cellWidth: 28, textColor: [0, 0, 0] }, // Cash AVANT
      6: { halign: 'right' as const, cellWidth: 28, textColor: [0, 0, 0] }, // Cash APRÈS
      7: { halign: 'right' as const, cellWidth: 25, textColor: [0, 0, 0] }, // Flux Cash
    },
    alternateRowStyles: {
      fillColor: [248, 249, 250] as [number, number, number],
      textColor: [0, 0, 0] as [number, number, number], // NOIR sur fond clair
    },
    margin: { top: 50 },
  };
  
  // Générer le tableau
  autoTable(doc, tableConfig);
  
  // Ajouter le résumé en pied de page
  const docWithAutoTable = doc as jsPDF & { lastAutoTable: { finalY: number } };
  const finalY = docWithAutoTable.lastAutoTable.finalY + 15;
  
  // Calculer les totaux
  const totalOperations = sortedOperations.length;
  const totalFees = sortedOperations.reduce((sum, op) => sum + (op.fees || 0), 0);
  const totalCommissions = sortedOperations.reduce((sum, op) => sum + (op.commission || 0), 0);
  
  // Résumé
  if (finalY < 240) { // S'assurer qu'il y a de l'espace
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0); // NOIR
    doc.text('Ø=ÜÊ RÉSUMÉ DES FLUX', 14, finalY);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0); // NOIR
    
    let y = finalY + 8;
    
    // Total opérations
    doc.text(`• Total opérations: ${totalOperations}`, 14, y);
    y += 6;
    
    // Balance Numérique Actuelle
    doc.text(`• Balance Numérique Actuelle: ${formatCurrency(digitalBalanceAtGeneration, settings.currency_symbol)}`, 14, y);
    y += 6;
    
    // Total Frais
    doc.text(`• Total Frais: ${formatCurrency(totalFees, settings.currency_symbol)}`, 14, y);
    y += 6;
    
    // Total Commissions
    doc.text(`• Total Commissions: ${formatCurrency(totalCommissions, settings.currency_symbol)}`, 14, y);
    y += 6;
    
    // Balance Cash Actuelle
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0); // NOIR
    doc.text(`• Balance Cash Actuelle: ${formatCurrency(cashBalanceAtGeneration, settings.currency_symbol)}`, 14, y);
  }
  
  return doc;
};

