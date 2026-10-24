'use client';
import {type FormEvent, useEffect, useRef, useState} from 'react';
import {displayLabel} from "@/components/shared/presentation";
import {Button, Field, Panel} from "@/components/customer/ui";
import {useAuth} from '@/contexts/AuthContext';
import {
    type CustomerProfile,
    profileError,
    type ProfileErrors,
    type ProfileFields,
    validateProfile
} from "@/features/profile/forms/profile-form";
import {useCustomerProfile, useUpdateCustomerProfile} from "@/features/profile/hooks/profile-query";
import {useI18n} from '@/contexts/I18nContext';

export function CustomerProfilePage() {
    const {user} = useAuth();
    return <Profile key={user?.id}/>;
}

function Profile() {
    const {user} = useAuth();
    const {t} = useI18n();
    const query = useCustomerProfile();
    const update = useUpdateCustomerProfile();
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
        const invalid = validateProfile(draft.fields, t);
        setErrors(invalid);
        setFailure(null);
        setSuccess('');
        if (Object.keys(invalid).length) {
            requestAnimationFrame(() => document.getElementById(invalid.fullName ? 'profile-name' : 'profile-phone')?.focus());
            return;
        }
        try {
            await update.mutateAsync(draft);
            setDraft(null);
            setSuccess(t('profile.saved'));
        } catch (error) {
            const next = profileError(error, t);
            setFailure(next);
            if (next.kind === 'phone') setErrors({phoneNumber: next.message});
            requestAnimationFrame(() => message.current?.focus());
        }
    }

    return <>
        <div className="page-heading">
            <div><h1>{t('profile.title')}</h1><p>{t('profile.subtitle')}</p></div>
        </div>
        <div className="profile-layout">
            <Panel title={t('profile.personalInfo')} action={!draft && profile ?
                <Button variant="secondary" onClick={() => edit(profile)}>{t('profile.edit')}</Button> : undefined}>
                {success && <div className="profile-success" role="status">{success}</div>}
                {!profile && !query.isError && <p role="status">{t('profile.loading')}</p>}
                {query.isError && <div className="error" role="alert">{t('profile.loadError')} <Button
                    variant="secondary" onClick={() => void query.refetch()} disabled={query.isFetching}>{t('common.retry')}</Button></div>}
                {draft ? <form onSubmit={save} noValidate aria-label={t('profile.editLabel')}>
                    {failure && <div className="error form-error-summary" role="alert" tabIndex={-1}
                                     ref={message}>{failure.message}</div>}
                    {profile && profile.revision !== draft.revision && !failure &&
                        <p className="notice" role="status">{t('profile.newerVersion')}</p>}
                    <fieldset disabled={busy} className="form-grid">
                        <div className="field"><label htmlFor="profile-name">{t('profile.fullName')}</label><input id="profile-name"
                                                                                                     ref={firstInput}
                                                                                                     autoComplete="name"
                                                                                                     maxLength={100}
                                                                                                     value={draft.fields.fullName}
                                                                                                     aria-invalid={!!errors.fullName}
                                                                                                     aria-describedby={errors.fullName ? 'profile-name-error' : 'profile-name-hint'}
                                                                                                     onChange={e => setDraft({
                                                                                                         ...draft,
                                                                                                         fields: {
                                                                                                             ...draft.fields,
                                                                                                             fullName: e.target.value
                                                                                                         }
                                                                                                     })}/>
                            <p className="form-hint" id="profile-name-hint">{t('profile.nameHint')}</p>{errors.fullName &&
                                <p className="field-error" id="profile-name-error">{errors.fullName}</p>}</div>
                        <div><Field id="profile-phone" label={t('profile.phone')} type="tel" autoComplete="tel"
                                    maxLength={20} required value={draft.fields.phoneNumber}
                                    aria-invalid={!!errors.phoneNumber}
                                    aria-describedby={errors.phoneNumber ? 'profile-phone-error' : 'profile-phone-hint'}
                                    onChange={e => setDraft({
                                        ...draft,
                                        fields: {...draft.fields, phoneNumber: e.target.value}
                                    })}/>
                            <p className="form-hint" id="profile-phone-hint">{t('profile.phoneHint')}</p>{errors.phoneNumber &&
                                <p className="field-error" id="profile-phone-error">{errors.phoneNumber}</p>}</div>
                    </fieldset>
                    {(failure?.kind === 'conflict' || failure?.kind === 'uncertain' || profile && profile.revision !== draft.revision) &&
                        <Button type="button" variant="secondary" disabled={busy} onClick={() => void reload()}>{t('profile.loadLatest')}</Button>}
                    <div className="form-actions"><Button type="button" variant="secondary" onClick={cancel}
                                                          disabled={busy}>{t('profile.cancelEdit')}</Button><Button type="submit"
                                                                                                        disabled={busy || failure?.kind === 'conflict' || failure?.kind === 'uncertain' || !!profile && profile.revision !== draft.revision}>{update.isPending ? t('profile.saving') : t('profile.saveChanges')}</Button>
                    </div>
                </form> : profile && <dl className="grid grid-2 profile-details">
                    <div>
                        <dt>{t('profile.fullName')}</dt>
                        <dd>{profile.fullName || t('profile.notUpdated')}</dd>
                    </div>
                    <div>
                        <dt>{t('profile.phone')}</dt>
                        <dd>{profile.phoneNumber || t('profile.notUpdated')}</dd>
                    </div>
                </dl>}
            </Panel>
            <Panel title={t('profile.accountInfo')}>
                <dl className="grid grid-2 profile-details">
                    <div>
                        <dt>{t('profile.username')}</dt>
                        <dd>{user?.username}</dd>
                    </div>
                    <div>
                        <dt>Email</dt>
                        <dd>{user?.email}</dd>
                    </div>
                    <div>
                        <dt>{t('common.status')}</dt>
                        <dd>{displayLabel(user?.status)}</dd>
                    </div>
                </dl>
                <p className="form-hint profile-readonly-note">{t('profile.readonlyNote')}</p></Panel>
        </div>
    </>;
}
