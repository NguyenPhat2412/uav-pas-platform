'use client';

import {useEffect, useState, type FormEvent} from 'react';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {Save, UserRound} from 'lucide-react';
import {useAuth} from '@/contexts/AuthContext';
import {useI18n} from '@/contexts/I18nContext';
import {displayLabel} from '@/components/shared/presentation';
import {QueryState} from '@/components/data/WorkspaceState';
import {RequiredMark} from '@/components/shared/RequiredMark';
import {profileError, validateProfile} from '@/features/profile/forms/profile-form';
import {profileService} from '@/features/profile/services/profile.service';
import type {ProfileErrors, ProfileFields} from '@/features/profile/types/profile.interface';
import {PasswordChangeCard} from '@/features/profile/components/PasswordChangeCard';

/** The admin's own account: editable name and phone, read-only identity, and a self-service password change. */
export function AdminProfilePanel() {
    const {user, refreshUser} = useAuth();
    const {t} = useI18n();
    const tp = (key: string, params?: Record<string, string | number>) => t(key.replace(/^profile\./, 'admin.profile.'), params);
    const client = useQueryClient();
    const key = ['session', user?.id, 'admin-profile'];
    const profile = useQuery({
        queryKey: key, enabled: !!user, retry: false,
        queryFn: ({signal}) => profileService.get(signal),
    });
    const [fields, setFields] = useState<ProfileFields>({fullName: '', phoneNumber: ''});
    const [errors, setErrors] = useState<ProfileErrors>({});
    const [saved, setSaved] = useState(false);
    useEffect(() => {
        if (profile.data) setFields({fullName: profile.data.fullName ?? '', phoneNumber: profile.data.phoneNumber ?? ''});
    }, [profile.data]);
    const save = useMutation({
        retry: false,
        mutationFn: () => profileService.update(fields, profile.data!.revision),
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
            void refreshUser();
        } catch {
            /* Shown below. */
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
                {saved && <p role="status" className="border-l-[3px] border-l-uav-blue bg-uav-blue-light px-3 py-2 text-[13px] text-uav-blue">
                    {t('admin.profile.saved')}</p>}
                <button type="submit" disabled={save.isPending}
                        className="inline-flex h-9 items-center gap-1.5 bg-primary px-4 text-[13px] font-semibold text-primary-foreground disabled:opacity-50">
                    <Save size={15} aria-hidden="true"/>{t('admin.profile.save')}</button>
            </form>}</QueryState>
        </section>
        <PasswordChangeCard/>
    </div>;
}
