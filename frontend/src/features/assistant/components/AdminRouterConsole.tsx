'use client';

import {useQuery} from '@tanstack/react-query';
import {Router, Settings} from 'lucide-react';
import Link from 'next/link';
import {AdminPage} from '@/components/layout/AdminPage';
import {QueryState} from '@/components/data/WorkspaceState';
import {useI18n} from '@/contexts/I18nContext';
import {assistantKeys, assistantService} from '@/features/assistant/services/assistant.service';

/** The gateway's console address: the configured API base without its /v1 suffix. */
export function consoleUrl(baseUrl: string) {
    return baseUrl.replace(/\/+$/, '').replace(/\/v1$/, '') + '/dashboard';
}

export default function AdminRouterConsole() {
    return <AdminPage title="adminNav.aiRouter" permission="PERMISSION_MANAGE" activeResource="ai-router">
        <RouterFrame/>
    </AdminPage>;
}

/**
 * The 9router web console embedded full-bleed. The gateway decides who may frame it (CSP frame-ancestors),
 * so the bar above always offers the same console in a new tab.
 */
function RouterFrame() {
    const {t} = useI18n();
    const settings = useQuery({queryKey: assistantKeys.settings, queryFn: ({signal}) => assistantService.settings(signal)});
    return <QueryState query={settings}>{settings.data && (() => {
        const url = consoleUrl(settings.data.baseUrl);
        return <div className="-mb-6 flex h-[calc(100dvh-3.25rem)] flex-col border-b border-slate-200 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50/70 px-4 py-2">
                <p className="m-0 flex min-w-0 items-center gap-2 text-xs text-slate-600">
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
