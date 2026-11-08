import {existsSync} from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
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

async function loadTsModule(relativePath) {
    const raw = await readSource(relativePath);
    const rewritten = raw.replaceAll('@/lib/format', formatUrl);
    return import(compileModule(rewritten));
}

function collectLeafKeys(obj, prefix = '') {
    const keys = [];
    for (const [k, v] of Object.entries(obj)) {
        const next = prefix ? `${prefix}.${k}` : k;
        if (v && typeof v === 'object' && !Array.isArray(v)) {
            keys.push(...collectLeafKeys(v, next));
        } else {
            keys.push(next);
        }
    }
    return keys.sort();
}

test('API_ROUTES wires airspace, mission permits, and notification push-tokens contracts', async () => {
    const {API_ROUTES} = await loadTsModule('src/lib/api/routes.ts');

    assert.equal(API_ROUTES.airspace.zones, '/api/v1/airspace/zones');
    assert.equal(API_ROUTES.airspace.check, '/api/v1/airspace/check');
    assert.equal(API_ROUTES.airspace.zoneById(42), '/api/v1/airspace/zones/42');

    assert.equal(API_ROUTES.missions.permit(19), '/api/v1/missions/19/permit');
    assert.equal(API_ROUTES.missions.permitVerify(19), '/api/v1/missions/19/permit/verify');
    assert.equal(API_ROUTES.notifications.pushTokens, '/api/v1/notifications/push-tokens');
});

test('permit-form normalizes Spring LocalDateTime strings, validates drafts, and checks permissions', async () => {
    const permitForm = await loadTsModule('src/forms/mission/permit-form.ts');

    assert.equal(permitForm.normalizePermitDateTime('2026-11-10T08:30'), '2026-11-10T08:30:00');
    assert.equal(permitForm.normalizePermitDateTime('2026-11-10T08:30:45'), '2026-11-10T08:30:45');
    assert.equal(permitForm.normalizePermitDateTime('2026-11-10T08:30:00.000Z'), '2026-11-10T08:30:00');
    assert.equal(permitForm.toDateTimeLocalValue('2026-11-10T08:30:00'), '2026-11-10T08:30');

    const draft = permitForm.permitDraftFromMission(null, {
        startTime: '2026-11-10T08:00:00',
        expectedEndTime: '2026-11-10T10:30:00',
        altitudeAglMeters: 110,
    });
    assert.equal(permitForm.canSubmitPermitDraft(draft), false);

    draft.permitNumber = '  GPB-2026-901  ';
    draft.permitAuthority = '  Cục Hàng không dân dụng  ';
    draft.permitMediaId = '77';
    draft.note = '  Áp dụng ban ngày  ';
    assert.equal(permitForm.canSubmitPermitDraft(draft), true);

    const payload = permitForm.toPermitUpsertPayload(draft);
    assert.deepEqual(payload, {
        permitNumber: 'GPB-2026-901',
        permitAuthority: 'Cục Hàng không dân dụng',
        validFrom: '2026-11-10T08:00:00',
        validUntil: '2026-11-10T10:30:00',
        maxAltitudeMeters: 110,
        permitMediaId: 77,
        note: 'Áp dụng ban ngày',
    });

    assert.equal(
        permitForm.canSubmitPermitDraft({
            ...draft,
            validFrom: '2026-11-10T11:00',
            validUntil: '2026-11-10T10:30',
        }),
        false,
    );

    assert.deepEqual(permitForm.toPermitVerifyPayload(true, '  Hợp lệ  '), {
        approved: true,
        note: 'Hợp lệ',
    });
    assert.deepEqual(permitForm.toPermitVerifyPayload(false, '   '), {
        approved: false,
        note: null,
    });

    assert.equal(
        permitForm.canEditMissionPermit({status: 'CONFIRMED', customerId: 5, operatorId: 9}, 5, false, false),
        true,
    );
    assert.equal(
        permitForm.canEditMissionPermit({status: 'IN_PROGRESS', customerId: 5, operatorId: 9}, 5, true, true),
        false,
    );
    assert.equal(
        permitForm.canEditMissionPermit({status: 'COMPLETED', customerId: 5, operatorId: 9}, 5, true, true),
        false,
    );
    assert.equal(
        permitForm.canVerifyMissionPermit(
            {status: 'CONFIRMED', permit: {status: 'SUBMITTED', permitNumber: 'GPB-01'}},
            true,
        ),
        true,
    );
    assert.equal(
        permitForm.canVerifyMissionPermit(
            {status: 'IN_PROGRESS', permit: {status: 'SUBMITTED', permitNumber: 'GPB-01'}},
            true,
        ),
        false,
    );
    assert.equal(
        permitForm.canVerifyMissionPermit(
            {status: 'CONFIRMED', permit: {status: 'VERIFIED', permitNumber: 'GPB-01'}},
            true,
        ),
        false,
    );
});

test('airspace-zone-form builds circle/polygon payloads and live check inputs safely', async () => {
    const zoneForm = await loadTsModule('src/forms/airspace/airspace-zone-form.ts');

    const circleDraft = {
        ...zoneForm.emptyAirspaceZoneDraft(),
        code: ' vn-hn-nfz-02 ',
        name: ' Khu vực cấm bay trung tâm ',
        zoneType: 'PROHIBITED',
        geometryType: 'CIRCLE',
        centerLat: '21.0285',
        centerLng: '105.8542',
        radiusMeters: '1500',
        maxAltitudeAglM: '',
        authority: ' Cơ quan quản lý không phận ',
        description: '  ',
    };
    assert.equal(zoneForm.canSubmitAirspaceZoneDraft(circleDraft), true);
    assert.deepEqual(zoneForm.toAirspaceZoneUpsertPayload(circleDraft), {
        code: 'VN-HN-NFZ-02',
        name: 'Khu vực cấm bay trung tâm',
        zoneType: 'PROHIBITED',
        geometryType: 'CIRCLE',
        centerLat: 21.0285,
        centerLng: 105.8542,
        radiusMeters: 1500,
        vertices: null,
        maxAltitudeAglM: null,
        authority: 'Cơ quan quản lý không phận',
        active: true,
        description: null,
        effectiveFrom: null,
        effectiveUntil: null,
    });

    const polygonDraft = {
        ...circleDraft,
        code: 'vn-hn-rst-05',
        zoneType: 'RESTRICTED',
        geometryType: 'POLYGON',
        maxAltitudeAglM: '120',
        verticesText: '21.0100, 105.8100\n21.0200, 105.8200\n21.0100, 105.8300',
    };
    assert.equal(zoneForm.canSubmitAirspaceZoneDraft(polygonDraft), true);
    const polyPayload = zoneForm.toAirspaceZoneUpsertPayload(polygonDraft);
    assert.equal(polyPayload.geometryType, 'POLYGON');
    assert.equal(polyPayload.radiusMeters, null);
    assert.equal(polyPayload.maxAltitudeAglM, 120);
    assert.equal(polyPayload.vertices.length, 3);

    // Partial polygon (< 3 vertices) falls back to POINT check on takeoff coordinate rather than sending invalid polygon
    assert.equal(zoneForm.toAirspaceCheckInput(null, undefined, undefined), null);
    assert.deepEqual(
        zoneForm.toAirspaceCheckInput(
            {
                areaType: 'POLYGON',
                vertices: [[21.02, 105.82]],
                takeoffLatitude: 21.015,
                takeoffLongitude: 105.815,
                altitudeAglMeters: 90,
            },
            undefined,
            undefined,
        ),
        {
            areaType: 'POINT',
            takeoffLatitude: 21.015,
            takeoffLongitude: 105.815,
            altitudeAglMeters: 90,
        },
    );
    assert.equal(
        zoneForm.toAirspaceCheckInput(
            {
                areaType: 'POLYGON',
                vertices: [
                    [21.01, 105.81],
                    [21.02, 105.82],
                    [21.01, 105.83],
                ],
                altitudeAglMeters: 85,
            },
            undefined,
            undefined,
        )?.areaType,
        'POLYGON',
    );
});

test('airspace and permit error codes map across operations-mission-form, mission-form, and apiMessages', async () => {
    const opsForm = await loadTsModule('src/forms/mission/operations-mission-form.ts');
    const missionForm = await loadTsModule('src/forms/mission/mission-form.ts');
    const apiMsgMod = await loadTsModule('src/lib/api/messages.ts');

    for (const code of [
        'AIRSPACE_PROHIBITED_ZONE',
        'MISSION_PERMIT_REQUIRED',
        'MISSION_PERMIT_EXPIRED',
        'MISSION_PERMIT_ALTITUDE_EXCEEDED',
    ]) {
        assert.equal(opsForm.OPERATIONS_MISSION_ERROR_CODES.has(code), true, `${code} in operations form`);
        assert.deepEqual(opsForm.operationsMissionNotice({status: 400, code}, 'fallback'), {
            key: `opsMissions.apiErrors.${code}`,
        });
        const customerText = missionForm.missionFormError({status: 400, code});
        assert.equal(customerText.length > 10, true, `${code} customer message`);
        for (const locale of ['vi', 'en', 'ja']) {
            assert.ok(apiMsgMod.apiMessages[locale][code], `${code} in apiMessages.${locale}`);
        }
        assert.equal(apiMsgMod.apiMessageCodes[code], code);
    }
});

test('UI components, map overlays, admin route, trilingual catalogs, and palette guardrails are wired', async () => {
    const [
        vi,
        en,
        ja,
        opsVi,
        opsEn,
        opsJa,
        adminVi,
        adminEn,
        adminJa,
        createPage,
        editPage,
        customerDetail,
        opsDetail,
        locationPicker,
        mapOverlays,
        adminRoutePage,
        sidebarRoutes,
    ] = await Promise.all([
        readSource('src/messages/vi.json').then(JSON.parse),
        readSource('src/messages/en.json').then(JSON.parse),
        readSource('src/messages/ja.json').then(JSON.parse),
        readSource('src/messages/sections/opsMissions/vi.json').then(JSON.parse),
        readSource('src/messages/sections/opsMissions/en.json').then(JSON.parse),
        readSource('src/messages/sections/opsMissions/ja.json').then(JSON.parse),
        readSource('src/messages/sections/admin/vi.json').then(JSON.parse),
        readSource('src/messages/sections/admin/en.json').then(JSON.parse),
        readSource('src/messages/sections/admin/ja.json').then(JSON.parse),
        readSource('src/components/mission/customer/CustomerMissionCreate.tsx'),
        readSource('src/components/mission/customer/CustomerMissionEdit.tsx'),
        readSource('src/components/mission/customer/CustomerMissionDetail.tsx'),
        readSource('src/components/mission/operations/OperationsMissionDetail.tsx'),
        readSource('src/components/mission/customer/LocationPicker.tsx'),
        readSource('src/utils/airspace/map-overlays.ts'),
        readSource('src/app/(admin)/admin/(portal)/airspace/page.tsx'),
        readSource('src/config/sidebar-routes.ts'),
    ]);

    assert.deepEqual(collectLeafKeys(vi.airspace), collectLeafKeys(en.airspace));
    assert.deepEqual(collectLeafKeys(vi.airspace), collectLeafKeys(ja.airspace));
    assert.deepEqual(collectLeafKeys(vi.permit), collectLeafKeys(en.permit));
    assert.deepEqual(collectLeafKeys(vi.permit), collectLeafKeys(ja.permit));

    assert.ok(vi.adminNav.airspace && en.adminNav.airspace && ja.adminNav.airspace);
    assert.ok(adminVi.admin.pages.airspace.title && adminEn.admin.pages.airspace.title && adminJa.admin.pages.airspace.title);
    assert.ok(opsVi.opsMissions.apiErrors.MISSION_PERMIT_REQUIRED);
    assert.ok(opsEn.opsMissions.apiErrors.MISSION_PERMIT_REQUIRED);
    assert.ok(opsJa.opsMissions.apiErrors.MISSION_PERMIT_REQUIRED);

    assert.match(createPage, /MissionAirspaceAdvisor/);
    assert.match(editPage, /MissionAirspaceAdvisor/);
    assert.match(customerDetail, /MissionPermitCard/);
    assert.doesNotMatch(customerDetail, /onVerifyPermit/);
    assert.match(opsDetail, /MissionPermitCard/);
    assert.match(opsDetail, /onVerifyPermit/);
    assert.match(opsDetail, /await load\(\)\.catch\(\(\) => setStale\(true\)\)/);
    assert.match(locationPicker, /useAirspaceZones/);
    assert.match(mapOverlays, /#ab2523/);
    assert.match(mapOverlays, /#d97706/);
    assert.match(mapOverlays, /#2563eb/);
    assert.match(adminRoutePage, /AdminAirspacePanel/);
    assert.match(sidebarRoutes, /\/admin\/airspace/);

    const checkedFiles = [
        'src/components/airspace/MissionAirspaceAdvisor.tsx',
        'src/components/airspace/AdminAirspacePanel.tsx',
        'src/components/mission/MissionPermitCard.tsx',
        'src/utils/airspace/map-overlays.ts',
    ];
    for (const file of checkedFiles) {
        const content = await readSource(file);
        assert.doesNotMatch(
            content,
            /\b(?:green|emerald|teal|indigo|purple|violet)-\d+\b/,
            `Forbidden palette class in ${file}`,
        );
    }

    const sharedTsFiles = [
        'src/lib/api/messages.ts',
        'src/lib/api/routes.ts',
        'src/lib/presentation.ts',
        'src/forms/mission/permit-form.ts',
        'src/forms/airspace/airspace-zone-form.ts',
        'src/hooks/airspace/query-keys.ts',
        'src/types/airspace/airspace.types.ts',
        'src/types/mission/mission.types.ts',
    ];
    for (const file of sharedTsFiles) {
        const content = await readSource(file);
        assert.doesNotMatch(
            content,
            /\b(?:window|document|localStorage|sessionStorage|navigator)\s*\./,
            `Browser global dot-match in shared module ${file}`,
        );
    }
});

test('map-overlays skips non-finite coordinates and presentation renders permit timeline events across locales', async () => {
    const overlays = await loadTsModule('src/utils/airspace/map-overlays.ts');
    const presentation = await loadTsModule('src/lib/presentation.ts');

    const circles = [];
    const polygons = [];
    const mockLayer = list => ({
        bindTooltip() {
            return this;
        },
        addTo() {
            list.push(true);
            return this;
        },
    });
    const mockL = {
        circle: (center, opts) => {
            circles.push({center, opts});
            return mockLayer([]);
        },
        polygon: (pts, opts) => {
            polygons.push({pts, opts});
            return mockLayer([]);
        },
    };
    const mockGroup = {clearLayers() {}};

    overlays.renderAirspaceZonesLayer(
        mockL,
        mockGroup,
        [
            {
                id: 1,
                code: 'BAD-C',
                name: 'Bad circle',
                zoneType: 'PROHIBITED',
                geometryType: 'CIRCLE',
                centerLat: Number.NaN,
                centerLng: 105.8,
                radiusMeters: 500,
                authority: 'CAAV',
                active: true,
            },
            {
                id: 2,
                code: 'ZERO-R',
                name: 'Zero radius',
                zoneType: 'RESTRICTED',
                geometryType: 'CIRCLE',
                centerLat: 21.02,
                centerLng: 105.8,
                radiusMeters: 0,
                authority: 'CAAV',
                active: true,
            },
            {
                id: 3,
                code: 'GOOD-C',
                name: 'Valid circle',
                zoneType: 'RESTRICTED',
                geometryType: 'CIRCLE',
                centerLat: 21.02,
                centerLng: 105.8,
                radiusMeters: 450,
                authority: 'CAAV',
                active: true,
            },
            {
                id: 4,
                code: 'BAD-P',
                name: 'Malformed polygon',
                zoneType: 'WARNING',
                geometryType: 'POLYGON',
                centerLat: 21.02,
                centerLng: 105.8,
                vertices: [
                    [21.01, 105.81],
                    [Number.NaN, 105.82],
                    [21.03, 105.83],
                ],
                authority: 'CAAV',
                active: true,
            },
            {
                id: 5,
                code: 'GOOD-P',
                name: 'Valid polygon',
                zoneType: 'WARNING',
                geometryType: 'POLYGON',
                centerLat: 21.02,
                centerLng: 105.8,
                vertices: [
                    [21.01, 105.81],
                    [21.02, 105.82],
                    [21.01, 105.83],
                ],
                authority: 'CAAV',
                active: true,
            },
        ],
        key => key,
        v => String(v),
    );

    assert.equal(circles.length, 1);
    assert.deepEqual(circles[0].center, [21.02, 105.8]);
    assert.equal(polygons.length, 1);
    assert.equal(polygons[0].pts.length, 3);

    for (const locale of ['vi', 'en', 'ja']) {
        presentation.setPresentationLocale(locale);
        for (const eventType of ['PERMIT_SUBMITTED', 'PERMIT_VERIFIED', 'PERMIT_REJECTED']) {
            const title = presentation.eventTitle({id: 1, eventType, createdAt: '2026-11-05T10:00:00Z'});
            assert.notEqual(title, 'Mission update');
            assert.notEqual(title, 'Cập nhật nhiệm vụ');
            assert.notEqual(title, 'ミッション更新');
        }
    }
    assert.equal(
        presentation.eventNote({
            id: 2,
            eventType: 'PERMIT_REJECTED',
            description: 'Thiếu chữ ký cơ quan cấp phép',
            createdAt: '2026-11-05T10:00:00Z',
        }),
        'Thiếu chữ ký cơ quan cấp phép',
    );
});
