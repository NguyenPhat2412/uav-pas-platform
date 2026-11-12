import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const read = rel => readFile(new URL(`../${rel}`, import.meta.url), 'utf8');

test('collapsed sidebar uses group icons with floating hover flyout card across Admin, Operations, and Customer shells', async () => {
    const [
        sidebarController,
        flyoutSource,
        adminShell,
        opsShell,
        customerSidebar,
    ] = await Promise.all([
        read('src/hooks/useSidebarController.ts'),
        read('src/components/layout/CollapsedNavFlyout.tsx'),
        read('src/components/layout/AdminAppShell.tsx'),
        read('src/components/layout/AppShell.tsx'),
        read('src/components/customer/CustomerNavSidebar.tsx'),
    ]);

    // Collapsed rail stays compact on hover (no full-sidebar peek expansion)
    assert.match(sidebarController, /const peeking = false/);
    assert.match(sidebarController, /const railCollapsed = collapsed && !open/);
    assert.doesNotMatch(sidebarController, /setPeek\(true\)/);

    // Floating flyout renders in document.body portal with uppercase group header, bullet dots,crimson icons, and hover bridge
    assert.match(flyoutSource, /createPortal/);
    assert.match(flyoutSource, /uppercase/);
    assert.match(flyoutSource, /-left-5 w-5/);
    assert.match(flyoutSource, /rounded-2xl/);
    assert.match(flyoutSource, /rounded-full/);
    assert.match(flyoutSource, /#ab2523/);

    // All 3 portal shells wire CollapsedNavGroupTrigger + CollapsedNavFlyoutPortal
    for (const [name, source] of [
        ['AdminAppShell', adminShell],
        ['OperationsAppShell', opsShell],
        ['CustomerNavSidebar', customerSidebar],
    ]) {
        assert.match(source, /useCollapsedNavFlyout/, `${name} must use useCollapsedNavFlyout`);
        assert.match(source, /CollapsedNavGroupTrigger/, `${name} must render CollapsedNavGroupTrigger`);
        assert.match(source, /CollapsedNavFlyoutPortal/, `${name} must mount CollapsedNavFlyoutPortal`);
    }
});
