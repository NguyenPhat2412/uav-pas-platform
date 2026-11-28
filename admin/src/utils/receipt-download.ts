/** Builds a safe PDF filename for an invoice or payment receipt. */
export function receiptFilename(code: string): string {
    const clean = code.trim().replace(/[^a-zA-Z0-9._-]+/g, '-') || 'receipt';
    return `invoice-${clean}.pdf`;
}

/** Saves an invoice or payment receipt PDF Blob via a temporary object URL and anchor download. */
export function triggerReceiptDownload(blob: Blob, code: string, revokeDelayMs = 100): void {
    if (typeof document === 'undefined' || typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') return;
    const pdfBlob = blob.type === 'application/pdf' ? blob : new Blob([blob], {type: 'application/pdf'});
    const objectUrl = URL.createObjectURL(pdfBlob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = receiptFilename(code);
    anchor.rel = 'noopener';
    document.body.appendChild(anchor);
    try {
        anchor.click();
    } finally {
        anchor.remove();
        if (revokeDelayMs <= 0) {
            URL.revokeObjectURL(objectUrl);
        } else {
            const timer = setTimeout(() => URL.revokeObjectURL(objectUrl), revokeDelayMs);
            (timer as unknown as { unref?: () => void })?.unref?.();
        }
    }
}
