'use client';

import {type FormEvent, useCallback, useRef, useState} from 'react';
import {useRouter} from 'next/navigation';
import {AlertTriangle, Trash2, X} from 'lucide-react';
import {useAuth} from '@/providers/AuthContext';
import {useI18n} from '@/providers/I18nContext';
import {toast} from '@/providers/ToastContext';
import {useDialogFocusTrap} from '@/hooks/useDialogFocusTrap';
import {useAccountDeletionPolicy, useDeleteOwnAccount} from '@/hooks/profile/useProfile';
import {
    accountDeletionFieldErrors,
    canSubmitAccountDeletion,
    emptyAccountDeletionDraft,
    toAccountDeletionPayload,
    type AccountDeletionDraft,
    type AccountDeletionFieldErrors,
} from '@/forms/profile/profile-form';
import {Alert, Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, FormField, Input, Textarea} from '@/components/ui';
import {cn} from '@/lib/utils';

export function AccountDeletionCard() {
    const {logout} = useAuth();
    const {t} = useI18n();
    const router = useRouter();
    const policyQuery = useAccountDeletionPolicy();
    const policy = policyQuery.data;

    const [open, setOpen] = useState(false);
    const [draft, setDraft] = useState<AccountDeletionDraft>(emptyAccountDeletionDraft);
    const [fieldErrors, setFieldErrors] = useState<AccountDeletionFieldErrors>({});
    const [submitError, setSubmitError] = useState('');
    const dialogRef = useRef<HTMLElement>(null);

    const deleteMutation = useDeleteOwnAccount({
        onSuccess: async res => {
            setOpen(false);
            setDraft(emptyAccountDeletionDraft());
            await logout();
            toast.success(res.message || t('accountDeletion.deletedToast'));
            router.replace('/');
        },
        onError: error => {
            const fields = accountDeletionFieldErrors(error);
            if (fields) return setFieldErrors(fields);
            setSubmitError(error instanceof Error && error.message ? error.message : t('accountDeletion.deleteFailed'));
        },
    });

    const closeDialog = useCallback(() => {
        if (deleteMutation.isPending) return;
        setOpen(false);
        setFieldErrors({});
        setSubmitError('');
    }, [deleteMutation.isPending]);

    useDialogFocusTrap(dialogRef, open, closeDialog);

    const openDialog = () => {
        setDraft(emptyAccountDeletionDraft());
        setFieldErrors({});
        setSubmitError('');
        setOpen(true);
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (!policy || !canSubmitAccountDeletion(draft, policy) || deleteMutation.isPending) return;
        setFieldErrors({});
        setSubmitError('');
        deleteMutation.mutate(toAccountDeletionPayload(draft, policy));
    };

    const showPasswordField = Boolean(policy?.requirePassword && policy?.hasPassword);
    const badgeLabel = policy
        ? !policy.enabled
            ? t('accountDeletion.disabledBadge')
            : policy.mode === 'HARD_DELETE'
                ? t('accountDeletion.modeHardDelete')
                : t('accountDeletion.modeAnonymize')
        : '';

    return (
        <>
            <Card aria-labelledby="account-deletion-title">
                <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0">
                    <div className="flex items-center gap-2">
                        <Trash2 size={17} className="text-danger" aria-hidden="true"/>
                        <CardTitle id="account-deletion-title" className="m-0 text-[15px] font-bold text-slate-900">
                            {t('accountDeletion.title')}
                        </CardTitle>
                    </div>
                    {policy && <Badge variant={policy.enabled ? 'error' : 'default'}>{badgeLabel}</Badge>}
                </CardHeader>

                <CardContent className="space-y-3.5">
                    <CardDescription className="m-0 text-xs text-slate-500">{t('accountDeletion.subtitle')}</CardDescription>
                    {policyQuery.isPending ? (
                        <p role="status" className="m-0 text-xs text-slate-500">{t('accountDeletion.loading')}</p>
                    ) : policyQuery.isError ? (
                        <Alert variant="error">
                            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                                <span>{t('accountDeletion.loadError')}</span>
                                <Button type="button" size="sm" variant="outline" onClick={() => void policyQuery.refetch()}>
                                    {t('common.retry')}
                                </Button>
                            </div>
                        </Alert>
                    ) : policy && !policy.enabled ? (
                        <Alert variant="info"><span className="text-xs">{policy.noticeMessage || t('accountDeletion.disabledNotice')}</span></Alert>
                    ) : policy && (
                        <>
                            {policy.noticeMessage && <Alert variant="warning"><span className="text-xs">{policy.noticeMessage}</span></Alert>}
                            {!policy.eligible && (
                                <Alert variant="error">
                                    <div className="space-y-2 text-xs">
                                        <p className="m-0">{policy.ineligibleReason || t('accountDeletion.ineligibleFallback')}</p>
                                        {(policy.activeMissionCount > 0 || policy.unpaidInvoiceCount > 0) && (
                                            <div className="flex flex-wrap gap-2">
                                                {policy.activeMissionCount > 0 && <Badge variant="warning">{t('accountDeletion.activeMissionsBadge', {count: policy.activeMissionCount})}</Badge>}
                                                {policy.unpaidInvoiceCount > 0 && <Badge variant="error">{t('accountDeletion.unpaidInvoicesBadge', {count: policy.unpaidInvoiceCount})}</Badge>}
                                            </div>
                                        )}
                                    </div>
                                </Alert>
                            )}
                            <div className="flex justify-start pt-1">
                                <Button type="button" size="sm" variant="danger" disabled={!policy.eligible} leftIcon={<Trash2 size={14} aria-hidden="true"/>} onClick={openDialog}>
                                    {t('accountDeletion.openAction')}
                                </Button>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            {open && policy && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-[1px]" onClick={closeDialog}>
                    <section
                        ref={dialogRef}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="account-deletion-dialog-title"
                        tabIndex={-1}
                        onClick={e => e.stopPropagation()}
                        className="w-full max-w-md rounded-panel border border-slate-200 bg-white p-5 shadow-xl outline-none"
                    >
                        <div className="mb-3 flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2">
                                <AlertTriangle size={18} className="shrink-0 text-danger" aria-hidden="true"/>
                                <h3 id="account-deletion-dialog-title" className="m-0 text-base font-bold text-slate-900">{t('accountDeletion.dialogTitle')}</h3>
                            </div>
                            <button type="button" onClick={closeDialog} disabled={deleteMutation.isPending} aria-label={t('common.close')} className="rounded-control p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700">
                                <X size={16} aria-hidden="true"/>
                            </button>
                        </div>

                        {policy.noticeMessage && (
                            <p className="mb-4 rounded-control border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">{policy.noticeMessage}</p>
                        )}

                        <form onSubmit={handleSubmit} noValidate className="space-y-3.5">
                            <FormField id="delete-account-phrase" label={t('accountDeletion.phraseLabel')} required helperText={t('accountDeletion.phraseHint', {phrase: policy.confirmationPhrase})} error={fieldErrors.confirmationPhrase}>
                                <Input
                                    id="delete-account-phrase"
                                    data-autofocus="true"
                                    required
                                    autoComplete="off"
                                    value={draft.confirmationPhrase}
                                    placeholder={policy.confirmationPhrase}
                                    onChange={e => setDraft(d => ({...d, confirmationPhrase: e.target.value}))}
                                    className={cn('h-10 px-3 font-mono text-sm', fieldErrors.confirmationPhrase && 'border-danger')}
                                />
                            </FormField>

                            {showPasswordField && (
                                <FormField id="delete-account-password" label={t('accountDeletion.passwordLabel')} required error={fieldErrors.currentPassword}>
                                    <Input
                                        id="delete-account-password"
                                        type="password"
                                        required
                                        autoComplete="current-password"
                                        value={draft.currentPassword}
                                        placeholder={t('accountDeletion.passwordPlaceholder')}
                                        onChange={e => setDraft(d => ({...d, currentPassword: e.target.value}))}
                                        className={cn('h-10 px-3 text-sm', fieldErrors.currentPassword && 'border-danger')}
                                    />
                                </FormField>
                            )}

                            <FormField id="delete-account-reason" label={t('accountDeletion.reasonLabel')} required={policy.requireReason} optional={!policy.requireReason} error={fieldErrors.reason}>
                                <Textarea
                                    id="delete-account-reason"
                                    rows={2}
                                    required={policy.requireReason}
                                    value={draft.reason}
                                    placeholder={t('accountDeletion.reasonPlaceholder')}
                                    onChange={e => setDraft(d => ({...d, reason: e.target.value}))}
                                    className={cn(fieldErrors.reason && 'border-danger')}
                                />
                            </FormField>

                            {submitError && <Alert variant="error"><span className="text-xs">{submitError}</span></Alert>}

                            <div className="flex justify-end gap-2.5 pt-1">
                                <Button type="button" size="sm" variant="outline" onClick={closeDialog} disabled={deleteMutation.isPending}>{t('accountDeletion.cancel')}</Button>
                                <Button type="submit" size="sm" variant="danger" isLoading={deleteMutation.isPending} loadingText={t('accountDeletion.deleting')} disabled={!canSubmitAccountDeletion(draft, policy)}>
                                    {t('accountDeletion.confirmDelete')}
                                </Button>
                            </div>
                        </form>
                    </section>
                </div>
            )}
        </>
    );
}
