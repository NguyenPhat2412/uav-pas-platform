'use client';

import {useRef, useState} from 'react';
import {useRouter} from 'next/navigation';
import {CalendarClock, Check, FolderKanban, MapPin, X} from 'lucide-react';
import {AreaStepPanel, ProjectStepPanel, ScheduleStepPanel} from '@/components/marketplace/booking/ProjectSubscriptionStepPanels';
import {Alert, Button} from '@/components/ui';
import {estimateBookingSubtotal, extractActionableError, pricingUnitLabel} from '@/forms/marketplace-forms';
import {flightPlanToGeoJson, geoJsonToFlightPlan, validateProjectInput, validateSubscriptionBooking} from '@/forms/project-form';
import {useCustomerProjects, useProjectActions} from '@/hooks/useCustomerProjects';
import {useDialogFocusTrap} from '@/hooks/useDialogFocusTrap';
import {ApiError} from '@/lib/api';
import {useI18n} from '@/providers/I18nContext';
import {toast} from '@/providers/ToastContext';
import type {MarketplaceListing} from '@/types/marketplace.types';
import type {FlightPlanInput} from '@/types/flight-plan.types';
import type {CustomerProject, ProjectScheduleType} from '@/types/project.types';

function defaultStartDateIso(): string {
    return new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
}

export function ProjectSubscriptionWizardDialog({
    open,
    listing,
    initialUnits,
    preselectedProjectId,
    onClose,
}: {
    open: boolean;
    listing: MarketplaceListing;
    initialUnits?: number;
    preselectedProjectId?: number | null;
    onClose: () => void;
}) {
    const {t} = useI18n();
    const router = useRouter();
    const dialogRef = useRef<HTMLDivElement>(null);
    useDialogFocusTrap(dialogRef, open, onClose);

    const projectsQuery = useCustomerProjects(0, '', 50, open);
    const actions = useProjectActions();
    const existingProjects = projectsQuery.data?.content ?? [];

    const minUnits = Math.max(1, Number(listing.minBookingUnits || 1));
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [projectMode, setProjectMode] = useState<'existing' | 'new'>('existing');
    const [selectedProjectId, setSelectedProjectId] = useState<number | null>(preselectedProjectId ?? null);
    const [newName, setNewName] = useState('');
    const [newProvince, setNewProvince] = useState(listing.province || '');
    const [newNote, setNewNote] = useState('');
    const [flightPlan, setFlightPlan] = useState<FlightPlanInput>(() => geoJsonToFlightPlan(null));
    const [scheduleType, setScheduleType] = useState<ProjectScheduleType>('ONCE');
    const [startDate, setStartDate] = useState<string>(defaultStartDateIso);
    const [units, setUnits] = useState<number>(Math.max(initialUnits ?? minUnits, minUnits));
    const [errorText, setErrorText] = useState<string | null>(null);

    if (!open) return null;

    const effectiveMode: 'existing' | 'new' =
        existingProjects.length === 0 && !projectsQuery.isLoading ? 'new' : projectMode;
    const activeProject: CustomerProject | undefined =
        existingProjects.find(p => p.id === selectedProjectId) ?? existingProjects[0];

    const areaGeoJson = flightPlanToGeoJson(flightPlan);
    const subtotal = estimateBookingSubtotal(Number(listing.basePriceVnd), units, minUnits);
    const unitLabel = pricingUnitLabel(listing.pricingModel);
    const busy = actions.createProject.isPending || actions.createSubscription.isPending;

    const handleNextFromProject = async () => {
        setErrorText(null);
        if (effectiveMode === 'existing' && activeProject) {
            setSelectedProjectId(activeProject.id);
            if (!areaGeoJson && activeProject.areaGeoJson) {
                setFlightPlan(geoJsonToFlightPlan(activeProject.areaGeoJson));
            }
            setStep(2);
            return;
        }
        if (validateProjectInput({name: newName, province: newProvince, note: newNote})) {
            setErrorText(t('missionForm.checkErrors'));
            return;
        }
        try {
            const created = await actions.createProject.mutateAsync({
                name: newName,
                province: newProvince,
                note: newNote || undefined,
            });
            setSelectedProjectId(created.id);
            setProjectMode('existing');
            setStep(2);
        } catch (err) {
            setErrorText(
                err instanceof ApiError && err.status === 404
                    ? t('marketplaceShop.bookingApiUnavailable')
                    : extractActionableError(err, t('missionDetail.actionFailed')),
            );
        }
    };

    const handleConfirm = async () => {
        setErrorText(null);
        const projectId = selectedProjectId ?? activeProject?.id;
        if (!projectId) {
            setStep(1);
            return;
        }
        const payload = {
            listingId: listing.id,
            areaGeoJson,
            scheduleType,
            startDate,
            units: Math.max(units, minUnits),
            locationName: activeProject?.province || listing.province,
        };
        if (validateSubscriptionBooking(payload)) {
            setErrorText(t('missionForm.checkErrors'));
            return;
        }
        try {
            const sub = await actions.createSubscription.mutateAsync({projectId, payload});
            toast.success(t('marketplaceShop.bookingSuccess'));
            onClose();
            router.push(sub?.firstMissionId ? `/customer/missions/${sub.firstMissionId}` : `/customer/projects?project=${projectId}`);
        } catch (err) {
            setErrorText(
                err instanceof ApiError && err.status === 404
                    ? t('marketplaceShop.bookingApiUnavailable')
                    : extractActionableError(err, t('missionDetail.actionFailed')),
            );
        }
    };

    const steps = [
        {num: 1 as const, label: t('marketplaceShop.stepProject'), icon: FolderKanban},
        {num: 2 as const, label: t('marketplaceShop.stepArea'), icon: MapPin},
        {num: 3 as const, label: t('marketplaceShop.stepSchedule'), icon: CalendarClock},
    ];

    return (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-xs sm:items-center sm:p-4">
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="project-sub-wizard-title"
                className="flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl sm:rounded-panel"
            >
                <header className="border-b border-slate-200 bg-slate-50/80 px-4 py-3 sm:px-5">
                    <div className="flex items-center justify-between gap-3">
                        <h2 id="project-sub-wizard-title" className="m-0 truncate text-base font-bold text-slate-900">
                            {t('marketplaceShop.wizardTitle')}
                        </h2>
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label={t('common.close')}
                            className="inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-control text-slate-500 hover:bg-slate-200/70 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                        >
                            <X size={18} aria-hidden="true"/>
                        </button>
                    </div>
                    <ol className="m-0 mt-3 grid list-none grid-cols-3 gap-2 p-0">
                        {steps.map(s => {
                            const Icon = s.icon;
                            const done = step > s.num;
                            const current = step === s.num;
                            return (
                                <li
                                    key={s.num}
                                    className={`flex min-w-0 items-center gap-1.5 rounded-control border px-2 py-1.5 text-[11px] font-semibold sm:px-2.5 sm:text-xs ${
                                        current
                                            ? 'border-primary bg-uav-red-light text-primary'
                                            : done
                                              ? 'border-slate-800 bg-slate-900 text-white'
                                              : 'border-slate-200 bg-white text-slate-500'
                                    }`}
                                >
                                    <span className="shrink-0" aria-hidden="true">
                                        {done ? <Check size={14}/> : <Icon size={14}/>}
                                    </span>
                                    <span className="line-clamp-2 leading-tight">{s.label}</span>
                                </li>
                            );
                        })}
                    </ol>
                </header>

                <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
                    {errorText && (
                        <Alert variant="error" role="alert" className="text-xs">
                            {errorText}
                        </Alert>
                    )}

                    {step === 1 && (
                        <ProjectStepPanel
                            existingProjects={existingProjects}
                            isLoading={projectsQuery.isLoading}
                            effectiveMode={effectiveMode}
                            selectedProjectId={selectedProjectId}
                            newName={newName}
                            newProvince={newProvince}
                            newNote={newNote}
                            onModeChange={setProjectMode}
                            onSelectProject={setSelectedProjectId}
                            onNewNameChange={setNewName}
                            onNewProvinceChange={setNewProvince}
                            onNewNoteChange={setNewNote}
                        />
                    )}
                    {step === 2 && (
                        <AreaStepPanel
                            areaGeoJson={areaGeoJson}
                            flightPlan={flightPlan}
                            onFlightPlanChange={setFlightPlan}
                        />
                    )}
                    {step === 3 && (
                        <ScheduleStepPanel
                            listing={listing}
                            projectName={activeProject?.name || newName}
                            scheduleType={scheduleType}
                            startDate={startDate}
                            units={units}
                            minUnits={minUnits}
                            unitLabel={unitLabel}
                            subtotal={subtotal}
                            onScheduleTypeChange={setScheduleType}
                            onStartDateChange={setStartDate}
                            onUnitsChange={setUnits}
                        />
                    )}
                </div>

                <footer className="flex items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-3 sm:px-5">
                    <Button
                        type="button"
                        variant="outline"
                        disabled={busy}
                        onClick={() => {
                            if (step > 1) {
                                setErrorText(null);
                                setStep(prev => (prev === 3 ? 2 : 1));
                            } else {
                                onClose();
                            }
                        }}
                    >
                        {step > 1 ? t('marketplaceShop.prevStep') : t('common.cancel')}
                    </Button>

                    {step < 3 ? (
                        <Button
                            type="button"
                            isLoading={busy}
                            disabled={busy}
                            onClick={() => {
                                if (step === 1) void handleNextFromProject();
                                else if (!areaGeoJson) setErrorText(t('marketplaceShop.areaMissing'));
                                else {
                                    setErrorText(null);
                                    setStep(3);
                                }
                            }}
                            className="min-h-11 px-6 whitespace-nowrap"
                        >
                            {t('marketplaceShop.nextStep')}
                        </Button>
                    ) : (
                        <Button
                            type="button"
                            isLoading={busy}
                            loadingText={t('marketplaceShop.submittingBooking')}
                            disabled={busy}
                            onClick={() => void handleConfirm()}
                            className="min-h-11 px-6 whitespace-nowrap"
                        >
                            {t('marketplaceShop.confirmBooking')}
                        </Button>
                    )}
                </footer>
            </div>
        </div>
    );
}
