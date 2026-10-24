'use client';
import Link from 'next/link';
import {useParams, useRouter} from 'next/navigation';
import {useState} from 'react';
import {displayLabel, serviceName} from "@/components/shared/presentation";
import {PageGuard} from "@/components/customer/layout";
import {Button, Panel} from "@/components/customer/ui";
import {useAuth} from '@/contexts/AuthContext';
import {useMission, useMissionActions, useServices} from "@/lib/query/customer";
import {
    focusMissionErrors,
    MissionErrorSummary,
    MissionFields
} from "@/features/missions/components/customer/MissionFields";
import {
    canEditMission,
    missionFormError,
    type MissionFormErrors,
    missionFormFromDetail,
    validateMissionForm
} from "@/features/missions/forms/mission-form";
import type {Mission} from "@/types/customer";
import {parseEntityId, toMissionSlug} from "@/lib/url-slugs";
import {useI18n} from '@/contexts/I18nContext';

export default function EditMissionPage() {
    return <PageGuard><EditMission/></PageGuard>;
}

function EditMission() {
    const {id} = useParams<{ id: string }>();
    const missionId = parseEntityId(id);
    const query = useMission(missionId);
    const {user, can} = useAuth();
    const {t} = useI18n();
    const noticeClass = 'rounded-lg bg-amber-50 px-3.5 py-3 text-xs text-warning [&_a]:underline';
    if (!Number.isSafeInteger(missionId) || missionId <= 0) return <div className={noticeClass} role="alert">{t('missionEdit.invalidId')} <Link href="/customer/missions">{t('missionDetail.backToList')}</Link></div>;
    if (query.isLoading) return <div role="status" className="text-sm text-muted">{t('missionEdit.loading')}</div>;
    const accessDenied = query.error && 'status' in query.error && [401, 403, 404].includes(Number(query.error.status));
    if (accessDenied || !query.data) return <div className="flex flex-wrap items-center gap-3 rounded-lg bg-red-50 px-3.5 py-3 text-xs text-danger [&_a]:underline" role="alert">{t('missionEdit.loadError')} <Button variant="secondary" onClick={() => void query.refetch()}>{t('common.retry')}</Button> <Link
            href="/customer/missions">{t('missionDetail.backToList')}</Link></div>;
    const mission = query.data;
    if (mission.customerId !== user?.id) return <div className={noticeClass} role="alert">{t('missionEdit.notOwner')} <Link href="/customer/missions">{t('missionDetail.backToList')}</Link></div>;
    if (!canEditMission(mission, user?.id, can('MISSION_UPDATE'))) return <div className={noticeClass}
                                                                               role="alert">{mission.status !== 'DRAFT' ? t('missionEdit.notDraft') : t('missionEdit.noPermission')}
        <Link href={`/customer/missions/${toMissionSlug(mission)}`}>{t('missionEdit.viewDetail')}</Link></div>;
    return <DraftEditor key={mission.id} mission={mission} reload={async () => {
        const result = await query.refetch();
        if (result.isError) throw result.error;
        return result.data;
    }}/>;
}

function DraftEditor({mission, reload}: { mission: Mission; reload: () => Promise<Mission | undefined> }) {
    const router = useRouter();
    const actions = useMissionActions();
    const services = useServices();
    const {t} = useI18n();
    const [form, setForm] = useState(() => missionFormFromDetail(mission));
    // Keep the version paired with the visible form, even if a background refetch updates the query.
    const [expectedVersion, setExpectedVersion] = useState(mission.version);
    const [errors, setErrors] = useState<MissionFormErrors>({});
    const [error, setError] = useState('');
    const [mustReload, setMustReload] = useState(false);
    const [reloading, setReloading] = useState(false);
    const selectedService = services.data?.find(service => service.id === mission.serviceId);
    const save = async () => {
        setError('');
        const nextErrors = validateMissionForm(form, undefined, t);
        setErrors(nextErrors);
        if (Object.keys(nextErrors).length) {
            focusMissionErrors();
            return;
        }
        if (mustReload) return;
        try {
            await actions.update.mutateAsync({id: mission.id, data: form, expectedVersion});
            router.replace(`/customer/missions/${toMissionSlug(mission)}`);
        } catch (err) {
            setError(missionFormError(err, t));
            if (err && typeof err === 'object' && 'status' in err && err.status === 409) setMustReload(true);
        }
    };
    const reloadDraft = async () => {
        setReloading(true);
        try {
            const current = await reload();
            if (!current) {
                setError(t('missionEdit.reloadError'));
                return;
            }
            setForm(missionFormFromDetail(current));
            setExpectedVersion(current.version);
            setErrors({});
            setError('');
            setMustReload(false);
        } catch {
            setError(t('missionEdit.reloadError'));
        } finally {
            setReloading(false);
        }
    };
    return <>
        <Link href={`/customer/missions/${toMissionSlug(mission)}`} className="inline-flex min-h-11 w-fit items-center gap-2 text-sm font-semibold text-primary hover:underline">{t('missionEdit.back')}</Link>
        <div className="sr-only">
            <div><h1>{t('missionEdit.title')}</h1><p>{mission.code} · {t('missionEdit.subtitle')}</p>
            </div>
        </div>
        <Panel title={t('missionCreate.requestDetails')}>
            <div className="mb-5 rounded-lg bg-amber-50 px-3.5 py-3 text-xs text-warning">
                <strong>{displayLabel(mission.missionType)}</strong>{mission.serviceId && <> · {selectedService ? serviceName(selectedService) : t('missionEdit.serviceNumber', {id: mission.serviceId})}</>}
                <p className="m-0 mt-1">{t('missionEdit.fixedService')}</p></div>
            {error && <div className="mb-5 rounded-lg bg-red-50 px-3.5 py-3 text-xs text-danger" role="alert">{error}</div>}
            {mustReload &&
                <div className="mb-5 flex flex-wrap items-center gap-3 rounded-lg bg-amber-50 px-3.5 py-3 text-xs text-warning"><p className="m-0">{t('missionEdit.reloadWarning')}</p><Button variant="secondary"
                                                                                    disabled={reloading}
                                                                                    onClick={() => void reloadDraft()}>{reloading ? t('common.loading') : t('missionEdit.reloadDraft')}</Button>
                </div>}
            <form onSubmit={event => {
                event.preventDefault();
                void save();
            }}>
                <MissionErrorSummary errors={errors}/>
                <fieldset className="m-0 border-0 p-0 disabled:opacity-65" disabled={actions.update.isPending || mustReload || reloading}>
                    <legend className="sr-only">{t('missionEdit.legend')}</legend>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><MissionFields form={form} onChange={setForm} errors={errors}/></div>
                    <div className="mt-5 flex flex-wrap justify-end gap-3"><Link href={`/customer/missions/${toMissionSlug(mission)}`}
                                                        className="inline-flex min-h-11 shrink-0 items-center justify-center whitespace-nowrap rounded-full border border-border bg-card px-4 text-sm font-bold text-foreground transition-colors hover:bg-background">{t('missionEdit.backToDetail')}</Link><Button
                        type="submit">{actions.update.isPending ? t('missionCreate.saving') : t('missionEdit.saveChanges')}</Button></div>
                </fieldset>
            </form>
        </Panel>
    </>;
}
