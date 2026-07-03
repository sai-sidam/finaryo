import * as pdfParseModule from "pdf-parse";

export const parsePdf = pdfParseModule.default ?? pdfParseModule;

export function tryExtractPayslipData(text) {
  const compact = text.replace(/\s+/g, " ").trim();
  const amountMatch =
    compact.match(/(?:net pay|net salary|take home|amount paid)\D{0,20}(\d[\d,]*(?:\.\d{2})?)/i) ??
    compact.match(/\$?(\d[\d,]*(?:\.\d{2})?)\s*(?:usd)?/i);
  const dateMatch =
    compact.match(/(?:pay date|payment date|paid on)\D{0,15}(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/i) ??
    compact.match(/\b(\d{4}-\d{2}-\d{2})\b/);

  const extractedNetPay = amountMatch ? Number(amountMatch[1].replace(/,/g, "")) : null;
  const extractedPayDate = dateMatch ? new Date(dateMatch[1]) : null;
  const validDate = extractedPayDate && !Number.isNaN(extractedPayDate.getTime()) ? extractedPayDate : null;

  return {
    extractedNetPay: Number.isFinite(extractedNetPay) ? extractedNetPay : null,
    extractedPayDate: validDate,
  };
}

// Never expose the server filesystem path to the client.
export function serializePayslip(item) {
  const { storagePath: _storagePath, ...rest } = item;
  return {
    ...rest,
    extractedPayDate: item.extractedPayDate ? item.extractedPayDate.toISOString() : null,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}
