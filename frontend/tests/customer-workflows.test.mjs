import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import {readFile} from 'node:fs/promises';

const formatCompiled = ts.transpileModule(await readFile(new URL('../src/lib/format.ts', import.meta.url), 'utf8'), {
    compilerOptions: {module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022}
}).outputText;
const formatUrl = `data:text/javascript;base64,${Buffer.from(formatCompiled).toString('base64')}`;
const source = (await readFile(new URL('../src/features/missions/forms/mission-form.ts', import.meta.url), 'utf8')).replace('@/lib/format', formatUrl);
const compiled = ts.transpileModule(source, {
    compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022
    }
}).outputText;
const {
    missionFieldErrors,
    missionDraftUpdatePayload,
    missionUpdatePayload,
    missionFormFromDetail,
    missionTypeForService,
    canEditMission,
    missionPageRange,
    missionListFilters,
    missionFormError
} = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const form = {
    missionType: 'AREA_INSPECTION',
    title: 'Khảo sát ruộng lúa',
    requestedDate: '2030-05-01',
    startTime: '2030-05-01T10:00',
    expectedEndTime: '2030-05-01T11:00',
    locationName: 'Hà Nội',
    serviceId: 8,
    priority: 'HIGH',
    latitude: 0,
    longitude: 105.1234567,
    notes: 'Giữ nguyên ghi chú',
    description: 'Mô tả yêu cầu'
};

test('draft update sends every editable field and never changes service, type or ownership', () => {
    const detail = {
        ...form,
        id: 4,
        code: 'M004',
        customerId: 9,
        status: 'DRAFT',
        title: '  Khảo sát ruộng lúa  ',
        locationName: ' Hà Nội ',
        updatedAt: '2030-01-01'
    };
    const loaded = missionFormFromDetail(detail);
    const payload = missionUpdatePayload(loaded);
    assert.deepEqual(payload, {
        title: form.title,
        description: form.description,
        requestedDate: form.requestedDate,
        startTime: form.startTime,
        expectedEndTime: form.expectedEndTime,
        locationName: form.locationName,
        latitude: 0,
        longitude: form.longitude,
        priority: 'HIGH',
        notes: form.notes
    });
    assert.equal(loaded.serviceId, 8);
    assert.equal(loaded.missionType, 'AREA_INSPECTION');
    for (const key of ['id', 'code', 'customerId', 'serviceId', 'missionType', 'status', 'updatedAt']) assert.equal(key in payload, false, key);
    assert.equal(missionUpdatePayload({...loaded, notes: '', description: ''}).notes, '');
});

test('mission rules live on the server: the form shows its field errors as returned', () => {
    // Dates, lengths, coordinates and the flight area are judged by POST /missions/validate and create/update.
    const fields = {title: 'Tiêu đề không được vượt quá 180 ký tự.', 'flightPlan.vertices': 'Vùng bay quá nhỏ.'};
    assert.deepEqual(missionFieldErrors({status: 400, code: 'VALIDATION_ERROR', fields}), fields);
    assert.equal(missionFieldErrors({status: 400, fields: {}}), null);
    assert.equal(missionFieldErrors({status: 409, message: 'MISSION_DRAFT_STALE'}), null);
    assert.equal(missionFieldErrors(null), null);
    // The payload is sent as authored apart from trimming; nothing is dropped or clamped client-side.
    const raw = missionUpdatePayload({...form, title: '  ' + 'x'.repeat(300) + '  ', latitude: 95});
    assert.equal(raw.title, 'x'.repeat(300));
    assert.equal(raw.latitude, 95);
});

test('service catalogue codes cannot produce an invalid mission enum', () => {
    for (const code of ['SURVEY_PREMIUM_2026', 'area_inspection', '', undefined]) assert.equal(missionTypeForService(code, 'AERIAL_RECORDING'), 'AERIAL_RECORDING');
    assert.equal(missionTypeForService('DATA_COLLECTION', 'OTHER'), 'DATA_COLLECTION');
});

test('edit action requires the owner, draft status and effective update permission', () => {
    const mission = {...form, customerId: 9, status: 'DRAFT'};
    assert.equal(canEditMission(mission, 9, true), true);
    assert.equal(canEditMission(mission, 10, true), false);
    assert.equal(canEditMission(mission, undefined, true), false);
    assert.equal(canEditMission(mission, 9, false), false);
    for (const status of ['PENDING_CONFIRMATION', 'CONFIRMED', 'READY', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'REJECTED', 'FAILED']) assert.equal(canEditMission({
        ...mission,
        status
    }, 9, true), false, status);
});

test('pagination covers records beyond twenty and filter changes return to the first page', () => {
    assert.deepEqual(missionPageRange({page: 0, size: 20, content: Array(20), totalElements: 43}), {
        first: 1,
        last: 20,
        total: 43
    });
    assert.deepEqual(missionPageRange({page: 2, size: 20, content: Array(3), totalElements: 43}), {
        first: 41,
        last: 43,
        total: 43
    });
    assert.deepEqual(missionPageRange({page: 0, size: 20, content: [], totalElements: 0}), {
        first: 0,
        last: 0,
        total: 0
    });
    assert.deepEqual(missionListFilters('M001', 'DRAFT'), {search: 'M001', status: 'DRAFT', page: 0});
});

test('errors do not expose backend internals and distinguish conflict recovery', () => {
    assert.match(missionFormError({status: 409, message: 'secret internal details'}), /bản mới nhất/);
    assert.match(missionFormError({status: 403}), /không có quyền/);
    assert.doesNotMatch(missionFormError(new Error('SQL diagnostic')), /SQL|diagnostic/);
});


test('draft PATCH carries the version loaded with the form and excludes privileged fields', () => {
    const payload = missionDraftUpdatePayload({...form, version: 99, customerId: 50, status: 'COMPLETED'}, 3);
    assert.equal(payload.expectedVersion, 3);
    assert.equal(payload.title, form.title);
    for (const field of ['version', 'customerId', 'status', 'serviceId', 'missionType']) assert.equal(field in payload, false);
});

test('a missing or invalid draft version cannot produce an unprotected PATCH', () => {
    for (const version of [undefined, null, -1, 1.5, NaN, Number.MAX_SAFE_INTEGER + 1]) {
        assert.throws(() => missionDraftUpdatePayload(form, version), /phiên bản/);
    }
    assert.equal(missionDraftUpdatePayload(form, 0).expectedVersion, 0);
});

const profileSource = (await readFile(new URL('../src/features/profile/forms/profile-form.ts', import.meta.url), 'utf8')).replace('@/lib/format', formatUrl);
const profileCompiled = ts.transpileModule(profileSource, {
    compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022
    }
}).outputText;
const {
    profilePayload,
    profileError
} = await import(`data:text/javascript;base64,${Buffer.from(profileCompiled).toString('base64')}`);

test('profile payload trims approved fields, preserves revision and excludes administrative fields', () => {
    const data = profilePayload({
        fullName: '  Nguyễn Xuân Phát  ',
        phoneNumber: ' 0912345678 ',
        role: 'ROLE_ADMIN',
        id: 77
    }, 'a'.repeat(64));
    assert.deepEqual(data, {fullName: 'Nguyễn Xuân Phát', phoneNumber: '0912345678', expectedRevision: 'a'.repeat(64)});
    assert.equal(profilePayload({fullName: '   ', phoneNumber: '0912345678'}, 'b'.repeat(64)).fullName, null);
    assert.throws(() => profilePayload({fullName: 'A', phoneNumber: '123'}, undefined), /phiên bản/);
});
test('profile rules live on the server: field errors from the API are returned for the inputs', () => {
    const failure = profileError({status: 400, code: 'PROFILE_PHONE_INVALID', fields: {phoneNumber: 'Số điện thoại Việt Nam gồm 10–11 chữ số.'}});
    assert.equal(failure.kind, 'fields');
    assert.deepEqual(failure.fields, {phoneNumber: 'Số điện thoại Việt Nam gồm 10–11 chữ số.'});
    assert.equal(failure.message, 'Số điện thoại Việt Nam gồm 10–11 chữ số.');
});
test('profile failures distinguish stale data, duplicate phone and uncertain network outcome without exposing internals', () => {
    assert.equal(profileError({status: 409, message: 'Phone number already exists in the system'}).kind, 'phone');
    assert.equal(profileError({status: 409, message: 'internal'}).kind, 'conflict');
    assert.equal(profileError({status: 0}).kind, 'uncertain');
    assert.doesNotMatch(profileError(new Error('SQL secret')).message, /SQL|secret/);
    assert.match(profileError({status: 403}).message, /tài khoản|Tài khoản/);
});
