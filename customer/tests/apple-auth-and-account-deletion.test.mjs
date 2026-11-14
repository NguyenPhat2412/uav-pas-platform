import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const customerRoot = path.resolve(import.meta.dirname, '..');
const repoRoot = path.resolve(customerRoot, '..');
const read = rel => fs.readFileSync(path.join(customerRoot, rel), 'utf8');

const compileModule = source =>
    `data:text/javascript;base64,${Buffer.from(
        ts.transpileModule(source, {
            compilerOptions: {
                module: ts.ModuleKind.ESNext,
                target: ts.ScriptTarget.ES2022,
            },
        }).outputText,
    ).toString('base64')}`;

test('API_ROUTES exposes Sign in with Apple and self-service account deletion endpoints', async () => {
    const {API_ROUTES} = await import(compileModule(read('src/lib/api/routes.ts')));
    assert.equal(API_ROUTES.auth.apple, '/api/v1/auth/apple');
    assert.equal(API_ROUTES.users.deletionPolicy, '/api/v1/users/profile/deletion-policy');
    assert.equal(API_ROUTES.users.deleteOwnAccount, '/api/v1/users/profile/delete');
});

test('AppleSignInButton and AuthModalChrome render side-by-side social sign-in with Google', () => {
    const appleBtn = read('src/components/auth/AppleSignInButton.tsx');
    assert.match(appleBtn, /appleid\.cdn-apple\.com\/appleauth\/static\/jsapi\/appleid\/1\/en_US\/appleid\.auth\.js/);
    assert.match(appleBtn, /NEXT_PUBLIC_APPLE_CLIENT_ID/);
    assert.match(appleBtn, /auth\.apple\.notConfigured/);
    assert.match(appleBtn, /popup_closed_by_user/);
    assert.match(appleBtn, /user_cancelled_authorize/);

    const googleBtn = read('src/components/auth/GoogleSignInButton.tsx');
    assert.match(googleBtn, /Math\.max\(140,/);
    assert.match(googleBtn, /auth\.google\.short/);

    const modalChrome = read('src/components/auth/AuthModalChrome.tsx');
    assert.match(modalChrome, /grid grid-cols-2 gap-3/);
    assert.match(modalChrome, /<GoogleSignInButton/);
    assert.match(modalChrome, /<AppleSignInButton/);
    assert.match(modalChrome, /export const AuthSocialEntry = AuthGoogleEntry/);
});

test('AccountMenu and CustomerAccountMenu use compact sign-out button styling', () => {
    for (const rel of ['src/components/customer/CustomerAccountMenu.tsx', 'src/components/layout/AccountMenu.tsx']) {
        const src = read(rel);
        assert.match(src, /px-2\.5 py-1\.5 text-xs font-semibold/, rel);
        assert.match(src, /<LogOut size=\{14\}/, rel);
    }
});

test('pure profile-form helpers enforce dynamic server AccountDeletionPolicy without hardcoded values', async () => {
    const formatUrl = compileModule(read('src/lib/format.ts'));
    const profileForm = await import(compileModule(read('src/forms/profile/profile-form.ts').replaceAll('@/lib/format', formatUrl)));

    const basePolicy = {
        enabled: true,
        eligible: true,
        confirmationPhrase: 'DELETE-MY-UAV-ACCOUNT',
        requirePassword: true,
        hasPassword: true,
        requireReason: true,
    };

    const empty = profileForm.emptyAccountDeletionDraft();
    assert.equal(profileForm.canSubmitAccountDeletion(empty, basePolicy), false);

    assert.equal(
        profileForm.canSubmitAccountDeletion(
            {confirmationPhrase: 'WRONG', currentPassword: 'secret', reason: 'No longer needed'},
            basePolicy,
        ),
        false,
    );
    assert.equal(
        profileForm.canSubmitAccountDeletion(
            {confirmationPhrase: 'DELETE-MY-UAV-ACCOUNT', currentPassword: '', reason: 'No longer needed'},
            basePolicy,
        ),
        false,
    );
    assert.equal(
        profileForm.canSubmitAccountDeletion(
            {confirmationPhrase: 'DELETE-MY-UAV-ACCOUNT', currentPassword: '', reason: 'No longer needed'},
            {...basePolicy, hasPassword: false},
        ),
        true,
    );
    assert.equal(
        profileForm.canSubmitAccountDeletion(
            {confirmationPhrase: 'DELETE-MY-UAV-ACCOUNT', currentPassword: 'secret', reason: '  '},
            basePolicy,
        ),
        false,
    );
    assert.equal(
        profileForm.canSubmitAccountDeletion(
            {confirmationPhrase: 'DELETE-MY-UAV-ACCOUNT', currentPassword: 'secret', reason: 'Closing test workspace'},
            basePolicy,
        ),
        true,
    );

    assert.deepEqual(
        profileForm.toAccountDeletionPayload(
            {confirmationPhrase: ' DELETE-MY-UAV-ACCOUNT ', currentPassword: 'secret', reason: '  Closing workspace  '},
            basePolicy,
        ),
        {confirmationPhrase: 'DELETE-MY-UAV-ACCOUNT', currentPassword: 'secret', reason: 'Closing workspace'},
    );
    assert.deepEqual(
        profileForm.toAccountDeletionPayload(
            {confirmationPhrase: 'CUSTOM-PHRASE', currentPassword: 'ignored', reason: ''},
            {...basePolicy, hasPassword: false, requireReason: false},
        ),
        {confirmationPhrase: 'CUSTOM-PHRASE'},
    );
});

test('AccountDeletionCard mounts on Profile and reads policy dynamically with trilingual parity', () => {
    const card = read('src/components/profile/AccountDeletionCard.tsx');
    assert.ok(card.split('\n').length <= 220, 'AccountDeletionCard.tsx must stay <= 220 lines');
    assert.match(card, /useAccountDeletionPolicy/);
    assert.match(card, /useDeleteOwnAccount/);
    assert.match(card, /policy\.confirmationPhrase/);
    assert.match(card, /policy\.noticeMessage/);
    assert.match(read('src/components/profile/Profile.tsx'), /<AccountDeletionCard\/>/);

    for (const locale of ['vi', 'en', 'ja']) {
        const rootMsg = JSON.parse(read(`src/messages/${locale}.json`));
        assert.equal(rootMsg.auth.google.short, 'Google', `${locale}: auth.google.short`);
        assert.equal(rootMsg.auth.apple.short, 'Apple', `${locale}: auth.apple.short`);
        assert.ok(rootMsg.auth.apple.signin_with, `${locale}: auth.apple.signin_with`);
        assert.ok(rootMsg.auth.apple.notConfigured, `${locale}: auth.apple.notConfigured`);

        const adminPlatform = JSON.parse(read(`src/messages/sections/adminPlatform/${locale}.json`));
        assert.ok(adminPlatform.adminPlatform.settings.groups.ACCOUNT, `${locale}: settings.groups.ACCOUNT`);
        for (const key of [
            'account_deletion_enabled',
            'account_deletion_allow_staff_roles',
            'account_deletion_block_active_missions',
            'account_deletion_block_unpaid_invoices',
            'account_deletion_require_password',
            'account_deletion_require_reason',
            'account_deletion_confirmation_phrase',
            'account_deletion_mode',
            'account_deletion_notice_message',
        ]) {
            assert.ok(adminPlatform.adminPlatform.settings.labels[key], `${locale}: ${key}`);
        }
    }

    if (fs.existsSync(path.join(repoRoot, 'admin/src/components/settings/AdminSettingsPanel.tsx'))) {
        const adminSettings = fs.readFileSync(path.join(repoRoot, 'admin/src/components/settings/AdminSettingsPanel.tsx'), 'utf8');
        assert.match(adminSettings, /adminPlatform\.settings\.groups\.ACCOUNT/);
        assert.match(adminSettings, /if \(c === 'ACCOUNT'\) return 'ACCOUNT'/);
    }
});
