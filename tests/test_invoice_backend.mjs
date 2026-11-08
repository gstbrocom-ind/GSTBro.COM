import test, { describe, it } from 'node:test';
import assert from 'node:assert';
import crypto from 'node:crypto';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: 'server/.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// We can test the service layer directly or against the API
import {
  buildExactLineItems,
  generateInvoiceBatch,
} from '../server/dist/services/invoiceGenerator.js';

describe('GST Invoice Module — Phase 2 Service & Algorithm Tests', () => {
  const mockItems = [
    {
      id: 'item-1',
      name: 'Software Consulting Services',
      hsn_sac: '998314',
      gst_rate_percent: 18,
      unit: 'HRS',
      min_price: 1000,
      max_price: 5000,
      active: true,
    },
    {
      id: 'item-2',
      name: 'Hardware Networking Equipment',
      hsn_sac: '847130',
      gst_rate_percent: 18,
      unit: 'NOS',
      min_price: 15000,
      max_price: 35000,
      active: true,
    },
    {
      id: 'item-3',
      name: 'Annual Maintenance Contract',
      hsn_sac: '998719',
      gst_rate_percent: 18,
      unit: 'YR',
      min_price: 25000,
      max_price: 60000,
      active: true,
    },
    {
      id: 'item-4',
      name: 'Cloud Hosting & Storage',
      hsn_sac: '998315',
      gst_rate_percent: 18,
      unit: 'MTH',
      min_price: 5000,
      max_price: 12000,
      active: true,
    },
    {
      id: 'item-5',
      name: 'Cybersecurity Audit Service',
      hsn_sac: '998316',
      gst_rate_percent: 18,
      unit: 'ASSMNT',
      min_price: 20000,
      max_price: 50000,
      active: true,
    },
  ];

  it('1. Exact Total Matching: should generate line items that sum EXACTLY to the target total', () => {
    const targets = [1000, 15420.75, 50000, 99999.99, 125000.5];

    for (const target of targets) {
      // Intra-state (CGST + SGST)
      const intraLines = buildExactLineItems(mockItems, target, false);
      const intraTotal = Math.round(intraLines.reduce((acc, l) => acc + l.lineTotal, 0) * 100) / 100;
      assert.strictEqual(
        intraTotal,
        target,
        `Intra-state grand total (${intraTotal}) must match target (${target}) exactly`
      );

      for (const line of intraLines) {
        assert.ok(line.quantity > 0, 'Quantity must be > 0');
        assert.ok(line.unitPrice > 0, 'Unit price must be > 0');
        assert.strictEqual(line.igst, 0, 'Intra-state IGST must be 0');
        assert.strictEqual(line.cgst, line.sgst, 'CGST and SGST should equal for intra-state');
        assert.strictEqual(
          Math.round((line.taxableValue + line.cgst + line.sgst) * 100) / 100,
          line.lineTotal,
          'taxable + cgst + sgst must equal lineTotal'
        );
      }

      // Inter-state (IGST)
      const interLines = buildExactLineItems(mockItems, target, true);
      const interTotal = Math.round(interLines.reduce((acc, l) => acc + l.lineTotal, 0) * 100) / 100;
      assert.strictEqual(
        interTotal,
        target,
        `Inter-state grand total (${interTotal}) must match target (${target}) exactly`
      );

      for (const line of interLines) {
        assert.strictEqual(line.cgst, 0, 'Inter-state CGST must be 0');
        assert.strictEqual(line.sgst, 0, 'Inter-state SGST must be 0');
        assert.ok(line.igst > 0, 'Inter-state IGST must be > 0');
        assert.strictEqual(
          Math.round((line.taxableValue + line.igst) * 100) / 100,
          line.lineTotal,
          'taxable + igst must equal lineTotal'
        );
      }
    }
  });

  it('2. Enforces minimum 5 items requirement', () => {
    assert.throws(
      () => {
        buildExactLineItems(mockItems.slice(0, 4), 10000, false);
      },
      /At least 5 active items are required/
    );
  });

  it('3. Real Database Test: Full Vendor Lifecycle (Catalog -> Series -> Generate -> Lock -> Cancel)', async () => {
    // 1. Pick a client user from DB
    const { data: clientUser } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('role', 'CLIENT')
      .limit(1)
      .single();

    assert.ok(clientUser, 'Must have at least one CLIENT user');
    const vendorId = clientUser.id;

    // 2. Clean up test records for this vendor
    await supabase.from('invoices').delete().eq('vendor_id', vendorId);
    await supabase.from('invoice_series').delete().eq('vendor_id', vendorId);
    await supabase.from('invoice_items').delete().eq('vendor_id', vendorId);
    await supabase.from('invoice_templates').delete().eq('vendor_id', vendorId);

    // 3. Insert 5 active items
    const itemsToInsert = [
      {
        vendor_id: vendorId,
        name: 'Technical Architecture Advisory',
        hsn_sac: '998311',
        gst_rate_percent: 18,
        unit: 'HRS',
        min_price: 2500,
        max_price: 5000,
        active: true,
      },
      {
        vendor_id: vendorId,
        name: 'Enterprise Software License',
        hsn_sac: '997331',
        gst_rate_percent: 18,
        unit: 'LIC',
        min_price: 15000,
        max_price: 45000,
        active: true,
      },
      {
        vendor_id: vendorId,
        name: 'Database Performance Tuning',
        hsn_sac: '998314',
        gst_rate_percent: 18,
        unit: 'JOB',
        min_price: 10000,
        max_price: 30000,
        active: true,
      },
      {
        vendor_id: vendorId,
        name: 'GST Compliance Automation Bot',
        hsn_sac: '998315',
        gst_rate_percent: 18,
        unit: 'NOS',
        min_price: 20000,
        max_price: 60000,
        active: true,
      },
      {
        vendor_id: vendorId,
        name: 'Security Vulnerability Assessment',
        hsn_sac: '998316',
        gst_rate_percent: 18,
        unit: 'RPT',
        min_price: 18000,
        max_price: 40000,
        active: true,
      },
    ];

    const { data: insertedItems, error: itemsErr } = await supabase
      .from('invoice_items')
      .insert(itemsToInsert)
      .select('*');

    assert.ifError(itemsErr);
    assert.strictEqual(insertedItems.length, 5, 'Must have inserted 5 items');

    // 4. Verify check_min_invoice_items RPC returns true now
    const { data: hasMin } = await supabase.rpc('check_min_invoice_items', {
      p_vendor_id: vendorId,
    });
    assert.strictEqual(hasMin, true, 'check_min_invoice_items must now return true');

    // 5. Configure Invoice Series for FY 2026-27
    const { data: series, error: seriesErr } = await supabase
      .from('invoice_series')
      .insert({
        vendor_id: vendorId,
        financial_year: '2026-27',
        prefix: 'GST/26/',
        start_number: 1,
        current_number: 0,
        padding: 4,
        active: true,
      })
      .select('*')
      .single();

    assert.ifError(seriesErr);
    assert.ok(series, 'Series must be created');

    // 6. Create a Customizable Template with custom title and font adjustments
    const { data: template, error: tplErr } = await supabase
      .from('invoice_templates')
      .insert({
        vendor_id: vendorId,
        name: 'Corporate Custom Blue',
        page_size: 'A4',
        custom_title: 'TAX INVOICE / CASH MEMO',
        title_font_size: 20,
        accent_color: '#2563eb',
        custom_labels: {
          invoice_number: 'Tax Invoice Ref',
          buyer: 'Bill To Party',
        },
        column_widths: {
          sno: 5,
          description: 30,
          hsn: 10,
          qty: 8,
          unit: 7,
          rate: 10,
          taxable: 15,
          total: 15,
        },
        is_default: true,
      })
      .select('*')
      .single();

    assert.ifError(tplErr);
    assert.ok(template, 'Template must be created');

    // 7. Generate a batch of 2 invoices totaling ₹75,000 each
    const TARGET = 75000;
    const batchResult = await generateInvoiceBatch({
      vendorId,
      seriesId: series.id,
      buyerName: 'Tata Consultancy Services Ltd',
      buyerGstin: '27AAACT2727Q1ZW',
      buyerState: 'Maharashtra',
      buyerStateCode: '27',
      invoiceDate: '2026-04-15',
      count: 2,
      targetTotal: TARGET,
      templateId: template.id,
      createdBy: vendorId,
    });

    assert.strictEqual(batchResult.count, 2, 'Batch count must be 2');
    assert.strictEqual(batchResult.totalAmount, TARGET * 2, 'Total amount must equal 2 * 75000');
    assert.strictEqual(batchResult.invoices[0].invoiceNumber, 'GST/26/0001', 'First invoice number');
    assert.strictEqual(batchResult.invoices[1].invoiceNumber, 'GST/26/0002', 'Second invoice number');

    // 8. Verify the invoices are saved in DB with line items
    const { data: inv1, error: inv1Err } = await supabase
      .from('invoices')
      .select('*, invoice_line_items(*)')
      .eq('id', batchResult.invoices[0].id)
      .single();

    assert.ifError(inv1Err);
    assert.strictEqual(Number(inv1.grand_total), TARGET, 'Invoice 1 grand total must match');
    assert.strictEqual(inv1.status, 'ACTIVE');
    assert.ok(inv1.invoice_line_items.length >= 2, 'Must have at least 2 line items');
    assert.strictEqual(inv1.template_snapshot.custom_title, 'TAX INVOICE / CASH MEMO');

    // Verify line totals sum to invoice grand_total exactly
    const lineTotalSum = Math.round(
      inv1.invoice_line_items.reduce((acc, l) => acc + Number(l.line_total), 0) * 100
    ) / 100;
    assert.strictEqual(lineTotalSum, TARGET, 'Sum of line totals must match grand_total exactly');

    // 9. Cancel invoice 2
    const { error: cancelErr } = await supabase.rpc('cancel_invoice', {
      p_invoice_id: batchResult.invoices[1].id,
      p_vendor_id: vendorId,
      p_cancelled_by: vendorId,
      p_reason: 'Testing cancellation flow',
    });
    assert.ifError(cancelErr);

    const { data: inv2 } = await supabase
      .from('invoices')
      .select('status, cancellation_reason')
      .eq('id', batchResult.invoices[1].id)
      .single();

    assert.strictEqual(inv2.status, 'CANCELLED');
    assert.strictEqual(inv2.cancellation_reason, 'Testing cancellation flow');

    // 10. Test SQL summary function
    const { data: summary } = await supabase.rpc('get_invoice_summary', {
      p_vendor_id: vendorId,
      p_from_date: '2026-04-01',
      p_to_date: '2026-04-30',
    });

    assert.ok(summary && summary[0], 'Summary data returned');
    assert.strictEqual(Number(summary[0].total_invoices), 2);
    assert.strictEqual(Number(summary[0].active_invoices), 1);
    assert.strictEqual(Number(summary[0].cancelled_invoices), 1);
    assert.strictEqual(Number(summary[0].total_sales), TARGET);

    console.log('✅ All Phase 2 backend lifecycle tests passed successfully!');
  });
});
