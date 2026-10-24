import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import {readFile} from 'node:fs/promises';

const compile = source => 'data:text/javascript;base64,' + Buffer.from(ts.transpileModule(source, {
    compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022
    }
}).outputText).toString('base64');
const labelsUrl = compile(await readFile(new URL('../src/components/shared/presentation.ts', import.meta.url), 'utf8'));
const {displayLabel, eventTitle, eventNote, terminalStatuses, auditDetail} = await import(labelsUrl);
const source = (await readFile(new URL('../src/features/missions/presentation.ts', import.meta.url), 'utf8')).replace('@/components/shared/presentation', labelsUrl);
const {missionControls} = await import(compile(source));
const mission = {id: 1, operatorId: 10, status: 'READY', operatorAccepted: false};
const all = () => true;
test('closed missions offer no mutation controls, even with all permissions', () => {
    for (const status of terminalStatuses) assert.ok(Object.values(missionControls({
        ...mission,
        status
    }, 10, all)).every(v => v === false), status);
});
test('execution belongs to the assigned operator and the matching lifecycle stage', () => {
    assert.equal(missionControls(mission, 10, all).start, false);
    assert.equal(missionControls({...mission, operatorAccepted: true}, 10, all).start, true);
    assert.equal(missionControls(mission, 11, all).start, false);
    assert.equal(missionControls({...mission, status: 'IN_PROGRESS'}, 10, all).complete, true);
    assert.equal(missionControls({...mission, status: 'IN_PROGRESS'}, 10, all).start, false);
    assert.equal(missionControls({...mission, status: 'IN_PROGRESS'}, 10, all).conflict, false);
    assert.equal(missionControls({...mission, operatorAccepted: true}, 10, all).accept, false);
});
test('permissions gate every action; assignment stops after resources are ready', () => {
    for (const status of ['DRAFT', 'PENDING_CONFIRMATION', 'CONFIRMED', 'RESOURCE_RESERVED', 'READY', 'IN_PROGRESS']) assert.ok(Object.values(missionControls({
        ...mission,
        status
    }, 10, () => false)).every(v => v === false));
    const allowed = code => ['MISSION_ASSIGN_OPERATOR', 'USER_READ'].includes(code);
    assert.equal(missionControls({...mission, status: 'CONFIRMED', operatorId: undefined}, 10, allowed).operator, true);
    assert.equal(missionControls({...mission, status: 'CONFIRMED'}, 10, allowed).operator, false);
    assert.equal(missionControls({...mission, status: 'READY', operatorId: undefined}, 10, allowed).operator, false);
    assert.equal(missionControls({
        ...mission,
        status: 'CONFIRMED',
        operatorId: undefined
    }, 10, c => c === 'MISSION_ASSIGN_OPERATOR').operator, false);
});
test('known codes are translated; unknown data and operator reasons are preserved', () => {
    assert.equal(displayLabel('COMPLETED'), 'Hoàn tất');
    assert.equal(displayLabel('STOCK_IN'), 'Nhập kho');
    assert.equal(auditDetail('STATION:DN-01'), 'Trạm: DN-01');
    assert.equal(auditDetail('document/report.txt'), 'document/report.txt');
    assert.equal(displayLabel('AREA_INSPECTION'), 'Khảo sát khu vực');
    assert.equal(displayLabel('new-backend-value'), 'new-backend-value');
    assert.equal(eventTitle({eventType: 'STATUS_CHANGED', newStatus: 'READY'}), 'Sẵn sàng');
    assert.equal(eventNote({
        eventType: 'OPERATOR_CONFLICT',
        description: 'Gió lớn, cần đổi lịch'
    }), 'Gió lớn, cần đổi lịch');
    assert.equal(eventNote({eventType: 'CREATED', description: 'Mission created'}), undefined);
});

test('profile audit renders approved field names in Vietnamese and preserves unrelated notes', () => {
    assert.equal(displayLabel('USER_PROFILE'), 'Hồ sơ cá nhân');
    assert.equal(auditDetail('Updated fields: fullName, phoneNumber'), 'Cập nhật hồ sơ: họ tên, số điện thoại');
    assert.equal(auditDetail('Updated fields: phoneNumber'), 'Cập nhật hồ sơ: số điện thoại');
    assert.equal(auditDetail('Updated fields: unknown'), 'Updated fields: unknown');
});
