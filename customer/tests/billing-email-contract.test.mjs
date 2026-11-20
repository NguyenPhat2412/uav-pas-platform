import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import test from 'node:test';

const ts = createRequire(new URL('../package.json', import.meta.url))('typescript');
const read = rel => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

const compileModule = source =>
    `data:text/javascript;base64,${Buffer.from(
        ts.transpileModule(source, {
            compilerOptions: {module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022},
        }).outputText,
    ).toString('base64')}`;

const formatUrl = compileModule(read('src/lib/format.ts'));

test('customer billing email route, billingEmail profile field, and trilingual copy stay wired', async () => {
    const {API_ROUTES} = await import(compileModule(read('src/lib/api/routes.ts')));
    assert.equal(API_ROUTES.billing.sendInvoiceEmail(88), '/api/v1/billing/invoices/88/send-email');

    const profileForm = await import(compileModule(read('src/forms/profile/profile-form.ts').replaceAll('@/lib/format', formatUrl)));
    assert.equal(profileForm.BILLING_PROFILE_FIELD_KEYS.includes('billingEmail'), true);

    const draft = profileForm.billingProfileDraftFromDetail({
        organizationName: 'Công ty UAV',
        taxCode: '0101234567',
        billingEmail: null,
        billingAddress: 'Hà Nội',
        emergencyContactName: null,
        emergencyContactPhone: null,
        version: 2,
        updatedAt: null,
    });
    assert.equal(draft.billingEmail, '');

    const payload = profileForm.toBillingProfilePayload({...draft, billingEmail: '  ke-toan@uav.vn  '}, 2);
    assert.equal(payload.fields.billingEmail, 'ke-toan@uav.vn');
    assert.equal(payload.version, 2);

    const enterprisePanel = read('src/components/profile/EnterpriseProfilePanel.tsx');
    assert.match(enterprisePanel, /enterprise\.billingEmailHint/);

    const invoicesCard = read('src/components/billing/CustomerBillingInvoicesCard.tsx');
    assert.match(invoicesCard, /billingPage\.sendEmail/);
    assert.match(invoicesCard, /billingPage\.emailedTo/);

    for (const locale of ['vi', 'en', 'ja']) {
        const customer = JSON.parse(read(`src/messages/customer/${locale}.json`));
        const customerPro = JSON.parse(read(`src/messages/sections/customerPro/${locale}.json`));
        assert.ok(customer.billingPage.sendEmail, `${locale}: billingPage.sendEmail`);
        assert.ok(customer.billingPage.sendEmailSuccess, `${locale}: billingPage.sendEmailSuccess`);
        assert.ok(customerPro.enterprise.field.billingEmail, `${locale}: enterprise.field.billingEmail`);
        assert.ok(customerPro.enterprise.billingEmailHint, `${locale}: enterprise.billingEmailHint`);
    }
});
