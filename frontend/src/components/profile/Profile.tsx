'use client';
import {type FormEvent, useEffect, useRef, useState} from 'react';
import {displayLabel} from "@/lib/presentation";
import {Button, Field, Panel} from "@/components/customer/CustomerUi";
import {useAuth} from '@/providers/AuthContext';
import {
    type CustomerProfile,
    profileError,
    type ProfileErrors,
    type ProfileFields,
} from "@/forms/profile/profile-form";
import {useOwnProfile, useUpdateProfile} from '@/hooks/profile/useProfile';
import {useI18n} from '@/providers/I18nContext';
import {toast} from '@/providers/ToastContext';
import {EnterpriseProfilePanel} from '@/components/profile/EnterpriseProfilePanel';
import {AvatarEditor} from '@/components/profile/AvatarEditor';

export function CustomerProfilePage() {
    const {user} = useAuth();
    return <Profile key={user?.id}/>;
}

function Profile() {
    const {user} = useAuth();
    const {t} = useI18n();
    const query = useOwnProfile();
    const update = useUpdateProfile();
    const [draft, setDraft] = useState<{ fields: ProfileFields; revision: string } | null>(null);
    const [errors, setErrors] = useState<ProfileErrors>({});
    const [failure, setFailure] = useState<ReturnType<typeof profileError> | null>(null);
    const [success, setSuccess] = useState('');
    const [reloading, setReloading] = useState(false);
    const firstInput = useRef<HTMLInputElement>(null);
    const message = useRef<HTMLDivElement>(null);
    const profile = query.data?.id === user?.id ? query.data : undefined;
    const busy = update.isPending || reloading;
    const editing = !!draft;
    useEffect(() => {
        if (!editing) return;
        const warn = (event: BeforeUnloadEvent) => {
            event.preventDefault();
        };
        window.addEventListener('beforeunload', warn);
        return () => window.removeEventListener('beforeunload', warn);
    }, [editing]);

    function edit(value: CustomerProfile) {
        setDraft({
            fields: {fullName: value.fullName ?? '', phoneNumber: value.phoneNumber ?? ''},
            revision: value.revision
        });
        setErrors({});
        setFailure(null);
        setSuccess('');
        requestAnimationFrame(() => firstInput.current?.focus());
    }

    function cancel() {
        setDraft(null);
        setErrors({});
        setFailure(null);
        setSuccess('');
    }

    async function reload() {
        if (draft && !window.confirm(t('profile.reloadConfirm'))) return;
        setReloading(true);
        try {
            const result = await query.refetch();
            if (result.error || !result.data) throw result.error;
            edit(result.data);
        } catch {
            setFailure({
                kind: failure?.kind ?? 'other',
                message: t('profile.reloadError')
            });
        } finally {
            setReloading(false);
        }
    }

    async function save(event: FormEvent) {
        event.preventDefault();
        if (!draft || busy || failure?.kind === 'conflict' || failure?.kind === 'uncertain') return;
        setErrors({});
        setFailure(null);
        setSuccess('');
        try {
            await update.mutateAsync(draft);
            setDraft(null);
            setSuccess(t('profile.saved'));
            toast.success(t('profile.saved'));
        } catch (error) {
            const next = profileError(error, t);
            if (next.fields) {
                setErrors(next.fields);
                requestAnimationFrame(() => document.getElementById(next.fields?.fullName ? 'profile-name' : 'profile-phone')?.focus());
                return;
            }
            setFailure(next);
            toast.error(next.message);
            if (next.kind === 'phone') setErrors({phoneNumber: next.message});
            requestAnimationFrame(() => message.current?.focus());
        }
    }

    return <>
        <div className="flex flex-1 flex-col divide-y divide-slate-200 bg-white">
            <div className="grid grid-cols-1 gap-px bg-slate-200 xl:grid-cols-[minmax(280px,0.95fr)_minmax(0,1.15fr)_minmax(0,1fr)] [&>*]:border-0">
                <AvatarEditor name={profile?.fullName || user?.fullName || user?.username || ''}/>
                <Panel title={t('profile.personalInfo')} className="h-full border-0" action={!draft && profile ?
                    <Button variant="secondary" onClick={() => edit(profile)}>{t('profile.edit')}</Button> : undefined}>
                {success && (
                    <div className="bg-uav-blue-light text-uav-blue rounded-panel px-3.5 py-3 mb-5 text-sm font-medium border border-blue-200" role="status">
                        {success}
                    </div>
                )}
                {!profile && !query.isError && <p role="status" className="text-sm text-slate-500">{t('profile.loading')}</p>}
                {query.isError && (
                    <div className="px-3.5 py-3 mb-4 rounded-panel bg-rose-50 text-danger text-[13px] flex items-center justify-between gap-3 flex-wrap" role="alert">
                        <span>{t('profile.loadError')}</span>
                        <Button variant="secondary" onClick={() => void query.refetch()} disabled={query.isFetching}>
                            {t('common.retry')}
                        </Button>
                    </div>
                )}
                {draft ? (
                    <form onSubmit={save} noValidate aria-label={t('profile.editLabel')}>
                        {failure && (
                            <div
                                className="px-3.5 py-3 mb-5 rounded-panel bg-rose-50 text-danger text-[13px]"
                                role="alert"
                                tabIndex={-1}
                                ref={message}
                            >
                                {failure.message}
                            </div>
                        )}
                        {profile && profile.revision !== draft.revision && !failure && (
                            <p className="px-3.5 py-3 mb-4 rounded-panel bg-amber-50 text-amber-800 text-[13px]" role="status">
                                {t('profile.newerVersion')}
                            </p>
                        )}
                        <fieldset disabled={busy} className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-0 p-0 m-0 disabled:opacity-65">
                            <div className="grid gap-2 text-[13px] font-bold text-slate-900">
                                <label htmlFor="profile-name">{t('profile.fullName')}</label>
                                <input
                                    id="profile-name"
                                    ref={firstInput}
                                    autoComplete="name"
                                    value={draft.fields.fullName}
                                    aria-invalid={!!errors.fullName}
                                    aria-describedby={errors.fullName ? 'profile-name-error' : 'profile-name-hint'}
                                    onChange={e => setDraft({
                                        ...draft,
                                        fields: {
                                            ...draft.fields,
                                            fullName: e.target.value
                                        }
                                    })}
                                    className={`w-full border rounded-control px-3 py-2.5 bg-card text-card-foreground text-base font-normal focus:outline-none focus:border-primary ${
                                        errors.fullName ? 'border-danger' : 'border-border-input'
                                    }`}
                                />
                                <p className="mt-1.5 mb-0 text-sm text-slate-500 font-normal" id="profile-name-hint">
                                    {t('profile.nameHint')}
                                </p>
                                {errors.fullName && (
                                    <p className="mt-1.5 mb-0 text-sm text-danger font-normal leading-normal" id="profile-name-error">
                                        {errors.fullName}
                                    </p>
                                )}
                            </div>
                            <div>
                                <Field
                                    id="profile-phone"
                                    label={t('profile.phone')}
                                    type="tel"
                                    autoComplete="tel"
                                    required
                                    value={draft.fields.phoneNumber}
                                    aria-invalid={!!errors.phoneNumber}
                                    aria-describedby={errors.phoneNumber ? 'profile-phone-error' : 'profile-phone-hint'}
                                    onChange={e => setDraft({
                                        ...draft,
                                        fields: {...draft.fields, phoneNumber: e.target.value}
                                    })}
                                />
                                <p className="mt-1.5 mb-0 text-sm text-slate-500 font-normal" id="profile-phone-hint">
                                    {t('profile.phoneHint')}
                                </p>
                                {errors.phoneNumber && (
                                    <p className="mt-1.5 mb-0 text-sm text-danger font-normal leading-normal" id="profile-phone-error">
                                        {errors.phoneNumber}
                                    </p>
                                )}
                            </div>
                        </fieldset>
                        {(failure?.kind === 'conflict' || failure?.kind === 'uncertain' || profile && profile.revision !== draft.revision) && (
                            <Button type="button" variant="secondary" disabled={busy} onClick={() => void reload()}>
                                {t('profile.loadLatest')}
                            </Button>
                        )}
                        <div className="flex flex-wrap justify-end gap-3 mt-5">
                            <Button type="button" variant="secondary" onClick={cancel} disabled={busy}>
                                {t('profile.cancelEdit')}
                            </Button>
                            <Button
                                type="submit"
                                disabled={busy || failure?.kind === 'conflict' || failure?.kind === 'uncertain' || !!profile && profile.revision !== draft.revision}
                            >
                                {update.isPending ? t('profile.saving') : t('profile.saveChanges')}
                            </Button>
                        </div>
                    </form>
                ) : profile && (
                    <dl className="profile-details grid grid-cols-1 sm:grid-cols-2 gap-4 items-stretch">
                        <div>
                            <dt className="text-[13px] text-slate-500">{t('profile.fullName')}</dt>
                            <dd className="mt-1 mb-0 font-semibold text-card-foreground break-words">
                                {profile.fullName || t('profile.notUpdated')}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-[13px] text-slate-500">{t('profile.phone')}</dt>
                            <dd className="mt-1 mb-0 font-semibold text-card-foreground break-words">
                                {profile.phoneNumber || t('profile.notUpdated')}
                            </dd>
                        </div>
                    </dl>
                )}
                </Panel>
                <Panel title={t('profile.accountInfo')} className="h-full border-0">
                    <dl className="profile-details grid grid-cols-1 sm:grid-cols-2 gap-4 items-stretch">
                        <div>
                            <dt className="text-[13px] text-slate-500">{t('profile.username')}</dt>
                            <dd className="mt-1 mb-0 font-semibold text-card-foreground break-words">{user?.username}</dd>
                        </div>
                        <div>
                            <dt className="text-[13px] text-slate-500">Email</dt>
                            <dd className="mt-1 mb-0 font-semibold text-card-foreground break-words">{user?.email}</dd>
                        </div>
                        <div>
                            <dt className="text-[13px] text-slate-500">{t('common.status')}</dt>
                            <dd className="mt-1 mb-0 font-semibold text-card-foreground break-words">{displayLabel(user?.status)}</dd>
                        </div>
                    </dl>
                    <p className="mt-6 mb-0 text-sm text-slate-500">{t('profile.readonlyNote')}</p>
                </Panel>
            </div>
            <EnterpriseProfilePanel/>
        </div>
    </>;
}
