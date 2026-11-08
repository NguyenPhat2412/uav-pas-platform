/**
 * The pages a user keeps open as tabs in one portal, kept in this browser only. A tab is a sidebar
 * destination (href) plus the path last seen under it, so a tab left on /admin/users/42 reopens there.
 * The pinned tab (the portal home) is always first and cannot be closed.
 */
export interface WorkspaceTab {
    href: string;
    path: string;
}

export const WORKSPACE_TAB_LIMIT = 10;

export function readWorkspaceTabs(key: string): WorkspaceTab[] {
    try {
        const parsed: unknown = JSON.parse(localStorage.getItem(key) ?? '[]');
        if (!Array.isArray(parsed)) return [];
        return parsed
            .filter((tab): tab is WorkspaceTab => typeof tab?.href === 'string' && typeof tab?.path === 'string')
            .slice(0, WORKSPACE_TAB_LIMIT);
    } catch {
        return [];
    }
}

export function writeWorkspaceTabs(key: string, tabs: WorkspaceTab[]) {
    try {
        localStorage.setItem(key, JSON.stringify(tabs));
    } catch {
        // storage unavailable (private mode, quota): the tabs then last for this visit only
    }
}

/** Puts the pinned tab first, once. */
export function withPinnedTab(tabs: WorkspaceTab[], pinned: string): WorkspaceTab[] {
    const home = tabs.find(tab => tab.href === pinned) ?? {href: pinned, path: pinned};
    if (tabs[0] === home && tabs.filter(tab => tab.href === pinned).length === 1) return tabs;
    return [home, ...tabs.filter(tab => tab.href !== pinned)];
}

/**
 * Opens (or moves) the tab for a destination. A new tab goes last; past the limit the oldest
 * closable tab other than this one makes room. Returns the same array when nothing changed.
 */
export function openWorkspaceTab(tabs: WorkspaceTab[], tab: WorkspaceTab, pinned: string, limit = WORKSPACE_TAB_LIMIT): WorkspaceTab[] {
    const index = tabs.findIndex(item => item.href === tab.href);
    if (index >= 0) {
        if (tabs[index].path === tab.path) return tabs;
        return tabs.map((item, i) => (i === index ? tab : item));
    }
    const next = [...tabs, tab];
    while (next.length > limit) {
        const drop = next.findIndex(item => item.href !== pinned && item.href !== tab.href);
        if (drop < 0) break;
        next.splice(drop, 1);
    }
    return next;
}

/**
 * Closes one tab. When it was the active one, `next` is the path to show instead: the tab to its
 * right, else the one to its left (the pinned tab is never closed, so one always remains).
 */
export function closeWorkspaceTab(tabs: WorkspaceTab[], href: string, activeHref: string | undefined, pinned: string): {
    tabs: WorkspaceTab[];
    next?: string
} {
    const index = tabs.findIndex(tab => tab.href === href);
    if (index < 0 || href === pinned) return {tabs};
    const rest = tabs.filter((_, i) => i !== index);
    if (href !== activeHref) return {tabs: rest};
    return {tabs: rest, next: (rest[index] ?? rest[index - 1])?.path ?? pinned};
}

/** Keeps the pinned tab and `keep` (when given); everything else closes. */
export function closeOtherWorkspaceTabs(tabs: WorkspaceTab[], pinned: string, keep?: string): WorkspaceTab[] {
    return tabs.filter(tab => tab.href === pinned || tab.href === keep);
}
