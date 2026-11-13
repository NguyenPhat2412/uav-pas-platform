import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import test from 'node:test';

let ts;
try {
    ts = createRequire(import.meta.url)('typescript');
} catch {
    ts = createRequire(new URL('../package.json', import.meta.url))('typescript');
}

const resolvePortalUrl = p => {
    for (const prefix of ['../', '../../customer/', '../../operations/']) {
        const u = new URL(`${prefix}${p}`, import.meta.url);
        if (existsSync(u)) return u;
    }
    return new URL(`../${p}`, import.meta.url);
};
const read = path => readFileSync(resolvePortalUrl(path), 'utf8');
const compile = source => ts.transpileModule(source, {
    compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
    },
}).outputText;
const load = source => import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));

const {API_ROUTES} = await load(compile(read('src/lib/api/routes.ts')));
const receiptHelper = await load(compile(read('src/utils/billing/receipt-download.ts')));

test('billing routes expose invoice PDF receipt and SePay webhook paths', () => {
    assert.equal(API_ROUTES.billing.invoiceReceipt(42), '/api/v1/billing/invoices/42/receipt');
    assert.equal(API_ROUTES.billing.invoiceReceipt('99'), '/api/v1/billing/invoices/99/receipt');
    assert.equal(API_ROUTES.billing.sepayWebhook, '/api/v1/billing/webhook/sepay');
});

test('receipt download helper builds safe filenames and triggers temporary anchor download + URL revocation', () => {
    assert.equal(receiptHelper.receiptFilename('INV-2026-0042'), 'invoice-INV-2026-0042.pdf');
    assert.equal(receiptHelper.receiptFilename('  INV / 2026 #01 '), 'invoice-INV-2026-01.pdf');
    assert.equal(receiptHelper.receiptFilename('   '), 'invoice-receipt.pdf');

    const originalDocument = globalThis.document;
    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;

    const createdBlobs = [];
    const revokedUrls = [];
    const appendedNodes = [];
    let clickedAnchor = null;
    let removed = false;

    URL.createObjectURL = blob => {
        createdBlobs.push(blob);
        return 'blob:https://uav.example.test/receipt-42';
    };
    URL.revokeObjectURL = url => {
        revokedUrls.push(url);
    };
    globalThis.document = {
        createElement: tag => {
            assert.equal(tag, 'a');
            return {
                href: '',
                download: '',
                rel: '',
                click() {
                    clickedAnchor = {href: this.href, download: this.download, rel: this.rel};
                },
                remove() {
                    removed = true;
                },
            };
        },
        body: {
            appendChild: node => appendedNodes.push(node),
        },
    };

    try {
        const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);
        receiptHelper.triggerReceiptDownload(new Blob([pdfBytes]), 'INV-2026-0042', 0);

        assert.equal(createdBlobs.length, 1);
        assert.equal(createdBlobs[0].type, 'application/pdf');
        assert.equal(appendedNodes.length, 1);
        assert.deepEqual(clickedAnchor, {
            href: 'blob:https://uav.example.test/receipt-42',
            download: 'invoice-INV-2026-0042.pdf',
            rel: 'noopener',
        });
        assert.equal(removed, true);
        assert.deepEqual(revokedUrls, ['blob:https://uav.example.test/receipt-42']);
    } finally {
        globalThis.document = originalDocument;
        URL.createObjectURL = originalCreateObjectURL;
        URL.revokeObjectURL = originalRevokeObjectURL;
    }
});

test('apiClient.getBlob authenticates, refreshes expired sessions on 401, and returns PDF Blob', async () => {
    const messagesJs = compile(read('src/lib/api/messages.ts'));
    const messagesUrl = 'data:text/javascript;base64,' + Buffer.from(messagesJs).toString('base64');
    const apiSource = read('src/lib/api/index.ts').replace(/^export \{ API_ROUTES.*$/m, '');
    const apiJs = compile(apiSource).replace(/(['"])@\/lib\/api\/messages\1/, `'${messagesUrl}'`);
    const api = await load(apiJs);

    const original = {fetch: globalThis.fetch, window: globalThis.window, localStorage: globalThis.localStorage};
    const storage = new Map();
    globalThis.localStorage = {
        getItem: k => storage.get(k) ?? null,
        setItem: (k, v) => storage.set(k, v),
        removeItem: k => storage.delete(k),
    };
    globalThis.window = Object.assign(new EventTarget(), {localStorage: globalThis.localStorage});
    api.setAuthSession({accessToken: 'expired-token', refreshToken: 'refresh-1', user: {id: 7}});

    try {
        let refreshes = 0;
        const pdfPayload = '%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF';
        globalThis.fetch = async (url, options) => {
            if (url.endsWith('/api/v1/auth/refresh')) {
                refreshes += 1;
                return Response.json({accessToken: 'fresh-token', refreshToken: 'refresh-2', user: {id: 7}});
            }
            const auth = new Headers(options.headers).get('authorization');
            if (auth !== 'Bearer fresh-token') {
                return Response.json({message: 'Unauthorized'}, {status: 401});
            }
            return new Response(pdfPayload, {
                status: 200,
                headers: {'Content-Type': 'application/pdf'},
            });
        };

        const blob = await api.apiClient.getBlob(API_ROUTES.billing.invoiceReceipt(77));
        assert.equal(refreshes, 1);
        assert.equal(await blob.text(), pdfPayload);
    } finally {
        Object.assign(globalThis, original);
    }
});

const hasSiblingPortals = existsSync(new URL('../../customer/package.json', import.meta.url));
test('customer and admin billing services, polling hooks, and trilingual PDF messages stay wired', {skip: !hasSiblingPortals}, async () => {
    const blobCalls = [];
    globalThis.__billingReceiptTest = {
        API_ROUTES,
        buildQueryString: () => '',
        apiClient: {
            get: async () => ({}),
            post: async () => ({}),
            getBlob: async endpoint => {
                blobCalls.push(endpoint);
                return new Blob(['%PDF-1.4'], {type: 'application/pdf'});
            },
        },
    };
    try {
        const customerCompiled = compile(read('src/api/billing/customer-billing.api.ts')).replace(/^import .*?;\n/gm, '');
        const {customerBillingService} = await load('const {API_ROUTES,apiClient}=globalThis.__billingReceiptTest;\n' + customerCompiled);
        await customerBillingService.downloadReceipt(12);

        const adminCompiled = compile(read('src/api/billing/billing-admin.api.ts')).replace(/^import .*?;\n/gm, '');
        const {billingAdminService} = await load('const {API_ROUTES,apiClient,buildQueryString}=globalThis.__billingReceiptTest;\n' + adminCompiled);
        await billingAdminService.downloadReceipt(34);

        assert.deepEqual(blobCalls, [
            '/api/v1/billing/invoices/12/receipt',
            '/api/v1/billing/invoices/34/receipt',
        ]);
    } finally {
        delete globalThis.__billingReceiptTest;
    }

    const customerHookSource = read('src/hooks/billing/useCustomerBilling.ts');
    assert.match(customerHookSource, /refetchInterval:[\s\S]*?status\s*(?:!==|===)\s*'PENDING'[\s\S]*?(?:5000|5_000)/);
    assert.match(customerHookSource, /export function useDownloadInvoiceReceipt/);
    assert.match(read('src/hooks/billing/useBillingAdmin.ts'), /export function useDownloadAdminInvoiceReceipt/);

    for (const locale of ['vi', 'en', 'ja']) {
        const customer = JSON.parse(read(`src/messages/customer/${locale}.json`));
        const customerPro = JSON.parse(read(`src/messages/sections/customerPro/${locale}.json`));
        const admin = JSON.parse(read(`src/messages/sections/admin/${locale}.json`)).admin;

        assert.ok(customer.billingPage.downloadPdf, `${locale}: billingPage.downloadPdf`);
        assert.ok(customer.billingPage.downloadPdfAria, `${locale}: billingPage.downloadPdfAria`);
        assert.ok(customer.billingPage.downloadPdfError, `${locale}: billingPage.downloadPdfError`);
        assert.ok(customerPro.payment.downloadPdf, `${locale}: payment.downloadPdf`);
        assert.ok(customerPro.payment.downloadPdfError, `${locale}: payment.downloadPdfError`);
        assert.ok(customerPro.payment.confirmation, `${locale}: payment.confirmation`);
        assert.ok(admin.invoices.downloadPdf, `${locale}: admin.invoices.downloadPdf`);
        assert.ok(admin.invoices.downloadPdfAria, `${locale}: admin.invoices.downloadPdfAria`);
        assert.ok(admin.invoices.downloadPdfFailed, `${locale}: admin.invoices.downloadPdfFailed`);
    }
});
