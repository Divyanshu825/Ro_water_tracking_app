import { DbState, FinancialEntry, Order, SettingsState } from '../../../types/domain';
import { formatMoney, formatCapacity, labelize } from '../../../utils/format';
import { formatDate, formatDateTime } from '../../../utils/date';
import { customerBalance, orderPaid, orderSubtotal, orderTotal } from './ledger';

const css = `body{font-family:-apple-system,Helvetica,Arial;color:#0B1F44;padding:32px;font-size:13px}
h1{font-size:24px;margin:0}.muted{color:#67788F}.row{display:flex;justify-content:space-between}
.hdr{display:flex;justify-content:space-between;border-bottom:3px solid #1E9FD8;padding-bottom:16px;margin-bottom:20px}
table{width:100%;border-collapse:collapse;margin:16px 0}th{text-align:left;background:#EDF3F9;padding:9px}td{padding:9px;border-bottom:1px solid #E1E9F2}
.r{text-align:right}.tot td{border:none;padding:5px 9px}.grand td{font-weight:800;font-size:16px;border-top:2px solid #0B1F44;padding-top:10px}
.sec{margin-top:6px;padding:10px;background:#F4F8FC;border-radius:8px}.foot{margin-top:28px;color:#67788F;font-size:11px}`;

const head = (s: SettingsState, title: string, no: string, date: string) => `
<div class="hdr"><div><h1>${s.business.name}</h1><div class="muted">${s.business.address}<br/>${s.business.phone} · ${s.business.email}${s.business.gstin ? `<br/>GSTIN: ${s.business.gstin}` : ''}</div></div>
<div style="text-align:right"><h1 style="color:#1E9FD8">${title}</h1><div>${no}</div><div class="muted">${date}</div></div></div>`;

export function invoiceHtml(db: DbState, s: SettingsState, o: Order) {
  const m = (n: number) => formatMoney(n, s.currency);
  const customer = db.customers.find((c) => c.id === o.customerId);
  const addr = customer?.addresses.find((a) => a.id === o.addressId);
  const paid = orderPaid(db.financialEntries, o.id);
  const total = orderTotal(o);
  const sub = orderSubtotal(o);
  return `<html><head><meta name="viewport" content="width=device-width, initial-scale=1"/><style>${css}</style></head><body>
${head(s, 'INVOICE', `${s.invoice.prefix}-${o.number}`, formatDate((o.deliveredAt ?? o.createdAt).slice(0, 10)))}
<div class="row"><div><b>Billed to</b><br/>${customer?.name ?? ''}<br/><span class="muted">${customer?.phone ?? ''}<br/>${addr ? `${addr.line}, ${addr.city} ${addr.pincode}` : ''}</span></div>
<div style="text-align:right"><b>Order</b> ${o.number}<br/><span class="muted">Delivery ${formatDate(o.deliveryDate)}<br/>Status: ${labelize(o.status)}</span></div></div>
<table><tr><th>Item</th><th class="r">Qty</th><th class="r">Rate</th><th class="r">Amount</th></tr>
${o.items.map((i) => `<tr><td>${i.name}</td><td class="r">${i.qty}</td><td class="r">${m(i.unitPrice)}</td><td class="r">${m(i.qty * i.unitPrice)}</td></tr>`).join('')}</table>
<table class="tot"><tr><td class="r">Subtotal</td><td class="r" style="width:120px">${m(sub)}</td></tr>
${o.discount ? `<tr><td class="r">Discount</td><td class="r">-${m(o.discount)}</td></tr>` : ''}
${o.deliveryCharge ? `<tr><td class="r">Delivery charges</td><td class="r">${m(o.deliveryCharge)}</td></tr>` : ''}
${o.taxAmount ? `<tr><td class="r">${s.tax.label} (${s.tax.rate}%)</td><td class="r">${m(o.taxAmount)}</td></tr>` : ''}
${o.depositAmount ? `<tr><td class="r">Refundable bottle deposit</td><td class="r">${m(o.depositAmount)}</td></tr>` : ''}
<tr class="grand"><td class="r">Total</td><td class="r">${m(total)}</td></tr>
<tr><td class="r">Paid</td><td class="r">${m(paid)}</td></tr><tr><td class="r"><b>Balance due on this order</b></td><td class="r"><b>${m(Math.max(0, total - paid))}</b></td></tr></table>
${customer ? `<div class="sec">Account balance (all orders): <b>${m(customerBalance(db.financialEntries, customer.id))}</b></div>` : ''}
<div class="foot">${s.invoice.terms}<br/><br/>${s.invoice.footer}</div></body></html>`;
}

export function receiptHtml(db: DbState, s: SettingsState, e: FinancialEntry) {
  const m = (n: number) => formatMoney(n, s.currency);
  const customer = db.customers.find((c) => c.id === e.customerId);
  const order = db.orders.find((o) => o.id === e.orderId);
  return `<html><head><meta name="viewport" content="width=device-width, initial-scale=1"/><style>${css}</style></head><body>
${head(s, 'RECEIPT', e.receiptNo ?? e.id, formatDateTime(e.at))}
<div class="sec"><div class="row"><span>Received from</span><b>${customer?.name ?? ''}</b></div>
<div class="row"><span>Payment method</span><b>${labelize(e.method ?? 'cash')}</b></div>
${order ? `<div class="row"><span>Against order</span><b>${order.number}</b></div>` : ''}</div>
<table class="tot"><tr class="grand"><td class="r">Amount received</td><td class="r" style="width:140px">${m(e.amount)}</td></tr>
<tr><td class="r">Outstanding balance after payment</td><td class="r">${m(customerBalance(db.financialEntries.filter((x) => x.at <= e.at || x.id === e.id), e.customerId))}</td></tr></table>
<div class="foot">${s.invoice.footer}</div></body></html>`;
}

export const itemLine = (name: string, qty: number, ml: number) => `${qty} × ${name} (${formatCapacity(ml)})`;
