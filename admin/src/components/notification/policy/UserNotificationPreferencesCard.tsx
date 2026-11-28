'use client';

import React, {useState} from 'react';
import {Bell, ChevronDown, ChevronUp, Lock, MonitorSmartphone, SlidersHorizontal} from 'lucide-react';
import {Badge, Button, Card, Switch} from '@/components/ui';
import {
    useUserNotificationPreferenceActions,
    useUserNotificationPreferences,
} from '@/hooks/useNotifications';
import {
    pickLocalizedModuleCopy,
    toUpdateUserPreferencePayload,
} from '@/forms/notification-policy-form';
import type {
    UpdateUserNotificationPreferenceInput,
    UserNotificationModulePreference,
} from '@/types/notification.types';
import {useI18n} from '@/providers/I18nContext';
import {toast} from '@/providers/ToastContext';

function readDesktopPermission(): 'granted' | 'denied' | 'default' | 'unsupported' {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
    return window.Notification.permission;
}

export function UserNotificationPreferencesCard() {
    const {t, locale} = useI18n();
    const [expanded, setExpanded] = useState(false);
    const [desktopPerm, setDesktopPerm] = useState<'granted' | 'denied' | 'default' | 'unsupported'>(
        () => readDesktopPermission(),
    );
    const query = useUserNotificationPreferences();
    const {updatePreference} = useUserNotificationPreferenceActions();

    const requestDesktop = async () => {
        if (typeof window === 'undefined' || !('Notification' in window)) {
            setDesktopPerm('unsupported');
            return;
        }
        const next = await window.Notification.requestPermission();
        setDesktopPerm(next);
    };

    const toggle = (
        row: UserNotificationModulePreference,
        patch: Partial<UpdateUserNotificationPreferenceInput>,
    ) => {
        updatePreference.mutate(
            {
                moduleCode: row.moduleCode,
                payload: toUpdateUserPreferencePayload(row, patch),
            },
            {
                onSuccess: () => toast.success(t('notificationCenter.savedPref')),
            },
        );
    };

    const desktopStatusText =
        desktopPerm === 'granted'
            ? t('notificationCenter.desktopGranted')
            : desktopPerm === 'denied'
              ? t('notificationCenter.desktopDenied')
              : desktopPerm === 'default'
                ? t('notificationCenter.desktopDefault')
                : t('notificationCenter.desktopUnsupported');

    return (
        <Card variant="machined" className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control border border-border bg-slate-100 text-slate-800">
                        <MonitorSmartphone size={17} aria-hidden="true"/>
                    </div>
                    <div>
                        <p className="text-[13px] font-bold text-on-surface">
                            {t('notificationCenter.desktopTitle')}
                        </p>
                        <p className="text-xs text-muted">{desktopStatusText}</p>
                    </div>
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
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        leftIcon={<SlidersHorizontal size={14}/>}
                        rightIcon={expanded ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                        onClick={() => setExpanded(prev => !prev)}
                    >
                        {expanded
                            ? t('notificationCenter.prefsHide')
                            : t('notificationCenter.prefsExpand')}
                    </Button>
                </div>
            </div>

            {expanded && (
                <div className="mt-4 border-t border-border pt-4">
                    <div className="mb-3">
                        <h3 className="text-sm font-bold text-on-surface">
                            {t('notificationCenter.prefsTitle')}
                        </h3>
                        <p className="text-xs text-muted">{t('notificationCenter.prefsSubtitle')}</p>
                    </div>

                    <div className="divide-y divide-border rounded-panel border border-border bg-card">
                        {(query.data ?? []).map(row => {
                            const copy = pickLocalizedModuleCopy(row, locale);
                            const disabledGlobally = !row.moduleEnabled;
                            return (
                                <div
                                    key={row.moduleCode}
                                    className="flex flex-col gap-3 p-3.5 lg:flex-row lg:items-center lg:justify-between"
                                >
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="rounded-badge bg-slate-100 px-2 py-0.5 font-mono text-[10.5px] font-bold text-slate-700">
                                                {row.moduleCode}
                                            </span>
                                            <span className="text-[13px] font-bold text-on-surface">
                                                {copy.name}
                                            </span>
                                            {row.mandatory && (
                                                <Badge variant="error" size="sm">
                                                    <Lock size={11} className="mr-1 inline"/>
                                                    {t('notificationCenter.mandatoryBadge')}
                                                </Badge>
                                            )}
                                            {disabledGlobally && (
                                                <Badge variant="secondary" size="sm">
                                                    {t('notificationCenter.disabledByAdmin')}
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="mt-1 text-xs text-muted">{copy.description}</p>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-4">
                                        <Switch
                                            checked={!row.muted && row.moduleEnabled}
                                            disabled={
                                                disabledGlobally ||
                                                row.mandatory ||
                                                updatePreference.isPending
                                            }
                                            onCheckedChange={checked =>
                                                toggle(row, {muted: !checked})
                                            }
                                            label={t('notificationCenter.receiveModule')}
                                        />
                                        <Switch
                                            checked={
                                                row.screenPopupEnabled &&
                                                row.adminScreenPopupEnabled &&
                                                !row.muted
                                            }
                                            disabled={
                                                disabledGlobally ||
                                                row.mandatory ||
                                                row.muted ||
                                                !row.adminScreenPopupEnabled ||
                                                updatePreference.isPending
                                            }
                                            onCheckedChange={checked =>
                                                toggle(row, {screenPopupEnabled: checked})
                                            }
                                            label={t('notificationCenter.channelScreenPopup')}
                                        />
                                        <Switch
                                            checked={
                                                row.desktopOsEnabled &&
                                                row.adminDesktopOsEnabled &&
                                                !row.muted
                                            }
                                            disabled={
                                                disabledGlobally ||
                                                row.muted ||
                                                !row.adminDesktopOsEnabled ||
                                                updatePreference.isPending
                                            }
                                            onCheckedChange={checked =>
                                                toggle(row, {desktopOsEnabled: checked})
                                            }
                                            label={t('notificationCenter.channelDesktopOs')}
                                        />
                                        <Switch
                                            checked={
                                                row.mobilePushEnabled &&
                                                row.adminMobilePushEnabled &&
                                                !row.muted
                                            }
                                            disabled={
                                                disabledGlobally ||
                                                row.muted ||
                                                !row.adminMobilePushEnabled ||
                                                updatePreference.isPending
                                            }
                                            onCheckedChange={checked =>
                                                toggle(row, {mobilePushEnabled: checked})
                                            }
                                            label={t('notificationCenter.channelMobilePush')}
                                        />
                                        <Switch
                                            checked={
                                                row.emailEnabled &&
                                                row.adminEmailEnabled &&
                                                !row.muted
                                            }
                                            disabled={
                                                disabledGlobally ||
                                                row.muted ||
                                                !row.adminEmailEnabled ||
                                                updatePreference.isPending
                                            }
                                            onCheckedChange={checked =>
                                                toggle(row, {emailEnabled: checked})
                                            }
                                            label={t('notificationCenter.channelEmail')}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </Card>
    );
}
