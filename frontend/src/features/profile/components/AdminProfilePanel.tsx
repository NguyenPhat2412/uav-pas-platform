'use client';

import {useEffect, useState, type FormEvent} from 'react';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {KeyRound, LogOut, Save, UserRound} from 'lucide-react';
import {useAuth} from '@/contexts/AuthContext';
import {useI18n} from '@/contexts/I18nContext';
import {displayLabel} from '@/components/shared/presentation';
import {ErrorNotice, QueryState} from '@/components/data/WorkspaceState';
import {RequiredMark} from '@/components/shared/RequiredMark';
import {apiClient} from '@/lib/api';
import {cn} from '@/lib/utils';
import {
    type CustomerProfile,
    type ProfileErrors,
    type ProfileFields,
    profileError,
    profilePayload,
    validateProfile
} from '@/features/profile/forms/profile-form';

const profileEndpoint = '/api/v1/users/profile';

/** The admin's own account: editable name and phone, read-only identity, and a self-service password change. */
export function AdminProfilePanel() {
    const {user} = useAuth();
    const {t} = useI18n();
    // The shared profile helpers look up profile.errors.*; admin keeps those strings under admin.profile.errors.
    const tp = (key: string, params?: Record<string, string | number>) => t(key.replace(/^profile\./, 'admin.profile.'), params);
    const client = useQueryClient();
    const key = ['session', user?.id, 'admin-profile'];
    const profile = useQuery({
        queryKey: key, enabled: !!user, retry: false,
        queryFn: ({signal}) => apiClient.get<CustomerProfile>(profileEndpoint, {signal}),
    });
    const [fields, setFields] = useState<ProfileFields>({fullName: '', phoneNumber: ''});
    const [errors, setErrors] = useState<ProfileErrors>({});
    const [saved, setSaved] = useState(false);
    useEffect(() => {
        if (profile.data) setFields({fullName: profile.data.fullName ?? '', phoneNumber: profile.data.phoneNumber ?? ''});
    }, [profile.data]);
    const save = useMutation({
        retry: false,
        mutationFn: () => apiClient.patch<CustomerProfile>(profileEndpoint, profilePayload(fields, profile.data!.revision)),
        onSuccess: data => client.setQueryData(key, data),
    });
    const submit = async (e: FormEvent) => {
        e.preventDefault();
        setSaved(false);
        const found = validateProfile(fields, tp);
        setErrors(found);
        if (Object.keys(found).length) return;
        try {
            await save.mutateAsync();
            setSaved(true);
        } catch {/* Shown below. */
        }
    };
    const saveError = save.error ? profileError(save.error, tp) : null;
    const field = 'mt-1 w-full border border-slate-200 px-3 py-2 text-[13px] font-normal focus:border-primary focus:outline-none';

    return <div className="grid gap-5 lg:grid-cols-2">
        <section className="border border-slate-200 bg-white" aria-labelledby="profile-title">
            <header className="flex items-center gap-2 border-b border-slate-100 px-5 py-3.5">
                <UserRound size={17} className="text-primary" aria-hidden="true"/>
                <h2 id="profile-title" className="text-[15px] font-bold text-slate-900">{t('admin.profile.title')}</h2>
            </header>
            <QueryState query={profile}>{profile.data && <form className="space-y-4 p-5" onSubmit={e => void submit(e)} noValidate>
                <dl className="m-0 grid grid-cols-[120px_minmax(0,1fr)] gap-x-3 gap-y-2 bg-slate-50 px-4 py-3 text-[13px]">
                    <dt className="text-slate-500">{t('admin.profile.username')}</dt><dd className="m-0 font-mono text-slate-900">{user?.username}</dd>
                    <dt className="text-slate-500">{t('admin.profile.email')}</dt><dd className="m-0 break-all text-slate-900">{user?.email}</dd>
                    <dt className="text-slate-500">{t('admin.profile.role')}</dt><dd className="m-0 text-slate-900">{displayLabel(user?.role)}</dd>
                </dl>
                <label className="block text-[13px] font-semibold text-slate-600">{t('admin.profile.fullName')}
                    <input maxLength={100} value={fields.fullName} aria-invalid={!!errors.fullName}
                           onChange={e => setFields(f => ({...f, fullName: e.target.value}))} className={field}/>
                    {errors.fullName && <span className="mt-1 block text-xs font-normal text-red-700">{errors.fullName}</span>}
                </label>
                <label className="block text-[13px] font-semibold text-slate-600">{t('admin.profile.phone')}<RequiredMark/>
                    <input type="tel" maxLength={20} value={fields.phoneNumber} aria-invalid={!!errors.phoneNumber}
                           onChange={e => setFields(f => ({...f, phoneNumber: e.target.value}))} className={field}/>
                    {errors.phoneNumber && <span className="mt-1 block text-xs font-normal text-red-700">{errors.phoneNumber}</span>}
                </label>
                {saveError && <p role="alert" className="border-l-[3px] border-l-red-600 bg-red-50 px-3 py-2 text-[13px] text-red-800">{saveError.message}
                    {saveError.kind === 'conflict' && <button type="button" onClick={() => void profile.refetch()}
                                                              className="ml-2 font-semibold underline">{t('admin.profile.reload')}</button>}</p>}
                {saved && <p role="status" className="border-l-[3px] border-l-emerald-600 bg-emerald-50 px-3 py-2 text-[13px] text-emerald-800">
                    {t('admin.profile.saved')}</p>}
                <button type="submit" disabled={save.isPending}
                        className="inline-flex h-9 items-center gap-1.5 bg-primary px-4 text-[13px] font-semibold text-primary-foreground disabled:opacity-50">
                    <Save size={15} aria-hidden="true"/>{t('admin.profile.save')}</button>
            </form>}</QueryState>
        </section>
        <PasswordCard/>
    </div>;
}

function PasswordCard() {
    const {logout} = useAuth();
    const {t} = useI18n();
    const [current, setCurrent] = useState('');
    const [next, setNext] = useState('');
    const [confirm, setConfirm] = useState('');
    const [error, setError] = useState('');
    const [done, setDone] = useState(false);
    const change = useMutation({
        mutationFn: () => apiClient.post<void>(`${profileEndpoint}/password`, {currentPassword: current, newPassword: next}),
    });
    const submit = async (e: FormEvent) => {
        e.preventDefault();
        if (next.length < 8) return setError(t('admin.profile.password.tooShort'));
        if (next !== confirm) return setError(t('admin.profile.password.mismatch'));
        setError('');
        try {
            await change.mutateAsync();
            setCurrent('');
            setNext('');
            setConfirm('');
            setDone(true);
        } catch {/* Shown below. */
        }
    };
    const field = 'mt-1 w-full border border-slate-200 px-3 py-2 text-[13px] font-normal focus:border-primary focus:outline-none';
    return <section className="border border-slate-200 bg-white" aria-labelledby="password-title">
        <header className="flex items-center gap-2 border-b border-slate-100 px-5 py-3.5">
            <KeyRound size={17} className="text-primary" aria-hidden="true"/>
            <h2 id="password-title" className="text-[15px] font-bold text-slate-900">{t('admin.profile.password.title')}</h2>
        </header>
        {done ? <div className="space-y-3 p-5">
            <p role="status" className="border-l-[3px] border-l-emerald-600 bg-emerald-50 px-3 py-2 text-[13px] text-emerald-800">
                {t('admin.profile.password.done')}</p>
            <button type="button" onClick={() => void logout()}
                    className="inline-flex h-9 items-center gap-1.5 bg-primary px-4 text-[13px] font-semibold text-primary-foreground">
                <LogOut size={15} aria-hidden="true"/>{t('admin.profile.password.signInAgain')}</button>
        </div> : <form className="space-y-4 p-5" onSubmit={e => void submit(e)} noValidate>
            <label className="block text-[13px] font-semibold text-slate-600">{t('admin.profile.password.current')}<RequiredMark/>
                <input type="password" required autoComplete="current-password" value={current} onChange={e => setCurrent(e.target.value)} className={field}/></label>
            <label className="block text-[13px] font-semibold text-slate-600">{t('admin.profile.password.new')}<RequiredMark/>
                <input type="password" required minLength={8} maxLength={100} autoComplete="new-password" value={next}
                       onChange={e => setNext(e.target.value)} className={field}/></label>
            <label className="block text-[13px] font-semibold text-slate-600">{t('admin.profile.password.confirm')}<RequiredMark/>
                <input type="password" required minLength={8} maxLength={100} autoComplete="new-password" value={confirm}
                       onChange={e => setConfirm(e.target.value)} className={field}/></label>
            <p className="text-xs text-slate-500">{t('admin.profile.password.hint')}</p>
            {error && <p role="alert" className="border-l-[3px] border-l-red-600 bg-red-50 px-3 py-2 text-[13px] text-red-800">{error}</p>}
            <ErrorNotice error={change.error}/>
            <button type="submit" disabled={change.isPending || !current || !next || !confirm}
                    className={cn('inline-flex h-9 items-center gap-1.5 bg-primary px-4 text-[13px] font-semibold text-primary-foreground disabled:opacity-50')}>
                <KeyRound size={15} aria-hidden="true"/>{t('admin.profile.password.submit')}</button>
        </form>}
    </section>;
}
