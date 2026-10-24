import {
    api,
    assert,
    check,
    errors,
    finish,
    fixture,
    fs,
    launch,
    network,
    origin,
    pageFor,
    path,
    secretValues,
    shot,
    work
} from './common.mjs';

function syntheticPdf() {
    const objects = ['<</Type /Catalog /Pages 2 0 R>>', '<</Type /Pages /Kids [3 0 R] /Count 1>>', '<</Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Contents 4 0 R>>', '<</Length 0>>\nstream\n\nendstream'];
    let text = '%PDF-1.4\n';
    const offsets = [0];
    for (const [index, body] of objects.entries()) {
        offsets.push(Buffer.byteLength(text));
        text += `${index + 1} 0 obj\n${body}\nendobj\n`;
    }
    const xref = Buffer.byteLength(text);
    text += 'xref\n0 5\n0000000000 65535 f \n' + offsets.slice(1).map(n => String(n).padStart(10, '0') + ' 00000 n \n').join('') + `trailer\n<</Size 5 /Root 1 0 R>>\nstartxref\n${xref}\n%%EOF\n`;
    return Buffer.from(text);
}

const pdf = syntheticPdf();
const storageMatcher = url => url.port === String(fixture.storagePort);
let browser, error, current, id, customer, admin, operator, otherCustomer, otherOperator;
const stamp = Date.now();
const date = new Date(stamp + 30 * 86400000).toISOString().slice(0, 10);
const note = 'Đã kiểm tra khu vực và bàn giao kết quả khảo sát.';
const condition = 'Đủ thiết bị, nguyên vẹn, pin đã kiểm tra.';
const requestNote = 'Ưu tiên khảo sát ranh giới phía bắc.\nBàn giao báo cáo trước 16 giờ.';
let uploadUrl, mediaId;

async function mutation(page, label, suffix, expected = 200) {
    const pending = page.waitForResponse(r => new URL(r.url()).pathname.endsWith(suffix) && r.request().method() === 'POST');
    await page.getByRole('button', {name: label, exact: true}).click();
    const r = await pending;
    assert.equal(r.status(), expected, `${suffix} HTTP ${r.status()}`);
    const data = await r.json();
    await page.getByText('Đang xử lý…', {exact: true}).waitFor({state: 'hidden'});
    return data;
}

async function assign(label, value, button, endpoint) {
    await admin.page.getByRole('combobox', {name: label, exact: true}).selectOption(String(value));
    return mutation(admin.page, button, '/' + endpoint);
}

async function upload(name, role = 'OUTPUT') {
    const p = operator.page;
    await p.getByRole('combobox', {name: 'Vai trò tệp', exact: true}).selectOption(role);
    const signed = p.waitForResponse(r => new URL(r.url()).pathname === `/api/v1/missions/${id}/media/upload-url` && r.request().method() === 'POST');
    const put = p.waitForResponse(r => new URL(r.url()).port === String(fixture.storagePort) && r.request().method() === 'PUT');
    const attached = p.waitForResponse(r => new URL(r.url()).pathname === `/api/v1/missions/${id}/media` && r.request().method() === 'POST');
    await p.locator('input[type=file]').setInputFiles({name, mimeType: 'application/pdf', buffer: pdf});
    const signedData = await (await signed).json();
    uploadUrl = signedData.url;
    mediaId = signedData.mediaId;
    secretValues.add(uploadUrl);
    assert.ok(new URL(uploadUrl).searchParams.get('X-Amz-SignedHeaders').includes('content-length'));
    const uploaded = await put;
    assert.equal(uploaded.status(), 200);
    const headers = await uploaded.request().allHeaders();
    assert.equal(Number(headers['content-length']), pdf.length);
    assert.equal((await attached).status(), 201);
    await p.getByText(name, {exact: true}).waitFor();
    return signedData;
}

async function downloadResult(session, name) {
    const row = session.page.locator('.mission-file').filter({hasText: name});
    const signed = session.page.waitForResponse(r => new URL(r.url()).pathname.endsWith('/download-url'));
    const popup = session.context.waitForEvent('page');
    await row.getByRole('button', {name: 'Tải xuống', exact: true}).click();
    const response = await signed;
    assert.equal(response.status(), 200);
    const data = await response.json();
    secretValues.add(data.url);
    const downloaded = await fetch(data.url, {signal: AbortSignal.timeout(15000)});
    assert.equal(downloaded.status, 200);
    assert.deepEqual(Buffer.from(await downloaded.arrayBuffer()), pdf);
    const p = await popup;
    await p.close(); // Headless PDF downloads do not emit document DOMContentLoaded; bytes were verified above.
}

try {
    browser = await launch();
    await check('Real Customer, Operations admin and operator login', async () => {
        customer = await pageFor(browser, 'Customer A', 'customer', 'customer', '/missions');
        admin = await pageFor(browser, 'Dispatcher', 'operations', 'admin', '/dispatch/missions');
        operator = await pageFor(browser, 'Assigned operator', 'operations', 'operator', '/assigned-missions');
        current = customer.page;
    });
    await check('Protected routes require login and own profile persists', async () => {
        const anonymous = await browser.newContext();
        const page = await anonymous.newPage();
        for (const app of ['customer', 'operations', 'admin']) {
            await page.goto(origin(app) + (app === 'customer' ? '/missions' : app === 'operations' ? '/assigned-missions' : '/dashboard'));
            await page.waitForURL(/\/login/);
        }
        await anonymous.close();
        const p = customer.page;
        await p.goto(origin('customer') + '/profile');
        await p.getByRole('button', {name: 'Chỉnh sửa hồ sơ', exact: true}).click();
        await p.getByLabel('Họ và tên', {exact: true}).fill('Synthetic browser profile');
        await p.getByRole('button', {name: 'Lưu thay đổi', exact: true}).click();
        await p.getByRole('status').filter({hasText: 'Đã lưu hồ sơ của bạn.'}).waitFor();
        await p.reload();
        await p.locator('.profile-details dd').getByText('Synthetic browser profile', {exact: true}).waitFor();
    });
    await check('Every linked service resolves its mission type after navigation and a cold reload', async () => {
        const p = customer.page;
        current = p;
        const services = await api(customer.token, 'GET', '/api/v1/uav-services');
        const known = ['UAV_RENTAL', 'AREA_INSPECTION', 'AERIAL_RECORDING', 'DATA_COLLECTION'];
        const waitForCatalogue = id => p.waitForFunction(serviceId => {
            const select = document.querySelector('#mission-serviceId');
            return select && select.options.length > 2 && select.value === String(serviceId);
        }, id);
        for (const code of known) {
            const service = services.find(s => s.code === code && s.active);
            assert.ok(service, code);
            await p.goto(origin('customer') + '/services');
            await p.locator(`a[href="/customer/missions/create?serviceId=${service.id}"]`).click();
            await waitForCatalogue(service.id);
            assert.equal(await p.locator('#mission-missionType').inputValue(), code, code + ' card link');
            // Reload removes the query cache, reproducing an asynchronous catalogue response.
            await p.reload();
            await waitForCatalogue(service.id);
            assert.equal(await p.locator('#mission-missionType').inputValue(), code, code + ' cold link');
            await p.locator('#mission-missionType').selectOption('OTHER');
            await p.getByLabel(/^Tiêu đề/).fill('Keep explicit mission type');
            assert.equal(await p.locator('#mission-missionType').inputValue(), 'OTHER', code + ' explicit override');
            const other = services.find(s => s.id !== service.id && s.active && known.includes(s.code));
            await p.locator('#mission-serviceId').selectOption(String(other.id));
            assert.equal(await p.locator('#mission-missionType').inputValue(), other.code, code + ' switch service');
            await p.locator('#mission-serviceId').selectOption(String(service.id));
            assert.equal(await p.locator('#mission-missionType').inputValue(), code, code + ' selected service');
        }
    });
    await check('Customer creates AREA_INSPECTION and submits through UI', async () => {
        const p = customer.page;
        await p.goto(`${origin('customer')}/missions/create`);
        await p.locator('#mission-missionType').selectOption('AREA_INSPECTION');
        await p.getByLabel(/^Tiêu đề/).fill('Kiểm tra bàn giao ' + stamp);
        await p.getByLabel('Ngày yêu cầu').fill(date);
        await p.getByLabel(/^Bắt đầu/).fill(date + 'T09:00');
        await p.getByLabel('Kết thúc dự kiến').fill(date + 'T10:00');
        await p.getByLabel(/^Địa điểm/).fill('Khu vực thử nghiệm Hà Nội');
        await p.locator('#mission-notes').fill(requestNote);
        await p.locator('#mission-latitude').fill('0');
        await p.locator('#mission-longitude').fill('105.834');
        await p.getByRole('button', {name: 'Kiểm tra & xem lại'}).click();
        await p.getByRole('button', {name: 'Lưu bản nháp', exact: true}).click();
        await p.waitForURL(/\/missions\/\d+$/);
        id = Number(new URL(p.url()).pathname.split('/').pop());
        await p.getByText(requestNote, {exact: true}).waitFor();
        await p.getByText('Vĩ độ: 0 · Kinh độ: 105.834', {exact: true}).waitFor();
        await mutation(p, 'Gửi xác nhận', '/submit');
    });
    await check('Dispatcher confirms and assigns resources; ready is unavailable until acceptance', async () => {
        current = admin.page;
        await admin.page.goto(`${origin("operations")}/missions/${id}`);
        await admin.page.getByText(requestNote, {exact: true}).waitFor();
        await admin.page.getByText('Vĩ độ: 0 · Kinh độ: 105.834', {exact: true}).waitFor();
        await mutation(admin.page, 'Xác nhận', '/confirm');
        await assign('Trạm', fixture.stationId, 'Gán trạm', 'assign-station');
        await assign('UAV', fixture.uavId, 'Gán uav', 'assign-uav');
        await assign('Người vận hành', operator.user.id, 'Gán người vận hành', 'assign-operator');
        await admin.page.getByRole('combobox', {
            name: 'Thiết bị',
            exact: true
        }).selectOption(String(fixture.equipmentId));
        await admin.page.getByLabel('Số lượng giữ', {exact: true}).fill('2');
        await mutation(admin.page, 'Giữ thiết bị', '/reserve-equipment');
        await admin.page.getByText('Chờ người vận hành tiếp nhận', {exact: true}).waitFor();
        assert.equal(await admin.page.getByRole('button', {name: 'Sẵn sàng', exact: true}).count(), 0);
        await api(admin.token, 'POST', `/api/v1/missions/${id}/ready`, undefined, 409);
        await operator.page.goto(`${origin("operations")}/missions/${id}`);
        await operator.page.getByRole('button', {name: 'Nhận nhiệm vụ', exact: true}).waitFor();
        await shot(admin.page, 'awaiting-acceptance');
    });
    await check('Old operator tab cannot accept a changed equipment assignment', async () => {
        const old = await api(operator.token, 'GET', `/api/v1/missions/${id}`);
        await admin.page.getByRole('button', {name: /Đổi hoặc hoàn trả khoản giữ/}).first().click();
        const f = admin.page.getByRole('form', {name: 'Điều phối lại thiết bị', exact: true});
        await f.getByLabel(/^Thiết bị thay thế/).selectOption(String(fixture.equipmentId));
        await f.getByLabel(/^Số lượng mới/).fill('3');
        await f.getByLabel(/^Lý do thay đổi tài nguyên/).fill('Bổ sung thiết bị trước khi tiếp nhận');
        await mutation(admin.page, 'Xác nhận thay đổi tài nguyên', '/redispatch-equipment');
        current = operator.page;
        await mutation(operator.page, 'Nhận nhiệm vụ', '/accept', 409);
        await operator.page.getByRole('alert').filter({hasText: 'Phân công đã thay đổi'}).waitFor();
        const latest = await api(operator.token, 'GET', `/api/v1/missions/${id}`);
        assert.ok(latest.version > old.version);
        assert.equal(latest.operatorAccepted, false);
        await shot(operator.page, 'stale-acceptance');
        await mutation(operator.page, 'Nhận nhiệm vụ', '/accept');
        await admin.page.reload();
        await mutation(admin.page, 'Sẵn sàng', '/ready');
    });
    await check('Conflict after ready returns to preparation; reaccept and ready are required', async () => {
        current = operator.page;
        await operator.page.reload();
        await operator.page.getByRole('button', {name: 'Báo vướng mắc', exact: true}).click();
        await operator.page.getByLabel('Lý do / vướng mắc').fill('Cần kiểm tra pin lần cuối');
        await mutation(operator.page, 'Xác nhận báo vướng mắc', '/report-conflict');
        assert.equal((await api(operator.token, 'GET', `/api/v1/missions/${id}`)).status, 'RESOURCE_RESERVED');
        assert.equal(await operator.page.getByRole('button', {name: 'Bắt đầu', exact: true}).count(), 0);
        await api(operator.token, 'POST', `/api/v1/missions/${id}/start`, undefined, 409);
        await mutation(operator.page, 'Nhận nhiệm vụ', '/accept');
        await admin.page.reload();
        await mutation(admin.page, 'Sẵn sàng', '/ready');
        await operator.page.reload();
        await mutation(operator.page, 'Bắt đầu', '/start');
    });
    await check('Completion form requires both notes and a real handover result; mobile has no overflow', async () => {
        const p = operator.page;
        current = p;
        await p.getByRole('button', {name: 'Hoàn tất', exact: true}).click();
        const form = p.getByRole('form', {name: 'Hoàn tất nhiệm vụ', exact: true});
        assert.equal(await form.getByRole('button', {name: 'Xác nhận hoàn tất', exact: true}).isDisabled(), true);
        await form.getByLabel(/^Ghi chú kết quả/).fill(note);
        await form.getByLabel(/^Tình trạng thiết bị khi hoàn trả/).fill(condition);
        assert.equal(await form.getByRole('button', {name: 'Xác nhận hoàn tất', exact: true}).isDisabled(), true);
        await api(operator.token, 'POST', `/api/v1/missions/${id}/complete`, {
            completionNote: note,
            equipmentCondition: condition
        }, 409);
        await p.setViewportSize({width: 375, height: 812});
        await form.scrollIntoViewIfNeeded();
        assert.equal(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        await shot(p, 'missing-handover-mobile');
        await p.setViewportSize({width: 1440, height: 1000});
    });
    await check('Upload policy rejects unsupported MIME and oversized PDF before registration; server agrees', async () => {
        const p = operator.page;
        const requests = network.filter(r => r.path.endsWith('/media/upload-url')).length;
        await p.locator('input[type=file]').setInputFiles({
            name: 'not-allowed.txt',
            mimeType: 'text/plain',
            buffer: Buffer.from('synthetic')
        });
        await p.getByRole('alert').filter({hasText: 'Tệp phải có nội dung'}).waitFor();
        assert.equal(network.filter(r => r.path.endsWith('/media/upload-url')).length, requests);
        await p.locator('input[type=file]').evaluate(input => {
            const dt = new DataTransfer();
            dt.items.add(new File([new Uint8Array(100000001)], 'oversized.pdf', {type: 'application/pdf'}));
            input.files = dt.files;
            input.dispatchEvent(new Event('change', {bubbles: true}));
        });
        await p.getByRole('alert').filter({hasText: 'Tệp phải có nội dung'}).waitFor();
        assert.equal(network.filter(r => r.path.endsWith('/media/upload-url')).length, requests);
        await api(operator.token, 'POST', `/api/v1/missions/${id}/media/upload-url`, {
            originalName: 'oversized.pdf',
            contentType: 'application/pdf',
            size: 100000001,
            type: 'DOCUMENT'
        }, 400);
        await api(operator.token, 'POST', `/api/v1/missions/${id}/media/upload-url`, {
            originalName: 'not-allowed.txt',
            contentType: 'text/plain',
            size: 9,
            type: 'DOCUMENT'
        }, 400);
        const form = p.getByRole('form', {name: 'Hoàn tất nhiệm vụ', exact: true});
        assert.equal(await form.getByLabel(/^Ghi chú kết quả/).inputValue(), note);
        await shot(p, 'media-policy-error');
    });
    await check('Raw flight data uploads to MinIO but does not substitute for handover evidence', async () => {
        await upload('flight-data.pdf', 'FLIGHT_DATA');
        const form = operator.page.getByRole('form', {name: 'Hoàn tất nhiệm vụ', exact: true});
        assert.equal(await form.getByRole('button', {name: 'Xác nhận hoàn tất', exact: true}).isDisabled(), true);
        assert.equal(await form.getByLabel(/^Ghi chú kết quả/).inputValue(), note);
    });
    await check('A failed browser upload preserves authored completion notes and can recover', async () => {
        const p = operator.page;
        await p.route(storageMatcher, async route => {
            if (route.request().method() === 'PUT') await route.abort('failed'); else await route.continue();
        });
        await p.locator('input[type=file]').setInputFiles({
            name: 'interrupted-result.pdf',
            mimeType: 'application/pdf',
            buffer: pdf
        });
        await p.getByRole('alert').filter({hasText: 'Chưa xác nhận được việc gắn tệp'}).waitFor();
        await p.unroute(storageMatcher);
        assert.equal(await p.getByRole('form', {
            name: 'Hoàn tất nhiệm vụ',
            exact: true
        }).getByLabel(/^Ghi chú kết quả/).inputValue(), note);
        assert.equal((await api(operator.token, 'GET', `/api/v1/missions/${id}/media`)).length, 1);
    });
    await check('Operator uploads a report, downloads it and completes; stock returns exactly once', async () => {
        const p = operator.page;
        await upload('handover-report.pdf', 'DOCUMENT');
        await downloadResult(operator, 'handover-report.pdf');
        const form = p.getByRole('form', {name: 'Hoàn tất nhiệm vụ', exact: true});
        assert.equal(await form.getByRole('button', {name: 'Xác nhận hoàn tất', exact: true}).isEnabled(), true);
        await form.scrollIntoViewIfNeeded();
        await shot(p, 'handover-ready');
        await mutation(p, 'Xác nhận hoàn tất', '/complete');
        await p.locator('[data-status=COMPLETED]').waitFor();
        assert.equal((await api(admin.token, 'GET', `/api/v1/inventory/equipment/${fixture.equipmentId}`)).reservedQuantity, 0);
        assert.equal(await p.locator('input[type=file]').count(), 0);
        await api(operator.token, 'POST', `/api/v1/missions/${id}/complete`, {
            completionNote: note,
            equipmentCondition: condition
        }, 409);
        await shot(p, 'operator-completed');
    });
    await check('Replaying signed upload cannot overwrite the delivered object', async () => {
        let r = await fetch(uploadUrl, {
            signal: AbortSignal.timeout(15000),
            method: 'PUT',
            headers: {'Content-Type': 'application/pdf', 'If-None-Match': '*'},
            body: Buffer.alloc(pdf.length, 65)
        });
        assert.equal(r.status, 412);
        r = await fetch(uploadUrl, {
            signal: AbortSignal.timeout(15000),
            method: 'PUT',
            headers: {'Content-Type': 'application/pdf'},
            body: Buffer.alloc(pdf.length, 65)
        });
        assert.ok(r.status >= 400 && r.status < 500);
        await api(operator.token, 'POST', `/api/v1/missions/${id}/media/upload-url`, {
            originalName: 'late.pdf',
            contentType: 'application/pdf',
            size: 4,
            type: 'DOCUMENT'
        }, 409);
        await api(admin.token, 'DELETE', `/api/v1/media/${mediaId}`, undefined, 409);
        await downloadResult(operator, 'handover-report.pdf');
    });
    await check('Customer sees handover notes, equipment condition, timeline and actual downloadable result', async () => {
        const p = customer.page;
        current = p;
        await p.reload();
        await p.getByRole('heading', {name: 'Kết quả bàn giao', exact: true}).waitFor();
        assert.ok(await p.getByText(note, {exact: true}).count() > 0);
        await p.getByText(condition, {exact: true}).waitFor();
        await downloadResult(customer, 'handover-report.pdf');
        await p.getByRole('heading', {name: 'Kết quả bàn giao', exact: true}).scrollIntoViewIfNeeded();
        await shot(p, 'customer-handover');
        await p.setViewportSize({width: 375, height: 812});
        assert.equal(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        await shot(p, 'customer-handover-mobile');
    });
    await check('Another customer and unassigned operator cannot read mission, timeline, files or download', async () => {
        otherCustomer = await pageFor(browser, 'Customer B', 'customer', 'customer_b', '/missions');
        otherOperator = await pageFor(browser, 'Unassigned operator', 'operations', 'operator_b', '/assigned-missions');
        for (const session of [otherCustomer, otherOperator]) {
            for (const suffix of ['', '/timeline', '/media']) await api(session.token, 'GET', `/api/v1/missions/${id}${suffix}`, undefined, 403);
            await api(session.token, 'GET', `/api/v1/media/${mediaId}/download-url`, undefined, 403);
        }
        current = otherCustomer.page;
        await otherCustomer.page.goto(`${origin("customer")}/missions/${id}`);
        await otherCustomer.page.getByRole('alert').filter({hasText: 'không thuộc tài khoản'}).waitFor();
        assert.equal(await otherCustomer.page.getByText('handover-report.pdf', {exact: true}).count(), 0);
    });
    await check('Admin audit includes acceptance, conflict and completion; no unexpected runtime failure', async () => {
        const portal = await pageFor(browser, 'Admin audit', 'admin', 'admin', '/audit-logs');
        current = portal.page;
        await portal.page.getByRole('heading', {name: 'Nhật ký quản trị', exact: true}).waitFor();
        await portal.page.locator('tbody tr').first().waitFor();
        await portal.page.getByLabel('Tìm trong trang hiện tại').fill('Hoàn tất');
        await portal.page.getByRole('row').filter({hasText: 'Hoàn tất'}).first().waitFor();
        await shot(portal.page, 'handover-audit');
        const timeline = await api(operator.token, 'GET', `/api/v1/missions/${id}/timeline`);
        for (const type of ['OPERATOR_ACCEPTED', 'OPERATOR_CONFLICT', 'COMPLETED', 'MEDIA_ATTACHED']) assert.ok(timeline.some(e => e.eventType === type));
        assert.equal(timeline.filter(e => e.eventType === 'COMPLETED').length, 1);
        assert.deepEqual(errors, []);
        assert.deepEqual(network.filter(r => r.status >= 500), []);
    });
    await check('Logout clears browser access to protected customer routes', async () => {
        if (customer.page.viewportSize().width < 901) await customer.page.getByRole('button', {
            name: 'Mở điều hướng',
            exact: true
        }).click();
        await customer.page.getByRole('button', {name: /Đăng xuất/}).click();
        await customer.page.waitForURL(/\/login/);
        await customer.page.goto(origin('customer') + '/missions');
        await customer.page.waitForURL(/\/login/);
    });
    await fs.writeFile(path.join(work, 'mission.json'), JSON.stringify({
        missionId: id,
        mediaId,
        pdfSha256: (await import('node:crypto')).createHash('sha256').update(pdf).digest('hex')
    }));
} catch (e) {
    error = e;
    if (current) await shot(current, 'handover-failure').catch(() => {
    });
    process.exitCode = 1;
} finally {
    await finish('browser', error);
    if (browser) await browser.close();
}
