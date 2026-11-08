import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

export interface Gstr1DataPayload {
  b2b: Array<{
    gstin: string;
    receiverName: string;
    invoiceNumber: string;
    invoiceDate: string;
    invoiceValue: number;
    placeOfSupply: string;
    reverseCharge: string;
    applicablePercent: string;
    invoiceType: string;
    rate: number;
    taxableValue: number;
    cessAmount: number;
  }>;
  b2cs: Array<{
    type: string;
    placeOfSupply: string;
    rate: number;
    taxableValue: number;
    cessAmount: number;
    ecomGstin: string;
  }>;
  hsn: Array<{
    hsn_sac: string;
    description: string;
    uqc: string;
    total_qty: number;
    total_value: number;
    taxable_value: number;
    igst_amount: number;
    cgst_amount: number;
    sgst_amount: number;
  }>;
  docsIssued: Array<{
    nature: string;
    fromNumber: string;
    toNumber: string;
    totalNumber: number;
    cancelled: number;
  }>;
  period: { fromDate: string; toDate: string };
}

/**
 * Generates an official GSTR-1 compliant multi-sheet Excel workbook and downloads it.
 */
export function exportGstr1Excel(data: Gstr1DataPayload, businessName: string = 'Vendor'): void {
  const wb = XLSX.utils.book_new();

  // 1. Table 4A: B2B Invoices
  const b2bHeaders = [
    'GSTIN/UIN of Recipient',
    'Receiver Name',
    'Invoice Number',
    'Invoice Date',
    'Invoice Value',
    'Place Of Supply',
    'Reverse Charge',
    'Applicable % of Tax Rate',
    'Invoice Type',
    'E-Commerce GSTIN',
    'Rate',
    'Taxable Value',
    'Cess Amount',
  ];

  const b2bRows = data.b2b.map((r) => [
    r.gstin,
    r.receiverName,
    r.invoiceNumber,
    r.invoiceDate,
    r.invoiceValue,
    r.placeOfSupply,
    r.reverseCharge,
    r.applicablePercent,
    r.invoiceType,
    '',
    r.rate,
    r.taxableValue,
    r.cessAmount,
  ]);

  const b2bSheet = XLSX.utils.aoa_to_sheet([b2bHeaders, ...b2bRows]);
  XLSX.utils.book_append_sheet(wb, b2bSheet, 'b2b');

  // 2. Table 7: B2CS (Small Invoices to Unregistered)
  const b2csHeaders = [
    'Type',
    'Place Of Supply',
    'Rate',
    'Taxable Value',
    'Cess Amount',
    'E-Commerce GSTIN',
  ];

  const b2csRows = data.b2cs.map((r) => [
    r.type,
    r.placeOfSupply,
    r.rate,
    r.taxableValue,
    r.cessAmount,
    r.ecomGstin,
  ]);

  const b2csSheet = XLSX.utils.aoa_to_sheet([b2csHeaders, ...b2csRows]);
  XLSX.utils.book_append_sheet(wb, b2csSheet, 'b2cs');

  // 3. Table 12: HSN Summary
  const hsnHeaders = [
    'HSN',
    'Description',
    'UQC',
    'Total Quantity',
    'Total Value',
    'Taxable Value',
    'Integrated Tax Amount',
    'Central Tax Amount',
    'State/UT Tax Amount',
    'Cess Amount',
  ];

  const hsnRows = data.hsn.map((r) => [
    r.hsn_sac,
    r.description,
    r.uqc,
    r.total_qty,
    r.total_value,
    r.taxable_value,
    r.igst_amount,
    r.cgst_amount,
    r.sgst_amount,
    0,
  ]);

  const hsnSheet = XLSX.utils.aoa_to_sheet([hsnHeaders, ...hsnRows]);
  XLSX.utils.book_append_sheet(wb, hsnSheet, 'hsn');

  // 4. Table 13: Documents Issued
  const docsHeaders = [
    'Nature of Document',
    'Sr. No. From',
    'Sr. No. To',
    'Total Number',
    'Cancelled',
  ];

  const docsRows = data.docsIssued.map((r) => [
    r.nature,
    r.fromNumber,
    r.toNumber,
    r.totalNumber,
    r.cancelled,
  ]);

  const docsSheet = XLSX.utils.aoa_to_sheet([docsHeaders, ...docsRows]);
  XLSX.utils.book_append_sheet(wb, docsSheet, 'docs');

  // Generate buffer and trigger browser download
  const wbOut = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbOut], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

  const safeName = businessName.replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `GSTR1_${safeName}_${data.period.fromDate}_to_${data.period.toDate}.xlsx`;

  saveAs(blob, filename);
}
