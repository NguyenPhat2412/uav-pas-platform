import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import test from 'node:test';

const ts = createRequire(new URL('../package.json', import.meta.url))('typescript');
const read = rel => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

const compile = source =>
    ts.transpileModule(source, {
        compilerOptions: {module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022},
    }).outputText;

const load = source => import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

function collectLeafKeys(obj, prefix = '') {
    const keys = [];
    for (const [k, v] of Object.entries(obj ?? {})) {
        const next = prefix ? `${prefix}.${k}` : k;
        if (v && typeof v === 'object' && !Array.isArray(v)) keys.push(...collectLeafKeys(v, next));
        else keys.push(next);
    }
    return keys.sort();
}

test('API_ROUTES exposes invoice email dispatch and dynamic SMTP/OTP management endpoints', async () => {
    const {API_ROUTES} = await load(compile(read('src/lib/api/routes.ts')));
    assert.equal(API_ROUTES.billing.sendInvoiceEmail(42), '/api/v1/billing/invoices/42/send-email');
    assert.equal(API_ROUTES.admin.infrastructureMailOtpSettings, '/api/v1/admin/infrastructure/mail-otp-settings');
    assert.equal(API_ROUTES.admin.infrastructureOtpTokens, '/api/v1/admin/infrastructure/otp-tokens');
    assert.equal(API_ROUTES.admin.infrastructureOtpTokenInvalidate(9), '/api/v1/admin/infrastructure/otp-tokens/9/invalidate');
    assert.equal(API_ROUTES.admin.infrastructureOtpSendReset, '/api/v1/admin/infrastructure/otp-support/send-reset');
    assert.equal(API_ROUTES.admin.infrastructureOtpClearRateLimit, '/api/v1/admin/infrastructure/otp-support/clear-rate-limit');
});

test('mail-otp-form strips 16-digit Google App Password spaces and builds clean payloads', async () => {
    const form = await load(compile(read('src/forms/infrastructure/mail-otp-form.ts')));
    assert.equal(form.stripAppPasswordSpaces('abcd efgh ijkl mnop'), 'abcdefghijklmnop');

    const draft = form.mailOtpDraftFromSettings({
        mailEnabled: true,
        smtpHost: 'smtp.gmail.com',
        smtpPort: 587,
        smtpUsername: 'ops@uav.vn',
        fromAddress: 'ops@uav.vn',
        senderDisplayName: 'UAV PAS',
        smtpAuth: true,
        smtpStarttls: true,
        passwordConfigured: true,
        passwordSource: 'DATABASE',
        passwordHint: '••••mnop',
        hasDatabaseOverride: true,
        otpTtlMinutes: 10,
        resendCooldownSeconds: 60,
        maxOtpAttempts: 5,
        otpPerAccount: 5,
        otpPerIp: 15,
        maxEmailsPerMinute: 60,
        updatedAt: null,
        updatedBy: null,
        connection: {status: 'UP', checkedAt: null, errorClass: null},
    });

    const keepPasswordPayload = form.toMailOtpSettingsPayload(draft);
    assert.equal('smtpPassword' in keepPasswordPayload, false, 'empty password field preserves existing secret');

    const rotatedPayload = form.toMailOtpSettingsPayload({...draft, smtpPassword: ' xxxx yyyy zzzz wwww '});
    assert.equal(rotatedPayload.smtpPassword, 'xxxxyyyyzzzzwwww');

    const resetPayload = form.toMailOtpSettingsPayload(draft, {resetToEnvDefaults: true});
    assert.equal(resetPayload.resetToEnvDefaults, true);

    assert.equal(form.canSubmitOtpSupportEmail('pilot@uav.vn'), true);
    assert.equal(form.canSubmitOtpSupportEmail('invalid-email'), false);
});

test('infrastructureService and billingAdminService call exact SMTP/OTP and invoice email endpoints', async () => {
    const {API_ROUTES} = await load(compile(read('src/lib/api/routes.ts')));
    const {buildQueryString} = await load(compile(read('src/lib/format.ts')));
    const calls = [];
    globalThis.__mailOtpContractTest = {
        API_ROUTES,
        buildQueryString,
        apiClient: {
            get: async url => {
                calls.push(['GET', url]);
                return {};
            },
            put: async (url, body) => {
                calls.push(['PUT', url, body]);
                return {};
            },
            post: async (url, body) => {
                calls.push(['POST', url, body]);
                return {};
            },
            getBlob: async url => {
                calls.push(['BLOB', url]);
                return new Blob();
            },
        },
    };
    try {
        const infraSource = compile(read('src/api/infrastructure/infrastructure.api.ts')).replace(/^import .*?;\n/gm, '');
        const {infrastructureService} = await load(
            'const {API_ROUTES,apiClient,buildQueryString}=globalThis.__mailOtpContractTest;\n' + infraSource,
        );
        await infrastructureService.mailOtpSettings();
        await infrastructureService.updateMailOtpSettings({mailEnabled: true});
        await infrastructureService.otpTokens(1, {purpose: 'PASSWORD_RESET', status: 'ACTIVE', q: ' user@uav.vn '});
        await infrastructureService.invalidateOtpToken(17);
        await infrastructureService.sendResetOtp(' forgot@uav.vn ');
        await infrastructureService.clearOtpRateLimit(' locked@uav.vn ');

        const billingSource = compile(read('src/api/billing/billing-admin.api.ts')).replace(/^import .*?;\n/gm, '');
        const {billingAdminService} = await load(
            'const {API_ROUTES,apiClient,buildQueryString}=globalThis.__mailOtpContractTest;\n' + billingSource,
        );
        await billingAdminService.sendInvoiceEmail(99);

        assert.deepEqual(calls, [
            ['GET', '/api/v1/admin/infrastructure/mail-otp-settings'],
            ['PUT', '/api/v1/admin/infrastructure/mail-otp-settings', {mailEnabled: true}],
            ['GET', '/api/v1/admin/infrastructure/otp-tokens?page=1&size=15&purpose=PASSWORD_RESET&status=ACTIVE&q=user%40uav.vn'],
            ['POST', '/api/v1/admin/infrastructure/otp-tokens/17/invalidate', undefined],
            ['POST', '/api/v1/admin/infrastructure/otp-support/send-reset', {email: 'forgot@uav.vn'}],
            ['POST', '/api/v1/admin/infrastructure/otp-support/clear-rate-limit', {email: 'locked@uav.vn'}],
            ['POST', '/api/v1/billing/invoices/99/send-email', undefined],
        ]);
    } finally {
        delete globalThis.__mailOtpContractTest;
    }
});

test('infrastructure email subcomponents stay <= 300 lines and maintain trilingual catalog parity', () => {
    for (const rel of [
        'src/components/infrastructure/data/EmailPanel.tsx',
        'src/components/infrastructure/data/MailOtpConfigSection.tsx',
        'src/components/infrastructure/data/OtpSupportMonitorSection.tsx',
        'src/components/billing/invoices/AdminInvoicesPanel.tsx',
        'src/components/billing/invoices/CustomerBillingProfileCard.tsx',
    ]) {
        assert.equal(existsSync(new URL(`../${rel}`, import.meta.url)), true, rel);
        const lines = read(rel).split('\n').length;
        assert.ok(lines <= 301, `${rel} must stay <= 300 lines (got ${lines - 1})`);
    }

    const vi = JSON.parse(read('src/messages/sections/adminInfra/vi.json')).adminInfra.email;
    const en = JSON.parse(read('src/messages/sections/adminInfra/en.json')).adminInfra.email;
    const ja = JSON.parse(read('src/messages/sections/adminInfra/ja.json')).adminInfra.email;
    assert.deepEqual(collectLeafKeys(en), collectLeafKeys(vi));
    assert.deepEqual(collectLeafKeys(ja), collectLeafKeys(vi));
});
