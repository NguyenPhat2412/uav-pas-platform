'use client';

import {useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {
    Calendar,
    CheckCircle2,
    Clock,
    ExternalLink,
    FileCheck2,
    Gamepad2,
    MapPin,
    PackageCheck,
    PlaneTakeoff,
    RefreshCw,
    ShieldAlert,
    UserCheck,
    XCircle,
} from 'lucide-react';
import {Button, OptionalMark, RequiredMark} from '@/components/ui';
import {ProviderStudioShell} from '@/components/marketplace/provider/ProviderStudioShell';
import {
    useMyProviderFleet,
    useMyProviderProfile,
    useProviderOrderActions,
    useProviderOrders,
    useProviderPilots,
} from '@/hooks/marketplace/useMarketplace';
import {
    classifySellerOrderTab,
    extractActionableError,
    formatVndCompact,
    type SellerOrderTab,
} from '@/forms/marketplace/marketplace-forms';
import {useI18n} from '@/providers/I18nContext';
import type {Mission} from '@/types/mission/mission.types';

const INPUT_CLASS =
    'h-10 w-full rounded-control border border-slate-300 bg-white px-3 text-xs font-medium text-slate-900 outline-none focus:border-primary';

const ORDER_TABS: readonly { key: SellerOrderTab; icon: typeof Clock }[] = [
    {key: 'PENDING_ACCEPT', icon: Clock},
    {key: 'WAITING_FLIGHT', icon: Calendar},
    {key: 'IN_FLIGHT', icon: PlaneTakeoff},
    {key: 'DELIVERED', icon: PackageCheck},
] as const;

export function ProviderOrdersView() {
    const {t} = useI18n();
    const router = useRouter();
    const profileQuery = useMyProviderProfile();
    const profile = profileQuery.data;
    const ordersQuery = useProviderOrders(true);
    const fleetQuery = useMyProviderFleet(true);
    const pilotsQuery = useProviderPilots(true);
    const {respondToOrder, assignOrder, startOrder, completeOrder} = useProviderOrderActions();

    const [activeTab, setActiveTab] = useState<SellerOrderTab>('PENDING_ACCEPT');
    const [selectedUavByMission, setSelectedUavByMission] = useState<Record<number, number>>({});
    const [selectedPilotByMission, setSelectedPilotByMission] = useState<Record<number, number>>({});
    const [rejectingMissionId, setRejectingMissionId] = useState<number | null>(null);
    const [rejectReasonByMission, setRejectReasonByMission] = useState<Record<number, string>>({});
    const [handoverNoteByMission, setHandoverNoteByMission] = useState<Record<number, string>>({});
    const [conditionByMission, setConditionByMission] = useState<Record<number, string>>({});
    const [errorMsg, setErrorMsg] = useState('');

    const orders = ordersQuery.data ?? [];
    const uavs = fleetQuery.data?.uavs ?? [];
    const pilots = pilotsQuery.data ?? [];

    const counts: Record<SellerOrderTab, number> = {
        PENDING_ACCEPT: orders.filter(m => classifySellerOrderTab(m) === 'PENDING_ACCEPT').length,
        WAITING_FLIGHT: orders.filter(m => classifySellerOrderTab(m) === 'WAITING_FLIGHT').length,
        IN_FLIGHT: orders.filter(m => classifySellerOrderTab(m) === 'IN_FLIGHT').length,
        DELIVERED: orders.filter(m => classifySellerOrderTab(m) === 'DELIVERED').length,
    };

    const filteredOrders = orders.filter(m => classifySellerOrderTab(m) === activeTab);

    const handleRespond = async (mission: Mission, accept: boolean) => {
        setErrorMsg('');
        const chosenUavId = selectedUavByMission[mission.id] ?? mission.uavId ?? uavs[0]?.id;
        const matchedAssignedPilot = pilots.find(
            p =>
                p.id === mission.operatorId ||
                p.userId === mission.operatorId ||
                p.pilotUserId === mission.operatorId,
        );
        const chosenPilotId =
            selectedPilotByMission[mission.id] ?? matchedAssignedPilot?.id ?? pilots[0]?.id;
        const matchedPilot = pilots.find(
            p => p.id === chosenPilotId || p.userId === chosenPilotId || p.pilotUserId === chosenPilotId,
        );
        const reasonText = (rejectReasonByMission[mission.id] ?? '').trim();
        try {
            await respondToOrder.mutateAsync({
                missionId: mission.id,
                payload: {
                    accept,
                    uavId: accept ? chosenUavId : undefined,
                    pilotUserId: accept
                        ? (matchedPilot?.pilotUserId ?? matchedPilot?.userId ?? chosenPilotId)
                        : undefined,
                    reason: accept ? undefined : reasonText || 'Đội bay từ chối nhận đơn',
                    responseNote: accept
                        ? 'Đội bay đã tiếp nhận đơn.'
                        : reasonText || 'Đội bay bận lịch khai thác.',
                },
            });
            if (accept && chosenUavId) {
                try {
                    await assignOrder.mutateAsync({
                        missionId: mission.id,
                        payload: {
                            uavId: chosenUavId,
                            pilotId: matchedPilot?.id ?? chosenPilotId,
                            pilotUserId:
                                matchedPilot?.pilotUserId ?? matchedPilot?.userId ?? chosenPilotId,
                        },
                    });
                } catch {
                    // Best-effort inline assignment right after accept
                }
            }
            setRejectingMissionId(null);
            if (accept) setActiveTab('WAITING_FLIGHT');
        } catch (err) {
            setErrorMsg(extractActionableError(err, t('opsMarketplace.common.retry')));
        }
    };

    const handleAssign = async (mission: Mission) => {
        setErrorMsg('');
        const uavId = selectedUavByMission[mission.id] ?? mission.uavId ?? uavs[0]?.id;
        const matchedAssignedPilot = pilots.find(
            p =>
                p.id === mission.operatorId ||
                p.userId === mission.operatorId ||
                p.pilotUserId === mission.operatorId,
        );
        const pilotId =
            selectedPilotByMission[mission.id] ?? matchedAssignedPilot?.id ?? pilots[0]?.id;
        if (!uavId) return;
        const matchedPilot = pilots.find(
            p => p.id === pilotId || p.userId === pilotId || p.pilotUserId === pilotId,
        );
        try {
            await assignOrder.mutateAsync({
                missionId: mission.id,
                payload: {
                    uavId,
                    pilotId: matchedPilot?.id ?? pilotId,
                    pilotUserId: matchedPilot?.pilotUserId ?? matchedPilot?.userId ?? pilotId,
                },
            });
        } catch (err) {
            setErrorMsg(extractActionableError(err, t('opsMarketplace.common.retry')));
        }
    };

    const handleStartSimulation = async (mission: Mission) => {
        setErrorMsg('');
        const uavId = selectedUavByMission[mission.id] ?? mission.uavId ?? uavs[0]?.id;
        try {
            const started = await startOrder.mutateAsync(mission.id);
            const targetUavId = started?.uavId ?? uavId;
            setActiveTab('IN_FLIGHT');
            router.push(
                `/operations/simulation?missionId=${mission.id}${targetUavId ? `&uavId=${targetUavId}` : ''}`,
            );
        } catch (err) {
            setErrorMsg(extractActionableError(err, t('opsMarketplace.common.retry')));
        }
    };

    const handleComplete = async (mission: Mission) => {
        setErrorMsg('');
        const note = (handoverNoteByMission[mission.id] ?? '').trim();
        if (!note) return;
        const condition =
            (conditionByMission[mission.id] ?? '').trim() ||
            t('opsMarketplace.orders.card.equipmentConditionDefault');
        try {
            await completeOrder.mutateAsync({
                missionId: mission.id,
                payload: {
                    completionNote: note,
                    equipmentCondition: condition,
                },
            });
            setActiveTab('DELIVERED');
        } catch (err) {
            setErrorMsg(extractActionableError(err, t('opsMarketplace.common.retry')));
        }
    };

    return (
        <ProviderStudioShell
            title={t('opsMarketplace.orders.title')}
            subtitle={t('opsMarketplace.orders.subtitle')}
            activeResource="providerOrders"
        >
            {profileQuery.isLoading || ordersQuery.isLoading ? (
                <div className="mx-auto max-w-6xl space-y-4" role="status" aria-label={t('opsMarketplace.common.loading')}>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {[1, 2, 3, 4].map(n => (
                            <div key={n} className="h-14 animate-pulse rounded-2xl bg-slate-200/70"/>
                        ))}
                    </div>
                    <div className="space-y-4">
                        {[1, 2].map(n => (
                            <div key={n} className="h-52 animate-pulse rounded-2xl bg-slate-200/70"/>
                        ))}
                    </div>
                </div>
            ) : !profile && orders.length === 0 && uavs.length === 0 ? (
                <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-6 text-center" role="status">
                    <PackageCheck size={28} className="mx-auto text-primary" aria-hidden="true"/>
                    <h2 className="m-0 mt-2 text-base font-semibold text-slate-900">
                        {t('opsMarketplace.common.requiredOnboardingTitle')}
                    </h2>
                    <p className="m-0 mt-1 text-[13px] text-slate-600">
                        {t('opsMarketplace.common.requiredOnboardingDesc')}
                    </p>
                    <Link
                        href="/operations/provider/onboarding"
                        className="mt-4 inline-flex min-h-11 items-center justify-center rounded-control bg-primary px-5 text-xs font-semibold whitespace-nowrap text-white"
                    >
                        {t('opsMarketplace.common.goToOnboarding')}
                    </Link>
                </div>
            ) : ordersQuery.isError ? (
                <div className="mx-auto max-w-xl rounded-2xl border border-rose-200 bg-white p-6 text-center" role="alert">
                    <ShieldAlert size={28} className="mx-auto text-danger" aria-hidden="true"/>
                    <p className="m-0 mt-2 text-sm font-semibold text-slate-900">
                        {extractActionableError(ordersQuery.error, t('opsMarketplace.common.retry'))}
                    </p>
                    <Button type="button" variant="secondary" className="mt-4" onClick={() => void ordersQuery.refetch()}>
                        <RefreshCw size={14} className="mr-1.5 inline" aria-hidden="true"/>
                        {t('opsMarketplace.common.retry')}
                    </Button>
                </div>
            ) : (
                <div className="mx-auto max-w-6xl space-y-5">
                    {/* Thanh 4 tab trạng thái đơn kiểu Shopee Seller */}
                    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4" role="tablist">
                        {ORDER_TABS.map(tab => {
                            const Icon = tab.icon;
                            const active = activeTab === tab.key;
                            return (
                                <button
                                    key={tab.key}
                                    type="button"
                                    role="tab"
                                    aria-selected={active}
                                    onClick={() => setActiveTab(tab.key)}
                                    className={`flex min-h-14 items-center justify-between gap-2 rounded-2xl border px-3.5 py-2.5 text-left transition-colors ${
                                        active
                                            ? 'border-primary bg-uav-red-light text-primary'
                                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                                    }`}
                                >
                                    <span className="inline-flex items-center gap-2 min-w-0">
                                        <Icon size={18} className={active ? 'text-primary' : 'text-slate-500'} aria-hidden="true"/>
                                        <span className="truncate text-xs font-semibold whitespace-nowrap">
                                            {t(`opsMarketplace.orders.tabs.${tab.key}`)}
                                        </span>
                                    </span>
                                    <strong className="rounded-full bg-white px-2 py-0.5 text-xs font-bold tabular-nums text-slate-900 shadow-2xs">
                                        {counts[tab.key]}
                                    </strong>
                                </button>
                            );
                        })}
                    </div>

                    {errorMsg && (
                        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-danger" role="alert">
                            {errorMsg}
                        </div>
                    )}

                    {filteredOrders.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
                            <PackageCheck size={28} className="mx-auto text-slate-400" aria-hidden="true"/>
                            <p className="m-0 mt-2 text-sm text-slate-500">{t('opsMarketplace.orders.empty')}</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredOrders.map(mission => {
                                const tab = classifySellerOrderTab(mission);
                                const selectedUavId =
                                    selectedUavByMission[mission.id] ?? mission.uavId ?? uavs[0]?.id ?? '';
                                const matchedAssignedPilot = pilots.find(
                                    p =>
                                        p.id === mission.operatorId ||
                                        p.userId === mission.operatorId ||
                                        p.pilotUserId === mission.operatorId,
                                );
                                const selectedPilotId =
                                    selectedPilotByMission[mission.id] ??
                                    matchedAssignedPilot?.id ??
                                    pilots[0]?.id ??
                                    '';

                                return (
                                    <article
                                        key={mission.id}
                                        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs"
                                    >
                                        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3.5">
                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="rounded-md bg-slate-100 px-2.5 py-0.5 font-mono text-xs font-bold whitespace-nowrap text-slate-800">
                                                        {t('opsMarketplace.orders.card.code', {
                                                            code: mission.code || mission.id,
                                                        })}
                                                    </span>
                                                    <span className="rounded-full bg-uav-red-light px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap text-primary">
                                                        {t(`opsMarketplace.orders.tabs.${tab}`)}
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

                                            <div className="text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <strong className="text-base font-bold text-primary tabular-nums">
                                                        {formatVndCompact(mission.quotedSubtotalVnd)}
                                                    </strong>
                                                    <span className="rounded bg-uav-red-light px-1.5 py-0.5 text-[11px] font-semibold whitespace-nowrap text-primary">
                                                        {t('opsMarketplace.common.illustrationBadge')}
                                                    </span>
                                                </div>
                                                <Link
                                                    href={`/operations/missions/${mission.id}`}
                                                    className="mt-1 inline-flex items-center gap-1 text-xs font-semibold whitespace-nowrap text-slate-600 hover:text-primary"
                                                >
                                                    <span>{t('opsMarketplace.orders.card.openDetail')}</span>
                                                    <ExternalLink size={12} aria-hidden="true"/>
                                                </Link>
                                            </div>
                                        </div>

                                        {/* Khu vực Chọn Kỹ sư + UAV (cho tab Chờ nhận & Chờ bay) */}
                                        {(tab === 'PENDING_ACCEPT' || tab === 'WAITING_FLIGHT') && (
                                            <div className="mt-4 grid grid-cols-1 items-end gap-3 rounded-xl bg-slate-50 p-3.5 sm:grid-cols-3">
                                                <label className="grid gap-1 text-xs font-semibold text-slate-700">
                                                    <span>
                                                        {t('opsMarketplace.orders.card.selectUav')}
                                                        <RequiredMark/>
                                                    </span>
                                                    <select
                                                        className={INPUT_CLASS}
                                                        value={selectedUavId}
                                                        onChange={e =>
                                                            setSelectedUavByMission(s => ({
                                                                ...s,
                                                                [mission.id]: Number(e.target.value),
                                                            }))
                                                        }
                                                    >
                                                        <option value="">
                                                            {t('opsMarketplace.orders.card.unassigned')}
                                                        </option>
                                                        {uavs.map(u => (
                                                            <option key={u.id} value={u.id}>
                                                                {u.model} · {u.serialNumber}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </label>

                                                <label className="grid gap-1 text-xs font-semibold text-slate-700">
                                                    <span>
                                                        {t('opsMarketplace.orders.card.selectPilot')}
                                                        <OptionalMark/>
                                                    </span>
                                                    <select
                                                        className={INPUT_CLASS}
                                                        value={selectedPilotId}
                                                        onChange={e =>
                                                            setSelectedPilotByMission(s => ({
                                                                ...s,
                                                                [mission.id]: Number(e.target.value),
                                                            }))
                                                        }
                                                    >
                                                        <option value="">
                                                            {t('opsMarketplace.orders.card.unassigned')}
                                                        </option>
                                                        {pilots.map(p => (
                                                            <option key={p.id} value={p.id}>
                                                                {p.fullName}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </label>

                                                {tab === 'WAITING_FLIGHT' ? (
                                                    <Button
                                                        type="button"
                                                        variant="secondary"
                                                        disabled={assignOrder.isPending}
                                                        onClick={() => void handleAssign(mission)}
                                                        className="min-h-10 whitespace-nowrap"
                                                    >
                                                        <UserCheck size={14} className="mr-1.5 inline" aria-hidden="true"/>
                                                        {t('opsMarketplace.orders.card.assign')}
                                                    </Button>
                                                ) : (
                                                    <div className="flex flex-wrap justify-end gap-2">
                                                        <Button
                                                            type="button"
                                                            variant="secondary"
                                                            disabled={respondToOrder.isPending}
                                                            onClick={() =>
                                                                setRejectingMissionId(
                                                                    rejectingMissionId === mission.id ? null : mission.id,
                                                                )
                                                            }
                                                            className="min-h-10 whitespace-nowrap"
                                                        >
                                                            <XCircle size={14} className="mr-1 inline" aria-hidden="true"/>
                                                            {t('opsMarketplace.orders.card.reject')}
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            disabled={respondToOrder.isPending}
                                                            onClick={() => void handleRespond(mission, true)}
                                                            className="min-h-10 whitespace-nowrap"
                                                        >
                                                            <CheckCircle2 size={14} className="mr-1 inline" aria-hidden="true"/>
                                                            {t('opsMarketplace.orders.card.accept')}
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Ô nhập lý do từ chối */}
                                        {tab === 'PENDING_ACCEPT' && rejectingMissionId === mission.id && (
                                            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-rose-200 bg-rose-50/60 p-3">
                                                <input
                                                    className="h-10 flex-1 rounded-control border border-rose-200 bg-white px-3 text-xs text-slate-900"
                                                    value={rejectReasonByMission[mission.id] ?? ''}
                                                    onChange={e =>
                                                        setRejectReasonByMission(s => ({
                                                            ...s,
                                                            [mission.id]: e.target.value,
                                                        }))
                                                    }
                                                    placeholder={t('opsMarketplace.orders.card.rejectReasonPlaceholder')}
                                                />
                                                <Button
                                                    type="button"
                                                    variant="danger"
                                                    disabled={respondToOrder.isPending}
                                                    onClick={() => void handleRespond(mission, false)}
                                                >
                                                    {t('opsMarketplace.orders.card.confirmReject')}
                                                </Button>
                                            </div>
                                        )}

                                        {/* Hành động Bắt đầu bay mô phỏng ở tab Chờ bay */}
                                        {tab === 'WAITING_FLIGHT' && (
                                            <div className="mt-4 flex flex-wrap items-center justify-between gap-2.5">
                                                <Link
                                                    href={`/operations/simulation?missionId=${mission.id}${selectedUavId ? `&uavId=${selectedUavId}` : ''}`}
                                                    className="inline-flex min-h-10 items-center gap-1.5 rounded-control border border-slate-200 px-3.5 text-xs font-semibold whitespace-nowrap text-slate-700 hover:border-primary hover:text-primary"
                                                >
                                                    <Gamepad2 size={15} aria-hidden="true"/>
                                                    {t('opsMarketplace.orders.card.openSimulation')}
                                                </Link>
                                                <Button
                                                    type="button"
                                                    disabled={startOrder.isPending}
                                                    onClick={() => void handleStartSimulation(mission)}
                                                    className="min-h-11 whitespace-nowrap"
                                                >
                                                    <PlaneTakeoff size={15} className="mr-1.5 inline" aria-hidden="true"/>
                                                    {t('opsMarketplace.orders.card.startSimulation')}
                                                </Button>
                                            </div>
                                        )}

                                        {/* Tab Đang bay: Màn bay mô phỏng + Hoàn thành kèm tài liệu bàn giao */}
                                        {tab === 'IN_FLIGHT' && (
                                            <div className="mt-4 space-y-3 rounded-xl bg-slate-50 p-4">
                                                <div className="flex flex-wrap items-center justify-between gap-2">
                                                    <Link
                                                        href={`/operations/simulation?missionId=${mission.id}${mission.uavId ? `&uavId=${mission.uavId}` : ''}`}
                                                        className="inline-flex min-h-10 items-center gap-1.5 rounded-control bg-slate-900 px-4 text-xs font-semibold whitespace-nowrap text-white hover:bg-slate-800"
                                                    >
                                                        <Gamepad2 size={15} aria-hidden="true"/>
                                                        {t('opsMarketplace.orders.card.openSimulation')}
                                                    </Link>
                                                    <Link
                                                        href={`/operations/missions/${mission.id}`}
                                                        className="inline-flex min-h-10 items-center gap-1.5 rounded-control border border-slate-200 bg-white px-3.5 text-xs font-semibold whitespace-nowrap text-slate-700 hover:border-primary hover:text-primary"
                                                    >
                                                        <FileCheck2 size={15} aria-hidden="true"/>
                                                        {t('opsMarketplace.orders.card.openDetail')}
                                                    </Link>
                                                </div>

                                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                                    <label className="grid gap-1 text-xs font-semibold text-slate-700">
                                                        <span>
                                                            {t('opsMarketplace.orders.card.handoverNote')}
                                                            <RequiredMark/>
                                                        </span>
                                                        <input
                                                            className={INPUT_CLASS}
                                                            value={handoverNoteByMission[mission.id] ?? ''}
                                                            onChange={e =>
                                                                setHandoverNoteByMission(s => ({
                                                                    ...s,
                                                                    [mission.id]: e.target.value,
                                                                }))
                                                            }
                                                            placeholder={t('opsMarketplace.orders.card.handoverPlaceholder')}
                                                        />
                                                    </label>

                                                    <label className="grid gap-1 text-xs font-semibold text-slate-700">
                                                        <span>
                                                            {t('opsMarketplace.orders.card.equipmentCondition')}
                                                            <OptionalMark/>
                                                        </span>
                                                        <input
                                                            className={INPUT_CLASS}
                                                            value={
                                                                conditionByMission[mission.id] ??
                                                                t('opsMarketplace.orders.card.equipmentConditionDefault')
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
                                                        disabled={completeOrder.isPending}
                                                        onClick={() => void handleComplete(mission)}
                                                        className="min-h-11 whitespace-nowrap"
                                                    >
                                                        <PackageCheck size={15} className="mr-1.5 inline" aria-hidden="true"/>
                                                        {t('opsMarketplace.orders.card.completeOrder')}
                                                    </Button>
                                                </div>
                                            </div>
                                        )}

                                        {/* Tab Đã bàn giao */}
                                        {tab === 'DELIVERED' && mission.completionNote && (
                                            <div className="mt-3 rounded-xl bg-slate-50 px-3.5 py-2.5 text-xs text-slate-700">
                                                <strong>{t('opsMarketplace.orders.card.handoverNote')}:</strong>{' '}
                                                {mission.completionNote}
                                            </div>
                                        )}
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </ProviderStudioShell>
    );
}
export default ProviderOrdersView;
