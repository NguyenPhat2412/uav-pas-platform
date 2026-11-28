'use client';

import React, {useState} from 'react';
import {Lock, Send} from 'lucide-react';
import {Badge, Button, Card, FormField, Input, Select, Switch} from '@/components/ui';
import {
    pickLocalizedModuleCopy,
    toUpdateModulePolicyPayload,
} from '@/forms/notification-policy-form';
import {
    notificationSeverities,
    type NotificationModuleCode,
    type NotificationModulePolicy,
    type NotificationSeverity,
    type UpdateNotificationModulePolicyInput,
} from '@/types/notification.types';
import {useI18n} from '@/providers/I18nContext';

interface NotificationModuleRowCardProps {
    policy: NotificationModulePolicy;
    canEdit: boolean;
    busy: boolean;
    testing: boolean;
    onUpdate: (
        moduleCode: NotificationModuleCode,
        payload: UpdateNotificationModulePolicyInput,
    ) => void;
    onTest: (moduleCode: NotificationModuleCode) => void;
}

export function NotificationModuleRowCard({
    policy,
    canEdit,
    busy,
    testing,
    onUpdate,
    onTest,
}: NotificationModuleRowCardProps) {
    const {t, locale} = useI18n();
    const copy = pickLocalizedModuleCopy(policy, locale);
    const [cooldownDraft, setCooldownDraft] = useState(String(policy.cooldownSeconds ?? 0));

    const applyPatch = (patch: Partial<UpdateNotificationModulePolicyInput>) => {
        onUpdate(policy.moduleCode, toUpdateModulePolicyPayload(policy, patch));
    };

    const parsedCooldown = Number.parseInt(cooldownDraft, 10);
    const cooldownChanged =
        Number.isFinite(parsedCooldown) && parsedCooldown !== policy.cooldownSeconds;

    const severityVariant =
        policy.severity === 'CRITICAL'
            ? 'error'
            : policy.severity === 'ACTION'
              ? 'primary'
              : 'secondary';

    return (
        <Card variant="machined" className="p-4">
            <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-badge bg-slate-900 px-2 py-0.5 font-mono text-[11px] font-bold text-white">
                                {policy.moduleCode}
                            </span>
                            <h3 className="text-sm font-bold text-on-surface">{copy.name}</h3>
                            <Badge variant={severityVariant} size="sm">
                                {t(`notificationCenter.severity${policy.severity}`)}
                            </Badge>
                            {policy.mandatory && (
                                <Badge variant="error" size="sm">
                                    <Lock size={11} className="mr-1 inline"/>
                                    {t('notificationCenter.mandatoryBadge')}
                                </Badge>
                            )}
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-muted">
                            {copy.description}
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <Switch
                            checked={policy.enabled}
                            disabled={!canEdit || busy}
                            onCheckedChange={checked => applyPatch({enabled: checked})}
                            label={t('notificationCenter.receiveModule')}
                        />
                        {canEdit && (
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={!policy.enabled || testing}
                                leftIcon={<Send size={13}/>}
                                onClick={() => onTest(policy.moduleCode)}
                            >
                                {t('notificationCenter.testPopupBtn')}
                            </Button>
                        )}
                    </div>
                </div>

                <div className="grid gap-3 border-t border-border pt-3.5 sm:grid-cols-2 lg:grid-cols-5">
                    <Switch
                        checked={policy.inAppEnabled}
                        disabled={!canEdit || busy || !policy.enabled || policy.mandatory}
                        onCheckedChange={checked => applyPatch({inAppEnabled: checked})}
                        label={t('notificationCenter.channelInApp')}
                    />
                    <Switch
                        checked={policy.screenPopupEnabled}
                        disabled={!canEdit || busy || !policy.enabled || policy.mandatory}
                        onCheckedChange={checked => applyPatch({screenPopupEnabled: checked})}
                        label={t('notificationCenter.channelScreenPopup')}
                    />
                    <Switch
                        checked={policy.desktopOsEnabled}
                        disabled={!canEdit || busy || !policy.enabled}
                        onCheckedChange={checked => applyPatch({desktopOsEnabled: checked})}
                        label={t('notificationCenter.channelDesktopOs')}
                    />
                    <Switch
                        checked={policy.mobilePushEnabled}
                        disabled={!canEdit || busy || !policy.enabled}
                        onCheckedChange={checked => applyPatch({mobilePushEnabled: checked})}
                        label={t('notificationCenter.channelMobilePush')}
                    />
                    <Switch
                        checked={policy.emailEnabled}
                        disabled={!canEdit || busy || !policy.enabled}
                        onCheckedChange={checked => applyPatch({emailEnabled: checked})}
                        label={t('notificationCenter.channelEmail')}
                    />
                </div>

                <div className="grid items-end gap-3 border-t border-border pt-3.5 sm:grid-cols-3">
                    <FormField
                        id={`severity-${policy.moduleCode}`}
                        label={t('notificationCenter.severityLabel')}
                        required
                    >
                        <Select
                            id={`severity-${policy.moduleCode}`}
                            value={policy.severity}
                            disabled={!canEdit || busy}
                            onChange={e =>
                                applyPatch({severity: e.target.value as NotificationSeverity})
                            }
                            className="h-9 text-[13px]"
                        >
                            {notificationSeverities.map(sev => (
                                <option key={sev} value={sev}>
                                    {t(`notificationCenter.severity${sev}`)} ({sev})
                                </option>
                            ))}
                        </Select>
                    </FormField>

                    <div className="flex items-end gap-2">
                        <FormField
                            id={`cooldown-${policy.moduleCode}`}
                            label={t('notificationCenter.cooldownLabel')}
                            optional
                            className="flex-1"
                        >
                            <Input
                                id={`cooldown-${policy.moduleCode}`}
                                type="number"
                                min={0}
                                max={86400}
                                value={cooldownDraft}
                                disabled={!canEdit || busy}
                                onChange={e => setCooldownDraft(e.target.value)}
                                className="h-9 font-mono text-[13px] tabular-nums"
                            />
                        </FormField>
                        {canEdit && cooldownChanged && (
                            <Button
                                type="button"
                                size="sm"
                                variant="primary"
                                disabled={busy}
                                onClick={() => applyPatch({cooldownSeconds: parsedCooldown})}
                            >
                                {t('notificationCenter.saveCooldown')}
                            </Button>
                        )}
                    </div>

                    <div className="flex items-center justify-start sm:justify-end">
                        <Switch
                            checked={policy.mandatory}
                            disabled={!canEdit || busy}
                            onCheckedChange={checked => applyPatch({mandatory: checked})}
                            label={t('notificationCenter.mandatoryToggle')}
                        />
                    </div>
                </div>
            </div>
        </Card>
    );
}
