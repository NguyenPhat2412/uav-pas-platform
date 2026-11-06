'use client';

import React, {useEffect, useId, useMemo, useRef, useState} from 'react';
import {MapPinned, PencilLine, Plus, Power, Search, ShieldAlert, Trash2} from 'lucide-react';
import {AdminPage} from '@/components/layout/AdminPage';
import {QueryState} from '@/components/data/WorkspaceState';
import {Button} from '@/components/ui';
import {OptionalMark, RequiredMark} from '@/components/shared/RequiredMark';
import {useI18n} from '@/providers/I18nContext';
import {cn} from '@/lib/utils';
import {AIRSPACE_ZONE_TYPE_TONE} from '@/components/airspace/MissionAirspaceAdvisor';
import {
    AIRSPACE_GEOMETRY_TYPES,
    AIRSPACE_ZONE_TYPES,
    airspaceZoneDraftFromZone,
    airspaceZoneFieldErrors,
    canSubmitAirspaceZoneDraft,
    emptyAirspaceZoneDraft,
    toAirspaceZoneTogglePayload,
    toAirspaceZoneUpsertPayload,
    type AirspaceZoneDraft,
} from '@/forms/airspace/airspace-zone-form';
import {
    useAirspaceZones,
    useCreateAirspaceZone,
    useDeleteAirspaceZone,
    useUpdateAirspaceZone,
} from '@/hooks/airspace/useAirspace';
import type {AirspaceZone, AirspaceZoneType} from '@/types/airspace/airspace.types';

function Modal({
    title,
    onClose,
    children,
}: {
    title: string;
    onClose: () => void;
    children: React.ReactNode;
}) {
    const ref = useRef<HTMLDialogElement>(null);
    const labelId = useId();
    useEffect(() => {
        const dialog = ref.current;
        const previous = document.activeElement as HTMLElement | null;
        dialog?.showModal();
        return () => {
            dialog?.close();
            previous?.focus();
        };
    }, []);
    return (
        <dialog
            ref={ref}
            aria-labelledby={labelId}
            onCancel={event => {
                event.preventDefault();
                onClose();
            }}
            className="m-auto w-[min(620px,calc(100vw-32px))] rounded-overlay border border-border bg-card p-0 text-foreground shadow-2xl backdrop:bg-slate-900/40"
        >
            <header className="border-b border-border px-5 py-4">
                <h2 id={labelId} className="m-0 text-base font-bold text-slate-900">
                    {title}
                </h2>
            </header>
            <div className="max-h-[82vh] overflow-y-auto px-5 py-4">{children}</div>
        </dialog>
    );
}

function AdminAirspaceContent() {
    const {t, formatNumber} = useI18n();
    const query = useAirspaceZones(false);
    const [typeFilter, setTypeFilter] = useState<'ALL' | AirspaceZoneType>('ALL');
    const [showInactive, setShowInactive] = useState(true);
    const [search, setSearch] = useState('');
    const [editingZone, setEditingZone] = useState<AirspaceZone | 'create' | null>(null);
    const [deletingZone, setDeletingZone] = useState<AirspaceZone | null>(null);
    const [togglingId, setTogglingId] = useState<number | null>(null);
    const [toggleError, setToggleError] = useState('');

    const toggleMutation = useUpdateAirspaceZone({
        onSettled: () => setTogglingId(null),
    });
    const deleteMutation = useDeleteAirspaceZone({
        onSuccess: () => setDeletingZone(null),
    });

    const allZones = useMemo(() => query.data ?? [], [query.data]);

    const filteredZones = useMemo(() => {
        const keyword = search.trim().toLowerCase();
        return allZones.filter(zone => {
            if (typeFilter !== 'ALL' && zone.zoneType !== typeFilter) return false;
            if (!showInactive && !zone.active) return false;
            if (!keyword) return true;
            return (
                zone.code.toLowerCase().includes(keyword) ||
                zone.name.toLowerCase().includes(keyword) ||
                zone.authority.toLowerCase().includes(keyword)
            );
        });
    }, [allZones, typeFilter, showInactive, search]);

    const counts = useMemo(
        () => ({
            total: allZones.length,
            prohibited: allZones.filter(z => z.zoneType === 'PROHIBITED').length,
            restricted: allZones.filter(z => z.zoneType === 'RESTRICTED').length,
            warning: allZones.filter(z => z.zoneType === 'WARNING').length,
        }),
        [allZones],
    );

    const handleToggleActive = async (zone: AirspaceZone) => {
        setToggleError('');
        setTogglingId(zone.id);
        try {
            await toggleMutation.mutateAsync({
                id: zone.id,
                input: toAirspaceZoneTogglePayload(zone, !zone.active),
            });
        } catch (err) {
            setToggleError(err instanceof Error && err.message ? err.message : t('airspace.admin.errors.saveFailed'));
        }
    };

    const filterTabs: readonly ('ALL' | AirspaceZoneType)[] = ['ALL', ...AIRSPACE_ZONE_TYPES];

    return (
        <div className="space-y-5 pb-12">
            <div className="flex flex-col gap-3 rounded-panel border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                    <p className="m-0 text-sm text-slate-700">{t('airspace.admin.intro')}</p>
                    <p className="m-0 mt-1 text-xs text-slate-500">
                        {t('airspace.admin.summaryCounts', {
                            total: counts.total,
                            prohibited: counts.prohibited,
                            restricted: counts.restricted,
                            warning: counts.warning,
                        })}
                    </p>
                </div>
                <Button onClick={() => setEditingZone('create')} leftIcon={<Plus size={16} />}>
                    {t('airspace.admin.create')}
                </Button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-panel border border-border bg-card p-3.5">
                <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={t('airspace.admin.filterType')}>
                    {filterTabs.map(option => (
                        <button
                            key={option}
                            type="button"
                            onClick={() => setTypeFilter(option)}
                            className={cn(
                                'min-h-9 rounded-control border px-3 text-xs font-bold transition-colors',
                                typeFilter === option
                                    ? 'border-primary bg-primary text-primary-foreground'
                                    : 'border-border bg-slate-50 text-slate-700 hover:bg-slate-100',
                            )}
                        >
                            {option === 'ALL' ? t('airspace.admin.filterAll') : t(`airspace.zoneType.${option}`)}
                        </button>
                    ))}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <label className="relative flex items-center">
                        <Search size={14} className="pointer-events-none absolute left-3 text-slate-400" aria-hidden="true" />
                        <input
                            type="search"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder={t('airspace.admin.searchPlaceholder')}
                            aria-label={t('airspace.admin.searchPlaceholder')}
                            className="min-h-9 w-56 rounded-control border border-border-input bg-slate-50 pl-8 pr-3 text-xs text-slate-900 focus:border-primary focus:bg-white focus:outline-none"
                        />
                    </label>
                    <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600">
                        <input
                            type="checkbox"
                            checked={showInactive}
                            onChange={e => setShowInactive(e.target.checked)}
                        />
                        {t('airspace.admin.showInactive')}
                    </label>
                </div>
            </div>

            {toggleError && (
                <div role="alert" className="rounded-panel border border-red-200 bg-red-50 px-4 py-3 text-xs text-danger">
                    {toggleError}
                </div>
            )}

            <QueryState query={query}>
                {filteredZones.length === 0 ? (
                    <div className="rounded-panel border border-dashed border-border bg-card p-8 text-center text-sm text-slate-500">
                        <MapPinned className="mx-auto mb-2 text-slate-400" size={22} aria-hidden="true" />
                        {t('airspace.admin.empty')}
                    </div>
                ) : (
                    <div className="overflow-x-auto rounded-panel border border-border bg-card">
                        <table className="w-full min-w-[860px] text-left text-[13px]">
                            <thead className="border-b border-border bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                                <tr>
                                    <th scope="col" className="px-4 py-3">
                                        {t('airspace.admin.columns.zone')}
                                    </th>
                                    <th scope="col" className="px-4 py-3">
                                        {t('airspace.admin.columns.type')}
                                    </th>
                                    <th scope="col" className="px-4 py-3">
                                        {t('airspace.admin.columns.geometry')}
                                    </th>
                                    <th scope="col" className="px-4 py-3">
                                        {t('airspace.admin.columns.ceiling')}
                                    </th>
                                    <th scope="col" className="px-4 py-3">
                                        {t('airspace.admin.columns.authority')}
                                    </th>
                                    <th scope="col" className="px-4 py-3">
                                        {t('airspace.admin.columns.status')}
                                    </th>
                                    <th scope="col" className="px-4 py-3 text-right">
                                        {t('airspace.admin.columns.actions')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredZones.map(zone => (
                                    <tr key={zone.id} className={cn(!zone.active && 'bg-slate-50/60 text-slate-500')}>
                                        <td className="px-4 py-3">
                                            <div className="font-mono text-xs font-bold text-slate-600">{zone.code}</div>
                                            <div className="font-semibold text-slate-900">{zone.name}</div>
                                            {zone.description && (
                                                <div className="mt-0.5 line-clamp-1 text-xs text-slate-500">
                                                    {zone.description}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span
                                                className={cn(
                                                    'inline-flex items-center rounded-badge border px-2 py-0.5 text-xs font-bold',
                                                    AIRSPACE_ZONE_TYPE_TONE[zone.zoneType],
                                                )}
                                            >
                                                {t(`airspace.zoneType.${zone.zoneType}`)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 tabular-nums">
                                            <div className="font-semibold text-slate-800">
                                                {zone.geometryType === 'CIRCLE'
                                                    ? `${t('airspace.geometry.CIRCLE')} · ${formatNumber(zone.radiusMeters ?? 0)} m`
                                                    : `${t('airspace.geometry.POLYGON')} · ${zone.vertices?.length ?? 0} ${t('airspace.admin.verticesUnit')}`}
                                            </div>
                                            <div className="font-mono text-xs text-slate-500">
                                                {zone.centerLat.toFixed(5)}, {zone.centerLng.toFixed(5)}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 tabular-nums">
                                            {zone.maxAltitudeAglM != null
                                                ? `${formatNumber(zone.maxAltitudeAglM)} m AGL`
                                                : t('airspace.tooltip.ceilingUnlimited')}
                                        </td>
                                        <td className="px-4 py-3">{zone.authority}</td>
                                        <td className="px-4 py-3">
                                            <span
                                                className={cn(
                                                    'inline-flex items-center rounded-badge border px-2 py-0.5 text-xs font-semibold',
                                                    zone.active
                                                        ? 'border-sky-200 bg-sky-50 text-uav-blue'
                                                        : 'border-slate-200 bg-slate-100 text-slate-600',
                                                )}
                                            >
                                                {zone.active
                                                    ? t('airspace.admin.status.active')
                                                    : t('airspace.admin.status.inactive')}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-wrap items-center justify-end gap-1.5">
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="outline"
                                                    isLoading={togglingId === zone.id}
                                                    disabled={togglingId !== null}
                                                    leftIcon={<Power size={13} />}
                                                    onClick={() => void handleToggleActive(zone)}
                                                >
                                                    {zone.active
                                                        ? t('airspace.admin.actions.deactivate')
                                                        : t('airspace.admin.actions.activate')}
                                                </Button>
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="outline"
                                                    leftIcon={<PencilLine size={13} />}
                                                    onClick={() => setEditingZone(zone)}
                                                >
                                                    {t('airspace.admin.actions.edit')}
                                                </Button>
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="danger"
                                                    leftIcon={<Trash2 size={13} />}
                                                    onClick={() => setDeletingZone(zone)}
                                                >
                                                    {t('airspace.admin.actions.delete')}
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </QueryState>

            {editingZone && (
                <UpsertAirspaceZoneDialog
                    zone={editingZone === 'create' ? null : editingZone}
                    onClose={() => setEditingZone(null)}
                    onSaved={() => setEditingZone(null)}
                />
            )}

            {deletingZone && (
                <Modal title={t('airspace.admin.deleteTitle')} onClose={() => setDeletingZone(null)}>
                    <div className="space-y-4">
                        <p className="m-0 flex items-start gap-2.5 text-sm text-slate-700">
                            <ShieldAlert size={18} className="mt-0.5 shrink-0 text-danger" aria-hidden="true" />
                            <span>
                                {t('airspace.admin.deleteConfirm', {
                                    code: deletingZone.code,
                                    name: deletingZone.name,
                                })}
                            </span>
                        </p>
                        {deleteMutation.error && (
                            <p role="alert" className="m-0 text-xs text-danger">
                                {deleteMutation.error.message}
                            </p>
                        )}
                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => setDeletingZone(null)}>
                                {t('common.cancel')}
                            </Button>
                            <Button
                                type="button"
                                variant="danger"
                                isLoading={deleteMutation.isPending}
                                onClick={() => deleteMutation.mutate(deletingZone.id)}
                            >
                                {t('airspace.admin.actions.delete')}
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}

function UpsertAirspaceZoneDialog({
    zone,
    onClose,
    onSaved,
}: {
    zone: AirspaceZone | null;
    onClose: () => void;
    onSaved: () => void;
}) {
    const {t} = useI18n();
    const [draft, setDraft] = useState<AirspaceZoneDraft>(() =>
        zone ? airspaceZoneDraftFromZone(zone) : emptyAirspaceZoneDraft(),
    );
    const createMutation = useCreateAirspaceZone({onSuccess: () => onSaved()});
    const updateMutation = useUpdateAirspaceZone({onSuccess: () => onSaved()});

    const activeError = zone ? updateMutation.error : createMutation.error;
    const isPending = zone ? updateMutation.isPending : createMutation.isPending;
    const fieldErrors = airspaceZoneFieldErrors(activeError);

    const inputClass =
        'min-h-10 w-full rounded-control border border-border-input bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-primary focus:bg-white focus:outline-none aria-[invalid=true]:border-danger';

    const handleSubmit = () => {
        if (!canSubmitAirspaceZoneDraft(draft) || isPending) return;
        const payload = toAirspaceZoneUpsertPayload(draft);
        if (zone) {
            updateMutation.mutate({id: zone.id, input: payload});
        } else {
            createMutation.mutate(payload);
        }
    };

    return (
        <Modal title={zone ? t('airspace.admin.editTitle') : t('airspace.admin.createTitle')} onClose={onClose}>
            <form
                noValidate
                className="space-y-4"
                onSubmit={event => {
                    event.preventDefault();
                    handleSubmit();
                }}
            >
                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                    <label className="grid gap-1 text-xs font-bold text-slate-800">
                        <span>
                            {t('airspace.admin.form.code')}
                            <RequiredMark />
                        </span>
                        <input
                            className={cn(inputClass, 'font-mono uppercase')}
                            value={draft.code}
                            autoFocus
                            aria-required
                            aria-invalid={Boolean(fieldErrors?.code)}
                            placeholder="VN-HN-NFZ-01"
                            onChange={e => setDraft(prev => ({...prev, code: e.target.value}))}
                        />
                        {fieldErrors?.code && (
                            <span className="text-xs font-normal text-danger">{fieldErrors.code}</span>
                        )}
                    </label>

                    <label className="grid gap-1 text-xs font-bold text-slate-800">
                        <span>
                            {t('airspace.admin.form.zoneType')}
                            <RequiredMark />
                        </span>
                        <select
                            className={inputClass}
                            value={draft.zoneType}
                            onChange={e =>
                                setDraft(prev => ({...prev, zoneType: e.target.value as AirspaceZoneType}))
                            }
                        >
                            {AIRSPACE_ZONE_TYPES.map(zt => (
                                <option key={zt} value={zt}>
                                    {t(`airspace.zoneType.${zt}`)}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="grid gap-1 text-xs font-bold text-slate-800 sm:col-span-2">
                        <span>
                            {t('airspace.admin.form.name')}
                            <RequiredMark />
                        </span>
                        <input
                            className={inputClass}
                            value={draft.name}
                            aria-required
                            aria-invalid={Boolean(fieldErrors?.name)}
                            placeholder={t('airspace.admin.form.namePlaceholder')}
                            onChange={e => setDraft(prev => ({...prev, name: e.target.value}))}
                        />
                        {fieldErrors?.name && (
                            <span className="text-xs font-normal text-danger">{fieldErrors.name}</span>
                        )}
                    </label>

                    <label className="grid gap-1 text-xs font-bold text-slate-800">
                        <span>
                            {t('airspace.admin.form.authority')}
                            <RequiredMark />
                        </span>
                        <input
                            className={inputClass}
                            value={draft.authority}
                            aria-required
                            aria-invalid={Boolean(fieldErrors?.authority)}
                            placeholder={t('airspace.admin.form.authorityPlaceholder')}
                            onChange={e => setDraft(prev => ({...prev, authority: e.target.value}))}
                        />
                        {fieldErrors?.authority && (
                            <span className="text-xs font-normal text-danger">{fieldErrors.authority}</span>
                        )}
                    </label>

                    <label className="grid gap-1 text-xs font-bold text-slate-800">
                        <span>
                            {t('airspace.admin.form.maxAltitudeAglM')}
                            <OptionalMark />
                        </span>
                        <input
                            type="number"
                            min={0}
                            max={10000}
                            step={10}
                            className={inputClass}
                            value={draft.maxAltitudeAglM}
                            aria-invalid={Boolean(fieldErrors?.maxAltitudeAglM)}
                            placeholder={t('airspace.admin.form.ceilingPlaceholder')}
                            onChange={e => setDraft(prev => ({...prev, maxAltitudeAglM: e.target.value}))}
                        />
                        {fieldErrors?.maxAltitudeAglM && (
                            <span className="text-xs font-normal text-danger">{fieldErrors.maxAltitudeAglM}</span>
                        )}
                    </label>

                    <label className="grid gap-1 text-xs font-bold text-slate-800 sm:col-span-2">
                        <span>
                            {t('airspace.admin.form.geometryType')}
                            <RequiredMark />
                        </span>
                        <select
                            className={inputClass}
                            value={draft.geometryType}
                            onChange={e =>
                                setDraft(prev => ({
                                    ...prev,
                                    geometryType: e.target.value as AirspaceZoneDraft['geometryType'],
                                }))
                            }
                        >
                            {AIRSPACE_GEOMETRY_TYPES.map(gt => (
                                <option key={gt} value={gt}>
                                    {t(`airspace.geometry.${gt}`)}
                                </option>
                            ))}
                        </select>
                    </label>

                    {draft.geometryType === 'CIRCLE' ? (
                        <>
                            <label className="grid gap-1 text-xs font-bold text-slate-800">
                                <span>
                                    {t('airspace.admin.form.centerLat')}
                                    <RequiredMark />
                                </span>
                                <input
                                    type="number"
                                    step="any"
                                    className={inputClass}
                                    value={draft.centerLat}
                                    aria-required
                                    aria-invalid={Boolean(fieldErrors?.centerLat)}
                                    onChange={e => setDraft(prev => ({...prev, centerLat: e.target.value}))}
                                />
                                {fieldErrors?.centerLat && (
                                    <span className="text-xs font-normal text-danger">{fieldErrors.centerLat}</span>
                                )}
                            </label>
                            <label className="grid gap-1 text-xs font-bold text-slate-800">
                                <span>
                                    {t('airspace.admin.form.centerLng')}
                                    <RequiredMark />
                                </span>
                                <input
                                    type="number"
                                    step="any"
                                    className={inputClass}
                                    value={draft.centerLng}
                                    aria-required
                                    aria-invalid={Boolean(fieldErrors?.centerLng)}
                                    onChange={e => setDraft(prev => ({...prev, centerLng: e.target.value}))}
                                />
                                {fieldErrors?.centerLng && (
                                    <span className="text-xs font-normal text-danger">{fieldErrors.centerLng}</span>
                                )}
                            </label>
                            <label className="grid gap-1 text-xs font-bold text-slate-800 sm:col-span-2">
                                <span>
                                    {t('airspace.admin.form.radiusMeters')}
                                    <RequiredMark />
                                </span>
                                <input
                                    type="number"
                                    min={10}
                                    step={50}
                                    className={inputClass}
                                    value={draft.radiusMeters}
                                    aria-required
                                    aria-invalid={Boolean(fieldErrors?.radiusMeters)}
                                    onChange={e => setDraft(prev => ({...prev, radiusMeters: e.target.value}))}
                                />
                                {fieldErrors?.radiusMeters && (
                                    <span className="text-xs font-normal text-danger">{fieldErrors.radiusMeters}</span>
                                )}
                            </label>
                        </>
                    ) : (
                        <label className="grid gap-1 text-xs font-bold text-slate-800 sm:col-span-2">
                            <span>
                                {t('airspace.admin.form.vertices')}
                                <RequiredMark />
                            </span>
                            <textarea
                                rows={4}
                                className="w-full rounded-control border border-border-input bg-slate-50 p-2.5 font-mono text-xs text-slate-900 focus:border-primary focus:bg-white focus:outline-none"
                                value={draft.verticesText}
                                aria-required
                                aria-invalid={Boolean(fieldErrors?.vertices || fieldErrors?.verticesText)}
                                placeholder={"21.0325, 105.8310\n21.0350, 105.8390\n21.0280, 105.8410"}
                                onChange={e => setDraft(prev => ({...prev, verticesText: e.target.value}))}
                            />
                            <span className="text-xs font-normal text-slate-500">
                                {t('airspace.admin.form.verticesHint')}
                            </span>
                            {(fieldErrors?.vertices || fieldErrors?.verticesText) && (
                                <span className="text-xs font-normal text-danger">
                                    {fieldErrors.vertices || fieldErrors.verticesText}
                                </span>
                            )}
                        </label>
                    )}

                    <label className="grid gap-1 text-xs font-bold text-slate-800 sm:col-span-2">
                        <span>
                            {t('airspace.admin.form.description')}
                            <OptionalMark />
                        </span>
                        <textarea
                            rows={2}
                            className="w-full rounded-control border border-border-input bg-slate-50 p-2.5 text-sm font-normal text-slate-900 focus:border-primary focus:bg-white focus:outline-none"
                            value={draft.description}
                            placeholder={t('airspace.admin.form.descriptionPlaceholder')}
                            onChange={e => setDraft(prev => ({...prev, description: e.target.value}))}
                        />
                    </label>
                </div>

                <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700">
                    <input
                        type="checkbox"
                        checked={draft.active}
                        onChange={e => setDraft(prev => ({...prev, active: e.target.checked}))}
                    />
                    {t('airspace.admin.form.activeLabel')}
                </label>

                {activeError && !fieldErrors && (
                    <p role="alert" className="m-0 text-xs text-danger">
                        {activeError.message}
                    </p>
                )}

                <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={onClose}>
                        {t('common.cancel')}
                    </Button>
                    <Button
                        type="submit"
                        isLoading={isPending}
                        disabled={isPending || !canSubmitAirspaceZoneDraft(draft)}
                    >
                        {zone ? t('airspace.admin.actions.saveChanges') : t('airspace.admin.create')}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}

export default function AdminAirspacePanel() {
    return (
        <AdminPage title="admin.pages.airspace.title" permission="USER_MANAGE" activeResource="airspace">
            <AdminAirspaceContent />
        </AdminPage>
    );
}
