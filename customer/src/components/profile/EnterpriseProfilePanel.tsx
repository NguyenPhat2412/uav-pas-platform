'use client';

import {type FormEvent, useState} from 'react';
import {Building2} from 'lucide-react';
import {useI18n} from '@/providers/I18nContext';
import {toast} from '@/providers/ToastContext';
import {useBillingProfile, useUpdateBillingProfile} from '@/hooks/profile/useProfile';
import {
    BILLING_PROFILE_FIELD_KEYS,
    billingProfileDraftFromDetail,
    billingProfileFieldErrors,
    toBillingProfilePayload,
    type BillingProfileFieldErrors,
    type BillingProfileFields,
} from '@/forms/profile/profile-form';
import {Alert, Button, Card, CardContent, CardHeader, CardTitle, FormField, Input, Textarea} from '@/components/ui';
import {cn} from '@/lib/utils';
import {EnterpriseAccessCard} from '@/components/profile/EnterpriseAccessCard';
import {TwoFactorSettingsCard} from '@/components/profile/TwoFactorSettingsCard';

/** Enterprise identity for VAT invoices and the on-site emergency contact, plus the account's plan and permissions. */
export function EnterpriseProfilePanel() {
    const {t} = useI18n();
    const query = useBillingProfile();
    const [draft, setDraft] = useState<BillingProfileFields | null>(null);
    const [errors, setErrors] = useState<BillingProfileFieldErrors>({});
    const save = useUpdateBillingProfile({
        onSuccess: () => {
            setDraft(null);
            toast.success(t('enterprise.saved'));
        },
        onError: error => {
            // The backend checks every field (lengths, tax code, phone) and names the one at fault.
            const fields = billingProfileFieldErrors(error);
            if (fields) {
                setErrors(fields);
                return;
            }
            const status = (error as { status?: number }).status;
            toast.error(status === 409 ? t('enterprise.conflict') : error instanceof Error ? error.message : t('enterprise.saveFailed'));
            if (status === 409) void query.refetch();
        },
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        if (!draft) return;
        setErrors({});
        save.mutate(toBillingProfilePayload(draft, query.data?.version ?? 0));
    };

    const profile = query.data;

    return (
        <>
            <div className="grid grid-cols-1 gap-px bg-slate-200 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
                <Card className="flex h-full flex-col rounded-none border-0" aria-labelledby="enterprise-title">
                    <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0 border-slate-200 bg-slate-50/70 px-4 py-3">
                        <CardTitle id="enterprise-title" className="m-0 flex items-center gap-2 text-sm font-bold text-slate-800">
                            <Building2 size={17} className="text-primary" aria-hidden="true"/>
                            {t('enterprise.title')}
                        </CardTitle>
                        {!draft && profile && (
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="bg-white"
                                onClick={() => {
                                    setErrors({});
                                    setDraft(billingProfileDraftFromDetail(profile));
                                }}
                            >
                                {t('enterprise.edit')}
                            </Button>
                        )}
                    </CardHeader>
                    <CardContent className="flex-1 p-4 sm:p-5">
                        {query.isPending ? (
                            <p role="status" className="m-0 text-sm text-slate-500">{t('enterprise.loading')}</p>
                        ) : query.isError ? (
                            <Alert variant="error">{t('enterprise.loadError')}</Alert>
                        ) : draft ? (
                            <form onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
                                {BILLING_PROFILE_FIELD_KEYS.map(k => {
                                    const fieldId = `enterprise-${k}`;
                                    const err = errors[k];
                                    return (
                                        <FormField
                                            key={k}
                                            id={fieldId}
                                            label={t(`enterprise.field.${k}`)}
                                            optional
                                            helperText={k === 'taxCode' ? t('enterprise.taxCodeHint') : undefined}
                                            error={err}
                                            className={k === 'billingAddress' ? 'sm:col-span-2' : undefined}
                                        >
                                            {k === 'billingAddress' ? (
                                                <Textarea
                                                    id={fieldId}
                                                    rows={2}
                                                    aria-invalid={Boolean(err)}
                                                    value={draft[k]}
                                                    onChange={e => setDraft({...draft, [k]: e.target.value})}
                                                    className={cn(err && 'border-danger')}
                                                />
                                            ) : (
                                                <Input
                                                    id={fieldId}
                                                    value={draft[k]}
                                                    aria-invalid={Boolean(err)}
                                                    inputMode={k === 'taxCode' ? 'numeric' : undefined}
                                                    type={k === 'emergencyContactPhone' ? 'tel' : 'text'}
                                                    onChange={e => setDraft({...draft, [k]: e.target.value})}
                                                    className={cn('h-11 px-3 text-sm', err && 'border-danger')}
                                                />
                                            )}
                                        </FormField>
                                    );
                                })}
                                <div className="flex justify-end gap-3 sm:col-span-2">
                                    <Button type="button" variant="outline" onClick={() => setDraft(null)} disabled={save.isPending}>
                                        {t('enterprise.cancel')}
                                    </Button>
                                    <Button type="submit" isLoading={save.isPending} loadingText={t('enterprise.saving')}>
                                        {t('enterprise.save')}
                                    </Button>
                                </div>
                            </form>
                        ) : profile && (
                            <dl className="m-0 grid gap-4 sm:grid-cols-2">
                                {BILLING_PROFILE_FIELD_KEYS.map(k => (
                                    <div key={k} className={k === 'billingAddress' ? 'sm:col-span-2' : undefined}>
                                        <dt className="text-[13px] text-slate-500">{t(`enterprise.field.${k}`)}</dt>
                                        <dd className="mb-0 mt-1 break-words font-semibold text-card-foreground">
                                            {profile[k] || t('enterprise.empty')}
                                        </dd>
                                    </div>
                                ))}
                                <p className="m-0 text-xs text-slate-500 sm:col-span-2">{t('enterprise.invoiceNote')}</p>
                            </dl>
                        )}
                    </CardContent>
                </Card>
                <EnterpriseAccessCard/>
            </div>
            <div className="flex-1 bg-white [&>*]:h-full [&>*]:rounded-none [&>*]:border-0">
                <TwoFactorSettingsCard/>
            </div>
        </>
    );
}
