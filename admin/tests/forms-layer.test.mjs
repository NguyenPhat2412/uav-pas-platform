import {existsSync} from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readdir, readFile} from 'node:fs/promises';
import ts from 'typescript';

const resolvePortalUrl = p => {
    for (const prefix of ['../', '../../customer/', '../../operations/']) {
        const u = new URL(`${prefix}${p}`, import.meta.url);
        if (existsSync(u)) return u;
    }
    return new URL(`../${p}`, import.meta.url);
};
const readSource = path => readFile(resolvePortalUrl(path), 'utf8');

const compileModule = source =>
    `data:text/javascript;base64,${Buffer.from(
        ts.transpileModule(source, {
            compilerOptions: {
                module: ts.ModuleKind.ESNext,
                target: ts.ScriptTarget.ES2022,
            },
        }).outputText,
    ).toString('base64')}`;

const formatUrl = compileModule(await readSource('src/lib/format.ts'));
const flightPlanTypesUrl = compileModule(await readSource('src/types/flight-plan.types.ts'));
const rewritePureImports = source =>
    source
        .replaceAll('@/lib/format', formatUrl)
        .replaceAll('@/types/flight-plan.types', flightPlanTypesUrl);

async function loadForm(relativePath) {
    const raw = await readSource(relativePath);
    const rewritten = rewritePureImports(raw);
    return import(compileModule(rewritten));
}

const hasSiblingPortals =
    existsSync(new URL('../../customer/package.json', import.meta.url)) &&
    existsSync(new URL('../../operations/package.json', import.meta.url));

async function walkFormDir(dirUrl) {
    if (!existsSync(dirUrl)) return [];
    if (!existsSync(dirUrl)) return [];
    const entries = await readdir(dirUrl, {withFileTypes: true});
    const out = [];
    for (const entry of entries) {
        const childUrl = new URL(`${entry.name}${entry.isDirectory() ? '/' : ''}`, dirUrl);
        if (entry.isDirectory()) {
            out.push(...(await walkFormDir(childUrl)));
        } else {
            out.push(childUrl);
        }
    }
    return out;
}
async function listFormFiles() {
    const seen = new Set();
    const out = [];
    for (const prefix of ['../src/forms/', '../../customer/src/forms/', '../../operations/src/forms/']) {
        const urls = await walkFormDir(new URL(prefix, import.meta.url));
        for (const u of urls) {
            const rel = u.pathname.split('/src/forms/')[1];
            if (!seen.has(rel)) {
                seen.add(rel);
                out.push(u);
            }
        }
    }
    return out;
}

test('every module in src/forms/** is pure TypeScript and compiles standalone for agents', async () => {
    const files = await listFormFiles();
    assert.equal(files.length >= (hasSiblingPortals ? 19 : 14), true, `Expected form modules, found ${files.length}`);

    for (const fileUrl of files) {
        assert.match(fileUrl.pathname, /\.ts$/, `Form module must be .ts (no JSX): ${fileUrl.pathname}`);
        const content = await readFile(fileUrl, 'utf8');
        assert.doesNotMatch(
            content,
            /from\s+['"](?:react|react-dom|next\/|@tanstack\/react-query|react-hook-form|@hookform\/|@\/api\/|@\/hooks\/|@\/components\/|@\/providers\/|@\/lib\/api)/,
            `Forbidden runtime import in ${fileUrl.pathname}`,
        );
        const mod = await import(compileModule(rewritePureImports(content)));
        assert.equal(Object.keys(mod).length > 0, true, `${fileUrl.pathname} must export runtime helpers`);
    }

    const pkg = JSON.parse(await readSource('package.json'));
    const allDeps = {...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {})};
    assert.equal('react-hook-form' in allDeps, false, 'react-hook-form must not remain in package.json');
    assert.equal('@hookform/resolvers' in allDeps, false, '@hookform/resolvers must not remain in package.json');
});

test('components delegate duplicate regex/range/URL validation to backend and wire src/forms/*', async () => {
    const adminSettings = await readSource('src/components/settings/AdminSettingsPanel.tsx');
    assert.doesNotMatch(adminSettings, /function\s+clientCheck\b/);
    assert.match(adminSettings, /@\/forms\/settings-form/);

    const trainingLessons = await readSource('src/components/training/editor/TrainingCourseLessonsPanel.tsx');
    assert.doesNotMatch(trainingLessons, /isSupportedVideoLink|isSupportedDocumentLink/);
    assert.match(trainingLessons, /@\/forms\/training-form/);

    const weatherSettings = await readSource('src/components/weather/WeatherProviderSettingsSection.tsx');
    assert.doesNotMatch(weatherSettings, />\s*120/);
    assert.match(weatherSettings, /@\/forms\/weather-provider-form/);

    for (const [componentPath, formImport] of [
        ['src/components/assistant/console/AssistantSettingsSection.tsx', '@/forms/assistant-settings-form'],
        ['src/components/auth/modal/AuthModalPopup.tsx', '@/forms/auth-form'],
        ['src/components/profile/PasswordChangeCard.tsx', '@/forms/profile-form'],
        ['src/components/user/Users.tsx', '@/forms/user-form'],
        ...(hasSiblingPortals ? [['src/components/mission/operations/OperationsMissionDetail.tsx', '@/forms/operations-mission-form']] : []),
        ['src/components/uav/UavPanel.tsx', '@/forms/uav-form'],
        ['src/components/station/StationPanel.tsx', '@/forms/station-form'],
        ['src/components/inventory/EquipmentPanel.tsx', '@/forms/equipment-form'],
        ['src/components/maintenance/OrderCreate.tsx', '@/forms/maintenance-form'],
        ['src/components/billing/plans/AdminPlansManager.tsx', '@/forms/billing-form'],
        ['src/components/billing/invoices/AdminInvoiceDialogs.tsx', '@/forms/billing-form'],
        ['src/components/billing/reconciliation/PaymentGatewaySettingsSection.tsx', '@/forms/payment-gateway-form'],
        ['src/components/billing/plans/AdminBillingPanel.tsx', '@/forms/billing-form'],
        ['src/components/catalog/AdminServicesPanel.tsx', '@/forms/service-offering-form'],
        ...(hasSiblingPortals ? [['src/components/marketing/ContactQuickForm.tsx', '@/forms/contact-form']] : []),
        ['src/components/webhook/WebhookSubscriptions.tsx', '@/forms/webhook-form'],
        ['src/components/devicekey/AdminDeviceKeysPanel.tsx', '@/forms/device-key-form'],
        ['src/components/notification/inbox/AdminNotificationsPanel.tsx', '@/forms/notification-form'],
        ['src/components/storage/pool/GoogleDriveNodeModal.tsx', '@/forms/storage-pool-form'],
        ['src/components/storage/pool/StoragePolicyFormSection.tsx', '@/forms/storage-pool-form'],
        ['src/components/storage/pool/StorageR2MigrationCard.tsx', '@/forms/storage-pool-form'],
        ['src/components/marketplace/AdminMarketplaceProviders.tsx', '@/forms/admin-marketplace-form'],
        ['src/components/marketplace/AdminMarketplaceListings.tsx', '@/forms/admin-marketplace-form'],
        ['src/components/marketplace/AdminMarketplacePayouts.tsx', '@/forms/admin-marketplace-form'],
    ]) {
        const componentSource = await readSource(componentPath);
        assert.match(componentSource, new RegExp(formImport.replaceAll('/', '\\/')), componentPath);
    }
});

test('settings, weather, assistant and training forms forward out-of-range/URL inputs and surface backend field errors', async () => {
    const settingsForm = await loadForm('src/forms/settings-form.ts');
    assert.equal(settingsForm.settingEmptyProblem({emptyAllowed: false}, '   '), 'required');
    assert.equal(settingsForm.settingEmptyProblem({emptyAllowed: false}, '999999'), null);
    assert.equal(
        settingsForm.settingServerError({fields: {configValue: 'Giá trị phải nằm trong khoảng từ 10 đến 90.'}}),
        'Giá trị phải nằm trong khoảng từ 10 đến 90.',
    );

    const ordered = settingsForm.sortedSettingsToSave(
        [
            {configKey: 'billing.auto_generate_invoice', configValue: 'false'},
            {configKey: 'uav.safety.min_battery_threshold', configValue: '20'},
            {configKey: 'billing.hourly_rate_vnd', configValue: '500000'},
        ],
        item => (item.configKey === 'billing.auto_generate_invoice' ? 'true' : item.configValue),
    );
    assert.deepEqual(
        ordered.map(s => s.configKey),
        ['billing.hourly_rate_vnd', 'uav.safety.min_battery_threshold', 'billing.auto_generate_invoice'],
    );

    const weatherForm = await loadForm('src/forms/weather-provider-form.ts');
    const weatherDraft = {
        provider: 'OPEN_METEO',
        apiKey: '  secret-key  ',
        cacheTtlMinutes: '500',
        enforcePreflightBlock: true,
    };
    assert.equal(weatherForm.canSubmitWeatherProvider(weatherDraft), true);
    assert.equal(weatherForm.toWeatherProviderPayload(weatherDraft).cacheTtlMinutes, 500);
    assert.deepEqual(weatherForm.weatherProviderFieldErrors({fields: {cacheTtlMinutes: 'TTL không hợp lệ'}}), {
        cacheTtlMinutes: 'TTL không hợp lệ',
    });

    const assistantForm = await loadForm('src/forms/assistant-settings-form.ts');
    const aiPayload = assistantForm.toAiRouterSettingsPayload(
        {
            baseUrl: ' https://api.openai.com/v1 ',
            apiKey: ' sk-test ',
            mode1Label: ' Nhanh ',
            mode1Model: ' gpt-4o-mini ',
            mode2Label: ' Sâu ',
            mode2Model: '',
            systemPrompt: '  ',
            enabled: true,
        },
        3,
        true,
    );
    assert.equal(aiPayload.apiKey, '');
    assert.equal(aiPayload.enabled, false);
    assert.equal(aiPayload.expectedVersion, 3);
    assert.equal(
        assistantForm.resolveAiRouterErrorCode({code: 'VALIDATION_ERROR', fields: {baseUrl: 'AI_ROUTER_URL_HTTPS_REQUIRED'}}),
        'AI_ROUTER_URL_HTTPS_REQUIRED',
    );

    const trainingForm = await loadForm('src/forms/training-form.ts');
    const videoDraft = {
        ...trainingForm.lessonDraftFromDetail(null, 10, 'Chương 1'),
        title: 'Bài 1',
        type: 'VIDEO',
        videoSource: 'LINK',
        videoUrl: 'https://untrusted.example.com/video.mp4',
    };
    // Untrusted URLs are not blocked in the browser; backend validates host/path rules.
    assert.equal(trainingForm.lessonDraftProblem(videoDraft), null);
    assert.equal(
        trainingForm.toUpsertTrainingLessonPayload(videoDraft, 7).videoUrl,
        'https://untrusted.example.com/video.mp4',
    );
});

test('auth, profile, user and operations-mission forms normalize payloads and map structured errors', async () => {
    const authForm = await loadForm('src/forms/auth-form.ts');
    assert.deepEqual(authForm.toLoginPayload('  pilot@uav.vn ', 'Secret#123'), {
        usernameOrEmail: 'pilot@uav.vn',
        password: 'Secret#123',
    });
    const orderedAuthErrors = authForm.authFieldErrors(
        {fields: {confirmPassword: 'Không khớp', username: 'Quá ngắn'}},
        ['username', 'email', 'confirmPassword'],
    );
    assert.deepEqual(orderedAuthErrors?.orderedNames, ['username', 'confirmPassword']);

    const profileForm = await loadForm('src/forms/profile-form.ts');
    assert.deepEqual(
        profileForm.toPasswordChangePayload({
            currentPassword: 'old',
            newPassword: 'new',
            confirmPassword: 'new',
        }),
        {current: 'old', next: 'new', confirm: 'new'},
    );

    const userForm = await loadForm('src/forms/user-form.ts');
    const userDraft = {
        ...userForm.emptyAdminCreateUserDraft(),
        username: ' operator_01 ',
        email: ' op@uav.vn ',
        phoneNumber: ' 0901234567 ',
        password: 'Password#1',
        confirmPassword: 'Password#1',
    };
    assert.equal(userForm.canSubmitAdminCreateUser(userDraft), true);
    assert.equal(userForm.toAdminCreateUserPayload(userDraft).fullName, undefined);

    const opsMissionForm = await loadForm('src/forms/operations-mission-form.ts');
    assert.deepEqual(opsMissionForm.operationsMissionNotice({status: 403}, 'fallback'), {
        key: 'opsMissions.detail.errors.forbidden',
    });
    assert.deepEqual(
        opsMissionForm.operationsMissionNotice({status: 400, fields: {reason: 'Lý do quá dài.'}}, 'fallback'),
        {text: 'Lý do quá dài.'},
    );
});

test('asset, maintenance, billing, catalog, webhook, device-key, notification and contact forms preserve backend contract', async () => {
    const uavForm = await loadForm('src/forms/uav-form.ts');
    assert.deepEqual(
        uavForm.toUavCreatePayload({model: ' DJI M30T ', serialNumber: ' SN-01 ', manufacturer: ' DJI '}),
        {model: 'DJI M30T', serialNumber: 'SN-01', manufacturer: 'DJI'},
    );
    assert.equal(uavForm.canAssignUavToStation('2', 1, [{id: 2, status: 'ACTIVE'}]), true);
    assert.equal(uavForm.canAssignUavToStation('1', 1, [{id: 1, status: 'ACTIVE'}]), false);

    const stationForm = await loadForm('src/forms/station-form.ts');
    // Out-of-range latitude reaches backend so @DecimalMin/@DecimalMax returns fields.latitude.
    const stationPayload = stationForm.toStationPayload({
        code: ' HN-01 ',
        name: ' Trạm Hòa Lạc ',
        address: '  ',
        latitude: '95.5',
        longitude: '105.5',
    });
    assert.deepEqual(stationPayload, {
        code: 'HN-01',
        name: 'Trạm Hòa Lạc',
        address: undefined,
        latitude: 95.5,
        longitude: 105.5,
        description: undefined,
    });

    const equipmentForm = await loadForm('src/forms/equipment-form.ts');
    assert.deepEqual(
        equipmentForm.toInventoryMovementPayload(
            {id: '5', action: 'stock-in', quantity: '3', note: ' Nhập kho ', stationId: ''},
            'req-1',
        ),
        {id: 5, action: 'stock-in', quantity: 3, note: 'Nhập kho', stationId: undefined, requestId: 'req-1'},
    );

    const maintenanceForm = await loadForm('src/forms/maintenance-form.ts');
    assert.equal(maintenanceForm.maintenanceBusinessToday(new Date('2026-10-15T17:30:00Z')), '2026-10-16');
    assert.deepEqual(
        maintenanceForm.toMaterialRowsPayload([{name: ' Pin ', unit: ' Viên ', quantity: ' 2 ', unitPrice: ' 500000 '}]),
        [{name: 'Pin', unit: 'Viên', quantity: '2', unitPrice: '500000'}],
    );

    const billingForm = await loadForm('src/forms/billing-form.ts');
    assert.equal(
        billingForm.toServicePlanPayload({
            code: ' enterprise_plus ',
            name: ' Gói Doanh nghiệp ',
            price: '5000000',
            billingCycle: 'MONTHLY',
            maxMonthlyFlightHours: '100',
            maxConcurrentUavs: '5',
            allowSarAi: true,
            description: ' ',
        }).code,
        'ENTERPRISE_PLUS',
    );
    // Out-of-range quota hours (e.g. 2 < 5.0) pass through to backend @DecimalMin("5.0").
    assert.deepEqual(billingForm.toUserQuotaPayload(12, {planCode: 'PRO', flightHoursLimit: '2'}), {
        userId: 12,
        planCode: 'PRO',
        flightHoursLimit: 2,
    });

    const catalogForm = await loadForm('src/forms/service-offering-form.ts');
    const offeringDraft = catalogForm.createServiceOfferingDraft(null);
    offeringDraft.code = ' thermal_scan ';
    offeringDraft.name = ' Quét nhiệt ';
    offeringDraft.spec.maxWindMs = '55';
    const offeringPayload = catalogForm.toServiceOfferingPayload(offeringDraft);
    assert.equal(offeringPayload.code, 'THERMAL_SCAN');
    assert.equal(offeringPayload.details.maxWindMs, 55);
    assert.equal(offeringPayload.details.bestGsdCm, null);

    const webhookForm = await loadForm('src/forms/webhook-form.ts');
    const shortSecretDraft = {
        name: ' Cảnh báo SAR ',
        targetUrl: ' http://127.0.0.1/hook ',
        secretKey: 'short',
        events: ['SAR_EMERGENCY_TRIGGERED'],
    };
    assert.equal(webhookForm.canSubmitWebhookSubscription(shortSecretDraft), true);
    assert.deepEqual(webhookForm.toWebhookSubscriptionPayload(shortSecretDraft), {
        name: 'Cảnh báo SAR',
        targetUrl: 'http://127.0.0.1/hook',
        secretKey: 'short',
        eventsSubscribed: 'SAR_EMERGENCY_TRIGGERED',
    });

    const deviceKeyForm = await loadForm('src/forms/device-key-form.ts');
    assert.deepEqual(
        deviceKeyForm.toDeviceKeyCreatePayload({name: ' Edge Key ', uavId: '9', expiresAt: '2027-01-01T12:30'}),
        {name: 'Edge Key', uavId: 9, expiresAt: '2027-01-01T12:30:00'},
    );

    const notificationForm = await loadForm('src/forms/notification-form.ts');
    assert.deepEqual(
        notificationForm.toSendNotificationPayload({
            recipient: {id: 42, name: 'Pilot'},
            title: ' Thông báo hệ thống ',
            content: ' Bảo trì định kỳ ',
            type: 'SYSTEM',
        }),
        {userId: 42, title: 'Thông báo hệ thống', content: 'Bảo trì định kỳ', type: 'SYSTEM'},
    );

    const contactForm = await loadForm('src/forms/contact-form.ts');
    assert.deepEqual(
        contactForm.toContactInquiryPayload({
            fullName: ' Nguyễn Văn A ',
            organization: ' ',
            contactInfo: ' 0909000111 ',
            topic: 'SURVEY_SERVICE',
            message: ' Khảo sát 50ha ',
        }),
        {
            fullName: 'Nguyễn Văn A',
            organization: undefined,
            contactInfo: '0909000111',
            topic: 'SURVEY_SERVICE',
            message: 'Khảo sát 50ha',
        },
    );

    const storagePoolForm = await loadForm('src/forms/storage-pool-form.ts');
    assert.deepEqual(
        storagePoolForm.buildStoragePolicyInput({
            primaryBackend: 'HYBRID_TIERED',
            allocationStrategy: 'MOST_FREE_SPACE',
            fallbackToR2: true,
            tieredMb: '10',
        }),
        {
            primaryBackend: 'HYBRID_TIERED',
            allocationStrategy: 'MOST_FREE_SPACE',
            fallbackToR2: true,
            tieredSmallFileMaxBytes: 10 * 1024 * 1024,
        },
    );
    assert.deepEqual(storagePoolForm.toggleStorageRouteTag(['ALL'], 'VIDEO'), ['VIDEO']);
    assert.deepEqual(storagePoolForm.toggleStorageRouteTag(['VIDEO'], 'VIDEO'), ['ALL']);
    assert.deepEqual(
        storagePoolForm.validateAndBuildDriveNodeCreateInput({
            tab: 'oauth_manual',
            displayName: ' Drive Pool #1 ',
            rootFolderId: ' folder_abc ',
            priorityWeight: '250',
            maxUsagePercent: '95',
            selectedModules: ['MISSION_MEDIA', 'VIDEO'],
            manualClientId: ' ',
            manualClientSecret: '',
            refreshToken: ' 1//0gtoken ',
            serviceAccountJson: '',
        }),
        {
            ok: true,
            data: {
                displayName: 'Drive Pool #1',
                authType: 'OAUTH2',
                clientId: undefined,
                clientSecret: undefined,
                refreshToken: '1//0gtoken',
                rootFolderId: 'folder_abc',
                priorityWeight: 250,
                maxUsagePercent: 95,
                routedModules: 'MISSION_MEDIA,VIDEO',
            },
        },
    );

    const marketplaceForm = await loadForm('src/forms/admin-marketplace-form.ts');
    assert.deepEqual(
        marketplaceForm.validateProviderModerationInput({
            status: 'VERIFIED',
            rawFeePct: '12',
            rawNote: ' Đạt chuẩn hồ sơ ',
        }),
        {
            ok: true,
            payload: {status: 'VERIFIED', reviewNote: 'Đạt chuẩn hồ sơ', commissionRateOverride: 0.12},
        },
    );
    assert.equal(marketplaceForm.validateProviderModerationInput({status: 'REJECTED', rawNote: '  '}).ok, false);
    assert.equal(marketplaceForm.validatePayoutProcessInput({approve: true, rawBankTransferRef: ''}).ok, false);
});

