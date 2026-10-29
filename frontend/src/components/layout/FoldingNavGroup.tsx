'use client';

import {useEffect, useState} from 'react';
import type {ReactNode} from 'react';
import type {LucideIcon} from 'lucide-react';
import {ChevronRight} from 'lucide-react';
import {cn} from '@/lib/utils';

function readOpenGroups(storageKey: string): Record<string, boolean> {
    try {
        const parsed: unknown = JSON.parse(localStorage.getItem(storageKey) ?? '{}');
        return parsed && typeof parsed === 'object' ? parsed as Record<string, boolean> : {};
    } catch {
        return {};
    }
}

/**
 * Which sidebar groups are unfolded. The user's own clicks are kept per browser; the group of the
 * page being opened always unfolds so the current page stays visible, without being stored.
 */
export function useFoldedNavGroups(storageKey: string, activeGroup?: string) {
    const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
    useEffect(() => {
        const saved = readOpenGroups(storageKey);
        setOpenGroups(activeGroup ? {...saved, [activeGroup]: true} : saved);
    }, [storageKey, activeGroup]);
    const toggleGroup = (group: string) => setOpenGroups(prev => {
        const expand = !prev[group];
        try {
            localStorage.setItem(storageKey, JSON.stringify({...readOpenGroups(storageKey), [group]: expand}));
        } catch {
            // storage unavailable: folding still works for this visit
        }
        return {...prev, [group]: expand};
    });
    return {openGroups, toggleGroup};
}

/** Link style for a page inside a folding group; the focus ring is drawn inside because the list clips. */
export function foldedLinkClass(active: boolean) {
    return cn('block truncate rounded-lg px-2.5 py-1.5 text-[13px] leading-5 outline-none transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary',
        active ? 'bg-slate-100 font-medium text-slate-900' : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900');
}

/** A sidebar group shown as one row with an icon and chevron; its pages unfold underneath. */
export function FoldingNavGroup({id, label, icon: Icon, expanded, active, onToggle, children}: {
    id: string; label: string; icon: LucideIcon; expanded: boolean; active: boolean; onToggle: () => void; children: ReactNode;
}) {
    return <div>
        <button type="button" onClick={onToggle} aria-expanded={expanded} aria-controls={id}
                className={cn('flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[13px] leading-5 outline-none transition-colors hover:bg-slate-100 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary',
                    active && !expanded ? 'font-semibold text-slate-900' : 'font-medium text-slate-800')}>
            <Icon size={16} className="shrink-0" aria-hidden="true"/>
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
