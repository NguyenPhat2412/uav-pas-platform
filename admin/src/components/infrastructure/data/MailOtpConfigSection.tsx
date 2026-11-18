'use client';

import {type FormEvent, useState} from 'react';
import {KeyRound, Lock, RotateCcw, Save, ServerCog, ShieldCheck} from 'lucide-react';
import {ErrorNotice} from '@/components/data/WorkspaceState';
import {Panel} from '@/components/infrastructure/runtime/InfraUi';
import {Badge, Button, Input, PasswordInput} from '@/components/ui';
import {
    mailOtpDraftFromSettings,
    mailOtpFieldErrors,
    toMailOtpSettingsPayload,
    type MailOtpFieldErrors,
    type MailOtpSettingsDraft,
} from '@/forms/infrastructure/mail-otp-form';
import {useUpdateMailOtpSettings} from '@/hooks/infrastructure/useInfrastructure';
import {confirmDialog} from '@/providers/ConfirmContext';
import {useI18n} from '@/providers/I18nContext';
import {toast} from '@/providers/ToastContext';
import type {MailOtpSettings} from '@/types/infrastructure/infrastructure.types';

const OTP_NUMERIC_FIELDS: { key: keyof MailOtpSettingsDraft; id: string; labelKey: string; min: number }[] = [
    {key: 'otpTtlMinutes', id: 'otp-ttl-minutes', labelKey: 'adminInfra.email.otpPolicy.ttlMinutes', min: 1},
    {key: 'resendCooldownSeconds', id: 'otp-resend-cooldown', labelKey: 'adminInfra.email.otpPolicy.resendCooldownSeconds', min: 0},
    {key: 'maxOtpAttempts', id: 'otp-max-attempts', labelKey: 'adminInfra.email.otpPolicy.maxOtpAttempts', min: 1},
    {key: 'otpPerAccount', id: 'otp-per-account', labelKey: 'adminInfra.email.otpPolicy.otpPerAccount', min: 1},
    {key: 'otpPerIp', id: 'otp-per-ip', labelKey: 'adminInfra.email.otpPolicy.otpPerIp', min: 1},
    {key: 'maxEmailsPerMinute', id: 'otp-max-emails-minute', labelKey: 'adminInfra.email.otpPolicy.maxEmailsPerMinute', min: 1},
];

export function MailOtpConfigSection({settings}: { settings: MailOtpSettings }) {
    const {t, formatDate} = useI18n();
    const [draft, setDraft] = useState<MailOtpSettingsDraft>(() => mailOtpDraftFromSettings(settings));
    const [errors, setErrors] = useState<MailOtpFieldErrors>({});

    const save = useUpdateMailOtpSettings({
        onSuccess: (updated, vars) => {
            setDraft(mailOtpDraftFromSettings(updated));
            setErrors({});
            toast.success(t(vars.resetToEnvDefaults ? 'adminInfra.email.smtp.resetSavedToast' : 'adminInfra.email.smtp.savedToast'));
        },
        onError: error => {
            const fieldErrs = mailOtpFieldErrors(error);
            if (fieldErrs) {
                setErrors(fieldErrs);
                return;
            }
            toast.error(error instanceof Error ? error.message : t('common.permissionError'));
        },
    });

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        setErrors({});
        save.mutate(toMailOtpSettingsPayload(draft));
    };

    const handleResetEnv = async () => {
        const ok = await confirmDialog({
            description: t('adminInfra.email.smtp.resetEnvConfirm'),
            variant: 'danger',
        });
        if (!ok) return;
        setErrors({});
        save.mutate(toMailOtpSettingsPayload(draft, {resetToEnvDefaults: true}));
    };

    const sourceBadge =
        settings.passwordSource === 'DATABASE'
            ? {variant: 'success' as const, label: t('adminInfra.email.smtp.passwordSourceDatabase')}
            : settings.passwordSource === 'ENV'
              ? {variant: 'outline' as const, label: t('adminInfra.email.smtp.passwordSourceEnv')}
              : {variant: 'warning' as const, label: t('adminInfra.email.smtp.passwordSourceNone')};

    return (
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <Panel id="smtp-dynamic-config" title={t('adminInfra.email.smtp.title')} icon={ServerCog}>
                <div className="space-y-4 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                        <p className="m-0 text-xs text-slate-600">{t('adminInfra.email.smtp.subtitle')}</p>
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge variant={sourceBadge.variant} size="sm" icon={<Lock size={11} aria-hidden="true"/>}>
                                {sourceBadge.label}
                            </Badge>
                            {settings.passwordHint && (
                                <Badge variant="outline" size="sm" className="font-mono normal-case">
                                    {t('adminInfra.email.smtp.passwordHintBadge', {hint: settings.passwordHint})}
                                </Badge>
                            )}
                        </div>
                    </div>

                    <label className="flex cursor-pointer items-start gap-3 rounded-control border border-slate-200 bg-slate-50/70 px-3.5 py-3">
                        <input
                            type="checkbox"
                            checked={draft.mailEnabled}
                            onChange={e => setDraft(prev => ({...prev, mailEnabled: e.target.checked}))}
                            className="mt-0.5 h-4 w-4 accent-slate-900"
                        />
                        <span className="min-w-0">
                            <span className="block text-[13px] font-bold text-slate-900">{t('adminInfra.email.smtp.mailEnabledLabel')}</span>
                            <span className="block text-xs text-slate-500">{t('adminInfra.email.smtp.mailEnabledHint')}</span>
                        </span>
                    </label>

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <Input id="smtp-host" label={t('adminInfra.email.smtp.hostLabel')}
                               required={draft.mailEnabled} optional={!draft.mailEnabled}
                               placeholder={t('adminInfra.email.smtp.hostPlaceholder')}
                               value={draft.smtpHost} error={errors.smtpHost}
                               onChange={e => setDraft(prev => ({...prev, smtpHost: e.target.value}))}
                               className="h-10 text-xs font-semibold"/>
                        <Input id="smtp-port" label={t('adminInfra.email.smtp.portLabel')}
                               type="number" inputMode="numeric" min={1} max={65535}
                               required={draft.mailEnabled} optional={!draft.mailEnabled}
                               placeholder={t('adminInfra.email.smtp.portPlaceholder')}
                               value={draft.smtpPort} error={errors.smtpPort}
                               onChange={e => setDraft(prev => ({...prev, smtpPort: e.target.value}))}
                               className="h-10 font-mono text-xs font-semibold tabular-nums"/>
                        <Input id="smtp-username" label={t('adminInfra.email.smtp.usernameLabel')}
                               required={draft.mailEnabled && draft.smtpAuth} optional={!(draft.mailEnabled && draft.smtpAuth)}
                               placeholder={t('adminInfra.email.smtp.usernamePlaceholder')}
                               value={draft.smtpUsername} error={errors.smtpUsername}
                               onChange={e => setDraft(prev => ({...prev, smtpUsername: e.target.value}))}
                               className="h-10 text-xs font-semibold"/>
                        <Input id="smtp-from-address" label={t('adminInfra.email.smtp.fromAddressLabel')}
                               type="email" inputMode="email"
                               required={draft.mailEnabled} optional={!draft.mailEnabled}
                               placeholder={t('adminInfra.email.smtp.fromAddressPlaceholder')}
                               value={draft.fromAddress} error={errors.fromAddress}
                               onChange={e => setDraft(prev => ({...prev, fromAddress: e.target.value}))}
                               className="h-10 text-xs font-semibold"/>
                        <Input id="smtp-sender-name" label={t('adminInfra.email.smtp.senderDisplayNameLabel')}
                               optional placeholder={t('adminInfra.email.smtp.senderDisplayNamePlaceholder')}
                               value={draft.senderDisplayName} error={errors.senderDisplayName}
                               onChange={e => setDraft(prev => ({...prev, senderDisplayName: e.target.value}))}
                               className="h-10 text-xs font-semibold"/>
                        <div className="flex flex-wrap items-center gap-5 pt-5">
                            <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-800">
                                <input type="checkbox" checked={draft.smtpAuth}
                                       onChange={e => setDraft(prev => ({...prev, smtpAuth: e.target.checked}))}
                                       className="h-4 w-4 accent-slate-900"/>
                                {t('adminInfra.email.smtp.smtpAuthLabel')}
                            </label>
                            <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-800">
                                <input type="checkbox" checked={draft.smtpStarttls}
                                       onChange={e => setDraft(prev => ({...prev, smtpStarttls: e.target.checked}))}
                                       className="h-4 w-4 accent-slate-900"/>
                                {t('adminInfra.email.smtp.smtpStarttlsLabel')}
                            </label>
                        </div>
                    </div>

                    <PasswordInput
                        id="smtp-app-password"
                        label={t('adminInfra.email.smtp.passwordLabel')}
                        optional
                        autoComplete="new-password"
                        leftIcon={<KeyRound size={15} aria-hidden="true"/>}
                        placeholder={t('adminInfra.email.smtp.passwordPlaceholder')}
                        helperText={t('adminInfra.email.smtp.passwordHelper')}
                        value={draft.smtpPassword}
                        error={errors.smtpPassword}
                        onChange={e => setDraft(prev => ({...prev, smtpPassword: e.target.value}))}
                        className="h-10 font-mono text-xs"
                    />
                </div>
            </Panel>

            <Panel id="otp-policy-config" title={t('adminInfra.email.otpPolicy.title')} icon={ShieldCheck}>
                <div className="space-y-4 p-4">
                    <p className="m-0 text-xs text-slate-600">{t('adminInfra.email.otpPolicy.subtitle')}</p>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {OTP_NUMERIC_FIELDS.map(({key, id, labelKey, min}) => (
                            <Input
                                key={key}
                                id={id}
                                label={t(labelKey)}
                                type="number"
                                inputMode="numeric"
                                min={min}
                                required
                                value={String(draft[key])}
                                error={errors[key]}
                                onChange={e => setDraft(prev => ({...prev, [key]: e.target.value}))}
                                className="h-10 text-xs font-semibold tabular-nums"
                            />
                        ))}
                    </div>

                    {save.error && !mailOtpFieldErrors(save.error) && <ErrorNotice error={save.error}/>}

                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
                        <span className="text-xs text-slate-500">
                            {settings.updatedAt
                                ? t('adminInfra.email.smtp.updatedMeta', {
                                      time: formatDate(settings.updatedAt, {dateStyle: 'short', timeStyle: 'short'}),
                                      actor: settings.updatedBy || 'system',
                                  })
                                : ''}
                        </span>
                        <div className="flex flex-wrap items-center gap-2">
                            {settings.hasDatabaseOverride && (
                                <Button type="button" variant="outline" size="sm" disabled={save.isPending}
                                        leftIcon={<RotateCcw size={14} aria-hidden="true"/>}
                                        onClick={() => void handleResetEnv()}>
                                    {t('adminInfra.email.smtp.resetEnvButton')}
                                </Button>
                            )}
                            <Button type="submit" variant="primary" size="sm"
                                    isLoading={save.isPending} loadingText={t('adminInfra.email.smtp.savingButton')}
                                    leftIcon={<Save size={14} aria-hidden="true"/>}>
                                {t('adminInfra.email.smtp.saveButton')}
                            </Button>
                        </div>
                    </div>
                </div>
            </Panel>
        </form>
    );
}
