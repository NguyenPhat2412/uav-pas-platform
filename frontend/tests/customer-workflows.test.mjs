import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import {readFile} from 'node:fs/promises';

const source = await readFile(new URL('../src/features/missions/forms/mission-form.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
    compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022
    }
}).outputText;
const {
    validateMissionForm,
    missionDraftUpdatePayload,
    missionUpdatePayload,
    missionFormFromDetail,
    missionTypeForService,
    canEditMission,
    missionPageRange,
    missionListFilters,
    localDateToday,
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
    assert.deepEqual(validateMissionForm(loaded, '2030-05-01'), {});
    for (const key of ['id', 'code', 'customerId', 'serviceId', 'missionType', 'status', 'updatedAt']) assert.equal(key in payload, false, key);
    assert.equal(missionUpdatePayload({...loaded, notes: '', description: ''}).notes, '');
});

test('date validation rejects impossible/past dates and non-increasing local times without inventing same-day constraints', () => {
    assert.ok(validateMissionForm({...form, requestedDate: '2030-02-30'}, '2030-01-01').requestedDate);
    assert.ok(validateMissionForm(form, '2030-05-02').requestedDate);
    for (const expectedEndTime of ['2030-05-01T10:00', '2030-05-01T10:00:00', '2030-05-01T10:00:00.000000', '2030-05-01T09:59', '2030-05-01T25:00', 'invalid']) {
        assert.ok(validateMissionForm({...form, expectedEndTime}, '2030-05-01').expectedEndTime, expectedEndTime);
    }
    assert.ok(validateMissionForm({...form, startTime: '2030-02-30T10:00'}, '2030-05-01').startTime);
    assert.deepEqual(validateMissionForm({
        ...form,
        startTime: '2030-05-01T23:30:00',
        expectedEndTime: '2030-05-02T00:15:00'
    }, '2030-05-01'), {});
    assert.equal(localDateToday(new Date(2030, 0, 2, 23, 30)), '2030-01-02');
});

test('schema limits, whitespace and coordinate boundaries are enforced before API submission', () => {
    const errors = validateMissionForm({
        ...form,
        title: '   ',
        locationName: '\t ',
        description: 'a'.repeat(2001),
        notes: 'a'.repeat(2001),
        latitude: 91,
        longitude: NaN
    }, '2030-05-01');
    for (const key of ['title', 'locationName', 'description', 'notes', 'latitude', 'longitude']) assert.ok(errors[key], key);
    assert.ok(validateMissionForm({
        ...form,
        title: 'a'.repeat(181),
        locationName: 'a'.repeat(256)
    }, '2030-05-01').title);
    assert.ok(validateMissionForm({...form, locationName: 'a'.repeat(256)}, '2030-05-01').locationName);
    assert.deepEqual(validateMissionForm({
        ...form,
        title: 'a'.repeat(180),
        locationName: 'a'.repeat(255),
        description: 'a'.repeat(2000),
        notes: 'a'.repeat(2000),
        latitude: -90,
        longitude: 180
    }, '2030-05-01'), {});
});

test('service catalogue codes cannot produce an invalid mission enum', () => {
    for (const code of ['SURVEY_PREMIUM_2026', 'area_inspection', '', undefined]) assert.equal(missionTypeForService(code, 'AERIAL_RECORDING'), 'AERIAL_RECORDING');
    assert.equal(missionTypeForService('DATA_COLLECTION', 'OTHER'), 'DATA_COLLECTION');
    assert.ok(validateMissionForm({...form, missionType: 'SURVEY_PREMIUM_2026'}, '2030-05-01').missionType);
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

const profileSource = await readFile(new URL('../src/features/profile/forms/profile-form.ts', import.meta.url), 'utf8');
const profileCompiled = ts.transpileModule(profileSource, {
    compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022
    }
}).outputText;
const {
    profilePayload,
    validateProfile,
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
test('profile validation enforces existing field lengths and required phone without inventing country rules', () => {
    assert.deepEqual(validateProfile({fullName: '', phoneNumber: '+84 (24) 1234-5678'}), {});
    assert.ok(validateProfile({fullName: 'x'.repeat(101), phoneNumber: '1'.repeat(21)}).fullName);
    assert.ok(validateProfile({fullName: 'A', phoneNumber: '1'.repeat(21)}).phoneNumber);
    assert.ok(validateProfile({fullName: 'A', phoneNumber: '  '}).phoneNumber);
    assert.deepEqual(validateProfile({fullName: 'x'.repeat(100), phoneNumber: '1'.repeat(20)}), {});
});
test('profile failures distinguish stale data, duplicate phone and uncertain network outcome without exposing internals', () => {
    assert.equal(profileError({status: 409, message: 'Phone number already exists in the system'}).kind, 'phone');
    assert.equal(profileError({status: 409, message: 'internal'}).kind, 'conflict');
    assert.equal(profileError({status: 0}).kind, 'uncertain');
    assert.doesNotMatch(profileError(new Error('SQL secret')).message, /SQL|secret/);
    assert.match(profileError({status: 403}).message, /tài khoản|Tài khoản/);
});
