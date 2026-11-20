'use client';

import {useState} from 'react';
import Link from 'next/link';
import {
    CheckCircle2,
    Edit3,
    Plane,
    PlaneTakeoff,
    Plus,
    RefreshCw,
    ShieldAlert,
    Trash2,
    Wrench,
} from 'lucide-react';
import {Button, OptionalMark, RequiredMark} from '@/components/ui';
import {IllustrativeFooterNote} from '@/components/marketplace/provider/IllustrativeDisclaimer';
import {ProviderStudioShell} from '@/components/marketplace/provider/ProviderStudioShell';
import {
    useMyProviderFleet,
    useMyProviderProfile,
    useProviderFleetActions,
} from '@/hooks/marketplace/useMarketplace';
import {
    extractActionableError,
    initialUavForm,
    normalizeUavStatusCardKey,
    sanitizeEntityName,
    sanitizeMarketplaceText,
    UAV_STATUS_CODES,
} from '@/forms/marketplace/marketplace-forms';
import {useI18n} from '@/providers/I18nContext';
import type {
    ProviderUav,
    ProviderUavCreateInput,
    ProviderUavStatus,
} from '@/types/marketplace/marketplace.types';

const INPUT_CLASS =
    'h-11 w-full rounded-control border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 outline-none focus:border-primary';

export function ProviderFleetView() {
    const {t} = useI18n();
    const profileQuery = useMyProviderProfile();
    const profile = profileQuery.data;
    const fleetQuery = useMyProviderFleet(true);
    const {registerUav, updateUav, deleteUav} = useProviderFleetActions();

    const [filter, setFilter] = useState<'ALL' | 'READY' | 'FLYING' | 'MAINTENANCE'>('ALL');
    const [showForm, setShowForm] = useState(false);
    const [editingUavId, setEditingUavId] = useState<number | null>(null);
    const [uavForm, setUavForm] = useState<ProviderUavCreateInput>(initialUavForm);
    const [errorMsg, setErrorMsg] = useState('');

    const uavs = fleetQuery.data?.uavs ?? [];
    const counts = {
        ALL: uavs.length,
        READY: uavs.filter(u => normalizeUavStatusCardKey(u.status) === 'READY').length,
        FLYING: uavs.filter(u => normalizeUavStatusCardKey(u.status) === 'FLYING').length,
        MAINTENANCE: uavs.filter(u => normalizeUavStatusCardKey(u.status) === 'MAINTENANCE').length,
    };

    const filteredUavs = filter === 'ALL'
        ? uavs
        : uavs.filter(u => normalizeUavStatusCardKey(u.status) === filter);

    const openAdd = () => {
        setErrorMsg('');
        setEditingUavId(null);
        setUavForm(initialUavForm());
        setShowForm(true);
    };

    const openEdit = (uav: ProviderUav) => {
        setErrorMsg('');
        setEditingUavId(uav.id);
        const mappedStatus: ProviderUavStatus =
            normalizeUavStatusCardKey(uav.status) === 'FLYING'
                ? 'IN_USE'
                : normalizeUavStatusCardKey(uav.status) === 'MAINTENANCE'
                  ? 'MAINTENANCE'
                  : 'AVAILABLE';
        setUavForm({
            model: sanitizeEntityName(uav.model),
            serialNumber: sanitizeEntityName(uav.serialNumber),
            manufacturer: sanitizeEntityName(uav.manufacturer),
            status: mappedStatus,
        });
        setShowForm(true);
    };

    const handleSaveUav = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg('');
        if (!uavForm.model.trim() || !uavForm.serialNumber.trim()) return;
        try {
            const payload = {
                model: uavForm.model.trim(),
                serialNumber: uavForm.serialNumber.trim(),
                manufacturer: uavForm.manufacturer.trim() || 'DJI Enterprise',
                status: uavForm.status ?? 'AVAILABLE',
            };
            if (editingUavId != null) {
                await updateUav.mutateAsync({id: editingUavId, payload});
            } else {
                await registerUav.mutateAsync(payload);
            }
            setUavForm(initialUavForm());
            setEditingUavId(null);
            setShowForm(false);
        } catch (err) {
            setErrorMsg(extractActionableError(err, t('opsMarketplace.common.retry')));
        }
    };

    const handleStatusChange = async (uav: ProviderUav, status: ProviderUavStatus) => {
        setErrorMsg('');
        try {
            await updateUav.mutateAsync({id: uav.id, payload: {status}});
        } catch (err) {
            setErrorMsg(extractActionableError(err, t('opsMarketplace.common.retry')));
        }
    };

    const handleDelete = async (id: number) => {
        setErrorMsg('');
        try {
            await deleteUav.mutateAsync(id);
        } catch (err) {
            setErrorMsg(extractActionableError(err, t('opsMarketplace.common.retry')));
        }
    };

    return (
        <ProviderStudioShell
            title={t('opsMarketplace.fleet.uavs.title')}
            subtitle={t('opsMarketplace.fleet.subtitle')}
            activeResource="providerFleet"
        >
            {profileQuery.isLoading || fleetQuery.isLoading ? (
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
            ) : !profile && uavs.length === 0 ? (
                <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-6 text-center" role="status">
                    <Plane size={28} className="mx-auto text-primary" aria-hidden="true"/>
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
            ) : fleetQuery.isError ? (
                <div className="mx-auto max-w-xl rounded-2xl border border-rose-200 bg-white p-6 text-center" role="alert">
                    <ShieldAlert size={28} className="mx-auto text-danger" aria-hidden="true"/>
                    <p className="m-0 mt-2 text-sm font-semibold text-slate-900">
                        {extractActionableError(fleetQuery.error, t('opsMarketplace.common.retry'))}
                    </p>
                    <Button type="button" variant="secondary" className="mt-4" onClick={() => void fleetQuery.refetch()}>
                        <RefreshCw size={14} className="mr-1.5 inline" aria-hidden="true"/>
                        {t('opsMarketplace.common.retry')}
                    </Button>
                </div>
            ) : (
                <div className="mx-auto max-w-6xl space-y-5">
                    {/* Thanh lọc thẻ icon trạng thái kiểu Shopee */}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="grid flex-1 grid-cols-2 gap-2.5 sm:grid-cols-4" role="tablist">
                            {([
                                {key: 'ALL' as const, icon: Plane},
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
                                            <span className="line-clamp-2 break-words text-xs font-semibold leading-tight">
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
                            {t('opsMarketplace.fleet.uavs.add')}
                        </Button>
                    </div>

                    {errorMsg && (
                        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-danger" role="alert">
                            {errorMsg}
                        </div>
                    )}

                    {showForm && (
                        <form
                            onSubmit={handleSaveUav}
                            className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5"
                        >
                            <h2 className="m-0 text-base font-semibold text-slate-900">
                                {editingUavId != null
                                    ? t('opsMarketplace.fleet.uavs.edit')
                                    : t('opsMarketplace.fleet.uavs.add')}
                            </h2>

                            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
                                <label className="grid gap-1 text-xs font-semibold text-slate-700">
                                    <span>
                                        {t('opsMarketplace.fleet.uavs.model')}
                                        <RequiredMark/>
                                    </span>
                                    <input
                                        required
                                        className={INPUT_CLASS}
                                        value={uavForm.model}
                                        onChange={e => setUavForm(s => ({...s, model: e.target.value}))}
                                        placeholder={t('opsMarketplace.fleet.uavs.modelPlaceholder')}
                                    />
                                </label>

                                <label className="grid gap-1 text-xs font-semibold text-slate-700">
                                    <span>
                                        {t('opsMarketplace.fleet.uavs.serialNumber')}
                                        <RequiredMark/>
                                    </span>
                                    <input
                                        required
                                        className={INPUT_CLASS}
                                        value={uavForm.serialNumber}
                                        onChange={e => setUavForm(s => ({...s, serialNumber: e.target.value}))}
                                        placeholder={t('opsMarketplace.fleet.uavs.serialPlaceholder')}
                                    />
                                </label>

                                <label className="grid gap-1 text-xs font-semibold text-slate-700">
                                    <span>
                                        {t('opsMarketplace.fleet.uavs.manufacturer')}
                                        <RequiredMark/>
                                    </span>
                                    <input
                                        required
                                        className={INPUT_CLASS}
                                        value={uavForm.manufacturer}
                                        onChange={e => setUavForm(s => ({...s, manufacturer: e.target.value}))}
                                        placeholder={t('opsMarketplace.fleet.uavs.manufacturerPlaceholder')}
                                    />
                                </label>

                                <label className="grid gap-1 text-xs font-semibold text-slate-700">
                                    <span>
                                        {t('opsMarketplace.fleet.uavs.status')}
                                        <OptionalMark/>
                                    </span>
                                    <select
                                        className={INPUT_CLASS}
                                        value={uavForm.status ?? 'AVAILABLE'}
                                        onChange={e => setUavForm(s => ({...s, status: e.target.value as ProviderUavStatus}))}
                                    >
                                        {UAV_STATUS_CODES.map(code => {
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
                                <Button type="submit" disabled={registerUav.isPending || updateUav.isPending}>
                                    {t('opsMarketplace.common.save')}
                                </Button>
                            </div>
                        </form>
                    )}

                    {/* Lưới thẻ icon trạng thái UAV */}
                    {filteredUavs.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
                            <Plane size={28} className="mx-auto text-slate-400" aria-hidden="true"/>
                            <p className="m-0 mt-2 text-sm text-slate-600">{t('opsMarketplace.fleet.uavs.empty')}</p>
                            <Button type="button" className="mt-4" onClick={openAdd}>
                                <Plus size={14} className="mr-1 inline" aria-hidden="true"/>
                                {t('opsMarketplace.fleet.uavs.add')}
                            </Button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {filteredUavs.map(uav => {
                                const stateKey = normalizeUavStatusCardKey(uav.status);
                                const StateIcon =
                                    stateKey === 'FLYING'
                                        ? PlaneTakeoff
                                        : stateKey === 'MAINTENANCE'
                                          ? Wrench
                                          : CheckCircle2;

                                return (
                                    <article
                                        key={uav.id}
                                        className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs"
                                    >
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
                                                    <h3 className="m-0 line-clamp-2 break-words text-base font-semibold text-slate-900">
                                                        {sanitizeMarketplaceText(uav.model)}
                                                    </h3>
                                                    <p className="m-0 mt-0.5 font-mono text-xs font-medium whitespace-nowrap text-slate-600">
                                                        {sanitizeMarketplaceText(uav.serialNumber)}
                                                    </p>
                                                    {uav.manufacturer && (
                                                        <p className="m-0 mt-0.5 line-clamp-2 break-words text-xs text-slate-500">
                                                            {sanitizeMarketplaceText(uav.manufacturer)}
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

                                        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                                            <div className="flex items-center gap-1">
                                                {([
                                                    {code: 'AVAILABLE' as const, key: 'READY' as const},
                                                    {code: 'IN_USE' as const, key: 'FLYING' as const},
                                                    {code: 'MAINTENANCE' as const, key: 'MAINTENANCE' as const},
                                                ]).map(btn => (
                                                    <button
                                                        key={btn.code}
                                                        type="button"
                                                        onClick={() => void handleStatusChange(uav, btn.code)}
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
                                                    onClick={() => openEdit(uav)}
                                                    className="inline-flex h-8 w-8 items-center justify-center rounded-control text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                                                    aria-label={t('opsMarketplace.common.edit')}
                                                >
                                                    <Edit3 size={14} aria-hidden="true"/>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => void handleDelete(uav.id)}
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

                    <IllustrativeFooterNote/>
                </div>
            )}
        </ProviderStudioShell>
    );
}
export default ProviderFleetView;
