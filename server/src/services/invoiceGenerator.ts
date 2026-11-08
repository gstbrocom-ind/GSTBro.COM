import { supabase } from '../lib/supabase.js';

export interface InvoiceItemModel {
  id: string;
  name: string;
  hsn_sac: string;
  gst_rate_percent: number;
  unit: string;
  min_price: number;
  max_price: number;
  active: boolean;
}

export interface GeneratedLineItem {
  itemId: string | null;
  itemName: string;
  hsnSac: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  taxableValue: number;
  gstRatePercent: number;
  cgst: number;
  sgst: number;
  igst: number;
  lineTotal: number;
  sortOrder: number;
}

export interface GeneratedInvoiceData {
  invoiceNumber: string;
  financialYear: string;
  invoiceDate: string;
  buyerName: string;
  buyerGstin: string | null;
  buyerAddress: string | null;
  buyerState: string;
  buyerStateCode: string;
  buyerPhone: string | null;
  placeOfSupply: string;
  placeOfSupplyCode: string;
  isIgst: boolean;
  taxableTotal: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  grandTotal: number;
  lines: GeneratedLineItem[];
}

export interface GenerateBatchParams {
  vendorId: string;
  seriesId: string;
  customerId?: string | null;
  // Buyer details if no customerId or custom buyer
  buyerName?: string;
  buyerGstin?: string | null;
  buyerAddress?: string | null;
  buyerState?: string;
  buyerStateCode?: string;
  buyerPhone?: string | null;
  // Sale details (single date or date range)
  invoiceDate?: string;
  fromDate?: string;
  toDate?: string;
  excludeSaturdays?: boolean;
  excludeSundays?: boolean;
  // Selected items from catalog
  itemIds?: string[];
  // Target amount basis
  amountBasis?: 'GRAND_TOTAL' | 'TAXABLE_VALUE';
  totalBatchTarget?: number;
  count: number;
  // Either exact targetTotal OR range [minTotal, maxTotal]
  targetTotal?: number;
  minTotal?: number;
  maxTotal?: number;
  templateId?: string | null;
  createdBy: string;
}

function round2(val: number): number {
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

/**
 * Computes invoice dates distributed across an eligible range with weekend exclusion.
 */
export function computeInvoiceDates(
  count: number,
  params: {
    invoiceDate?: string;
    fromDate?: string;
    toDate?: string;
    excludeSaturdays?: boolean;
    excludeSundays?: boolean;
  }
): string[] {
  const from = params.fromDate || params.invoiceDate || new Date().toISOString().split('T')[0];
  const to = params.toDate || from;

  const start = new Date(from + 'T00:00:00Z');
  const end = new Date(to + 'T00:00:00Z');

  // Collect all eligible calendar days
  const eligibleDates: string[] = [];
  const current = new Date(start);

  while (current <= end) {
    const dayOfWeek = current.getUTCDay(); // 0 = Sunday, 6 = Saturday
    const isSat = dayOfWeek === 6;
    const isSun = dayOfWeek === 0;

    let skip = false;
    if (params.excludeSaturdays && isSat) skip = true;
    if (params.excludeSundays && isSun) skip = true;

    if (!skip) {
      eligibleDates.push(current.toISOString().split('T')[0]);
    }
    current.setUTCDate(current.getUTCDate() + 1);
  }

  if (eligibleDates.length === 0) {
    eligibleDates.push(from);
  }

  const dates: string[] = [];
  if (eligibleDates.length === 1) {
    for (let i = 0; i < count; i++) dates.push(eligibleDates[0]);
  } else {
    for (let i = 0; i < count; i++) {
      const idx = Math.min(
        eligibleDates.length - 1,
        Math.floor((i / Math.max(1, count - 1)) * (eligibleDates.length - 1))
      );
      dates.push(eligibleDates[idx]);
    }
  }

  return dates;
}

/**
 * Computes target totals across batch invoices, optionally partitioning a cumulative batch total.
 */
export function partitionBatchTargets(
  count: number,
  totalBatchTarget?: number,
  minTotal?: number,
  maxTotal?: number,
  exactTargetTotal?: number
): number[] {
  if (exactTargetTotal && exactTargetTotal > 0) {
    return Array.from({ length: count }, () => round2(exactTargetTotal));
  }

  const min = minTotal && minTotal > 0 ? minTotal : 1000;
  const max = maxTotal && maxTotal >= min ? maxTotal : min * 2;

  if (totalBatchTarget && totalBatchTarget > 0) {
    const weights = Array.from({ length: count }, () => min + Math.random() * (max - min));
    const currentSum = weights.reduce((a, b) => a + b, 0);
    const scale = totalBatchTarget / currentSum;

    const targets = weights.map((w) => round2(w * scale));
    const actualSum = round2(targets.reduce((a, b) => a + b, 0));
    const diff = round2(totalBatchTarget - actualSum);
    targets[targets.length - 1] = round2(targets[targets.length - 1] + diff);
    return targets;
  }

  return Array.from({ length: count }, () => round2(min + Math.random() * (max - min)));
}

/**
 * Generates line items that sum up to EXACTLY targetAmount down to the last paisa (0.01).
 * If isTaxableTarget is true, the sum of line taxableValue equals targetAmount.
 * If isTaxableTarget is false, the sum of line lineTotal (grand total) equals targetAmount.
 */
export function buildExactLineItems(
  items: InvoiceItemModel[],
  targetAmount: number,
  isIgst: boolean,
  isTaxableTarget = false
): GeneratedLineItem[] {
  if (items.length < 1) {
    throw new Error('At least 1 active item must be selected to generate invoices.');
  }

  if (targetAmount <= 0) {
    throw new Error('Target amount must be greater than zero.');
  }

  // Single-item selection shortcut
  if (items.length === 1) {
    const single = items[0];
    const rate = single.gst_rate_percent;

    if (isTaxableTarget) {
      const taxable = round2(targetAmount);
      let bestQty = 1;
      for (let q = 1; q <= 25; q++) {
        const p = round2(taxable / q);
        if (p >= single.min_price && p <= single.max_price) {
          bestQty = q;
          break;
        }
      }
      const unitPrice = round2(taxable / bestQty);
      const cgst = isIgst ? 0 : round2(taxable * (rate / 200));
      const sgst = cgst;
      const igst = isIgst ? round2(taxable * (rate / 100)) : 0;
      const lineTotal = round2(taxable + (isIgst ? igst : cgst + sgst));

      return [
        {
          itemId: single.id,
          itemName: single.name,
          hsnSac: single.hsn_sac,
          unit: single.unit,
          quantity: bestQty,
          unitPrice,
          discountPercent: 0,
          taxableValue: taxable,
          gstRatePercent: rate,
          cgst,
          sgst,
          igst,
          lineTotal,
          sortOrder: 1,
        },
      ];
    } else {
      let taxable = round2(targetAmount / (1 + rate / 100));
      let cgst = 0;
      let sgst = 0;
      let igst = 0;

      if (isIgst) {
        igst = round2(targetAmount - taxable);
      } else {
        cgst = round2(taxable * (rate / 200));
        sgst = cgst;
        taxable = round2(targetAmount - (cgst + sgst));
      }

      let bestQty = 1;
      for (let q = 1; q <= 25; q++) {
        const p = round2(taxable / q);
        if (p >= single.min_price && p <= single.max_price) {
          bestQty = q;
          break;
        }
      }
      const unitPrice = round2(taxable / bestQty);

      return [
        {
          itemId: single.id,
          itemName: single.name,
          hsnSac: single.hsn_sac,
          unit: single.unit,
          quantity: bestQty,
          unitPrice,
          discountPercent: 0,
          taxableValue: taxable,
          gstRatePercent: rate,
          cgst,
          sgst,
          igst,
          lineTotal: targetAmount,
          sortOrder: 1,
        },
      ];
    }
  }

  const maxAttempts = 120;
  let attempt = 0;

  while (attempt < maxAttempts) {
    attempt++;

    // Shuffle items
    const shuffled = [...items].sort(() => Math.random() - 0.5);

    // Pick between 2 and min(5, items.length) items
    const pickCount = Math.min(shuffled.length, Math.max(2, Math.floor(2 + Math.random() * 3)));
    const selectedItems = shuffled.slice(0, pickCount);

    const lines: GeneratedLineItem[] = [];
    let remaining = targetAmount;

    // Build first (pickCount - 1) items
    for (let i = 0; i < selectedItems.length - 1; i++) {
      const item = selectedItems[i];

      if (isTaxableTarget) {
        // Safe budget per line for Taxable Target
        const lineBudget = remaining / (selectedItems.length - i);
        const minLineTaxable = round2(item.min_price * 1);

        if (remaining - minLineTaxable < 10) break;

        const qty = Math.max(1, Math.floor(1 + Math.random() * 4));
        let price = round2(item.min_price + Math.random() * (item.max_price - item.min_price));
        let taxable = round2(qty * price);

        if (taxable >= remaining - 10) {
          price = round2((remaining - 10) / qty);
          if (price < item.min_price) continue;
          taxable = round2(qty * price);
        }

        const cgst = isIgst ? 0 : round2(taxable * (item.gst_rate_percent / 200));
        const sgst = cgst;
        const igst = isIgst ? round2(taxable * (item.gst_rate_percent / 100)) : 0;
        const lineTotal = round2(taxable + (isIgst ? igst : cgst + sgst));

        remaining = round2(remaining - taxable);

        lines.push({
          itemId: item.id,
          itemName: item.name,
          hsnSac: item.hsn_sac,
          unit: item.unit,
          quantity: qty,
          unitPrice: price,
          discountPercent: 0,
          taxableValue: taxable,
          gstRatePercent: item.gst_rate_percent,
          cgst,
          sgst,
          igst,
          lineTotal,
          sortOrder: i + 1,
        });
      } else {
        // Grand Total target
        const lineBudget = remaining / (selectedItems.length - i);
        const minLineTotal = round2(item.min_price * 1 * (1 + item.gst_rate_percent / 100));

        if (remaining - minLineTotal < 10) break;

        const qty = Math.max(1, Math.floor(1 + Math.random() * 5));
        let price = round2(item.min_price + Math.random() * (item.max_price - item.min_price));

        let taxable = round2(qty * price);
        let cgst = 0;
        let sgst = 0;
        let igst = 0;

        if (isIgst) {
          igst = round2(taxable * (item.gst_rate_percent / 100));
        } else {
          cgst = round2(taxable * (item.gst_rate_percent / 200));
          sgst = cgst;
        }
        let lineTotal = round2(taxable + (isIgst ? igst : cgst + sgst));

        if (lineTotal >= remaining - 5) {
          const maxAllowedTaxable = (remaining - 10) / (1 + item.gst_rate_percent / 100);
          price = round2(maxAllowedTaxable / qty);
          if (price < item.min_price) continue;

          taxable = round2(qty * price);
          if (isIgst) {
            igst = round2(taxable * (item.gst_rate_percent / 100));
          } else {
            cgst = round2(taxable * (item.gst_rate_percent / 200));
            sgst = cgst;
          }
          lineTotal = round2(taxable + (isIgst ? igst : cgst + sgst));
        }

        remaining = round2(remaining - lineTotal);

        lines.push({
          itemId: item.id,
          itemName: item.name,
          hsnSac: item.hsn_sac,
          unit: item.unit,
          quantity: qty,
          unitPrice: price,
          discountPercent: 0,
          taxableValue: taxable,
          gstRatePercent: item.gst_rate_percent,
          cgst,
          sgst,
          igst,
          lineTotal,
          sortOrder: i + 1,
        });
      }
    }

    if (lines.length === 0 || remaining <= 0) continue;

    // Last item acts as the absorber
    const lastItem = selectedItems[selectedItems.length - 1];
    const lastRate = lastItem.gst_rate_percent;

    if (isTaxableTarget) {
      const lastTaxable = remaining;
      if (lastTaxable <= 0) continue;

      let bestQty = 1;
      let foundValid = false;
      for (let testQty = 1; testQty <= 25; testQty++) {
        const testPrice = round2(lastTaxable / testQty);
        if (testPrice >= lastItem.min_price && testPrice <= lastItem.max_price) {
          bestQty = testQty;
          foundValid = true;
          break;
        }
      }
      if (!foundValid) {
        bestQty = Math.max(1, Math.round(lastTaxable / Math.max(lastItem.min_price, 1)));
      }

      const bestPrice = round2(lastTaxable / bestQty);
      const lastCgst = isIgst ? 0 : round2(lastTaxable * (lastRate / 200));
      const lastSgst = lastCgst;
      const lastIgst = isIgst ? round2(lastTaxable * (lastRate / 100)) : 0;
      const lastLineTotal = round2(lastTaxable + (isIgst ? lastIgst : lastCgst + lastSgst));

      lines.push({
        itemId: lastItem.id,
        itemName: lastItem.name,
        hsnSac: lastItem.hsn_sac,
        unit: lastItem.unit,
        quantity: bestQty,
        unitPrice: bestPrice,
        discountPercent: 0,
        taxableValue: lastTaxable,
        gstRatePercent: lastRate,
        cgst: lastCgst,
        sgst: lastSgst,
        igst: lastIgst,
        lineTotal: lastLineTotal,
        sortOrder: lines.length + 1,
      });

      const actualSum = round2(lines.reduce((acc, l) => acc + l.taxableValue, 0));
      if (Math.abs(targetAmount - actualSum) <= 0.001) {
        return lines;
      }
    } else {
      // Grand total absorber
      let lastTaxable = round2(remaining / (1 + lastRate / 100));
      let lastCgst = 0;
      let lastSgst = 0;
      let lastIgst = 0;

      if (isIgst) {
        lastIgst = round2(remaining - lastTaxable);
      } else {
        lastCgst = round2(lastTaxable * (lastRate / 200));
        lastSgst = lastCgst;
        lastTaxable = round2(remaining - (lastCgst + lastSgst));
      }

      if (lastTaxable <= 0) continue;

      let foundValidLastLine = false;
      let bestQty = 1;
      let bestPrice = lastTaxable;

      for (let testQty = 1; testQty <= 25; testQty++) {
        const testPrice = round2(lastTaxable / testQty);
        if (testPrice >= lastItem.min_price && testPrice <= lastItem.max_price) {
          bestQty = testQty;
          bestPrice = testPrice;
          foundValidLastLine = true;
          break;
        }
      }

      if (!foundValidLastLine) {
        bestQty = Math.max(1, Math.round(lastTaxable / Math.max(lastItem.min_price, 1)));
        bestPrice = round2(lastTaxable / bestQty);
      }

      lines.push({
        itemId: lastItem.id,
        itemName: lastItem.name,
        hsnSac: lastItem.hsn_sac,
        unit: lastItem.unit,
        quantity: bestQty,
        unitPrice: bestPrice,
        discountPercent: 0,
        taxableValue: lastTaxable,
        gstRatePercent: lastRate,
        cgst: lastCgst,
        sgst: lastSgst,
        igst: lastIgst,
        lineTotal: remaining,
        sortOrder: lines.length + 1,
      });

      const actualSum = round2(lines.reduce((acc, l) => acc + l.lineTotal, 0));
      if (Math.abs(targetAmount - actualSum) <= 0.001) {
        return lines;
      }
    }
  }

  // Fallback single line item if random multi-line didn't converge within 120 attempts
  const fallbackItem = items[0];
  const fallbackRate = fallbackItem.gst_rate_percent;

  if (isTaxableTarget) {
    const fallbackTaxable = round2(targetAmount);
    const fallbackCgst = isIgst ? 0 : round2(fallbackTaxable * (fallbackRate / 200));
    const fallbackSgst = fallbackCgst;
    const fallbackIgst = isIgst ? round2(fallbackTaxable * (fallbackRate / 100)) : 0;
    const fallbackTotal = round2(fallbackTaxable + (isIgst ? fallbackIgst : fallbackCgst + fallbackSgst));

    return [
      {
        itemId: fallbackItem.id,
        itemName: fallbackItem.name,
        hsnSac: fallbackItem.hsn_sac,
        unit: fallbackItem.unit,
        quantity: 1,
        unitPrice: fallbackTaxable,
        discountPercent: 0,
        taxableValue: fallbackTaxable,
        gstRatePercent: fallbackRate,
        cgst: fallbackCgst,
        sgst: fallbackSgst,
        igst: fallbackIgst,
        lineTotal: fallbackTotal,
        sortOrder: 1,
      },
    ];
  } else {
    let fallbackTaxable = round2(targetAmount / (1 + fallbackRate / 100));
    let fallbackCgst = 0;
    let fallbackSgst = 0;
    let fallbackIgst = 0;

    if (isIgst) {
      fallbackIgst = round2(targetAmount - fallbackTaxable);
    } else {
      fallbackCgst = round2(fallbackTaxable * (fallbackRate / 200));
      fallbackSgst = fallbackCgst;
      fallbackTaxable = round2(targetAmount - (fallbackCgst + fallbackSgst));
    }

    return [
      {
        itemId: fallbackItem.id,
        itemName: fallbackItem.name,
        hsnSac: fallbackItem.hsn_sac,
        unit: fallbackItem.unit,
        quantity: 1,
        unitPrice: fallbackTaxable,
        discountPercent: 0,
        taxableValue: fallbackTaxable,
        gstRatePercent: fallbackRate,
        cgst: fallbackCgst,
        sgst: fallbackSgst,
        igst: fallbackIgst,
        lineTotal: targetAmount,
        sortOrder: 1,
      },
    ];
  }
}

/**
 * Core Batch Generator:
 * Generates N invoices in a batch, issuing atomic numbers and saving to DB.
 */
export async function generateInvoiceBatch(params: GenerateBatchParams): Promise<{
  batchId: string;
  count: number;
  totalAmount: number;
  invoices: Array<{ id: string; invoiceNumber: string; grandTotal: number }>;
}> {
  const { vendorId, seriesId, count, createdBy } = params;

  if (count <= 0 || count > 200) {
    throw new Error('Invoice count must be between 1 and 200 per batch.');
  }

  // 1. Fetch vendor profile (state, state_code)
  const { data: vendor, error: vendorErr } = await supabase
    .from('users')
    .select('id, name, business_name, gstin, state, state_code')
    .eq('id', vendorId)
    .single();

  if (vendorErr || !vendor) {
    throw new Error('Vendor profile not found: ' + (vendorErr?.message || 'unknown'));
  }

  const vendorStateCode = vendor.state_code || (vendor.gstin ? vendor.gstin.substring(0, 2) : '27');

  // 2. Fetch series
  const { data: series, error: seriesErr } = await supabase
    .from('invoice_series')
    .select('*')
    .eq('id', seriesId)
    .eq('vendor_id', vendorId)
    .eq('active', true)
    .single();

  if (seriesErr || !series) {
    throw new Error('Active invoice series not found for this vendor.');
  }

  // 3. Fetch active items (require >= 1)
  const { data: items, error: itemsErr } = await supabase
    .from('invoice_items')
    .select('*')
    .eq('vendor_id', vendorId)
    .eq('active', true);

  if (itemsErr || !items || items.length < 1) {
    throw new Error(
      `Cannot generate invoices: Vendor has no active items. Please add items in the Catalog tab.`
    );
  }

  // Filter items if specific itemIds were selected
  let candidateItems = items as InvoiceItemModel[];
  if (params.itemIds && params.itemIds.length > 0) {
    const selectedItemSet = new Set(params.itemIds);
    const filtered = candidateItems.filter((i) => selectedItemSet.has(i.id));
    if (filtered.length > 0) {
      candidateItems = filtered;
    }
  }

  // 4. Resolve customer / buyer
  let buyerName = params.buyerName || 'Walk-in Customer';
  let buyerGstin = params.buyerGstin || null;
  let buyerAddress = params.buyerAddress || null;
  let buyerState = params.buyerState || vendor.state || 'Maharashtra';
  let buyerStateCode = params.buyerStateCode || vendorStateCode;
  let buyerPhone = params.buyerPhone || null;

  if (params.customerId) {
    const { data: customer } = await supabase
      .from('invoice_customers')
      .select('*')
      .eq('id', params.customerId)
      .eq('vendor_id', vendorId)
      .maybeSingle();

    if (customer) {
      buyerName = customer.name;
      buyerGstin = customer.gstin || null;
      buyerAddress = customer.address || null;
      buyerState = customer.state;
      buyerStateCode = customer.state_code;
      buyerPhone = customer.phone || null;
    }
  }

  // Determine supply nature: cross-state vs intra-state
  const isIgst = buyerStateCode.trim() !== vendorStateCode.trim();

  // 5. Fetch template snapshot if templateId provided
  let templateSnapshot = null;
  if (params.templateId) {
    const { data: template } = await supabase
      .from('invoice_templates')
      .select('*')
      .eq('id', params.templateId)
      .eq('vendor_id', vendorId)
      .maybeSingle();
    templateSnapshot = template;
  } else {
    // Default template if available
    const { data: defTpl } = await supabase
      .from('invoice_templates')
      .select('*')
      .eq('vendor_id', vendorId)
      .eq('is_default', true)
      .maybeSingle();
    templateSnapshot = defTpl;
  }

  // 6. Generate target totals for each invoice
  const isTaxableTarget = params.amountBasis === 'TAXABLE_VALUE';
  const targets = partitionBatchTargets(
    count,
    params.totalBatchTarget,
    params.minTotal,
    params.maxTotal,
    params.targetTotal
  );

  // Compute distributed dates across eligible date range with weekend exclusion
  const dates = computeInvoiceDates(count, {
    invoiceDate: params.invoiceDate,
    fromDate: params.fromDate,
    toDate: params.toDate,
    excludeSaturdays: params.excludeSaturdays,
    excludeSundays: params.excludeSundays,
  });

  const batchId = crypto.randomUUID();
  const createdInvoices: Array<{ id: string; invoiceNumber: string; grandTotal: number }> = [];
  let batchTotalAmount = 0;

  // 7. Generate each invoice and lines
  for (let i = 0; i < count; i++) {
    const target = targets[i];
    const invDate = dates[i] || params.invoiceDate || new Date().toISOString().split('T')[0];
    const lines = buildExactLineItems(candidateItems, target, isIgst, isTaxableTarget);

    // Calculate totals
    const taxableTotal = round2(lines.reduce((acc, l) => acc + l.taxableValue, 0));
    const cgstTotal = round2(lines.reduce((acc, l) => acc + l.cgst, 0));
    const sgstTotal = round2(lines.reduce((acc, l) => acc + l.sgst, 0));
    const igstTotal = round2(lines.reduce((acc, l) => acc + l.igst, 0));
    const grandTotal = round2(taxableTotal + cgstTotal + sgstTotal + igstTotal);

    // Atomically obtain next invoice number
    const { data: invoiceNum, error: rpcErr } = await supabase.rpc('issue_invoice_number', {
      p_series_id: seriesId,
      p_vendor_id: vendorId,
    });

    if (rpcErr || !invoiceNum) {
      throw new Error(`Failed to issue invoice number: ${rpcErr?.message || 'unknown error'}`);
    }

    // Insert invoice header
    const { data: insertedInvoice, error: invInsertErr } = await supabase
      .from('invoices')
      .insert({
        vendor_id: vendorId,
        customer_id: params.customerId || null,
        series_id: seriesId,
        template_id: params.templateId || null,
        invoice_number: invoiceNum,
        financial_year: series.financial_year,
        invoice_date: invDate,
        buyer_name: buyerName,
        buyer_gstin: buyerGstin,
        buyer_address: buyerAddress,
        buyer_state: buyerState,
        buyer_state_code: buyerStateCode,
        buyer_phone: buyerPhone,
        place_of_supply: buyerState,
        place_of_supply_code: buyerStateCode,
        is_igst: isIgst,
        taxable_total: taxableTotal,
        cgst_total: cgstTotal,
        sgst_total: sgstTotal,
        igst_total: igstTotal,
        grand_total: grandTotal,
        status: 'ACTIVE',
        template_snapshot: templateSnapshot,
        generation_batch_id: batchId,
        created_by: createdBy,
      })
      .select('id, invoice_number, grand_total')
      .single();

    if (invInsertErr || !insertedInvoice) {
      throw new Error(`Failed to save invoice record: ${invInsertErr?.message || 'unknown'}`);
    }

    // Insert line items
    const lineInserts = lines.map((l) => ({
      invoice_id: insertedInvoice.id,
      item_id: l.itemId,
      item_name: l.itemName,
      hsn_sac: l.hsnSac,
      unit: l.unit,
      quantity: l.quantity,
      unit_price: l.unitPrice,
      discount_percent: l.discountPercent,
      taxable_value: l.taxableValue,
      gst_rate_percent: l.gstRatePercent,
      cgst: l.cgst,
      sgst: l.sgst,
      igst: l.igst,
      line_total: l.lineTotal,
      sort_order: l.sortOrder,
    }));

    const { error: linesErr } = await supabase.from('invoice_line_items').insert(lineInserts);
    if (linesErr) {
      throw new Error(`Failed to save invoice line items: ${linesErr.message}`);
    }

    createdInvoices.push({
      id: insertedInvoice.id,
      invoiceNumber: insertedInvoice.invoice_number,
      grandTotal: insertedInvoice.grand_total,
    });
    batchTotalAmount = round2(batchTotalAmount + grandTotal);
  }

  return {
    batchId,
    count: createdInvoices.length,
    totalAmount: batchTotalAmount,
    invoices: createdInvoices,
  };
}

export interface ManualLineItemInput {
  itemId?: string | null;
  itemName: string;
  hsnSac?: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  discountPercent?: number;
  gstRatePercent: number;
}

export interface CreateSingleInvoiceParams {
  vendorId: string;
  seriesId: string;
  customerId?: string | null;
  buyerName?: string;
  buyerGstin?: string | null;
  buyerAddress?: string | null;
  buyerState?: string;
  buyerStateCode?: string;
  buyerPhone?: string | null;
  invoiceDate: string;
  templateId?: string | null;
  lines: ManualLineItemInput[];
  createdBy: string;
}

/**
 * Standard Single Manual Invoice Issuer:
 * Creates a standard single tax invoice with specified items, quantities, rates,
 * and auto-calculated GST splits.
 */
export async function createSingleManualInvoice(params: CreateSingleInvoiceParams): Promise<{
  id: string;
  invoiceNumber: string;
  grandTotal: number;
  taxableTotal: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
}> {
  const { vendorId, seriesId, createdBy } = params;

  if (!params.lines || params.lines.length === 0) {
    throw new Error('At least one line item is required to issue an invoice.');
  }

  // 1. Fetch vendor
  const { data: vendor, error: vendorErr } = await supabase
    .from('users')
    .select('id, state, state_code, gstin, business_name, name')
    .eq('id', vendorId)
    .single();

  if (vendorErr || !vendor) {
    throw new Error('Vendor profile not found.');
  }

  const vendorStateCode = vendor.state_code || (vendor.gstin ? vendor.gstin.substring(0, 2) : '27');

  // 2. Fetch series
  const { data: series, error: seriesErr } = await supabase
    .from('invoice_series')
    .select('*')
    .eq('id', seriesId)
    .eq('vendor_id', vendorId)
    .eq('active', true)
    .single();

  if (seriesErr || !series) {
    throw new Error('Active invoice series not found for this vendor.');
  }

  // 3. Resolve customer / buyer
  let buyerName = params.buyerName || 'Walk-in Customer';
  let buyerGstin = params.buyerGstin || null;
  let buyerAddress = params.buyerAddress || null;
  let buyerState = params.buyerState || vendor.state || 'Maharashtra';
  let buyerStateCode = params.buyerStateCode || vendorStateCode;
  let buyerPhone = params.buyerPhone || null;

  if (params.customerId) {
    const { data: customer } = await supabase
      .from('invoice_customers')
      .select('*')
      .eq('id', params.customerId)
      .eq('vendor_id', vendorId)
      .maybeSingle();

    if (customer) {
      buyerName = customer.name;
      buyerGstin = customer.gstin || null;
      buyerAddress = customer.address || null;
      buyerState = customer.state || buyerState;
      buyerStateCode = customer.state_code || buyerStateCode;
      buyerPhone = customer.phone || null;
    }
  }

  const isIgst = buyerStateCode.trim() !== vendorStateCode.trim();

  // 4. Template snapshot
  let templateSnapshot = null;
  if (params.templateId) {
    const { data: template } = await supabase
      .from('invoice_templates')
      .select('*')
      .eq('id', params.templateId)
      .eq('vendor_id', vendorId)
      .maybeSingle();
    templateSnapshot = template;
  } else {
    const { data: defTpl } = await supabase
      .from('invoice_templates')
      .select('*')
      .eq('vendor_id', vendorId)
      .eq('is_default', true)
      .maybeSingle();
    templateSnapshot = defTpl;
  }

  // 5. Calculate line items
  const computedLines = params.lines.map((l, index) => {
    const qty = Math.max(0.001, Number(l.quantity) || 1);
    const unitPrice = Math.max(0, Number(l.unitPrice) || 0);
    const discountPct = Math.min(100, Math.max(0, Number(l.discountPercent) || 0));
    const gross = qty * unitPrice;
    const taxableValue = round2(gross * (1 - discountPct / 100));
    const rate = Math.max(0, Number(l.gstRatePercent) || 0);

    const cgst = isIgst ? 0 : round2(taxableValue * (rate / 200));
    const sgst = isIgst ? 0 : cgst;
    const igst = isIgst ? round2(taxableValue * (rate / 100)) : 0;
    const lineTotal = round2(taxableValue + (isIgst ? igst : cgst + sgst));

    return {
      itemId: l.itemId || null,
      itemName: l.itemName || 'Custom Item',
      hsnSac: l.hsnSac || '',
      unit: l.unit || 'PCS',
      quantity: qty,
      unitPrice: unitPrice,
      discountPercent: discountPct,
      taxableValue: taxableValue,
      gstRatePercent: rate,
      cgst,
      sgst,
      igst,
      lineTotal,
      sortOrder: index + 1,
    };
  });

  const taxableTotal = round2(computedLines.reduce((acc, l) => acc + l.taxableValue, 0));
  const cgstTotal = round2(computedLines.reduce((acc, l) => acc + l.cgst, 0));
  const sgstTotal = round2(computedLines.reduce((acc, l) => acc + l.sgst, 0));
  const igstTotal = round2(computedLines.reduce((acc, l) => acc + l.igst, 0));
  const grandTotal = round2(taxableTotal + cgstTotal + sgstTotal + igstTotal);

  // 6. Atomically obtain next invoice number
  const { data: invoiceNum, error: rpcErr } = await supabase.rpc('issue_invoice_number', {
    p_series_id: seriesId,
    p_vendor_id: vendorId,
  });

  if (rpcErr || !invoiceNum) {
    throw new Error(`Failed to issue invoice number: ${rpcErr?.message || 'unknown error'}`);
  }

  // 7. Insert invoice header
  const { data: insertedInvoice, error: invInsertErr } = await supabase
    .from('invoices')
    .insert({
      vendor_id: vendorId,
      customer_id: params.customerId || null,
      series_id: seriesId,
      template_id: params.templateId || null,
      invoice_number: invoiceNum,
      financial_year: series.financial_year,
      invoice_date: params.invoiceDate || new Date().toISOString().split('T')[0],
      buyer_name: buyerName,
      buyer_gstin: buyerGstin,
      buyer_address: buyerAddress,
      buyer_state: buyerState,
      buyer_state_code: buyerStateCode,
      buyer_phone: buyerPhone,
      place_of_supply: buyerState,
      place_of_supply_code: buyerStateCode,
      is_igst: isIgst,
      taxable_total: taxableTotal,
      cgst_total: cgstTotal,
      sgst_total: sgstTotal,
      igst_total: igstTotal,
      grand_total: grandTotal,
      status: 'ACTIVE',
      template_snapshot: templateSnapshot,
      generation_batch_id: null,
      created_by: createdBy,
    })
    .select('id, invoice_number, grand_total, taxable_total, cgst_total, sgst_total, igst_total')
    .single();

  if (invInsertErr || !insertedInvoice) {
    throw new Error(`Failed to save invoice record: ${invInsertErr?.message || 'unknown'}`);
  }

  // 8. Insert line items
  const lineInserts = computedLines.map((l) => ({
    invoice_id: insertedInvoice.id,
    item_id: l.itemId,
    item_name: l.itemName,
    hsn_sac: l.hsnSac,
    unit: l.unit,
    quantity: l.quantity,
    unit_price: l.unitPrice,
    discount_percent: l.discountPercent,
    taxable_value: l.taxableValue,
    gst_rate_percent: l.gstRatePercent,
    cgst: l.cgst,
    sgst: l.sgst,
    igst: l.igst,
    line_total: l.lineTotal,
    sort_order: l.sortOrder,
  }));

  const { error: linesErr } = await supabase.from('invoice_line_items').insert(lineInserts);
  if (linesErr) {
    throw new Error(`Failed to save invoice line items: ${linesErr.message}`);
  }

  return {
    id: insertedInvoice.id,
    invoiceNumber: insertedInvoice.invoice_number,
    grandTotal: insertedInvoice.grand_total,
    taxableTotal: insertedInvoice.taxable_total,
    cgstTotal: insertedInvoice.cgst_total,
    sgstTotal: insertedInvoice.sgst_total,
    igstTotal: insertedInvoice.igst_total,
  };
}

