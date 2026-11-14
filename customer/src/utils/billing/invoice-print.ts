import type {BankTransferInstructions} from '@/types/billing/billing.types';

export function buildInvoiceSupportPrompt(
    invoiceCode: string,
    formattedAmount: string,
    configured = true,
): string {
    if (!configured) {
        return `Tôi cần hướng dẫn chuyển khoản và đối soát thanh toán cho hóa đơn ${invoiceCode} (số tiền ${formattedAmount}). Nhờ Admin hỗ trợ thông tin nhận khoản.`;
    }
    return `Tôi đã chuyển khoản thanh toán cho hóa đơn ${invoiceCode} (số tiền ${formattedAmount}). Nhờ Admin kiểm tra và đối soát giúp.`;
}

/** Opens a plain printable invoice; the browser's print dialog can save it as PDF. */
export function printInvoice(
    data: BankTransferInstructions,
    labels: Record<string, string>,
    money: (n: number) => string,
    date: (v: string | null) => string,
    onPopupBlocked?: () => void,
) {
    const win = window.open('', '_blank', 'noopener=no,width=760,height=900');
    if (!win) {
        onPopupBlocked?.();
        return;
    }
    const esc = (v: string) => v.replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]!));
    const row = (k: string, v: string) =>
        `<tr><td style="padding:6px 0;color:#555">${esc(k)}</td><td style="padding:6px 0;text-align:right">${esc(v)}</td></tr>`;
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(data.invoiceCode)}</title></head>
<body style="font-family:system-ui,sans-serif;max-width:640px;margin:32px auto;color:#111">
<h1 style="font-size:20px;margin:0 0 4px">${esc(labels.title)}</h1><p style="margin:0 0 24px;color:#555">${esc(data.invoiceCode)}</p>
<table style="width:100%;border-collapse:collapse;font-size:14px">
${row(labels.issued, date(data.issuedAt))}${row(labels.due, date(data.dueDate))}${row(labels.item, data.itemName ?? '—')}
${row(labels.serviceFee, money(data.subtotal))}${row(labels.vat, money(data.vat))}
<tr><td style="padding:10px 0;font-weight:700;border-top:1px solid #ccc">${esc(labels.total)}</td><td style="padding:10px 0;text-align:right;font-weight:700;border-top:1px solid #ccc">${esc(money(data.total))}</td></tr>
</table><h2 style="font-size:15px;margin:28px 0 8px">${esc(labels.bank)}</h2>
<table style="width:100%;border-collapse:collapse;font-size:14px">
${row(labels.bank, data.bankName || data.bankBin)}${row(labels.accountName, data.accountName)}${row(labels.accountNumber, data.accountNumber)}${row(labels.content, data.transferContent)}
</table><script>window.onload=()=>window.print()</script></body></html>`);
    win.document.close();
}
