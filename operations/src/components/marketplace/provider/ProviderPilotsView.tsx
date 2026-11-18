'use client';

import {useState} from 'react';
import Link from 'next/link';
import {
    Award,
    CheckCircle2,
    Edit3,
    Phone,
    PlaneTakeoff,
    Plus,
    RefreshCw,
    ShieldAlert,
    Trash2,
    Users,
    Wrench,
} from 'lucide-react';
import {Button, OptionalMark, RequiredMark} from '@/components/ui';
import {ProviderStudioShell} from '@/components/marketplace/provider/ProviderStudioShell';
import {
    useMyProviderFleet,
    useMyProviderProfile,
    useProviderPilotActions,
    useProviderPilots,
} from '@/hooks/marketplace/useMarketplace';
import {
    extractActionableError,
    initialPilotForm,
    normalizeUavStatusCardKey,
    PILOT_STATUS_CODES,
} from '@/forms/marketplace/marketplace-forms';
import {useI18n} from '@/providers/I18nContext';
import type {
    ProviderPilot,
    ProviderPilotStatus,
    ProviderPilotUpsertInput,
} from '@/types/marketplace/marketplace.types';

const INPUT_CLASS =
    'h-11 w-full rounded-control border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 outline-none focus:border-primary';

export function ProviderPilotsView() {
    const {t} = useI18n();
    const profileQuery = useMyProviderProfile();
    const profile = profileQuery.data;
    const pilotsQuery = useProviderPilots(Boolean(profile));
    const fleetQuery = useMyProviderFleet(Boolean(profile));
    const {createPilot, updatePilot, deletePilot} = useProviderPilotActions();

    const [filter, setFilter] = useState<'ALL' | 'READY' | 'FLYING' | 'MAINTENANCE'>('ALL');
    const [showForm, setShowForm] = useState(false);
    const [editingPilotId, setEditingPilotId] = useState<number | null>(null);
    const [pilotForm, setPilotForm] = useState<ProviderPilotUpsertInput>(initialPilotForm);
    const [errorMsg, setErrorMsg] = useState('');

    const pilots = pilotsQuery.data ?? [];
    const uavs = fleetQuery.data?.uavs ?? [];

    const counts = {
        ALL: pilots.length,
        READY: pilots.filter(p => normalizeUavStatusCardKey(p.status) === 'READY').length,
        FLYING: pilots.filter(p => normalizeUavStatusCardKey(p.status) === 'FLYING').length,
        MAINTENANCE: pilots.filter(p => normalizeUavStatusCardKey(p.status) === 'MAINTENANCE').length,
    };

    const filteredPilots = filter === 'ALL'
        ? pilots
        : pilots.filter(p => normalizeUavStatusCardKey(p.status) === filter);

    const openAdd = () => {
        setErrorMsg('');
        setEditingPilotId(null);
        setPilotForm(initialPilotForm());
        setShowForm(true);
    };

    const openEdit = (pilot: ProviderPilot) => {
        setErrorMsg('');
        setEditingPilotId(pilot.id);
        const mappedStatus: ProviderPilotStatus =
            normalizeUavStatusCardKey(pilot.status) === 'FLYING'
                ? 'IN_FLIGHT'
                : normalizeUavStatusCardKey(pilot.status) === 'MAINTENANCE'
                  ? 'MAINTENANCE'
                  : 'AVAILABLE';
        setPilotForm({
            fullName: pilot.fullName,
            phone: pilot.phone ?? '',
            email: pilot.email ?? '',
            licenseNumber: pilot.licenseNumber ?? '',
            specialization: pilot.specialization ?? '',
            status: mappedStatus,
            assignedUavId: pilot.assignedUavId ?? null,
        });
        setShowForm(true);
    };

    const handleSavePilot = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg('');
        if (!pilotForm.fullName.trim()) return;
        try {
            const payload: ProviderPilotUpsertInput = {
                fullName: pilotForm.fullName.trim(),
                phone: pilotForm.phone?.trim() || undefined,
                email: pilotForm.email?.trim() || undefined,
                licenseNumber: pilotForm.licenseNumber?.trim() || undefined,
                specialization: pilotForm.specialization?.trim() || undefined,
                status: pilotForm.status ?? 'AVAILABLE',
                assignedUavId: pilotForm.assignedUavId ?? null,
            };
            if (editingPilotId != null) {
                await updatePilot.mutateAsync({id: editingPilotId, payload});
            } else {
                await createPilot.mutateAsync(payload);
            }
            setPilotForm(initialPilotForm());
            setEditingPilotId(null);
            setShowForm(false);
        } catch (err) {
            setErrorMsg(extractActionableError(err, t('opsMarketplace.common.retry')));
        }
    };

    const handleStatusChange = async (pilot: ProviderPilot, status: ProviderPilotStatus) => {
        setErrorMsg('');
        try {
            await updatePilot.mutateAsync({id: pilot.id, payload: {status}});
        } catch (err) {
            setErrorMsg(extractActionableError(err, t('opsMarketplace.common.retry')));
        }
    };

    const handleDelete = async (id: number) => {
        setErrorMsg('');
        try {
            await deletePilot.mutateAsync(id);
        } catch (err) {
            setErrorMsg(extractActionableError(err, t('opsMarketplace.common.retry')));
        }
    };

    return (
        <ProviderStudioShell
            title={t('opsMarketplace.fleet.pilots.title')}
            subtitle={t('opsMarketplace.fleet.subtitle')}
            activeResource="providerPilots"
        >
            {profileQuery.isLoading || (Boolean(profile) && pilotsQuery.isLoading) ? (
                <div className="mx-auto max-w-6xl space-y-4" role="status" aria-label={t('opsMarketplace.common.loading')}>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {[1, 2, 3, 4].map(n => (
                            <div key={n} className="h-16 animate-pulse rounded-2xl bg-slate-200/70"/>
                        ))}
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {[1, 2, 3].map(n => (
                            <div key={n} className="h-44 animate-pulse rounded-2xl bg-slate-200/70"/>
                        ))}
                    </div>
                </div>
            ) : !profile ? (
                <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-6 text-center" role="status">
                    <Users size={28} className="mx-auto text-primary" aria-hidden="true"/>
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
            ) : pilotsQuery.isError ? (
                <div className="mx-auto max-w-xl rounded-2xl border border-rose-200 bg-white p-6 text-center" role="alert">
                    <ShieldAlert size={28} className="mx-auto text-danger" aria-hidden="true"/>
                    <p className="m-0 mt-2 text-sm font-semibold text-slate-900">
                        {extractActionableError(pilotsQuery.error, t('opsMarketplace.common.retry'))}
                    </p>
                    <Button type="button" variant="secondary" className="mt-4" onClick={() => void pilotsQuery.refetch()}>
                        <RefreshCw size={14} className="mr-1.5 inline" aria-hidden="true"/>
                        {t('opsMarketplace.common.retry')}
                    </Button>
                </div>
            ) : (
                <div className="mx-auto max-w-6xl space-y-5">
                    {/* Thanh lọc thẻ icon trạng thái Kỹ sư */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="grid flex-1 grid-cols-2 gap-2.5 sm:grid-cols-4" role="tablist">
                            {([
                                {key: 'ALL' as const, icon: Users},
                                {key: 'READY' as const, icon: CheckCircle2},
                                {key: 'FLYING' as const, icon: PlaneTakeoff},
                                {key: 'MAINTENANCE' as const, icon: Wrench},
                            ]).map(item => {
                                const Icon = item.icon;
                                const active = filter === item.key;
                                return (
                                    <button
                                        key={item.key}
                                        type="button"
                                        role="tab"
                                        aria-selected={active}
                                        onClick={() => setFilter(item.key)}
                                        className={`flex min-h-14 items-center justify-between gap-2 rounded-2xl border px-3.5 py-2.5 text-left transition-colors ${
                                            active
                                                ? 'border-primary bg-uav-red-light text-primary'
                                                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                                        }`}
                                    >
                                        <span className="inline-flex items-center gap-2 min-w-0">
                                            <Icon size={18} className={active ? 'text-primary' : 'text-slate-500'} aria-hidden="true"/>
                                            <span className="truncate text-xs font-semibold whitespace-nowrap">
                                                {t(`opsMarketplace.fleet.filter.${item.key}`)}
                                            </span>
                                        </span>
                                        <strong className="rounded-full bg-white px-2 py-0.5 text-xs font-bold tabular-nums text-slate-900 shadow-2xs">
                                            {counts[item.key]}
                                        </strong>
                                    </button>
                                );
                            })}
                        </div>

                        <Button type="button" onClick={openAdd} className="min-h-11 whitespace-nowrap">
                            <Plus size={15} className="mr-1 inline" aria-hidden="true"/>
                            {t('opsMarketplace.fleet.pilots.add')}
                        </Button>
                    </div>

                    {errorMsg && (
                        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-danger" role="alert">
                            {errorMsg}
                        </div>
                    )}

                    {showForm && (
                        <form
                            onSubmit={handleSavePilot}
                            className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5"
                        >
                            <h2 className="m-0 text-base font-semibold text-slate-900">
                                {editingPilotId != null
                                    ? t('opsMarketplace.fleet.pilots.edit')
                                    : t('opsMarketplace.fleet.pilots.add')}
                            </h2>

                            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                                <label className="grid gap-1 text-xs font-semibold text-slate-700">
                                    <span>
                                        {t('opsMarketplace.fleet.pilots.fullName')}
                                        <RequiredMark/>
                                    </span>
                                    <input
                                        required
                                        className={INPUT_CLASS}
                                        value={pilotForm.fullName}
                                        onChange={e => setPilotForm(s => ({...s, fullName: e.target.value}))}
                                        placeholder={t('opsMarketplace.fleet.pilots.fullNamePlaceholder')}
                                    />
                                </label>

                                <label className="grid gap-1 text-xs font-semibold text-slate-700">
                                    <span>
                                        {t('opsMarketplace.fleet.pilots.phone')}
                                        <OptionalMark/>
                                    </span>
                                    <input
                                        className={INPUT_CLASS}
                                        value={pilotForm.phone ?? ''}
                                        onChange={e => setPilotForm(s => ({...s, phone: e.target.value}))}
                                    />
                                </label>

                                <label className="grid gap-1 text-xs font-semibold text-slate-700">
                                    <span>
                                        {t('opsMarketplace.fleet.pilots.licenseNumber')}
                                        <OptionalMark/>
                                    </span>
                                    <input
                                        className={INPUT_CLASS}
                                        value={pilotForm.licenseNumber ?? ''}
                                        onChange={e => setPilotForm(s => ({...s, licenseNumber: e.target.value}))}
                                        placeholder={t('opsMarketplace.fleet.pilots.licensePlaceholder')}
                                    />
                                </label>

                                <label className="grid gap-1 text-xs font-semibold text-slate-700">
                                    <span>
                                        {t('opsMarketplace.fleet.pilots.specialization')}
                                        <OptionalMark/>
                                    </span>
                                    <input
                                        className={INPUT_CLASS}
                                        value={pilotForm.specialization ?? ''}
                                        onChange={e => setPilotForm(s => ({...s, specialization: e.target.value}))}
                                        placeholder={t('opsMarketplace.fleet.pilots.specializationPlaceholder')}
                                    />
                                </label>

                                <label className="grid gap-1 text-xs font-semibold text-slate-700">
                                    <span>
                                        {t('opsMarketplace.fleet.pilots.assignedUav')}
                                        <OptionalMark/>
                                    </span>
                                    <select
                                        className={INPUT_CLASS}
                                        value={pilotForm.assignedUavId ?? ''}
                                        onChange={e =>
                                            setPilotForm(s => ({
                                                ...s,
                                                assignedUavId: e.target.value ? Number(e.target.value) : null,
                                            }))
                                        }
                                    >
                                        <option value="">{t('opsMarketplace.fleet.pilots.noUav')}</option>
                                        {uavs.map(u => (
                                            <option key={u.id} value={u.id}>
                                                {u.model} · {u.serialNumber}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                <label className="grid gap-1 text-xs font-semibold text-slate-700">
                                    <span>
                                        {t('opsMarketplace.fleet.pilots.status')}
                                        <OptionalMark/>
                                    </span>
                                    <select
                                        className={INPUT_CLASS}
                                        value={pilotForm.status ?? 'AVAILABLE'}
                                        onChange={e =>
                                            setPilotForm(s => ({...s, status: e.target.value as ProviderPilotStatus}))
                                        }
                                    >
                                        {PILOT_STATUS_CODES.map(code => {
                                            const cardKey = normalizeUavStatusCardKey(code);
                                            return (
                                                <option key={code} value={code}>
                                                    {t(`opsMarketplace.fleet.status.${cardKey}`)}
                                                </option>
                                            );
                                        })}
                                    </select>
                                </label>
                            </div>

                            <div className="flex flex-wrap justify-end gap-2">
                                <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
                                    {t('opsMarketplace.common.cancel')}
                                </Button>
                                <Button type="submit" disabled={createPilot.isPending || updatePilot.isPending}>
                                    {t('opsMarketplace.common.save')}
                                </Button>
                            </div>
                        </form>
                    )}

                    {/* Lưới thẻ icon trạng thái Kỹ sư điều khiển */}
                    {filteredPilots.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
                            <Users size={28} className="mx-auto text-slate-400" aria-hidden="true"/>
                            <p className="m-0 mt-2 text-sm text-slate-600">{t('opsMarketplace.fleet.pilots.empty')}</p>
                            <Button type="button" className="mt-4" onClick={openAdd}>
                                <Plus size={14} className="mr-1 inline" aria-hidden="true"/>
                                {t('opsMarketplace.fleet.pilots.add')}
                            </Button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {filteredPilots.map(pilot => {
                                const stateKey = normalizeUavStatusCardKey(pilot.status);
                                const StateIcon =
                                    stateKey === 'FLYING'
                                        ? PlaneTakeoff
                                        : stateKey === 'MAINTENANCE'
                                          ? Wrench
                                          : CheckCircle2;

                                return (
                                    <article
                                        key={pilot.id}
                                        className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs"
                                    >
                                        <div className="space-y-2.5">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex items-start gap-3 min-w-0">
                                                    <span
                                                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                                                            stateKey === 'FLYING'
                                                                ? 'bg-primary text-white'
                                                                : stateKey === 'MAINTENANCE'
                                                                  ? 'bg-amber-100 text-amber-800'
                                                                  : 'bg-uav-red-light text-primary'
                                                        }`}
                                                    >
                                                        <StateIcon size={20} aria-hidden="true"/>
                                                    </span>
                                                    <div className="min-w-0">
                                                        <h3 className="m-0 line-clamp-2 text-base font-semibold text-slate-900">
                                                            {pilot.fullName}
                                                        </h3>
                                                        {pilot.specialization && (
                                                            <p className="m-0 mt-0.5 truncate text-xs text-slate-500">
                                                                {pilot.specialization}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                <span
                                                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${
                                                        stateKey === 'FLYING'
                                                            ? 'bg-primary text-white'
                                                            : stateKey === 'MAINTENANCE'
                                                              ? 'bg-amber-100 text-amber-800'
                                                              : 'bg-slate-100 text-slate-800'
                                                    }`}
                                                >
                                                    {t(`opsMarketplace.fleet.status.${stateKey}`)}
                                                </span>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                                                {pilot.licenseNumber && (
                                                    <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 font-mono whitespace-nowrap">
                                                        <Award size={12} className="text-primary" aria-hidden="true"/>
                                                        {pilot.licenseNumber}
                                                    </span>
                                                )}
                                                {pilot.phone && (
                                                    <span className="inline-flex items-center gap-1 whitespace-nowrap">
                                                        <Phone size={12} className="text-slate-400" aria-hidden="true"/>
                                                        {pilot.phone}
                                                    </span>
                                                )}
                                                {pilot.assignedUavModel && (
                                                    <span className="inline-flex items-center gap-1 rounded-md bg-uav-red-light px-2 py-0.5 font-semibold whitespace-nowrap text-primary">
                                                        <PlaneTakeoff size={12} aria-hidden="true"/>
                                                        {pilot.assignedUavModel}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                                            <div className="flex items-center gap-1">
                                                {([
                                                    {code: 'AVAILABLE' as const, key: 'READY' as const},
                                                    {code: 'IN_FLIGHT' as const, key: 'FLYING' as const},
                                                    {code: 'MAINTENANCE' as const, key: 'MAINTENANCE' as const},
                                                ]).map(btn => (
                                                    <button
                                                        key={btn.code}
                                                        type="button"
                                                        onClick={() => void handleStatusChange(pilot, btn.code)}
                                                        className={`min-h-8 rounded-control px-2 text-xs font-semibold whitespace-nowrap transition-colors ${
                                                            stateKey === btn.key
                                                                ? 'bg-slate-900 text-white'
                                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                        }`}
                                                    >
                                                        {t(`opsMarketplace.fleet.status.${btn.key}`)}
                                                    </button>
                                                ))}
                                            </div>

                                            <div className="flex items-center gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => openEdit(pilot)}
                                                    className="inline-flex h-8 w-8 items-center justify-center rounded-control text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                                                    aria-label={t('opsMarketplace.common.edit')}
                                                >
                                                    <Edit3 size={14} aria-hidden="true"/>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => void handleDelete(pilot.id)}
                                                    className="inline-flex h-8 w-8 items-center justify-center rounded-control text-slate-400 hover:bg-rose-50 hover:text-danger"
                                                    aria-label={t('opsMarketplace.common.delete')}
                                                >
                                                    <Trash2 size={14} aria-hidden="true"/>
                                                </button>
                                            </div>
                                        </div>
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
export default ProviderPilotsView;
