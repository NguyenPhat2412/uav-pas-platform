'use client';

import {type ReactNode, useEffect, useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {MessagesSquare, MonitorCog, Router, Settings} from 'lucide-react';
import Link from 'next/link';
import {AdminPage} from '@/components/layout/AdminPage';
import {QueryState} from '@/components/data/WorkspaceState';
import {useI18n} from '@/contexts/I18nContext';
import {assistantKeys, assistantService} from '@/lib/api/services';
import {AssistantConversations} from '@/features/assistant/components/AssistantConversations';
import type {RouterConsoleTab} from '@/features/assistant/types/assistant.types';
import {cn} from '@/lib/utils';

/** The gateway's console address: the configured API base without its /v1 suffix. */
export function consoleUrl(baseUrl: string) {
    return baseUrl.replace(/\/+$/, '').replace(/\/v1$/, '') + '/dashboard';
}

export default function AdminRouterConsole() {
    return <AdminPage title="adminNav.aiRouter" permission="PERMISSION_MANAGE" activeResource="/admin/ai-router">
        <AssistantTabs/>
    </AdminPage>;
}

export function AdminAiConversationsWorkspace() {
    const {t} = useI18n();
    return (
        <AdminPage
            title="adminNav.aiConversations"
            permission="PERMISSION_MANAGE"
            activeResource="/admin/ai-router/conversations"
        >
            <AssistantConversations actions={<>
                <Link href="/admin/ai-router"
                      className="inline-flex h-9 items-center gap-1.5 rounded-control border border-border bg-slate-50 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100">
                    <MonitorCog size={13} aria-hidden="true"/>{t('adminNav.aiRouter')}</Link>
                <Link href="/admin/settings#assistant"
                      className="inline-flex h-9 items-center gap-1.5 rounded-control border border-border bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                    <Settings size={13} aria-hidden="true"/>{t('admin.aiRouter.assistantSettings')}</Link>
            </>}/>
        </AdminPage>
    );
}

/** Console and stored chats share the page; #chats deep-links to the second tab. */
function AssistantTabs() {
    const {t} = useI18n();
    const [tab, setTab] = useState<RouterConsoleTab>('console');
    useEffect(() => {
        // Read once after hydration: the server render has no hash.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (window.location.hash === '#chats') setTab('chats');
    }, []);
    const select = (next: RouterConsoleTab) => {
        setTab(next);
        history.replaceState(null, '', next === 'chats' ? '#chats' : window.location.pathname);
    };
    const tabs = <div role="tablist" aria-label={t('adminNav.aiRouter')} className="flex gap-1">
        {([['console', MonitorCog], ['chats', MessagesSquare]] as const).map(([id, Icon]) =>
            <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => select(id)}
                    className={cn('inline-flex h-8 items-center gap-1.5 px-3 text-xs font-bold transition-colors',
                        tab === id ? 'bg-uav-red-light text-primary shadow-[inset_0_-2px_0_var(--primary)]' : 'text-slate-600 hover:bg-slate-100')}>
                <Icon size={14} aria-hidden="true"/>{t(`admin.aiRouter.tab.${id}`)}</button>)}
    </div>;
    return tab === 'console' ? <RouterFrame tabs={tabs}/> : <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">{tabs}
            <p className="m-0 text-xs text-slate-500">{t('admin.assistantChats.intro')}</p></div>
        <AssistantConversations/>
    </div>;
}

/**
 * The 9router web console embedded full-bleed. The gateway decides who may frame it (CSP frame-ancestors),
 * so the bar above always offers the same console in a new tab.
 */
function RouterFrame({tabs}: { tabs: ReactNode }) {
    const {t} = useI18n();
    const settings = useQuery({queryKey: assistantKeys.settings, queryFn: ({signal}) => assistantService.settings(signal)});
    return <QueryState query={settings}>{settings.data && (() => {
        const url = consoleUrl(settings.data.baseUrl);
        return <div className="-mb-6 flex h-[calc(100dvh-3.25rem)] flex-col border-b border-slate-200 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50/70 px-4 py-2">
                {tabs}
                <p className="m-0 flex min-w-0 flex-1 items-center gap-2 text-xs text-slate-600">
                    <Router size={14} className="shrink-0 text-primary" aria-hidden="true"/>
                    <span className="truncate font-mono">{url}</span>
                </p>
                <div className="flex flex-wrap items-center gap-2">
                    <span className="hidden text-[11px] text-slate-500 lg:inline">{t('admin.aiRouter.frameHint')}</span>
                    <a href={url} target="_blank" rel="noopener noreferrer"
                       className="inline-flex h-8 items-center rounded-control border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                        {t('admin.aiRouter.openNewTab')}</a>
                    <Link href="/admin/settings#assistant"
                          className="inline-flex h-8 items-center gap-1.5 rounded-control border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                        <Settings size={13} aria-hidden="true"/>{t('admin.aiRouter.assistantSettings')}</Link>
                </div>
            </div>
            <iframe src={url} title={t('admin.aiRouter.frameTitle')} className="min-h-0 w-full flex-1 border-0 bg-white"
                    referrerPolicy="strict-origin-when-cross-origin"/>
        </div>;
    })()}</QueryState>;
}
