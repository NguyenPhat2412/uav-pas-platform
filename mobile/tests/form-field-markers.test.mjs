import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readSrc = relPath => readFileSync(path.join(ROOT, relPath), 'utf8');

test('FieldLabel and UI primitives render red * for required, localized (Tuỳ chọn) for optional, and strip duplicate suffixes', () => {
    const fieldLabel = readSrc('src/components/ui/FieldLabel.tsx');
    const uiIndex = readSrc('src/components/ui/index.tsx');
    const glassSelect = readSrc('src/components/ui/GlassSelect.tsx');

    assert.match(fieldLabel, /vi:\s*'Tuỳ chọn'/);
    assert.match(fieldLabel, /en:\s*'Optional'/);
    assert.match(fieldLabel, /ja:\s*'任意'/);
    assert.match(fieldLabel, /required:\s*\{color:\s*colors\.danger/);
    assert.match(fieldLabel, /optional:\s*\{color:\s*colors\.muted/);
    assert.match(fieldLabel, /export function cleanFieldLabel/);
    assert.match(fieldLabel, />\s*\*</);

    assert.match(uiIndex, /<FieldLabel label=\{label\} required=\{required\} optional=\{optional\}\/>/);
    assert.match(glassSelect, /<FieldLabel label=\{label\} required=\{required\} optional=\{optional\}\/>/);
});

test('mobile data-entry screens mark required and optional fields while pure search/filter screens stay unmarked', () => {
    const requiredScreens = [
        'src/components/auth/LoginScreen.tsx',
        'src/components/auth/RegisterScreen.tsx',
        'src/components/auth/ForgotPasswordScreen.tsx',
        'src/components/auth/VerifyCodeScreen.tsx',
        'src/components/profile/SecurityScreen.tsx',
        'src/components/support/AdminQuickRepliesCard.tsx',
        'src/components/support/AdminSupportThreadCard.tsx',
        'src/components/marketplace/catalog/MarketplaceListingDetailScreen.tsx',
        'src/components/uav/FleetAssetCards.tsx',
    ];
    for (const rel of requiredScreens) {
        assert.match(readSrc(rel), /\brequired\b/, `${rel} must mark required fields`);
    }

    const mixedForms = [
        'src/components/profile/ProfileScreen.tsx',
        'src/components/profile/AccountDeletionModal.tsx',
        'src/components/support/PublicSupportSheetScreen.tsx',
        'src/components/marketplace/provider/ProviderOnboardingScreen.tsx',
        'src/components/marketplace/provider/ProviderListingsScreen.tsx',
        'src/components/marketplace/provider/ProviderFleetScreen.tsx',
        'src/components/marketplace/provider/ProviderWalletScreen.tsx',
        'src/components/marketplace/provider/ProviderOrdersScreen.tsx',
        'src/components/marketplace/provider/ProviderRfqBiddingList.tsx',
        'src/components/mission/MissionFormScreen.tsx',
        'src/components/mission/MissionBookingOptionsCard.tsx',
        'src/components/mission/MissionPermitCard.tsx',
        'src/components/mission/CustomerHandoverReviewCard.tsx',
        'src/components/operations/OperationsMissionExecutionCard.tsx',
        'src/components/admin/AdminQuickMarketplaceCards.tsx',
    ];
    for (const rel of mixedForms) {
        const src = readSrc(rel);
        assert.match(src, /\brequired\b/, `${rel} must mark required inputs`);
        assert.match(src, /\boptional\b/, `${rel} must mark optional inputs`);
    }

    const searchFilterScreens = [
        'src/components/training/TrainingCatalogScreen.tsx',
        'src/components/catalog/ServicesScreen.tsx',
        'src/components/support/AdminSupportInboxScreen.tsx',
        'src/components/operations/OperationsMissionsScreen.tsx',
    ];
    for (const rel of searchFilterScreens) {
        const src = readSrc(rel);
        assert.doesNotMatch(src, /<TextField[^>]*\b(?:required|optional)\b/, `${rel} search inputs must not carry required/optional marks`);
    }
});
