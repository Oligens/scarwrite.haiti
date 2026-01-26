// Self-contained manual test: compute expected accounting entries for a sale
(async function run() {
  try {
    const saleId = 'TEST-SALE-1';
    const productRecord = {
      id: 'prod-test-1',
      name: 'Produit Test',
      unit_price: 100,
      cost_price: 50,
      quantity_available: 10,
      is_active: true,
      is_service: false,
      service_fee_percentage: 2,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const computeSaleEntriesLocal = async (opts) => {
      const { saleId, productRecord, productName, quantity, unitPrice, date, isCredit = false, clientName, paidAmount = 0, paymentMethod = 'cash', paymentService, serviceFeePercent = 0, taxConfigs = [] } = opts;
      const base = Math.round(unitPrice * quantity * 100) / 100;
      const taxes = (taxConfigs || []);
      const taxDetails = taxes.map(t => ({ ...t, amount: Math.round(base * (t.percentage / 100) * 100) / 100 }));
      const taxTotal = taxDetails.reduce((s, t) => s + (t.amount || 0), 0);
      const subtotalWithTax = Math.round((base + taxTotal) * 100) / 100;
      const feePercent = serviceFeePercent || (productRecord && productRecord.service_fee_percentage) || 0;
      const feeAmount = paymentMethod === 'digital' ? Math.round(subtotalWithTax * (feePercent / 100) * 100) / 100 : 0;
      const totalWithTaxAndFee = Math.round((subtotalWithTax + feeAmount) * 100) / 100;

      const entries = [];

      const mapServiceAccount = (service) => {
        switch (service) {
          case 'moncash':
          case 'natcash':
            return { code: '517', name: 'Argent Numérique' };
          case 'zelle':
          case 'western_union':
          case 'moneygram':
          case 'cam_transfert':
            return { code: '5120', name: 'Banque' };
          default:
            return { code: '5311', name: 'Caisse Centrale' };
        }
      };

      const paymentAccount = paymentMethod === 'digital' ? mapServiceAccount(paymentService) : { code: '5311', name: 'Caisse Centrale' };
      const isService = !!productRecord && !!productRecord.is_service;
      const salesAccountCode = isService ? '706' : '701';
      const salesAccountName = isService ? 'Prestations de services' : 'Ventes de marchandises';

      if (isCredit) {
        const paid = Number.isFinite(paidAmount) ? paidAmount : 0;
        const unpaid = Math.round((totalWithTaxAndFee - paid) * 100) / 100;
        if (paid > 0) entries.push({ journal_date: date, transaction_type: 'sale', transaction_id: saleId, account_code: paymentAccount.code, account_name: paymentAccount.name, debit: paid, credit: 0, description: `Acompte vente ${productName}` });
        if (unpaid > 0) entries.push({ journal_date: date, transaction_type: 'sale', transaction_id: saleId, account_code: '4110', account_name: 'Clients', debit: unpaid, credit: 0, description: `Créance client ${clientName || ''}` });
        entries.push({ journal_date: date, transaction_type: 'sale', transaction_id: saleId, account_code: salesAccountCode, account_name: salesAccountName, debit: 0, credit: base, description: `Vente HT ${productName}` });
        if (taxTotal > 0) entries.push({ journal_date: date, transaction_type: 'sale', transaction_id: saleId, account_code: '4457', account_name: 'TVA à payer', debit: 0, credit: taxTotal, description: `TVA sur vente ${productName}` });
        if (feeAmount > 0) entries.push({ journal_date: date, transaction_type: 'sale', transaction_id: saleId, account_code: '706', account_name: 'Honoraires / Commissions', debit: 0, credit: feeAmount, description: `Frais paiement ${paymentService || ''}` });
      } else {
        entries.push({ journal_date: date, transaction_type: 'sale', transaction_id: saleId, account_code: paymentAccount.code, account_name: paymentAccount.name, debit: totalWithTaxAndFee, credit: 0, description: `Vente ${productName}` });
        entries.push({ journal_date: date, transaction_type: 'sale', transaction_id: saleId, account_code: salesAccountCode, account_name: salesAccountName, debit: 0, credit: base, description: `Vente HT ${productName}` });
        if (taxTotal > 0) entries.push({ journal_date: date, transaction_type: 'sale', transaction_id: saleId, account_code: '4457', account_name: 'TVA à payer', debit: 0, credit: taxTotal, description: `TVA sur vente ${productName}` });
        if (feeAmount > 0) entries.push({ journal_date: date, transaction_type: 'sale', transaction_id: saleId, account_code: '706', account_name: 'Honoraires / Commissions', debit: 0, credit: feeAmount, description: `Frais paiement ${paymentService || ''}` });
      }

      return entries;
    };

    const entries = await computeSaleEntriesLocal({
      saleId,
      productRecord,
      productName: productRecord.name,
      quantity: 1,
      unitPrice: productRecord.unit_price,
      date: new Date().toISOString().slice(0,10),
      isCredit: false,
      paidAmount: 0,
      paymentMethod: 'digital',
      paymentService: 'moncash',
      serviceFeePercent: 2,
      taxConfigs: [],
    });

    console.log('=== Computed Accounting Entries for Test Sale ===');
    console.log(JSON.stringify(entries, null, 2));
    console.log('=== Checks ===');
    const has701 = entries.some(e => e.account_code === '701' );
    const has706 = entries.some(e => e.account_code === '706');
    const taxEntry = entries.find(e => e.account_code === '4457');
    console.log('Contains sales (701):', has701);
    console.log('Contains fees (706):', has706);
    console.log('Tax entry (4457):', !!taxEntry);
  } catch (err) {
    console.error('Test failed', err);
    process.exit(1);
  }
})();
