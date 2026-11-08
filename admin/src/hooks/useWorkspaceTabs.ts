'use client';

import {createContext, useCallback, useContext, useEffect, useState} from 'react';
import {
    closeOtherWorkspaceTabs,
    closeWorkspaceTab,
    openWorkspaceTab,
    readWorkspaceTabs,
    withPinnedTab,
    writeWorkspaceTabs,
    type WorkspaceTab,
} from '@/lib/workspace-tabs';

/**
 * The open-page tabs of one portal shell. The shell only renders in the browser (it waits for the
 * session), so the saved tabs are read on the first render. Visiting a sidebar destination opens its
 * tab, or moves that tab to the current path.
 */
export function useWorkspaceTabs({storageKey, pinnedHref, activeHref, pathname}: {
    storageKey: string;
    pinnedHref: string;
    activeHref?: string;
    pathname: string;
}) {
    const [tabs, setTabs] = useState<WorkspaceTab[]>(() => withPinnedTab(readWorkspaceTabs(storageKey), pinnedHref));
    const [dirtyHref, setDirtyHref] = useState<string | null>(null);

    // Adjusts state while rendering (not in an effect) so the new tab shows in the same paint as the page.
    const visit = activeHref ? `${activeHref}|${pathname}` : null;
    const [lastVisit, setLastVisit] = useState<string | null>(null);
    if (visit !== lastVisit) {
        setLastVisit(visit);
        if (activeHref) setTabs(prev => openWorkspaceTab(prev, {href: activeHref, path: pathname}, pinnedHref));
    }

    useEffect(() => {
        writeWorkspaceTabs(storageKey, tabs);
    }, [storageKey, tabs]);

    /** Closes a tab and returns the path to navigate to when it was the one on screen. */
    const close = (href: string) => {
        const result = closeWorkspaceTab(tabs, href, activeHref, pinnedHref);
        setTabs(result.tabs);
        return result.next;
    };

    /** Closes every tab but the pinned one and `keep`; returns where to go if the current page closed. */
    const closeOthers = (keep?: string) => {
        setTabs(closeOtherWorkspaceTabs(tabs, pinnedHref, keep));
        const stays = activeHref === pinnedHref || activeHref === keep;
        return stays ? undefined : (tabs.find(tab => tab.href === keep)?.path ?? pinnedHref);
    };

    // Bound to the page on screen: only that page can hold unsaved input, the others are unmounted.
    const reportDirty = useCallback((dirty: boolean) => {
        if (!activeHref) return;
        setDirtyHref(prev => (dirty ? activeHref : prev === activeHref ? null : prev));
    }, [activeHref]);

    return {tabs, dirtyHref, close, closeOthers, reportDirty};
}

export const UnsavedChangesContext = createContext<((dirty: boolean) => void) | null>(null);

/**
 * A page with unsaved input calls this: its tab shows a dot, closing or leaving the tab asks first,
 * and closing or reloading the browser tab warns.
 */
export function useUnsavedChanges(dirty: boolean) {
    const report = useContext(UnsavedChangesContext);
    useEffect(() => {
        report?.(dirty);
        return () => report?.(false);
    }, [dirty, report]);
    useEffect(() => {
        if (!dirty) return;
        const warn = (event: BeforeUnloadEvent) => {
            event.preventDefault();
            event.returnValue = '';
        };
        window.addEventListener('beforeunload', warn);
        return () => window.removeEventListener('beforeunload', warn);
    }, [dirty]);
}
