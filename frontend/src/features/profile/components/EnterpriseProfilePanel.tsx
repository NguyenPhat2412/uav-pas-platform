'use client';
import {type FormEvent, useState} from 'react';
import {Building2} from 'lucide-react';
import {ApiError} from '@/lib/api';
import {useI18n} from '@/providers/I18nContext';
import {toast} from '@/providers/ToastContext';
import {useBillingProfile, useUpdateBillingProfile} from '@/features/profile/hooks/useProfile';
import type {BillingProfileFields} from '@/features/profile/types/profile.types';
import {EnterpriseAccessCard} from '@/features/profile/components/EnterpriseAccessCard';
import {TwoFactorSettingsCard} from '@/features/profile/components/TwoFactorSettingsCard';

const fieldKeys: (keyof BillingProfileFields)[] = ['organizationName', 'taxCode', 'billingAddress', 'emergencyContactName', 'emergencyContactPhone'];

/** Enterprise identity for VAT invoices and the on-site emergency contact, plus the account's plan and permissions. */
export function EnterpriseProfilePanel() {
    const {t} = useI18n();
    const query = useBillingProfile();
    const [draft, setDraft] = useState<BillingProfileFields | null>(null);
    const [errors, setErrors] = useState<Partial<Record<keyof BillingProfileFields, string>>>({});
    const save = useUpdateBillingProfile({
        onSuccess: () => {
            setDraft(null);
            toast.success(t('enterprise.saved'));
        },
        onError: error => {
            // The backend checks every field (lengths, tax code, phone) and names the one at fault.
            if (error instanceof ApiError && error.fields && Object.keys(error.fields).length) {
                setErrors(error.fields as typeof errors);
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
        save.mutate({fields: Object.fromEntries(fieldKeys.map(k => [k, draft[k].trim()])) as BillingProfileFields, version: query.data?.version ?? 0});
    };
    const profile = query.data;
    const field = 'w-full border border-border-input bg-card px-3 py-2.5 text-base font-normal text-card-foreground focus:border-primary focus:outline-none sm:text-sm aria-[invalid=true]:border-danger';

    return <>
        <div className="grid grid-cols-1 gap-px bg-slate-200 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
            <section className="flex h-full flex-col bg-card" aria-labelledby="enterprise-title">
                <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/70 px-4 py-3">
                    <h2 id="enterprise-title" className="m-0 flex items-center gap-2 text-sm font-bold text-slate-800">
                        <Building2 size={17} className="text-primary" aria-hidden="true"/>{t('enterprise.title')}</h2>
                    {!draft && profile && <button type="button" onClick={() => {
                        setErrors({});
                        setDraft(Object.fromEntries(fieldKeys.map(k => [k, profile[k] ?? ''])) as BillingProfileFields);
                    }} className="h-9 rounded-control border border-border bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">{t('enterprise.edit')}</button>}
                </header>
                <div className="flex-1 p-4 sm:p-5">
                    {query.isPending ? <p role="status" className="m-0 text-sm text-slate-500">{t('enterprise.loading')}</p>
                        : query.isError ? <p role="alert" className="m-0 text-sm text-danger">{t('enterprise.loadError')}</p>
                            : draft ? <form onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
                                {fieldKeys.map(k => <label key={k} className={`grid gap-1.5 text-xs font-bold text-foreground ${k === 'billingAddress' ? 'sm:col-span-2' : ''}`}>
                                    {t(`enterprise.field.${k}`)}
                                    {k === 'billingAddress'
                                        ? <textarea rows={2} value={draft[k]} onChange={e => setDraft({...draft, [k]: e.target.value})} className={field}/>
                                        : <input value={draft[k]} aria-invalid={!!errors[k]} inputMode={k === 'taxCode' ? 'numeric' : undefined}
                                                 type={k === 'emergencyContactPhone' ? 'tel' : 'text'} onChange={e => setDraft({...draft, [k]: e.target.value})} className={field}/>}
                                    {k === 'taxCode' && <span className="text-xs font-normal text-slate-500">{t('enterprise.taxCodeHint')}</span>}
                                    {errors[k] && <span className="text-sm font-normal text-danger">{errors[k]}</span>}
                                </label>)}
                                <div className="flex justify-end gap-3 sm:col-span-2">
                                    <button type="button" onClick={() => setDraft(null)} disabled={save.isPending}
                                            className="h-10 border border-border px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">{t('enterprise.cancel')}</button>
                                    <button type="submit" disabled={save.isPending}
                                            className="h-10 bg-primary px-4 text-sm font-bold text-primary-foreground hover:bg-primary-hover disabled:opacity-60">
                                        {save.isPending ? t('enterprise.saving') : t('enterprise.save')}</button>
                                </div>
                            </form> : profile && <dl className="m-0 grid gap-4 sm:grid-cols-2">
                                {fieldKeys.map(k => <div key={k} className={k === 'billingAddress' ? 'sm:col-span-2' : ''}>
                                    <dt className="text-[13px] text-slate-500">{t(`enterprise.field.${k}`)}</dt>
                                    <dd className="mb-0 mt-1 break-words font-semibold text-card-foreground">{profile[k] || t('enterprise.empty')}</dd>
                                </div>)}
                                <p className="m-0 text-xs text-slate-500 sm:col-span-2">{t('enterprise.invoiceNote')}</p>
                            </dl>}
                </div>
            </section>
            <EnterpriseAccessCard/>
        </div>
        <div className="flex-1 bg-white [&>section]:h-full [&>section]:border-0">
            <TwoFactorSettingsCard/>
        </div>
    </>;
}
