import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const readSrc = rel => readFileSync(new URL(`../src/${rel}`, import.meta.url), 'utf8');

test('mobile LiveNotificationBanner, foreground Expo handler, and NotificationModulePrefsCard are wired end-to-end', () => {
    const rootLayout = readSrc('app/_layout.tsx');
    const hook = readSrc('hooks/useNotifications.ts');
    const banner = readSrc('components/notification/LiveNotificationBanner.tsx');
    const prefs = readSrc('components/notification/NotificationModulePrefsCard.tsx');
    const screen = readSrc('components/notification/NotificationsScreen.tsx');

    assert.match(rootLayout, /<LiveNotificationBanner\/>/);
    assert.match(hook, /setNotificationHandler/);
    assert.match(hook, /shouldShowBanner:\s*true/);
    assert.match(banner, /useRealtimeMobileNotifications/);
    assert.match(banner, /popupDurationMs/);
    assert.match(prefs, /useUserNotificationPreferences/);
    assert.match(prefs, /mandatoryBadge/);
    assert.match(screen, /<NotificationModulePrefsCard\/>/);
});
