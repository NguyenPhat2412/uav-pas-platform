import assert from 'node:assert/strict';
import test from 'node:test';
import ts from 'typescript';
import {readFile} from 'node:fs/promises';

async function loadTs(path) {
    const source = await readFile(new URL(path, import.meta.url), 'utf8');
    const compiled = ts.transpileModule(source, {
        compilerOptions: {
            module: ts.ModuleKind.ESNext,
            target: ts.ScriptTarget.ES2022
        }
    }).outputText;
    return import('data:text/javascript;base64,' + Buffer.from(compiled).toString('base64'));
}

const {
    calculateHaversineDistance,
    generateExpandingSquarePattern,
    isPointInsideGeofence,
    calculateRthFeasibility
} = await loadTs('../src/utils/sar/sar-algorithms.ts');
const {calculateCrc16Ccitt, generateVietQrPayload} = await loadTs('../src/utils/billing/vietqr.ts');

test('Algorithm 1: Haversine distance calculates accurate geodesic length', () => {
    // Khoảng cách giữa 2 điểm mẫu tại Vịnh Hạ Long / Cát Bà
    const p1 = {lat: 20.7284, lng: 107.0512};
    const p2 = {lat: 20.7384, lng: 107.0612};
    const distance = calculateHaversineDistance(p1, p2);

    // Khoảng cách khoảng ~1500m - 1600m
    assert.ok(distance > 1400 && distance < 1700, `Distance should be ~1.5km, got ${distance}`);
});

test('Algorithm 2: Expanding square search pattern generates escalating spiral legs', () => {
    const lkp = {lat: 20.7284, lng: 107.0512};
    const step = 50; // meters
    const waypoints = generateExpandingSquarePattern(lkp, step, 8);

    assert.equal(waypoints.length, 9); // WP-00 + 8 legs
    assert.equal(waypoints[0].id, 'WP-00-LKP');
    assert.equal(waypoints[1].legDistanceMeters, 50); // Leg 1: 1*S
    assert.equal(waypoints[2].legDistanceMeters, 50); // Leg 2: 1*S
    assert.equal(waypoints[3].legDistanceMeters, 100); // Leg 3: 2*S
    assert.equal(waypoints[4].legDistanceMeters, 100); // Leg 4: 2*S
    assert.equal(waypoints[5].legDistanceMeters, 150); // Leg 5: 3*S
});

test('Algorithm 3: Ray-Casting PIP algorithm correctly identifies Geofence boundaries', () => {
    // Một vùng đa giác hình tứ giác xung quanh trạm Cát Bà
    const polygon = [
        {lat: 20.70, lng: 107.00},
        {lat: 20.80, lng: 107.00},
        {lat: 20.80, lng: 107.10},
        {lat: 20.70, lng: 107.10}
    ];

    const insidePoint = {lat: 20.75, lng: 107.05};
    const outsidePoint = {lat: 20.85, lng: 107.05};

    assert.equal(isPointInsideGeofence(insidePoint, polygon), true, 'Center point must be inside');
    assert.equal(isPointInsideGeofence(outsidePoint, polygon), false, 'Northern point must be outside');
});

test('Algorithm 4: Battery RTH feasibility triggers emergency actions on low battery', () => {
    const home = {lat: 20.70, lng: 107.00};
    const currentPos = {lat: 20.75, lng: 107.05}; // Cách home ~7.5km

    // UAV có 80% pin -> An toàn tiếp tục bay
    const safeResult = calculateRthFeasibility(currentPos, home, 80);
    assert.equal(safeResult.isSafeToContinue, true);
    assert.equal(safeResult.recommendedAction, 'CONTINUE_MISSION');

    // UAV chỉ còn 15% pin -> Báo động quay về khẩn cấp
    const criticalResult = calculateRthFeasibility(currentPos, home, 15);
    assert.equal(criticalResult.isSafeToContinue, false);
    assert.equal(criticalResult.recommendedAction, 'CRITICAL_IMMEDIATE_RTH');
});

test('Algorithm 5: VietQR EMVCo generator produces valid TLV string and CRC-16', () => {
    const payload = generateVietQrPayload({
        bankBin: '970422', // MB Bank
        accountNumber: '0987654321',
        amount: 500000,
        memo: 'UAV MISSION INV001'
    });

    assert.match(payload, /^000201010212/);
    assert.match(payload, /A000000727/); // NAPAS GUID
    assert.match(payload, /970422/);
    assert.match(payload, /5303704/); // VND
    assert.match(payload, /5406500000/); // 500,000 VND
    assert.match(payload, /6304[A-F0-9]{4}$/); // CRC-16 Checksum
});
