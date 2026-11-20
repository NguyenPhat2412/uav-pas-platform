'use client';

import {useState, type FormEvent} from 'react';
import {Save, ShieldCheck, UserRound} from 'lucide-react';
import {OperationsPage} from '@/components/layout/OperationsPage';
import {QueryState} from '@/components/data/WorkspaceState';
import {Alert, Badge, Button, Card, CardContent, CardHeader, CardTitle, FormField, Input} from '@/components/ui';
import {AvatarEditor} from '@/components/profile/AvatarEditor';
import {PasswordChangeCard} from '@/components/profile/PasswordChangeCard';
import {TwoFactorSettingsCard} from '@/components/profile/TwoFactorSettingsCard';
import {AccountDeletionCard} from '@/components/profile/AccountDeletionCard';
import {profileError} from '@/forms/profile/profile-form';
import {useOwnProfile, useUpdateProfile} from '@/hooks/profile/useProfile';
import {displayLabel} from '@/lib/presentation';
import {cn} from '@/lib/utils';
import {useAuth} from '@/providers/AuthContext';
import {useI18n} from '@/providers/I18nContext';
import type {ProfileErrors, ProfileFields} from '@/types/profile/profile.types';

export default function OperationsProfilePanel() {
    return (
        <OperationsPage permission={null} activeResource="profile">
            <OperationsProfileWorkspace/>
        </OperationsPage>
    );
}

function OperationsProfileWorkspace() {
    const {user, permissions, refreshUser} = useAuth();
    const {t} = useI18n();
    const tp = (key: string, params?: Record<string, string | number>) => t(key.replace(/^profile\./, 'admin.profile.'), params);
    const profile = useOwnProfile();
    const [fields, setFields] = useState<ProfileFields>({fullName: '', phoneNumber: ''});
    const [errors, setErrors] = useState<ProfileErrors>({});
    const [saved, setSaved] = useState(false);

    const [loadedFrom, setLoadedFrom] = useState(profile.data);
    if (profile.data && profile.data !== loadedFrom) {
        setLoadedFrom(profile.data);
        setFields({fullName: profile.data.fullName ?? '', phoneNumber: profile.data.phoneNumber ?? ''});
    }

    const save = useUpdateProfile();
    const submit = async (e: FormEvent) => {
        e.preventDefault();
        if (!profile.data) return;
        setSaved(false);
        setErrors({});
        try {
            await save.mutateAsync({fields, revision: profile.data.revision});
            setSaved(true);
            void refreshUser();
        } catch (error) {
            const found = profileError(error, tp);
            if (found.fields) setErrors(found.fields);
        }
    };

    const saveError = save.error && !profileError(save.error, tp).fields ? profileError(save.error, tp) : null;
    const displayName = profile.data?.fullName || user?.fullName || user?.username || '';
    const permissionList = [...(permissions ?? [])].sort();

    return (
        <div className="space-y-4">
            <div className="rounded-panel border border-slate-200 border-t-2 border-t-primary bg-white px-5 py-4">
                <h1 className="m-0 text-lg font-extrabold text-slate-900">
                    {t('publicSite.profileHub.opsTitle')}
                </h1>
                <p className="m-0 mt-1 text-xs text-slate-600">
                    {t('publicSite.profileHub.opsSubtitle')}
                </p>
            </div>

            <div className="border border-slate-200 bg-white">
                <AvatarEditor name={displayName}/>
            </div>

            <div className="grid gap-px border border-slate-200 bg-slate-200 [&>*]:border-0 lg:grid-cols-2">
                <Card className="rounded-none bg-white" aria-labelledby="ops-profile-title">
                    <CardHeader className="flex-row items-center gap-2 space-y-0">
                        <UserRound size={17} className="text-primary" aria-hidden="true"/>
                        <CardTitle id="ops-profile-title" className="text-[15px] font-bold text-slate-900">
                            {t('admin.profile.title')}
                        </CardTitle>
                    </CardHeader>
                    <QueryState query={profile}>
                        {profile.data && (
                            <CardContent>
                                <form className="space-y-4" onSubmit={e => void submit(e)} noValidate>
                                    <dl className="m-0 grid grid-cols-[120px_minmax(0,1fr)] items-center gap-x-3 gap-y-2 rounded-control bg-slate-50 px-4 py-3 text-[13px]">
                                        <dt className="text-slate-500">{t('admin.profile.username')}</dt>
                                        <dd className="m-0 font-mono text-slate-900">{user?.username}</dd>
                                        <dt className="text-slate-500">{t('admin.profile.email')}</dt>
                                        <dd className="m-0 break-all text-slate-900">{user?.email}</dd>
                                        <dt className="text-slate-500">{t('admin.profile.role')}</dt>
                                        <dd className="m-0"><Badge variant="primary">{displayLabel(user?.role)}</Badge></dd>
                                    </dl>

                                    <FormField id="ops-profile-fullname" label={t('admin.profile.fullName')} optional error={errors.fullName}>
                                        <Input
                                            id="ops-profile-fullname"
                                            value={fields.fullName}
                                            aria-invalid={Boolean(errors.fullName)}
                                            onChange={e => setFields(f => ({...f, fullName: e.target.value}))}
                                            className={cn('h-10 px-3 text-sm', errors.fullName && 'border-danger')}
                                        />
                                    </FormField>

                                    <FormField id="ops-profile-phone" label={t('admin.profile.phone')} required error={errors.phoneNumber}>
                                        <Input
                                            id="ops-profile-phone"
                                            type="tel"
                                            required
                                            value={fields.phoneNumber}
                                            aria-invalid={Boolean(errors.phoneNumber)}
                                            onChange={e => setFields(f => ({...f, phoneNumber: e.target.value}))}
                                            className={cn('h-10 px-3 text-sm', errors.phoneNumber && 'border-danger')}
                                        />
                                    </FormField>

                                    {saveError && (
                                        <Alert variant="error">
                                            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                                                <span>{saveError.message}</span>
                                                {saveError.kind === 'conflict' && (
                                                    <Button type="button" size="sm" variant="outline" onClick={() => void profile.refetch()}>
                                                        {t('admin.profile.reload')}
                                                    </Button>
                                                )}
                                            </div>
                                        </Alert>
                                    )}

                                    {saved && <Alert variant="success">{t('admin.profile.saved')}</Alert>}

                                    <Button type="submit" size="sm" isLoading={save.isPending} leftIcon={<Save size={15} aria-hidden="true"/>}>
                                        {t('admin.profile.save')}
                                    </Button>
                                </form>
                            </CardContent>
                        )}
                    </QueryState>
                </Card>

                <PasswordChangeCard/>

                <div className="lg:col-span-2 [&>*]:rounded-none [&>*]:border-0">
                    <TwoFactorSettingsCard/>
                </div>

                {permissionList.length > 0 && (
                    <Card className="rounded-none bg-white lg:col-span-2" aria-labelledby="ops-permissions-title">
                        <CardHeader className="flex-row items-center gap-2 space-y-0">
                            <ShieldCheck size={17} className="text-primary" aria-hidden="true"/>
                            <CardTitle id="ops-permissions-title" className="text-[15px] font-bold text-slate-900">
                                {t('publicSite.profileHub.opsPermissionsTitle')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2.5">
                            <p className="m-0 text-xs text-slate-600">
                                {t('publicSite.profileHub.opsPermissionsDesc')}
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                                {permissionList.map(code => (
                                    <Badge key={code} variant="outline">{code}</Badge>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                <div className="lg:col-span-2 [&>*]:rounded-none [&>*]:border-0">
                    <AccountDeletionCard/>
                </div>
            </div>
        </div>
    );
}
