import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {
    canSubmitAccountDeletion,
    formatAppleFullName,
    isAppleAuthDisabledError,
    isAppleSignInCanceled,
    nextSignInStep,
    normalizeCode,
    registerVerifyParams,
    signInErrorText,
} from '../src/forms/auth/sign-in-flow.ts';
import {fromLocalIso, newMissionDraft, toLocalIso, withEnd, withPoint, withStart} from '../src/forms/mission/mission-draft.ts';
import {canCancel, MISSION_FILTERS, progressStep, statusTone} from '../src/utils/mission/status.ts';
import {gradientStops, nextHours} from '../src/utils/weather/gradient.ts';

test('sign-in flow: finished, second factor, email verification and pending approval', () => {
    assert.deepEqual(nextSignInStep({accessToken: 'a', refreshToken: 'r', user: {id: 1}, tokenType: 'Bearer'}), {kind: 'done'});
    const totp = nextSignInStep({mfaRequired: true, mfaMethod: 'TOTP', challengeToken: 'c', maskedEmail: 'a***@x.vn', user: {email: 'a@x.vn'}, tokenType: 'Bearer'});
    assert.deepEqual(totp, {kind: 'verify', params: {purpose: 'login', challengeToken: 'c', email: 'a@x.vn', maskedEmail: 'a***@x.vn', method: 'TOTP'}});
    const verifyEmail = nextSignInStep({mfaRequired: true, mfaMethod: 'EMAIL_VERIFY', challengeToken: 'v', tokenType: 'Bearer'}, 'me@x.vn');
    assert.equal(verifyEmail.params.purpose, 'register');
    assert.equal(verifyEmail.params.method, 'EMAIL');
    assert.equal(verifyEmail.params.email, 'me@x.vn');
    assert.deepEqual(nextSignInStep({mfaMethod: 'PENDING_APPROVAL', tokenType: 'Bearer'}), {kind: 'pending-approval'});
    assert.equal(registerVerifyParams({challengeToken: 't', email: 'e@x.vn', maskedEmail: 'e***', purpose: 'REGISTER_VERIFY', method: 'EMAIL'}).purpose, 'register');
});

test('sign-in flow: codes keep six digits and errors prefer known codes', () => {
    assert.equal(normalizeCode(' 12 34-567 89'), '123456');
    const t = key => ({'customerAuth.errors.INVALID_CREDENTIALS': 'Sai mật khẩu', 'customerAuth.errors.default': 'Có lỗi'})[key] ?? key;
    assert.equal(signInErrorText({code: 'INVALID_CREDENTIALS', message: 'x'}, t), 'Sai mật khẩu');
    assert.equal(signInErrorText({code: 'OTHER', message: 'Từ máy chủ'}, t), 'Từ máy chủ');
    assert.equal(signInErrorText(null, t), 'Có lỗi');
});

test('mission draft: tomorrow 08:00 for the service duration, moving the start keeps the duration', () => {
    const draft = newMissionDraft(new Date(2026, 10, 1, 15, 20), 7, 90);
    assert.equal(draft.startTime, '2026-11-02T08:00');
    assert.equal(draft.expectedEndTime, '2026-11-02T09:30');
    assert.equal(draft.requestedDate, '2026-11-02');
    assert.equal(draft.serviceId, 7);
    const moved = withStart(draft, new Date(2026, 10, 5, 23, 0));
    assert.equal(moved.startTime, '2026-11-05T23:00');
    assert.equal(moved.expectedEndTime, '2026-11-06T00:30', 'crosses midnight with the same 90 minutes');
    assert.equal(moved.requestedDate, '2026-11-05');
    assert.equal(withEnd(moved, new Date(2026, 10, 6, 2, 0)).expectedEndTime, '2026-11-06T02:00');
    assert.deepEqual([withPoint(draft, 21.0136789, 105.5259123).latitude, withPoint(draft, 21.0136789, 105.5259123).longitude], [21.01368, 105.52591]);
    const polygonDraft = {
        ...draft,
        flightPlan: {
            areaType: 'POLYGON',
            vertices: [[21.01, 105.51], [21.02, 105.52], [21.03, 105.51]],
            altitudeAglMeters: 80,
            targetGsdCm: 3,
            forwardOverlap: 80,
            sideOverlap: 70,
            sensors: ['RGB_4K'],
            permitSupport: false,
        },
    };
    const updatedPolygonDraft = withPoint(polygonDraft, 21.015555, 105.519999);
    assert.deepEqual(updatedPolygonDraft.flightPlan.vertices, polygonDraft.flightPlan.vertices, 'POLYGON vertices drawn on web stay intact');
    assert.equal(updatedPolygonDraft.flightPlan.takeoffLatitude, 21.01556);
    assert.equal(updatedPolygonDraft.flightPlan.takeoffLongitude, 105.52);
    assert.equal(toLocalIso(fromLocalIso('2026-01-09T07:05')), '2026-01-09T07:05');
    assert.equal(fromLocalIso('not a date'), null);
});

test('mission status: filters, tones, progress and the web cancel rule', () => {
    assert.deepEqual(MISSION_FILTERS.scheduled, ['CONFIRMED', 'RESOURCE_RESERVED', 'READY']);
    const all = new Set(Object.values(MISSION_FILTERS).flat());
    assert.equal(all.size, 10, 'every status belongs to one filter');
    assert.equal(statusTone('FAILED'), 'danger');
    assert.equal(statusTone('IN_PROGRESS'), 'progress');
    assert.deepEqual(['DRAFT', 'PENDING_CONFIRMATION', 'READY', 'COMPLETED', 'CANCELLED'].map(progressStep), [0, 1, 2, 3, -1]);
    assert.deepEqual(['DRAFT', 'PENDING_CONFIRMATION', 'CONFIRMED'].map(canCancel), [true, true, false]);
});

test('weather: sky gradients and the next-hours strip', () => {
    assert.deepEqual(gradientStops('bg-gradient-to-br from-[#fff8e6] via-[#ffecc2] to-[#ffd98f]'), ['#fff8e6', '#ffecc2', '#ffd98f']);
    assert.deepEqual(gradientStops('bg-gradient-to-br from-[#454c5c] to-[#1f2430]'), ['#454c5c', '#1f2430']);
    assert.equal(gradientStops('none').length, 2);
    assert.deepEqual(nextHours(new Date(2026, 10, 1, 22, 40)), [undefined, '2026-11-02T01:00', '2026-11-02T04:00', '2026-11-02T07:00', '2026-11-02T10:00']);
});

test('apple sign-in: fullName formatting, cancel/503 guards and horizontal social row wiring', () => {
    assert.equal(formatAppleFullName({givenName: 'Minh', familyName: 'Nguyễn'}), 'Minh Nguyễn');
    assert.equal(formatAppleFullName({givenName: '  Minh ', familyName: null}), 'Minh');
    assert.equal(formatAppleFullName({givenName: null, familyName: '   '}), undefined);
    assert.equal(formatAppleFullName(null), undefined);

    assert.equal(isAppleSignInCanceled({code: 'ERR_REQUEST_CANCELED'}), true);
    assert.equal(isAppleSignInCanceled({code: 'ERR_CANCELED'}), true);
    assert.equal(isAppleSignInCanceled({code: 'OTHER'}), false);
    assert.equal(isAppleAuthDisabledError({code: 'APPLE_AUTH_DISABLED'}), true);
    assert.equal(isAppleAuthDisabledError({code: 'INVALID_CREDENTIALS'}), false);

    const appJson = JSON.parse(readFileSync(new URL('../app.json', import.meta.url), 'utf8'));
    assert.equal(appJson.expo.ios.usesAppleSignIn, true);
    assert.ok(appJson.expo.plugins.includes('expo-apple-authentication'));

    const authApi = readFileSync(new URL('../src/api/auth/auth.api.ts', import.meta.url), 'utf8');
    assert.match(authApi, /loginWithApple:/);
    assert.match(authApi, /API_ROUTES\.auth\.apple/);

    const socialRow = readFileSync(new URL('../src/components/auth/SocialSignInRow.tsx', import.meta.url), 'utf8');
    assert.match(socialRow, /<GoogleSignInButton/);
    assert.match(socialRow, /<AppleSignInButton/);
    assert.match(socialRow, /flexDirection:\s*'row'/);

    const loginScreen = readFileSync(new URL('../src/components/auth/LoginScreen.tsx', import.meta.url), 'utf8');
    const registerScreen = readFileSync(new URL('../src/components/auth/RegisterScreen.tsx', import.meta.url), 'utf8');
    assert.match(loginScreen, /<SocialSignInRow/);
    assert.match(registerScreen, /<SocialSignInRow\s+mode="signup"/);
});

test('account deletion & compact account controls: 100% Admin-policy driven with zero hardcoded rules', () => {
    const basePolicy = {
        enabled: true,
        eligible: true,
        hasPassword: true,
        requirePassword: true,
        requireReason: false,
        confirmationPhrase: 'DELETE-NOW',
    };

    assert.equal(canSubmitAccountDeletion(null, {phrase: 'DELETE-NOW', currentPassword: 'secret', reason: ''}), false);
    assert.equal(
        canSubmitAccountDeletion({...basePolicy, enabled: false}, {phrase: 'DELETE-NOW', currentPassword: 'secret', reason: ''}),
        false,
    );
    assert.equal(
        canSubmitAccountDeletion({...basePolicy, eligible: false}, {phrase: 'DELETE-NOW', currentPassword: 'secret', reason: ''}),
        false,
    );
    assert.equal(
        canSubmitAccountDeletion(basePolicy, {phrase: 'WRONG', currentPassword: 'secret', reason: ''}),
        false,
        'must match dynamic confirmationPhrase from Admin policy',
    );
    assert.equal(
        canSubmitAccountDeletion(basePolicy, {phrase: 'DELETE-NOW', currentPassword: '', reason: ''}),
        false,
        'requires password when policy.requirePassword && policy.hasPassword',
    );
    assert.equal(
        canSubmitAccountDeletion({...basePolicy, hasPassword: false}, {phrase: 'DELETE-NOW', currentPassword: '', reason: ''}),
        true,
        'OAuth-only accounts without password are not blocked by password field',
    );
    assert.equal(
        canSubmitAccountDeletion({...basePolicy, requireReason: true}, {phrase: 'DELETE-NOW', currentPassword: 'secret', reason: '   '}),
        false,
    );
    assert.equal(
        canSubmitAccountDeletion({...basePolicy, requireReason: true}, {phrase: '  DELETE-NOW ', currentPassword: 'secret', reason: 'No longer flying'}),
        true,
    );

    const profileApi = readFileSync(new URL('../src/api/profile/profile.api.ts', import.meta.url), 'utf8');
    assert.match(profileApi, /API_ROUTES\.users\.deletionPolicy/);
    assert.match(profileApi, /API_ROUTES\.users\.deleteOwnAccount/);

    const moreSheet = readFileSync(new URL('../src/components/profile/AccountMoreSheet.tsx', import.meta.url), 'utf8');
    assert.match(moreSheet, /if\s*\(router\.canDismiss\(\)\)\s*router\.dismiss\(\)/);
});
