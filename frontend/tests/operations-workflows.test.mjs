import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';

const source = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const compile = value => `data:text/javascript;base64,${Buffer.from(ts.transpileModule(value, {
    compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022
    }
}).outputText).toString('base64')}`;
const formatUrl = compile(await source('src/lib/format.ts'));
const labelsUrl = compile(await source('src/components/shared/presentation.ts'));
const mediaPolicyUrl = compile(await source('src/lib/api/media-policy.ts'));
const formsUrl = compile((await source('src/features/missions/utils/workflows.ts')).replace('@/lib/format', formatUrl));
const {failureInput, reservationQuantity, missionEventNote} = await import(formsUrl);
const {missionControls} = await import(compile((await source('src/features/missions/utils/presentation.ts')).replace('@/components/shared/presentation', labelsUrl)));
const routesUrl = compile(await source('src/lib/api/routes.ts'));
const apiUrl = compile(`
  export {API_ROUTES} from "${routesUrl}";
  export const requests = [];
  export const apiClient = Object.fromEntries(['get','post','put','patch','delete'].map(method => [method, async (path, body) => { requests.push({method,path,body}); return {id:42,status:'FAILED'}; }]));
  export const apiRequest = async () => {};
`);
const {requests} = await import(apiUrl);
const {missionService} = await import(compile((await source('src/lib/api/missions.ts')).replace('@/lib/api/media-policy', mediaPolicyUrl).replace('@/lib/api', apiUrl).replace('@/features/missions/utils/workflows', formsUrl)));
const uavWorkflowsUrl = compile((await source('src/features/uavs/utils/workflows.ts')).replace('@/lib/format', formatUrl));
const {operationsService} = await import(compile((await source('src/lib/api/resources.ts')).replace('@/lib/api', apiUrl).replace('@/features/uavs/utils/workflows', uavWorkflowsUrl)));

test('failure requires assignment, status-update permission, and a permitted nonterminal state', () => {
    const statuses = ['DRAFT', 'PENDING_CONFIRMATION', 'CONFIRMED', 'RESOURCE_RESERVED', 'READY', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'REJECTED', 'FAILED'];
    for (const status of statuses) {
        const mission = {id: 42, status, operatorId: 7, operatorAccepted: false};
        assert.equal(missionControls(mission, 7, code => code === 'MISSION_STATUS_UPDATE').fail, ['RESOURCE_RESERVED', 'READY', 'IN_PROGRESS'].includes(status), status);
        assert.equal(missionControls(mission, 8, () => true).fail, false, `other operator at ${status}`);
        assert.equal(missionControls(mission, undefined, () => true).fail, false);
        assert.equal(missionControls(mission, 7, code => code === 'MISSION_COMPLETE').fail, false);
    }
});

test('all terminal mission controls stay closed with every permission', () => {
    for (const status of ['COMPLETED', 'FAILED', 'CANCELLED', 'REJECTED']) {
        assert.ok(Object.values(missionControls({
            status,
            operatorId: 7
        }, 7, () => true)).every(value => value === false), status);
    }
});

test('failure payload trims surrounding whitespace, preserves authored content, and handles optional notes', () => {
    assert.deepEqual(failureInput('  Gió lớn, không thể tiếp tục.  ', '\nĐã hạ cánh an toàn.\nCần kiểm tra pin.\n'), {
        failureReason: 'Gió lớn, không thể tiếp tục.',
        notes: 'Đã hạ cánh an toàn.\nCần kiểm tra pin.'
    });
    assert.deepEqual(failureInput('Lỗi cảm biến', '  '), {failureReason: 'Lỗi cảm biến', notes: undefined});
    // Length and required rules are the API's (MissionFailureRequest); nothing is cut or refused here.
    assert.equal(failureInput('x'.repeat(501)).failureReason.length, 501);
});
test('failure form goes to the API as authored, which judges it; endpoint contract is unchanged', async () => {
    requests.length = 0;
    await missionService.fail(42, '  Lỗi cảm biến  ', '  Đã thu hồi thiết bị  ');
    await missionService.fail(42, '  ', 'Chi tiết');
    assert.deepEqual(requests, [{
        method: 'post',
        path: '/api/v1/missions/42/fail',
        body: {failureReason: 'Lỗi cảm biến', notes: 'Đã thu hồi thiết bị'}
    }, {
        method: 'post',
        path: '/api/v1/missions/42/fail',
        body: {failureReason: '', notes: 'Chi tiết'}
    }]);
});
test('completion sends equipment condition without converting it into an inventory action', async () => {
    requests.length = 0;
    await missionService.complete(42, 'Đã bàn giao ảnh', 'Cần kiểm tra pin');
    assert.deepEqual(requests, [{
        method: 'post',
        path: '/api/v1/missions/42/complete',
        body: {completionNote: 'Đã bàn giao ảnh', equipmentCondition: 'Cần kiểm tra pin'}
    }]);
});

test('ready and start require current operator acceptance in addition to permissions', () => {
    for (const operatorAccepted of [false, true]) {
        assert.equal(missionControls({
            status: 'RESOURCE_RESERVED',
            operatorId: 7,
            operatorAccepted
        }, 7, () => true).ready, operatorAccepted);
        assert.equal(missionControls({
            status: 'READY',
            operatorId: 7,
            operatorAccepted
        }, 7, () => true).start, operatorAccepted);
    }
});

test('accept sends the version the operator reviewed; the API rejects invalid revisions', async () => {
    requests.length = 0;
    await missionService.accept(42, 8);
    assert.deepEqual(requests, [{method: 'post', path: '/api/v1/missions/42/accept', body: {expectedVersion: 8}}]);
});
test('completion sends what the operator wrote; missing notes or condition are refused by the API', async () => {
    requests.length = 0;
    await missionService.complete(42, '  Done  ', undefined);
    assert.deepEqual(requests[0].body, {completionNote: 'Done', equipmentCondition: ''});
});
test('timeline notes are trimmed and always reach the API, which enforces the 500-character limit', async () => {
    assert.equal(missionEventNote('  ' + 'x'.repeat(500) + '  ').length, 500);
    const operations = [
        note => missionService.reject(42, note),
        note => missionService.reportConflict(42, note),
        note => missionService.complete(42, note, 'Thiết bị tốt'),
    ];
    for (const operation of operations) {
        requests.length = 0;
        await operation('x'.repeat(501));
        assert.equal(requests.length, 1);
    }
});
test('reservation quantity is converted, not judged: the API checks it against availability', async () => {
    assert.equal(reservationQuantity('3'), 3);
    assert.equal(reservationQuantity('11'), 11);
    requests.length = 0;
    await missionService.reserveEquipment(42, 9, reservationQuantity('3'));
    assert.deepEqual(requests[0].body, {resourceId: 9, quantity: 3});
});
test('later operator and history pages keep their server pagination parameters', async () => {
    requests.length = 0;
    await operationsService.listOperators(2);
    await operationsService.inventoryHistory(1);
    await operationsService.uavHistory(42, 3);
    assert.deepEqual(requests.map(request => request.path), [
        '/api/v1/users?role=ROLE_OPERATOR&page=2&size=100',
        '/api/v1/inventory/equipment/history?page=1&size=20',
        '/api/v1/uavs/42/history?page=3&size=20',
    ]);
});


const {uavControls, uavChangeReason} = await import(uavWorkflowsUrl);
test('maintenance and transfer affordances exclude mission-owned and unknown UAV states', () => {
    for (const status of ['AVAILABLE', 'INACTIVE', 'MAINTENANCE', 'ASSIGNED', 'IN_USE', 'UNKNOWN']) {
        const controls = uavControls(status, true);
        assert.equal(controls.maintenance, ['AVAILABLE', 'INACTIVE'].includes(status));
        assert.equal(controls.recover, ['MAINTENANCE', 'ASSIGNED'].includes(status));
        assert.equal(controls.station, status === 'AVAILABLE');
        assert.equal(controls.busy, ['ASSIGNED', 'IN_USE'].includes(status));
        const denied = uavControls(status, false);
        assert.deepEqual([denied.maintenance, denied.recover, denied.station], [false, false, false]);
    }
});

test('maintenance reason boundaries and encoded stale-state contract are preserved', async () => {
    assert.equal(uavChangeReason('  Đã kiểm tra cánh quạt  '), 'Đã kiểm tra cánh quạt');
    // Empty or over-255 reasons are refused by the API on the reason field, not here.
    assert.equal(uavChangeReason('x'.repeat(256)).length, 256);
    requests.length = 0;
    await operationsService.maintenanceUav({id: 8, reason: ' Cánh & pin? kiểm tra ', expectedStatus: 'AVAILABLE'});
    await operationsService.completeUavMaintenance({id: 8, reason: ' Đạt yêu cầu ', expectedStatus: 'MAINTENANCE'});
    assert.deepEqual(requests.map(request => request.method), ['post', 'put']);
    const [entry, recovery] = requests.map(request => new URL(request.path, 'http://test.invalid'));
    assert.equal(entry.pathname, '/api/v1/uavs/8/maintenance');
    assert.deepEqual(Object.fromEntries(entry.searchParams), {
        reason: 'Cánh & pin? kiểm tra',
        expectedStatus: 'AVAILABLE'
    });
    assert.equal(recovery.pathname, '/api/v1/uavs/8/status');
    assert.deepEqual(Object.fromEntries(recovery.searchParams), {
        status: 'AVAILABLE',
        reason: 'Đạt yêu cầu',
        expectedStatus: 'MAINTENANCE'
    });
});

test('redispatch requires existing UAV, preflight state, existing assignment and read permissions', () => {
    for (const status of ['DRAFT', 'PENDING_CONFIRMATION', 'CONFIRMED', 'RESOURCE_RESERVED', 'READY', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'REJECTED', 'CANCELLED']) {
        const mission = {status, uavId: 8};
        const allowed = ['CONFIRMED', 'RESOURCE_RESERVED', 'READY'].includes(status);
        const controls = missionControls(mission, 7, () => true);
        assert.equal(controls.replaceUav, allowed, status);
        assert.equal(controls.unassignUav, allowed, status);
        assert.equal(missionControls({status}, 7, () => true).replaceUav, false);
        assert.equal(missionControls(mission, 7, code => code !== 'UAV_READ').replaceUav, false);
        assert.equal(missionControls(mission, 7, code => code !== 'MISSION_ASSIGN_UAV').unassignUav, false);
    }
});

test('redispatch sends expected-current UAV with authored reason; the API checks ids and reasons', async () => {
    requests.length = 0;
    await missionService.replaceUav(42, 8, 9, '  Thay pin\nKiểm tra trước khi bay.  ');
    await missionService.unassignUav(42, 9, '  Cần bảo trì  ');
    assert.deepEqual(requests, [
        {
            method: 'post',
            path: '/api/v1/missions/42/replace-uav',
            body: {expectedCurrentUavId: 8, replacementUavId: 9, reason: 'Thay pin\nKiểm tra trước khi bay.'}
        },
        {
            method: 'post',
            path: '/api/v1/missions/42/unassign-uav',
            body: {expectedCurrentUavId: 9, reason: 'Cần bảo trì'}
        },
    ]);
});
test('redispatch timeline shows Vietnamese action and preserves the supplied reason', async () => {
    const {eventTitle, eventNote} = await import(labelsUrl);
    assert.equal(eventTitle({eventType: 'UAV_REPLACED'}), 'Thay UAV');
    assert.equal(eventTitle({eventType: 'UAV_UNASSIGNED'}), 'Gỡ UAV khỏi nhiệm vụ');
    for (const eventType of ['UAV_REPLACED', 'UAV_UNASSIGNED']) assert.equal(eventNote({
        eventType,
        description: 'UAV-A → UAV-B. Lý do: kiểm tra pin.'
    }), 'UAV-A → UAV-B. Lý do: kiểm tra pin.');
});


test('UAV history translates generated messages while retaining authored reasons', async () => {
    const {uavHistoryReason} = await import(uavWorkflowsUrl);
    assert.equal(uavHistoryReason('Created'), 'Tạo UAV');
    assert.equal(uavHistoryReason('Home station changed: none -> 12'), 'Điều chuyển trạm: Chưa gán → #12');
    assert.equal(uavHistoryReason('Home station changed: 10 -> 12'), 'Điều chuyển trạm: #10 → #12');
    assert.equal(uavHistoryReason('Đã kiểm tra cánh quạt.'), 'Đã kiểm tra cánh quạt.');
    assert.equal(uavHistoryReason('Engine checked by technician'), 'Engine checked by technician');
});

test('resource redispatch is preflight only and uses the existing granular permissions', () => {
    for (const status of ['DRAFT', 'PENDING_CONFIRMATION', 'CONFIRMED', 'RESOURCE_RESERVED', 'READY', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED', 'REJECTED']) {
        const mission = {status, operatorId: 7, stationId: 2};
        const expected = ['CONFIRMED', 'RESOURCE_RESERVED', 'READY'].includes(status);
        const controls = missionControls(mission, 7, () => true);
        assert.equal(controls.redispatchOperator, expected);
        assert.equal(controls.redispatchStation, expected);
        assert.equal(controls.redispatchEquipment, expected);
        assert.equal(missionControls(mission, 7, code => code !== 'MISSION_ASSIGN_OPERATOR').redispatchOperator, false);
        assert.equal(missionControls(mission, 7, code => code !== 'MISSION_ASSIGN_STATION').redispatchStation, false);
        assert.equal(missionControls(mission, 7, code => code !== 'MISSION_RESERVE_EQUIPMENT').redispatchEquipment, false);
        assert.equal(controls.station, false, 'Existing station must use redispatch');
    }
});

test('resource redispatch sends the viewed revision and explicit null for removal', async () => {
    requests.length = 0;
    await missionService.redispatchResource(42, 'operator', 9, 8, ' Đổi ca ');
    await missionService.redispatchResource(42, 'station', 10, null, ' Gỡ trạm ');
    await missionService.redispatchEquipment(42, 11, 17, 18, 3, ' Đổi thiết bị ');
    await missionService.redispatchEquipment(42, 12, 19, null, null, ' Hoàn trả ');
    assert.deepEqual(requests.map(r => r.body), [
        {expectedVersion: 9, replacementId: 8, reason: 'Đổi ca'},
        {expectedVersion: 10, replacementId: null, reason: 'Gỡ trạm'},
        {expectedVersion: 11, reservationId: 17, replacementId: 18, quantity: 3, reason: 'Đổi thiết bị'},
        {expectedVersion: 12, reservationId: 19, replacementId: null, quantity: null, reason: 'Hoàn trả'},
    ]);
});

test('resource redispatch timeline retains meaningful Vietnamese actions and authored reasons', async () => {
    const {eventTitle, eventNote} = await import(labelsUrl);
    for (const [eventType, title] of Object.entries({
        OPERATOR_REPLACED: 'Thay người vận hành',
        OPERATOR_UNASSIGNED: 'Gỡ người vận hành',
        STATION_REPLACED: 'Đổi trạm',
        STATION_UNASSIGNED: 'Gỡ trạm',
        EQUIPMENT_CHANGED: 'Đổi thiết bị hoặc số lượng',
        EQUIPMENT_RELEASED: 'Hoàn trả thiết bị'
    })) {
        assert.equal(eventTitle({eventType}), title);
        assert.equal(eventNote({
            eventType,
            description: 'Cần điều phối lại ca vận hành.'
        }), 'Cần điều phối lại ca vận hành.');
    }
});


test('mission upload registers the file as described; the API applies the type and size policy', async () => {
    requests.length = 0;
    await missionService.requestMediaUpload(42, {name: 'report.pdf', type: 'application/pdf', size: 100_000_000});
    await missionService.requestMediaUpload(42, {name: 'file.txt', type: 'text/plain', size: 5});
    assert.deepEqual(requests.map(r => r.body.contentType), ['application/pdf', 'text/plain']);
    assert.deepEqual(requests[0], {
        method: 'post',
        path: '/api/v1/missions/42/media/upload-url',
        body: {originalName: 'report.pdf', contentType: 'application/pdf', size: 100_000_000, type: 'DOCUMENT'}
    });
});
