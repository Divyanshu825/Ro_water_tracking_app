import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { writeTextFile } from '../utils/files';

export async function sharePdf(html: string, title: string) {
  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: title });
  else await Print.printAsync({ uri });
}

const esc = (v: string | number) => {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
export const toCsv = (rows: (string | number)[][]) => rows.map((r) => r.map(esc).join(',')).join('\n');

/** CSV opens directly in Excel / Google Sheets. */
export async function shareCsv(name: string, rows: (string | number)[][]) {
  const uri = writeTextFile(`${name}.csv`, toCsv(rows));
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: 'text/csv', UTI: 'public.comma-separated-values-text', dialogTitle: name });
}

export const reportHtml = (title: string, business: string, subtitle: string, head: string[], rows: (string | number)[][]) => `
<html><head><meta name="viewport" content="width=device-width, initial-scale=1"/><style>
body{font-family:-apple-system,Helvetica,Arial;padding:28px;color:#0B1F44}h1{margin:0;font-size:22px}p{color:#67788F;margin:4px 0 18px}
table{width:100%;border-collapse:collapse;font-size:12px}th{background:#0B1F44;color:#fff;text-align:left;padding:8px}td{padding:8px;border-bottom:1px solid #E1E9F2}
</style></head><body><h1>${business}</h1><p>${title} · ${subtitle}</p>
<table><tr>${head.map((h) => `<th>${h}</th>`).join('')}</tr>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</table></body></html>`;
