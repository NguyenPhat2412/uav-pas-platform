'use client';

import {useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {
    Calendar,
    CheckCircle2,
    ClipboardCheck,
    ExternalLink,
    FileUp,
    Gamepad2,
    MapPin,
    PackageCheck,
    PlaneTakeoff,
    RefreshCw,
    ShieldAlert,
} from 'lucide-react';
import {MissionPreflightCard} from '@/components/mission/operations/MissionPreflightCard';
import {Button, OptionalMark, RequiredMark} from '@/components/ui';
import {extractActionableError} from '@/forms/marketplace/marketplace-forms';
import {usePilotTodayActions} from '@/hooks/marketplace/useMarketplace';
import {useAuth} from '@/providers/AuthContext';
import {useI18n} from '@/providers/I18nContext';
import type {Mission} from '@/types/mission/mission.types';
import {MEDIA_ACCEPT} from '@/utils/media/media-policy';

type PilotTaskTab = 'ACTIVE' | 'IN_FLIGHT' | 'COMPLETED';

function classifyPilotTaskTab(mission: Mission): PilotTaskTab {
    if (mission.status === 'IN_PROGRESS') return 'IN_FLIGHT';
    if (
        mission.status === 'COMPLETED' ||
        mission.status === 'CANCELLED' ||
        mission.status === 'REJECTED' ||
        mission.status === 'FAILED'
    ) {
        return 'COMPLETED';
    }
    return 'ACTIVE';
}

export function PilotTodayWorkspace({
    missions,
    loading,
    error,
    onRefresh,
}: {
    missions: Mission[];
    loading: boolean;
    error?: string | null;
    onRefresh: () => void;
}) {
    const {t} = useI18n();
    const router = useRouter();
    const {user, can} = useAuth();
    const {startTask, uploadDeliverable, completeTask} = usePilotTodayActions();

    const [activeTab, setActiveTab] = useState<PilotTaskTab>('ACTIVE');
    const [openPreflightId, setOpenPreflightId] = useState<number | null>(null);
    const [openCompleteId, setOpenCompleteId] = useState<number | null>(null);
    const [uploadingMissionId, setUploadingMissionId] = useState<number | null>(null);
    const [uploadedNamesByMission, setUploadedNamesByMission] = useState<Record<number, string[]>>({});
    const [handoverNoteByMission, setHandoverNoteByMission] = useState<Record<number, string>>({});
    const [conditionByMission, setConditionByMission] = useState<Record<number, string>>({});
    const [busyMissionId, setBusyMissionId] = useState<number | null>(null);
    const [errorMsg, setErrorMsg] = useState('');

    // Filter to missions assigned to the current operator if any match, otherwise show the operator's visible missions
    const ownMissions =
        user?.id != null && missions.some(m => m.operatorId === user.id)
            ? missions.filter(m => m.operatorId === user.id)
            : missions;

    const counts: Record<PilotTaskTab, number> = {
        ACTIVE: ownMissions.filter(m => classifyPilotTaskTab(m) === 'ACTIVE').length,
        IN_FLIGHT: ownMissions.filter(m => classifyPilotTaskTab(m) === 'IN_FLIGHT').length,
        COMPLETED: ownMissions.filter(m => classifyPilotTaskTab(m) === 'COMPLETED').length,
    };

    const visibleMissions = ownMissions.filter(m => classifyPilotTaskTab(m) === activeTab);

    const handleStartSimulation = async (mission: Mission) => {
        setErrorMsg('');
        setBusyMissionId(mission.id);
        try {
            await startTask.mutateAsync(mission);
            onRefresh();
            router.push(
                `/operations/simulation?missionId=${mission.id}${mission.uavId ? `&uavId=${mission.uavId}` : ''}`,
            );
        } catch (err) {
            setErrorMsg(extractActionableError(err, t('opsMarketplace.common.retry')));
        } finally {
            setBusyMissionId(null);
        }
    };

    const handleUploadDeliverable = async (mission: Mission, file: File) => {
        setErrorMsg('');
        setUploadingMissionId(mission.id);
        try {
            const uploadedName = await uploadDeliverable.mutateAsync({missionId: mission.id, file});
            setUploadedNamesByMission(prev => ({
                ...prev,
                [mission.id]: [...(prev[mission.id] ?? []), uploadedName],
            }));
        } catch (err) {
            setErrorMsg(extractActionableError(err, t('opsMissions.detail.errors.uploadUnconfirmed')));
        } finally {
            setUploadingMissionId(null);
        }
    };

    const handleCompleteMission = async (mission: Mission) => {
        setErrorMsg('');
        const note = (handoverNoteByMission[mission.id] ?? '').trim();
        if (!note) {
            setErrorMsg(t('opsMissions.errors.completionRequired'));
            return;
        }
        const condition =
            (conditionByMission[mission.id] ?? '').trim() ||
            t('opsMarketplace.pilotToday.equipmentConditionDefault');
        setBusyMissionId(mission.id);
        try {
            await completeTask.mutateAsync({
                mission,
                completionNote: note,
                equipmentCondition: condition,
            });
            setOpenCompleteId(null);
            setActiveTab('COMPLETED');
            onRefresh();
        } catch (err) {
            setErrorMsg(extractActionableError(err, t('opsMarketplace.common.retry')));
        } finally {
            setBusyMissionId(null);
        }
    };

    return (
        <section className="mb-6 space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-uav-red-light px-2.5 py-0.5 text-xs font-bold whitespace-nowrap text-primary">
                        <PlaneTakeoff size={13} aria-hidden="true"/>
                        {t('opsMarketplace.pilotToday.badge')}
                    </span>
                    <h2 className="m-0 mt-1.5 text-xl font-bold text-slate-900">
                        {t('opsMarketplace.pilotToday.title')}
                    </h2>
                    <p className="m-0 mt-0.5 text-[13px] text-slate-500">
                        {t('opsMarketplace.pilotToday.subtitle')}
                    </p>
                </div>

                <Button type="button" variant="secondary" size="sm" onClick={onRefresh}>
                    <RefreshCw size={14} className="mr-1.5 inline" aria-hidden="true"/>
                    {t('opsMissions.list.refresh')}
                </Button>
            </div>

            {/* 3 Tab Việc hôm nay của Kỹ sư */}
            <div className="grid grid-cols-3 gap-2" role="tablist">
                {([
                    {key: 'ACTIVE' as const, icon: ClipboardCheck},
                    {key: 'IN_FLIGHT' as const, icon: PlaneTakeoff},
                    {key: 'COMPLETED' as const, icon: PackageCheck},
                ]).map(tab => {
                    const Icon = tab.icon;
                    const active = activeTab === tab.key;
                    return (
                        <button
                            key={tab.key}
                            type="button"
                            role="tab"
                            aria-selected={active}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex min-h-12 items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left transition-colors ${
                                active
                                    ? 'border-primary bg-uav-red-light text-primary'
                                    : 'border-slate-200 bg-slate-50/70 text-slate-700 hover:bg-slate-100'
                            }`}
                        >
                            <span className="inline-flex items-center gap-1.5 min-w-0">
                                <Icon size={16} className="shrink-0" aria-hidden="true"/>
                                <span className="truncate text-xs font-semibold whitespace-nowrap">
                                    {t(`opsMarketplace.pilotToday.tabs.${tab.key}`)}
                                </span>
                            </span>
                            <strong className="rounded-full bg-white px-2 py-0.5 text-xs font-bold tabular-nums text-slate-900 shadow-2xs">
                                {counts[tab.key]}
                            </strong>
                        </button>
                    );
                })}
            </div>

            {(error || errorMsg) && (
                <div className="flex items-center justify-between gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-danger" role="alert">
                    <span className="inline-flex items-center gap-1.5">
                        <ShieldAlert size={15} aria-hidden="true"/>
                        {errorMsg || error}
                    </span>
                    <button
                        type="button"
                        onClick={onRefresh}
                        className="rounded-control bg-white px-2.5 py-1 text-xs font-bold whitespace-nowrap text-danger shadow-2xs"
                    >
                        {t('opsMarketplace.common.retry')}
                    </button>
                </div>
            )}

            {loading ? (
                <div className="space-y-3" role="status" aria-label={t('opsMarketplace.common.loading')}>
                    {[1, 2].map(n => (
                        <div key={n} className="h-36 animate-pulse rounded-2xl bg-slate-200/70"/>
                    ))}
                </div>
            ) : visibleMissions.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 p-8 text-center">
                    <CheckCircle2 size={28} className="mx-auto text-slate-400" aria-hidden="true"/>
                    <p className="m-0 mt-2 text-sm text-slate-500">
                        {t('opsMarketplace.pilotToday.empty')}
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {visibleMissions.map(mission => {
                        const tab = classifyPilotTaskTab(mission);
                        const preflightOpen = openPreflightId === mission.id;
                        const completeOpen = openCompleteId === mission.id || tab === 'IN_FLIGHT';
                        const uploadedFiles = uploadedNamesByMission[mission.id] ?? [];

                        return (
                            <article
                                key={mission.id}
                                className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/40 p-4"
                            >
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="rounded-md bg-white px-2.5 py-0.5 font-mono text-xs font-bold whitespace-nowrap text-slate-800 shadow-2xs">
                                                #{mission.code || mission.id}
                                            </span>
                                            <span className="rounded-full bg-uav-red-light px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap text-primary">
                                                {t(`opsMarketplace.pilotToday.tabs.${tab}`)}
                                            </span>
                                        </div>
                                        <h3 className="m-0 mt-1.5 line-clamp-2 text-base font-semibold text-slate-900">
                                            {mission.title}
                                        </h3>
                                        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                                            <span className="inline-flex items-center gap-1 whitespace-nowrap">
                                                <MapPin size={13} className="text-primary" aria-hidden="true"/>
                                                {mission.locationName}
                                            </span>
                                            <span className="inline-flex items-center gap-1 whitespace-nowrap">
                                                <Calendar size={13} aria-hidden="true"/>
                                                {mission.requestedDate}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2">
                                        {tab !== 'COMPLETED' && (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setOpenPreflightId(preflightOpen ? null : mission.id)
                                                }
                                                className={`inline-flex min-h-10 items-center gap-1.5 rounded-control border px-3 text-xs font-semibold whitespace-nowrap transition-colors ${
                                                    preflightOpen
                                                        ? 'border-primary bg-uav-red-light text-primary'
                                                        : 'border-slate-200 bg-white text-slate-700 hover:border-primary'
                                                }`}
                                            >
                                                <ClipboardCheck size={15} aria-hidden="true"/>
                                                {t('opsMarketplace.pilotToday.preflightToggle')}
                                            </button>
                                        )}

                                        {tab === 'ACTIVE' && (
                                            <Button
                                                type="button"
                                                disabled={busyMissionId === mission.id}
                                                onClick={() => void handleStartSimulation(mission)}
                                                className="min-h-10 whitespace-nowrap"
                                            >
                                                <PlaneTakeoff size={15} className="mr-1.5 inline" aria-hidden="true"/>
                                                {t('opsMarketplace.pilotToday.startSimulation')}
                                            </Button>
                                        )}

                                        {tab === 'IN_FLIGHT' && (
                                            <Link
                                                href={`/operations/simulation?missionId=${mission.id}${mission.uavId ? `&uavId=${mission.uavId}` : ''}`}
                                                className="inline-flex min-h-10 items-center gap-1.5 rounded-control bg-slate-900 px-3.5 text-xs font-semibold whitespace-nowrap text-white hover:bg-slate-800"
                                            >
                                                <Gamepad2 size={15} aria-hidden="true"/>
                                                {t('opsMarketplace.pilotToday.openSimulation')}
                                            </Link>
                                        )}

                                        {tab !== 'COMPLETED' && (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setOpenCompleteId(
                                                        openCompleteId === mission.id ? null : mission.id,
                                                    )
                                                }
                                                className="inline-flex min-h-10 items-center gap-1.5 rounded-control border border-slate-200 bg-white px-3 text-xs font-semibold whitespace-nowrap text-slate-700 hover:border-primary hover:text-primary"
                                            >
                                                <PackageCheck size={15} aria-hidden="true"/>
                                                {t('opsMarketplace.pilotToday.completeToggle')}
                                            </button>
                                        )}

                                        <Link
                                            href={`/operations/missions/${mission.id}`}
                                            className="inline-flex min-h-10 items-center gap-1 rounded-control border border-slate-200 bg-white px-2.5 text-xs font-semibold whitespace-nowrap text-slate-600 hover:text-primary"
                                        >
                                            <ExternalLink size={13} aria-hidden="true"/>
                                        </Link>
                                    </div>
                                </div>

                                {/* Checklist trước bay (dùng MissionPreflightCard sẵn có) */}
                                {preflightOpen && (
                                    <div className="pt-2">
                                        <MissionPreflightCard
                                            mission={mission}
                                            canSign={can('MISSION_STATUS_UPDATE') || can('MISSION_VIEW')}
                                            onSigned={onRefresh}
                                        />
                                    </div>
                                )}

                                {/* Khối Hoàn thành kèm tải tài liệu bàn giao */}
                                {tab !== 'COMPLETED' && completeOpen && (
                                    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <label className="inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-control border border-dashed border-primary bg-uav-red-light/50 px-3.5 text-xs font-semibold whitespace-nowrap text-primary hover:bg-uav-red-light">
                                                <FileUp size={15} aria-hidden="true"/>
                                                <span>
                                                    {uploadingMissionId === mission.id
                                                        ? t('opsMarketplace.pilotToday.uploading')
                                                        : t('opsMarketplace.pilotToday.uploadDeliverable')}
                                                </span>
                                                <input
                                                    type="file"
                                                    accept={MEDIA_ACCEPT}
                                                    className="sr-only"
                                                    disabled={uploadingMissionId === mission.id}
                                                    onChange={e => {
                                                        const file = e.target.files?.[0];
                                                        if (file) void handleUploadDeliverable(mission, file);
                                                        e.target.value = '';
                                                    }}
                                                />
                                            </label>

                                            {uploadedFiles.length > 0 && (
                                                <span className="text-xs font-semibold text-slate-700">
                                                    {t('opsMarketplace.pilotToday.uploadedFiles', {
                                                        count: uploadedFiles.length,
                                                    })}
                                                    : {uploadedFiles.join(', ')}
                                                </span>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                            <label className="grid gap-1 text-xs font-semibold text-slate-700">
                                                <span>
                                                    {t('opsMarketplace.pilotToday.handoverNote')}
                                                    <RequiredMark/>
                                                </span>
                                                <input
                                                    className="h-10 w-full rounded-control border border-slate-300 bg-white px-3 text-xs font-medium text-slate-900 outline-none focus:border-primary"
                                                    value={handoverNoteByMission[mission.id] ?? ''}
                                                    onChange={e =>
                                                        setHandoverNoteByMission(s => ({
                                                            ...s,
                                                            [mission.id]: e.target.value,
                                                        }))
                                                    }
                                                    placeholder={t('opsMarketplace.pilotToday.handoverPlaceholder')}
                                                />
                                            </label>

                                            <label className="grid gap-1 text-xs font-semibold text-slate-700">
                                                <span>
                                                    {t('opsMarketplace.pilotToday.equipmentCondition')}
                                                    <OptionalMark/>
                                                </span>
                                                <input
                                                    className="h-10 w-full rounded-control border border-slate-300 bg-white px-3 text-xs font-medium text-slate-900 outline-none focus:border-primary"
                                                    value={
                                                        conditionByMission[mission.id] ??
                                                        t('opsMarketplace.pilotToday.equipmentConditionDefault')
                                                    }
                                                    onChange={e =>
                                                        setConditionByMission(s => ({
                                                            ...s,
                                                            [mission.id]: e.target.value,
                                                        }))
                                                    }
                                                />
                                            </label>
                                        </div>

                                        <div className="flex justify-end">
                                            <Button
                                                type="button"
                                                disabled={busyMissionId === mission.id}
                                                onClick={() => void handleCompleteMission(mission)}
                                                className="min-h-10 whitespace-nowrap"
                                            >
                                                <PackageCheck size={15} className="mr-1.5 inline" aria-hidden="true"/>
                                                {t('opsMarketplace.pilotToday.submitComplete')}
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </article>
                        );
                    })}
                </div>
            )}
        </section>
    );
}
