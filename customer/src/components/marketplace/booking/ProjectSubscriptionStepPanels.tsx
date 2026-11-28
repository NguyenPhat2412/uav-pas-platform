'use client';

import {CheckCircle2, MapPin, Plus} from 'lucide-react';
import {LocationPicker} from '@/components/mission/customer/LocationPicker';
import {OptionalMark, RequiredMark} from '@/components/shared/RequiredMark';
import {formatVndCompact} from '@/forms/marketplace-forms';
import {PROJECT_SCHEDULE_TYPES} from '@/forms/project-form';
import {useI18n} from '@/providers/I18nContext';
import type {MarketplaceListing} from '@/types/marketplace.types';
import type {FlightPlanInput} from '@/types/flight-plan.types';
import type {CustomerProject, ProjectScheduleType} from '@/types/project.types';

export function ProjectStepPanel({
    existingProjects,
    isLoading,
    effectiveMode,
    selectedProjectId,
    newName,
    newProvince,
    newNote,
    onModeChange,
    onSelectProject,
    onNewNameChange,
    onNewProvinceChange,
    onNewNoteChange,
}: {
    existingProjects: CustomerProject[];
    isLoading: boolean;
    effectiveMode: 'existing' | 'new';
    selectedProjectId: number | null;
    newName: string;
    newProvince: string;
    newNote: string;
    onModeChange: (mode: 'existing' | 'new') => void;
    onSelectProject: (id: number) => void;
    onNewNameChange: (val: string) => void;
    onNewProvinceChange: (val: string) => void;
    onNewNoteChange: (val: string) => void;
}) {
    const {t} = useI18n();

    return (
        <div className="space-y-3.5">
            {existingProjects.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                    <button
                        type="button"
                        aria-pressed={effectiveMode === 'existing'}
                        onClick={() => onModeChange('existing')}
                        className={`min-h-11 cursor-pointer rounded-control border px-3 text-xs font-bold whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                            effectiveMode === 'existing'
                                ? 'border-primary bg-uav-red-light text-primary'
                                : 'border-slate-200 bg-white text-slate-700'
                        }`}
                    >
                        {t('marketplaceShop.chooseExistingProject')}
                    </button>
                    <button
                        type="button"
                        aria-pressed={effectiveMode === 'new'}
                        onClick={() => onModeChange('new')}
                        className={`inline-flex min-h-11 cursor-pointer items-center justify-center gap-1 rounded-control border px-3 text-xs font-bold whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                            effectiveMode === 'new'
                                ? 'border-primary bg-uav-red-light text-primary'
                                : 'border-slate-200 bg-white text-slate-700'
                        }`}
                    >
                        <Plus size={14} aria-hidden="true"/>
                        <span>{t('marketplaceShop.createNewProject')}</span>
                    </button>
                </div>
            )}

            {effectiveMode === 'existing' && existingProjects.length > 0 ? (
                <div className="grid gap-2">
                    {existingProjects.map(proj => {
                        const active = (selectedProjectId ?? existingProjects[0]?.id) === proj.id;
                        return (
                            <button
                                key={proj.id}
                                type="button"
                                aria-pressed={active}
                                onClick={() => onSelectProject(proj.id)}
                                className={`flex w-full cursor-pointer items-center justify-between gap-3 rounded-panel border p-3.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                                    active
                                        ? 'border-primary bg-uav-red-light/50'
                                        : 'border-slate-200 bg-white hover:bg-slate-50'
                                }`}
                            >
                                <div className="min-w-0">
                                    <strong className="block truncate text-sm font-semibold text-slate-900">
                                        {proj.name}
                                    </strong>
                                    <span className="block truncate text-xs text-slate-500">{proj.province}</span>
                                </div>
                                {active && <CheckCircle2 size={18} className="shrink-0 text-primary" aria-hidden="true"/>}
                            </button>
                        );
                    })}
                </div>
            ) : (
                <div className="space-y-3">
                    {existingProjects.length === 0 && !isLoading && (
                        <p className="m-0 text-xs text-slate-500">{t('marketplaceShop.noProjectsYet')}</p>
                    )}
                    <label className="block space-y-1 text-xs font-semibold text-slate-800">
                        <span>{t('marketplaceShop.projectName')}<RequiredMark/></span>
                        <input
                            type="text"
                            value={newName}
                            onChange={e => onNewNameChange(e.target.value)}
                            placeholder={t('marketplaceShop.projectNamePlaceholder')}
                            className="h-11 w-full rounded-control border border-slate-300 bg-white px-3 text-sm font-normal text-slate-900 outline-none focus:border-primary"
                        />
                    </label>
                    <label className="block space-y-1 text-xs font-semibold text-slate-800">
                        <span>{t('marketplaceShop.projectProvince')}<RequiredMark/></span>
                        <input
                            type="text"
                            value={newProvince}
                            onChange={e => onNewProvinceChange(e.target.value)}
                            placeholder={t('marketplaceShop.projectProvincePlaceholder')}
                            className="h-11 w-full rounded-control border border-slate-300 bg-white px-3 text-sm font-normal text-slate-900 outline-none focus:border-primary"
                        />
                    </label>
                    <label className="block space-y-1 text-xs font-semibold text-slate-800">
                        <span>{t('marketplaceShop.projectNote')}<OptionalMark/></span>
                        <textarea
                            rows={2}
                            value={newNote}
                            onChange={e => onNewNoteChange(e.target.value)}
                            placeholder={t('marketplaceShop.projectNotePlaceholder')}
                            className="w-full rounded-control border border-slate-300 bg-white p-3 text-sm font-normal text-slate-900 outline-none focus:border-primary"
                        />
                    </label>
                </div>
            )}
        </div>
    );
}

const QUICK_REGION_PRESETS = [
    {label: 'TP. Hồ Chí Minh', lat: 10.7769, lng: 106.7009}, {label: 'Hà Nội', lat: 21.0285, lng: 105.8542},
    {label: 'Đà Nẵng', lat: 16.0544, lng: 108.2022}, {label: 'Cần Thơ', lat: 10.0452, lng: 105.7469},
    {label: 'Bình Dương', lat: 10.9804, lng: 106.6519}, {label: 'Bắc Ninh', lat: 21.1861, lng: 106.0763},
] as const;

export function AreaStepPanel({areaGeoJson, flightPlan, onFlightPlanChange}: {
    areaGeoJson: string; flightPlan: FlightPlanInput; onFlightPlanChange: (next: FlightPlanInput) => void;
}) {
    const {t} = useI18n();
    const jumpToRegion = (lat: number, lng: number) => {
        const d = 0.004;
        onFlightPlanChange({...flightPlan, areaType: 'POLYGON', takeoffLatitude: lat, takeoffLongitude: lng, vertices: [[lat - d, lng - d], [lat - d, lng + d], [lat + d, lng + d], [lat + d, lng - d]]});
    };

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="m-0 text-xs text-slate-600">{t('marketplaceShop.areaHint')}</p>
                <span
                    className={`inline-flex items-center gap-1 rounded-badge px-2.5 py-0.5 text-xs font-bold whitespace-nowrap ${
                        areaGeoJson ? 'bg-uav-red-light text-primary' : 'bg-slate-100 text-slate-600'
                    }`}
                >
                    <MapPin size={12} aria-hidden="true"/>
                    {areaGeoJson ? t('marketplaceShop.areaReady') : t('marketplaceShop.stepArea')}
                </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={t('marketplaceShop.projectProvince')}>
                {QUICK_REGION_PRESETS.map(region => (
                    <button
                        key={region.label}
                        type="button"
                        onClick={() => jumpToRegion(region.lat, region.lng)}
                        className="min-h-8 cursor-pointer rounded-badge border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition-colors hover:border-primary hover:bg-uav-red-light hover:text-primary"
                    >
                        {region.label}
                    </button>
                ))}
            </div>
            <LocationPicker plan={flightPlan} onChange={nextPlan => onFlightPlanChange(nextPlan)}/>
        </div>
    );
}

export function ScheduleStepPanel({
    listing,
    projectName,
    scheduleType,
    startDate,
    units,
    minUnits,
    unitLabel,
    subtotal,
    onScheduleTypeChange,
    onStartDateChange,
    onUnitsChange,
}: {
    listing: MarketplaceListing;
    projectName: string;
    scheduleType: ProjectScheduleType;
    startDate: string;
    units: number;
    minUnits: number;
    unitLabel: string;
    subtotal: number;
    onScheduleTypeChange: (val: ProjectScheduleType) => void;
    onStartDateChange: (val: string) => void;
    onUnitsChange: (val: number) => void;
}) {
    const {t} = useI18n();
    const scheduleLabel = (kind: ProjectScheduleType) => {
        if (kind === 'WEEKLY') return t('marketplaceShop.scheduleWeekly');
        if (kind === 'MONTHLY') return t('marketplaceShop.scheduleMonthly');
        return t('marketplaceShop.scheduleOnce');
    };

    return (
        <div className="space-y-4">
            <div className="space-y-1.5">
                <span className="block text-xs font-semibold text-slate-800">
                    {t('marketplaceShop.scheduleType')}<RequiredMark/>
                </span>
                <div className="grid grid-cols-3 gap-2">
                    {PROJECT_SCHEDULE_TYPES.map(kind => {
                        const active = scheduleType === kind;
                        return (
                            <button
                                key={kind}
                                type="button"
                                aria-pressed={active}
                                onClick={() => onScheduleTypeChange(kind)}
                                className={`min-h-10 cursor-pointer rounded-control border px-2 text-xs font-bold whitespace-nowrap transition-colors ${
                                    active
                                        ? 'border-primary bg-primary text-primary-foreground'
                                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                }`}
                            >
                                {scheduleLabel(kind)}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block space-y-1 text-xs font-semibold text-slate-800">
                    <span>{t('marketplaceShop.startDate')}<RequiredMark/></span>
                    <input
                        type="date"
                        value={startDate}
                        onChange={e => onStartDateChange(e.target.value)}
                        className="h-11 w-full rounded-control border border-slate-300 bg-white px-3 text-sm font-normal text-slate-900 tabular-nums outline-none focus:border-primary"
                    />
                </label>
                <label className="block space-y-1 text-xs font-semibold text-slate-800">
                    <span>{t('marketplaceShop.unitsLabel')} ({unitLabel})<RequiredMark/></span>
                    <input
                        type="number"
                        min={minUnits}
                        step="0.5"
                        value={units}
                        onChange={e => onUnitsChange(Math.max(minUnits, Number(e.target.value) || minUnits))}
                        className="h-11 w-full rounded-control border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 tabular-nums outline-none focus:border-primary"
                    />
                </label>
            </div>

            <dl className="m-0 space-y-2 rounded-panel border border-slate-200 bg-slate-50 p-4 text-xs tabular-nums">
                <div className="flex items-center justify-between gap-2">
                    <dt className="text-slate-500">{t('marketplaceShop.stepProject')}</dt>
                    <dd className="m-0 truncate font-semibold text-slate-900">{projectName}</dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                    <dt className="text-slate-500">{t('missionCreate.service')}</dt>
                    <dd className="m-0 truncate font-semibold text-slate-900">{listing.title}</dd>
                </div>
                <div className="flex items-center justify-between gap-2 border-t border-slate-200 pt-2">
                    <dt className="font-semibold text-slate-800">{t('marketplaceShop.estimatedTotal')}</dt>
                    <dd className="m-0 text-base font-bold text-primary">{formatVndCompact(subtotal)}</dd>
                </div>
            </dl>
        </div>
    );
}
