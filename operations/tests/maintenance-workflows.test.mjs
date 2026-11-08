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
const workflowUrl = compile((await source('src/utils/maintenance/workflows.ts')).replace('@/lib/format', formatUrl));
const {
    orderControls,
    scheduleInput,
    orderInput,
    materialInput,
    closingNote,
    positiveId,
    formatVnd,
    businessToday
} = await import(workflowUrl);
const routesUrl = compile(await source('src/lib/api/routes.ts'));
const apiUrl = compile(`export {API_ROUTES} from "${routesUrl}"; export const requests = []; export const apiClient = Object.fromEntries(['get','post','put'].map(method => [method, async (path, body) => { requests.push({method,path,body}); return {}; }]));`);
const {requests} = await import(apiUrl);
const {maintenanceService} = await import(compile((await source('src/api/maintenance/maintenance.api.ts')).replace('@/lib/api', apiUrl).replace('@/utils/maintenance/workflows', workflowUrl).replace('@/lib/format', formatUrl)));
const schedule = {title: ' Kiểm tra pin ', intervalDays: '30', nextDueDate: '2028-02-29'};
const order = {
    title: ' Kiểm tra pin ',
    description: ' Ghi nhận tình trạng ',
    technicianName: ' Nguyễn Văn A ',
    plannedDate: '2028-02-29'
};

test('maintenance calendar uses Vietnam business date at UTC day boundary', () => {
    assert.equal(businessToday(new Date('2026-10-15T16:59:59Z')), '2026-10-15');
    assert.equal(businessToday(new Date('2026-10-15T17:00:00Z')), '2026-10-16');
});
test('schedule payload is trimmed and typed; interval, date and title rules are the API\'s', () => {
    assert.deepEqual(scheduleInput(schedule), {title: 'Kiểm tra pin', intervalDays: 30, nextDueDate: '2028-02-29'});
    // Out-of-range values are sent as authored so the server reports them on the right field.
    assert.equal(scheduleInput({...schedule, intervalDays: '3651'}).intervalDays, 3651);
    assert.equal(scheduleInput({...schedule, intervalDays: ''}).intervalDays, null);
    assert.equal(scheduleInput({...schedule, nextDueDate: ''}).nextDueDate, null);
    assert.equal(scheduleInput({...schedule, title: 'x'.repeat(161)}).title.length, 161);
});
test('order and closing payloads are trimmed; required content and size limits are the API\'s', () => {
    assert.deepEqual(orderInput(order), {
        title: 'Kiểm tra pin',
        description: 'Ghi nhận tình trạng',
        technicianName: 'Nguyễn Văn A',
        plannedDate: '2028-02-29'
    });
    assert.equal(orderInput({...order, description: ''}).description, '');
    assert.equal(orderInput({...order, technicianName: ' '}).technicianName, '');
    assert.equal(closingNote('  Đã kiểm tra\nCánh quạt tốt  '), 'Đã kiểm tra\nCánh quạt tốt');
    assert.equal(closingNote(' '), '');
});
test('material ledger keeps decimal strings exactly; quantity and price limits are the API\'s', () => {
    const row = {name: ' Dầu bôi trơn ', unit: ' Lít ', quantity: '0.125', unitPrice: '123456789'};
    assert.deepEqual(materialInput([row]), [{
        name: 'Dầu bôi trơn',
        unit: 'Lít',
        quantity: '0.125',
        unitPrice: '123456789'
    }]);
    assert.deepEqual(materialInput([]), []);
    // Never rounded, clamped or dropped in the browser.
    assert.equal(materialInput([{...row, quantity: '10000.001'}])[0].quantity, '10000.001');
    assert.equal(materialInput(Array.from({length: 101}, () => row)).length, 101);
});
test('closed orders remain immutable and all maintenance actions require manage authority', () => {
    for (const status of ['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']) {
        const controls = orderControls(status, true);
        assert.equal(controls.edit, ['OPEN', 'IN_PROGRESS'].includes(status));
        assert.equal(controls.start, status === 'OPEN');
        assert.equal(controls.complete, status === 'IN_PROGRESS');
        assert.equal(controls.cancel, ['OPEN', 'IN_PROGRESS'].includes(status));
        assert.ok(Object.values(orderControls(status, false)).every(value => !value));
    }
});
test('materials send expected version and decimal strings, never client totals or inventory actions', async () => {
    requests.length = 0;
    const items = [{name: 'Dầu', unit: 'lít', quantity: '0.125', unitPrice: '123456789'}];
    await maintenanceService.materials({id: 17, version: 4}, items);
    assert.deepEqual(requests, [{
        method: 'put',
        path: '/api/v1/maintenance/orders/17/materials',
        body: {expectedVersion: 4, items}
    }]);
});
test('lifecycle mutations preserve expected version, the inspection answer and cancellation reason', async () => {
    requests.length = 0;
    const item = {id: 17, version: 4};
    await maintenanceService.start(item);
    await maintenanceService.complete(item, ' Đạt kiểm tra ', true);
    await maintenanceService.complete(item, 'Chưa kiểm', false);
    await maintenanceService.cancel(item, ' Hoãn do thiếu linh kiện ');
    // The checkbox value is sent as-is; the API requires inspectionPassed = true.
    assert.deepEqual(requests.map(({body}) => body), [{expectedVersion: 4}, {
        expectedVersion: 4,
        inspectionNotes: 'Đạt kiểm tra',
        inspectionPassed: true
    }, {expectedVersion: 4, inspectionNotes: 'Chưa kiểm', inspectionPassed: false}, {expectedVersion: 4, reason: 'Hoãn do thiếu linh kiện'}]);
});
test('filtered later pages stay server paginated and paused schedule writes retain identity/version', async () => {
    requests.length = 0;
    await maintenanceService.schedules(2, '8', 'OVERDUE');
    await maintenanceService.orders(3, '8', 'CANCELLED');
    await maintenanceService.updateSchedule({id: 11, version: 7}, schedule, false);
    assert.deepEqual(requests.slice(0, 2).map(({path}) => path), ['/api/v1/maintenance/schedules?page=2&size=20&uavId=8&dueStatus=OVERDUE', '/api/v1/maintenance/orders?page=3&size=20&uavId=8&status=CANCELLED']);
    assert.deepEqual(requests[2].body, {
        expectedVersion: 7,
        title: 'Kiểm tra pin',
        intervalDays: 30,
        nextDueDate: '2028-02-29',
        active: false
    });
});
test('VND display retains server integer precision; identifiers are passed to the API to judge', () => {
    assert.equal(formatVnd('1000000000000000'), '1.000.000.000.000.000 ₫');
    assert.equal(formatVnd('0'), '0 ₫');
    assert.equal(formatVnd('not-a-number'), 'Chưa xác định');
    assert.equal(positiveId('12'), 12);
    assert.equal(positiveId(''), 0);
});
test('neutral repair history is translated without rewriting user-authored text', async () => {
    const {uavHistoryReason} = await import(compile((await source('src/utils/uav/workflows.ts')).replace('@/lib/format', formatUrl)));
    assert.equal(uavHistoryReason('Repair order #42 started'), 'Bắt đầu phiếu sửa chữa #42');
    assert.equal(uavHistoryReason('Repair order #42 completed'), 'Hoàn tất phiếu sửa chữa #42');
    assert.equal(uavHistoryReason('Đã kiểm tra động cơ'), 'Đã kiểm tra động cơ');
});

test('maintenance audit translates generated records and retains exact VND amount and unknown text', async () => {
    const {displayLabel, auditDetail} = await import(compile(await source('src/lib/presentation.ts')));
    assert.equal(displayLabel('REPAIR_ORDER'), 'Phiếu sửa chữa');
    assert.equal(displayLabel('MAINTENANCE_SCHEDULE'), 'Lịch bảo trì');
    assert.equal(auditDetail('MATERIALS_UPDATED lines=2 totalVND=1000000000000000'), 'Cập nhật 2 dòng vật tư · Tổng 1.000.000.000.000.000 ₫');
    assert.equal(auditDetail('ADVANCED order=42'), 'Cập nhật kỳ bảo trì tiếp theo sau phiếu #42');
    assert.equal(auditDetail('Ghi chú do người dùng nhập'), 'Ghi chú do người dùng nhập');
});

test('removing the last filtered row returns to a real page without losing an empty-first-page state', async () => {
    const {pageAfterRefresh} = await import(workflowUrl);
    assert.equal(pageAfterRefresh(1, 1), 0);
    assert.equal(pageAfterRefresh(5, 3), 2);
    assert.equal(pageAfterRefresh(0, 0), 0);
    assert.equal(pageAfterRefresh(1, 3), 1);
});
