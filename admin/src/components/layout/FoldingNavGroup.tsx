'use client';

import {useMemo, useState} from 'react';
import {useBrowserStorage, writeBrowserStorage} from '@/hooks/useBrowserStorage';
import type {ReactNode} from 'react';
import type {LucideIcon} from 'lucide-react';
import {ChevronRight} from 'lucide-react';
import {cn} from '@/lib/utils';

function parseOpenGroups(raw: string | null): Record<string, boolean> {
    try {
        const parsed: unknown = JSON.parse(raw ?? '{}');
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, boolean> : {};
    } catch {
        return {};
    }
}

/**
 * Which sidebar groups (and optional Level-2 sub-groups) are unfolded. The user's own clicks are kept
 * per browser; the group/sub-group of the active page always unfolds so the current page stays visible.
 */
export function useFoldedNavGroups(storageKey: string, activeGroup?: string, activeSubGroup?: string) {
    const raw = useBrowserStorage(storageKey);
    const saved = useMemo(() => parseOpenGroups(raw), [raw]);
    const activeSignature = `${activeGroup ?? ''}::${activeSubGroup ?? ''}`;
    // Clicks on this page win over the forced-open active group; a new page starts from what is stored.
    const [clicked, setClicked] = useState<Record<string, boolean>>({});
    const [clickedFor, setClickedFor] = useState(activeSignature);
    if (clickedFor !== activeSignature) {
        setClickedFor(activeSignature);
        setClicked({});
    }
    const openGroups = {
        ...saved,
        ...(activeGroup ? {[activeGroup]: true} : {}),
        ...(activeSubGroup ? {[activeSubGroup]: true} : {}),
        ...clicked,
    };
    const toggleGroup = (group: string) => {
        const expand = !openGroups[group];
        setClicked(prev => ({...prev, [group]: expand}));
        // When storage refuses the write, the click still applies for this visit through `clicked`.
        writeBrowserStorage(storageKey, JSON.stringify({...saved, ...clicked, [group]: expand}));
    };
    return {openGroups, toggleGroup};
}

/** Link style for a page inside a folding group; the focus ring is drawn inside because the list clips. */
export function foldedLinkClass(active: boolean) {
    return cn('block truncate rounded-lg px-2.5 py-1.5 text-[13px] leading-5 outline-none transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#ab2523]',
        active ? 'bg-[#ab2523]/10 font-semibold text-[#ab2523]' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900');
}

/** Link style for a Level-3 leaf page nested inside a Level-2 sub-group. */
export function foldedSubLinkClass(active: boolean) {
    return cn('block truncate rounded-lg px-2 py-1 text-[12.5px] leading-5 outline-none transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#ab2523]',
        active ? 'bg-[#ab2523]/10 font-semibold text-[#ab2523]' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900');
}

/** A sidebar group shown as one row with an icon and chevron; its pages unfold underneath. */
export function FoldingNavGroup({id, label, icon: Icon, expanded, active, onToggle, children}: {
    id: string; label: string; icon: LucideIcon; expanded: boolean; active: boolean; onToggle: () => void; children: ReactNode;
}) {
    return <div>
        <button type="button" onClick={onToggle} aria-expanded={expanded} aria-controls={id} title={label}
                className={cn('flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[13px] leading-5 outline-none transition-colors hover:bg-slate-100 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#ab2523]',
                    active && !expanded ? 'bg-[#ab2523]/10 font-semibold text-[#ab2523]' : active ? 'font-semibold text-slate-900' : 'font-medium text-slate-800')}>
            <Icon size={16} className="shrink-0 text-[#ab2523]" aria-hidden="true"/>
            <span className="min-w-0 flex-1 truncate">{label}</span>
            <ChevronRight size={14} aria-hidden="true" className={cn('shrink-0 text-slate-400 transition-transform duration-200', expanded && 'rotate-90')}/>
        </button>
        <div id={id} inert={!expanded}
             className={cn('grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none', expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
            {/* overflow-hidden lets the list fold to zero height. */}
            <ul className="m-0 ml-[17px] min-h-0 list-none space-y-0.5 overflow-hidden border-l border-slate-200 py-0.5 pl-2">{children}</ul>
        </div>
    </div>;
}

/** Level-2 collapsible sub-group inside a dense Level-1 group (3-level hybrid tree). */
export function FoldingSubNavGroup({id, label, icon: Icon, count, badge, expanded, active, onToggle, children}: {
    id: string;
    label: string;
    icon: LucideIcon;
    count?: number;
    badge?: ReactNode;
    expanded: boolean;
    active: boolean;
    onToggle: () => void;
    children: ReactNode;
}) {
    return <li className="pt-0.5">
        <button type="button" onClick={onToggle} aria-expanded={expanded} aria-controls={id} title={label}
                className={cn('flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left text-[12px] leading-5 outline-none transition-colors hover:bg-slate-100/90 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#ab2523]',
                    active && !expanded ? 'bg-[#ab2523]/8 font-semibold text-[#ab2523]' : active ? 'font-semibold text-slate-800' : 'font-medium text-slate-500 hover:text-slate-800')}>
            <Icon size={13.5} className={cn('shrink-0 transition-colors', active ? 'text-[#ab2523]' : 'text-slate-400')} aria-hidden="true"/>
            <span className="min-w-0 flex-1 truncate">{label}</span>
            {badge ?? (!expanded && count !== undefined ? (
                <span className="shrink-0 rounded-full bg-slate-100 px-1.5 py-0.2 text-[10px] font-semibold leading-4 text-slate-500">
                    {count}
                </span>
            ) : null)}
            <ChevronRight size={12.5} aria-hidden="true" className={cn('shrink-0 text-slate-400 transition-transform duration-200', expanded && 'rotate-90')}/>
        </button>
        <div id={id} inert={!expanded}
             className={cn('grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none', expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
            <ul className="m-0 ml-2.5 min-h-0 list-none space-y-0.5 overflow-hidden border-l border-slate-200/80 py-0.5 pl-2">{children}</ul>
        </div>
    </li>;
}
