import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = rel => readFileSync(path.join(root, rel), 'utf8');

const BANNED_PALETTE = /\b(?:emerald|green|teal|indigo|purple|violet)-(?:50|100|200|300|400|500|600|700|800|900)\b/;

test('Admin WebSocket hub & support/billing hooks wire real-time events cleanly', () => {
    const wsClient = read('src/lib/realtime-ws.ts');
    assert.match(wsClient, /\/api\/v1\/ws\/realtime/);
    assert.match(wsClient, /ADMIN_SUPPORT_UPDATED/);
    assert.match(wsClient, /SUPPORT_VISITOR_TYPING/);
    assert.match(wsClient, /INVOICE_UPDATED/);

    const supportHook = read('src/hooks/support/useAdminSupport.ts');
    assert.match(supportHook, /useAdminSupportRealtime/);
    assert.match(supportHook, /ADMIN_TYPING/);

    const billingHook = read('src/hooks/billing/useBillingAdmin.ts');
    assert.match(billingHook, /useAdminBillingRealtime/);
    assert.match(billingHook, /usePaymentGatewayConfig/);
    assert.match(billingHook, /useUpdatePaymentGatewayConfig/);
});

test('Admin support & billing components respect palette guardrails and <= 300 line cap', () => {
    const uiFiles = [
        'src/components/support/SupportInboxWorkspace.tsx',
        'src/components/support/SupportThreadConversationPane.tsx',
        'src/components/support/AdminSupportQuickDock.tsx',
        'src/utils/support/support-format.ts',
        'src/components/billing/PaymentGatewaySettingsSection.tsx',
        'src/components/billing/AdminInvoiceDialogs.tsx',
        'src/components/billing/AdminInvoicesPanel.tsx',
        'src/components/billing/AdminTransactionsPanel.tsx',
    ];

    for (const rel of uiFiles) {
        const source = read(rel);
        assert.doesNotMatch(source, BANNED_PALETTE, `${rel} must not contain banned palette classes`);
        const lines = source.split('\n').length;
        assert.ok(lines <= 300, `${rel} exceeds 300 lines (${lines})`);
    }
});
