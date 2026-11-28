'use client';

import React, {useState} from 'react';
import Link from 'next/link';
import {ArrowLeft, Bell, BellRing, Lock, MonitorSmartphone, Radio} from 'lucide-react';
import {Button, Card, KpiCard} from '@/components/ui';
import {QueryState} from '@/components/data/WorkspaceState';
import {
    useNotificationModuleActions,
    useNotificationModules,
} from '@/hooks/useNotifications';
import {NotificationModuleRowCard} from './NotificationModuleRowCard';
import {useAuth} from '@/providers/AuthContext';
import {useI18n} from '@/providers/I18nContext';
import {toast} from '@/providers/ToastContext';

function readDesktopPermission(): 'granted' | 'denied' | 'default' | 'unsupported' {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
    return window.Notification.permission;
}

export function NotificationModulesAdminPanel() {
    const {can} = useAuth();
    const {t} = useI18n();
    const canEdit = can('SETTINGS_MANAGE') || can('USER_MANAGE');
    const query = useNotificationModules();
    const {updateModule, testModule} = useNotificationModuleActions();
    const [desktopPerm, setDesktopPerm] = useState<'granted' | 'denied' | 'default' | 'unsupported'>(
        () => readDesktopPermission(),
    );

    const modules = query.data ?? [];
    const activeCount = modules.filter(m => m.enabled).length;
    const mandatoryCount = modules.filter(m => m.mandatory).length;
    const popupCount = modules.filter(m => m.enabled && m.screenPopupEnabled).length;
    const osCount = modules.filter(m => m.enabled && m.desktopOsEnabled).length;

    const requestDesktop = async () => {
        if (typeof window === 'undefined' || !('Notification' in window)) {
            setDesktopPerm('unsupported');
            return;
        }
        const next = await window.Notification.requestPermission();
        setDesktopPerm(next);
    };

    return (
        <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h2 className="text-base font-bold text-on-surface">
                        {t('notificationCenter.adminTitle')}
                    </h2>
                    <p className="mt-0.5 text-xs text-muted">
                        {t('notificationCenter.adminSubtitle')}
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {desktopPerm === 'default' && (
                        <Button
                            type="button"
                            size="sm"
                            variant="primary"
                            leftIcon={<Bell size={14}/>}
                            onClick={() => void requestDesktop()}
                        >
                            {t('notificationCenter.desktopEnableBtn')}
                        </Button>
                    )}
                    <Link
                        href="/admin/notifications"
                        className="inline-flex h-9 items-center gap-1.5 rounded-control border border-border bg-card px-3 text-xs font-bold text-on-surface transition-colors duration-150 hover:bg-slate-50"
                    >
                        <ArrowLeft size={14}/>
                        <span>{t('notificationCenter.backToInbox')}</span>
                    </Link>
                </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <KpiCard
                    label={t('notificationCenter.kpiActiveModules')}
                    value={`${activeCount}/${modules.length || 9}`}
                    icon={<Radio size={18}/>}
                />
                <KpiCard
                    label={t('notificationCenter.kpiMandatory')}
                    value={String(mandatoryCount)}
                    icon={<Lock size={18}/>}
                />
                <KpiCard
                    label={t('notificationCenter.kpiScreenPopup')}
                    value={`${popupCount}/${modules.length || 9}`}
                    icon={<BellRing size={18}/>}
                />
                <KpiCard
                    label={t('notificationCenter.kpiDesktopOs')}
                    value={`${osCount}/${modules.length || 9}`}
                    icon={<MonitorSmartphone size={18}/>}
                />
            </div>

            <Card variant="machined" className="p-3.5">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                        <MonitorSmartphone size={16} className="text-slate-700"/>
                        <span className="text-xs font-semibold text-on-surface">
                            {t('notificationCenter.desktopTitle')}:{' '}
                            <span className="font-normal text-muted">
                                {desktopPerm === 'granted'
                                    ? t('notificationCenter.desktopGranted')
                                    : desktopPerm === 'denied'
                                      ? t('notificationCenter.desktopDenied')
                                      : desktopPerm === 'default'
                                        ? t('notificationCenter.desktopDefault')
                                        : t('notificationCenter.desktopUnsupported')}
                            </span>
                        </span>
                    </div>
                </div>
            </Card>

            <QueryState query={query}>
                <div className="space-y-3">
                    {modules.map(policy => (
                        <NotificationModuleRowCard
                            key={policy.moduleCode}
                            policy={policy}
                            canEdit={canEdit}
                            busy={updateModule.isPending}
                            testing={testModule.isPending}
                            onUpdate={(moduleCode, payload) =>
                                updateModule.mutate(
                                    {moduleCode, payload},
                                    {
                                        onSuccess: () =>
                                            toast.success(
                                                t('notificationCenter.savedModule', {
                                                    module: moduleCode,
                                                }),
                                            ),
                                        onError: err =>
                                            toast.error(
                                                err instanceof Error
                                                    ? err.message
                                                    : 'Update failed',
                                            ),
                                    },
                                )
                            }
                            onTest={moduleCode =>
                                testModule.mutate(moduleCode, {
                                    onSuccess: () =>
                                        toast.info(
                                            t('notificationCenter.testFired', {
                                                module: moduleCode,
                                            }),
                                        ),
                                    onError: err =>
                                        toast.error(
                                            err instanceof Error ? err.message : 'Test failed',
                                        ),
                                })
                            }
                        />
                    ))}
                </div>
            </QueryState>
        </div>
    );
}
