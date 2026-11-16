'use client';
import {useCustomerMissionWorkflow} from '@/hooks/mission/useMissionWorkflow';
import Link from 'next/link';
import {displayLabel, serviceName} from "@/lib/presentation";
import {useRouter, useSearchParams} from 'next/navigation';
import {useState} from 'react';
import {PageGuard} from "@/components/customer/CustomerLayout";
import {Button, Panel} from "@/components/customer/CustomerUi";
import {useAuth} from '@/providers/AuthContext';
import {useMissionActions, useServices} from '@/hooks/mission/useCustomerMissions';
import {
    focusMissionErrors,
    MissionErrorSummary,
    MissionFields
} from "@/components/mission/customer/MissionFields";
import {
    missionFormError,
    type MissionFormErrors,
    missionTypeForService,
    missionTypes,
    missionFieldErrors,
    missionCreatePayload,
} from "@/forms/mission/mission-form";
import {usePublicListingDetail} from '@/hooks/marketplace/useMarketplace';
import {useSiteInfo} from '@/hooks/settings/useSiteInfo';
import {estimateBookingSubtotal} from '@/forms/marketplace/marketplace-forms';
import {MissionMarketplaceBanner} from '@/components/mission/customer/MissionMarketplaceBanner';
import {MissionReviewSummaryList} from '@/components/mission/customer/MissionReviewSummaryList';
import type {MissionInput, MissionType} from "@/types/customer";
import {OptionalMark, RequiredMark} from "@/components/shared/RequiredMark";
import {resolveServiceIdFromParam, toServiceSlug} from "@/lib/url-slugs";
import {useI18n} from '@/providers/I18nContext';
import {MissionWeatherAdvisor} from '@/components/weather/MissionWeatherAdvisor';
import {MissionAirspaceAdvisor} from '@/components/airspace/MissionAirspaceAdvisor';
import {
    applySavedSiteToForm,
    SavedFlightSitesBar,
} from '@/components/mission/customer/SavedFlightSitesBar';

const initial: MissionInput = {
    missionType: 'AREA_INSPECTION',
    title: '',
    description: '',
    requestedDate: '',
    startTime: '',
    expectedEndTime: '',
    locationName: '',
    priority: 'NORMAL',
    notes: ''
};
export default function CreateMissionPage() {
    return <PageGuard permission="MISSION_CREATE"><CreateMission/></PageGuard>;
}

function CreateMission() {
    const customerMissions = useCustomerMissionWorkflow();
    const router = useRouter();
    const params = useSearchParams();
    const services = useServices();
    const actions = useMissionActions();
    const {can} = useAuth();
    const {t} = useI18n();
    const {rfqEnabled, requireEscrowBeforeStart, invoiceDueDays} = useSiteInfo();
    const listingSlug = params.get('listing');
    const initialUnitsParam = Number(params.get('units'));
    const listingQuery = usePublicListingDetail(listingSlug);
    const activeListing = listingQuery.data?.listing;
    const [bookingUnits, setBookingUnits] = useState<number>(
        Number.isFinite(initialUnitsParam) && initialUnitsParam >= 0.5 ? initialUnitsParam : 1,
    );
    const [openRfq, setOpenRfq] = useState<boolean>(params.get('rfq') === '1');
    const [formValues, setForm] = useState<MissionInput>({
        ...initial,
        serviceId: resolveServiceIdFromParam(params.get('service'), params.get('serviceId'))
    });
    const [missionTypeOverride, setMissionTypeOverride] = useState<MissionType | null>(null);
    const [step, setStep] = useState<1 | 2>(1);
    const [errors, setErrors] = useState<MissionFormErrors>({});
    const [error, setError] = useState('');
    const [availability, setAvailability] = useState<'' | 'ok' | 'conflict' | 'draft'>('');
    const [checking, setChecking] = useState(false);
    const activeServices = (services.data ?? []).filter(service => service.active);
    const resolvedServiceId = activeListing?.categoryServiceId ?? (
        formValues.serviceId === -1 && params.get('service')
            ? resolveServiceIdFromParam(params.get('service'), null, activeServices)
            : formValues.serviceId
    );
    const selectedService = activeServices.find(service => service.id === resolvedServiceId);
    const effectiveUnits = activeListing
        ? Math.max(bookingUnits || Number(activeListing.minBookingUnits || 1), Number(activeListing.minBookingUnits || 1))
        : undefined;
    const estimatedSubtotal = activeListing
        ? estimateBookingSubtotal(Number(activeListing.basePriceVnd), effectiveUnits ?? 1, Number(activeListing.minBookingUnits || 1))
        : null;
    const effectiveOpenRfq = !activeListing && rfqEnabled && openRfq;
    // Resolve a linked service after its catalogue arrives; keep an explicit type choice.
    const form: MissionInput = {
        ...formValues,
        serviceId: resolvedServiceId ?? undefined,
        missionType: activeListing?.missionType ?? missionTypeOverride ?? missionTypeForService(selectedService?.code, formValues.missionType),
        listingId: activeListing?.id,
        bookingUnits: effectiveUnits,
        openRfq: effectiveOpenRfq ? true : undefined,
    };
    const payload = () => missionCreatePayload(form);
    /** Puts the backend's field errors on the form and returns to step 1; false when the error was not about fields. */
    const showFieldErrors = (err: unknown) => {
        const fields = missionFieldErrors(err);
        if (!fields) return false;
        setErrors(fields);
        setStep(1);
        focusMissionErrors();
        return true;
    };
    const review = async () => {
        setError('');
        setErrors({});
        setChecking(true);
        try {
            // The server checks every rule; the form itself does not repeat them.
            await customerMissions.validateMission(payload());
        } catch (err) {
            if (!showFieldErrors(err)) setError(missionFormError(err, t));
            setChecking(false);
            return;
        }
        try {
            if (can('MISSION_VIEW')) {
                const result = await customerMissions.availability(form.startTime, form.expectedEndTime);
                setAvailability(result.available ? 'ok' : 'conflict');
            } else setAvailability('draft');
            setStep(2);
        } catch {
            setError(t('missionCreate.availabilityError'));
        } finally {
            setChecking(false);
        }
    };
    const canSendNow = can('MISSION_UPDATE');
    const busy = actions.create.isPending || actions.submit.isPending;
    const submit = async (sendNow: boolean) => {
        setError('');
        try {
            const mission = await actions.create.mutateAsync(payload());
            // A failed send still leaves a saved draft; the detail page offers "Gửi xác nhận" again.
            if (sendNow) await actions.submit.mutateAsync(mission.id).catch(() => undefined);
            router.replace(`/customer/missions/${mission.id}`);
        } catch (err) {
            if (!showFieldErrors(err)) setError(missionFormError(err, t));
        }
    };
    const fieldClass = 'grid gap-1.5 text-xs font-bold text-foreground';
    const selectClass = 'min-h-11 w-full rounded-control border border-border-input bg-card px-3 py-2 text-base font-normal text-foreground sm:text-sm aria-[invalid=true]:border-danger';
    return <div className="flex flex-1 flex-col bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/70 px-4 py-2.5">
            <Link href="/customer/missions" className="inline-flex min-h-8 w-fit items-center gap-2 text-sm font-semibold text-primary hover:underline">{t('missionCreate.back')}</Link>
        </div>
        <Panel title={step === 1 ? t('missionCreate.step1') : t('missionCreate.step2')} className="flex-1 border-0">
            {error &&
                <div className="mb-5 rounded-panel bg-red-50 px-3.5 py-3 text-xs text-danger [&_a]:underline" role="alert">{error} <Link href="/customer/missions">{t('missionCreate.viewMissions')}</Link></div>}
            {step === 1 ? <form onSubmit={event => {
                event.preventDefault();
                void review();
            }}>
                <MissionErrorSummary errors={errors}/>
                {services.isError &&
                    <div className="mb-5 flex flex-wrap items-center gap-3 rounded-panel bg-amber-50 px-3.5 py-3 text-xs text-warning" role="alert">{t('missionCreate.servicesError')} <Button type="button" variant="secondary"
                                                    onClick={() => void services.refetch()}>{t('missionCreate.reloadServices')}</Button>
                    </div>}
                <fieldset className="m-0 border-0 p-0 disabled:opacity-65" disabled={checking}>
                    <legend className="sr-only">{t('missionCreate.requestDetails')}</legend>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <MissionMarketplaceBanner
                            activeListing={activeListing}
                            effectiveUnits={effectiveUnits}
                            estimatedSubtotal={estimatedSubtotal}
                            onBookingUnitsChange={setBookingUnits}
                            rfqEnabled={rfqEnabled}
                            openRfq={openRfq}
                            onOpenRfqChange={setOpenRfq}
                            invoiceDueDays={invoiceDueDays}
                            requireEscrowBeforeStart={requireEscrowBeforeStart}
                        />
                        <SavedFlightSitesBar
                            form={form}
                            onApply={site => {
                                const {nextForm, nextMissionType} = applySavedSiteToForm(form, site);
                                setMissionTypeOverride(nextMissionType);
                                setForm(nextForm);
                            }}
                        />
                        <label className={fieldClass}><span>{t('missionCreate.service')}<OptionalMark/></span><select id="mission-serviceId"
                                                                                        className={selectClass}
                                                                                        value={form.serviceId ?? ''}
                                                                                        aria-invalid={!!errors.serviceId}
                                                                                        aria-describedby={errors.serviceId ? 'mission-serviceId-error' : undefined}
                                                                                        onChange={event => {
                                                                                            const service = activeServices.find(item => item.id === Number(event.target.value));
                                                                                            setMissionTypeOverride(null);
                                                                                            setForm(value => ({
                                                                                                ...value,
                                                                                                serviceId: event.target.value ? Number(event.target.value) : undefined,
                                                                                                missionType: missionTypeForService(service?.code, form.missionType)
                                                                                            }));
                                                                                            if (typeof window !== 'undefined') {
                                                                                                const nextUrl = service
                                                                                                    ? `${window.location.pathname}?service=${toServiceSlug(service)}`
                                                                                                    : window.location.pathname;
                                                                                                window.history.replaceState(null, '', nextUrl);
                                                                                            }
                                                                                        }}>
                            <option value="">{t('missionCreate.noService')}</option>
                            {form.serviceId != null && !selectedService && <option
                                value={form.serviceId}>{services.isLoading ? t('missionCreate.loadingSelectedService') : t('missionCreate.serviceUnavailableOption')}</option>}{activeServices.map(service =>
                            <option key={service.id} value={service.id}>{serviceName(service)}</option>)}
                        </select>{errors.serviceId &&
                            <span className="text-sm font-normal leading-normal text-danger" id="mission-serviceId-error">{errors.serviceId}</span>}
                        </label>
                        <label className={fieldClass}><span>{t('missions.type')}<RequiredMark/></span><select id="mission-missionType" aria-required
                                                                                   className={selectClass}
                                                                                   value={form.missionType}
                                                                                   onChange={event => setMissionTypeOverride(event.target.value as MissionType)}>{missionTypes.map(type =>
                            <option key={type} value={type}>{displayLabel(type)}</option>)}</select></label>
                        <MissionFields form={form} onChange={setForm} errors={errors}/>
                        <MissionAirspaceAdvisor className="col-span-full" form={form} onChange={setForm}/>
                        <MissionWeatherAdvisor className="col-span-full" form={form} onChange={setForm}/>
                        <div className="col-span-full mt-5 flex flex-wrap justify-end gap-3"><Button type="submit"
                                                                        disabled={checking || (form.serviceId != null && services.isLoading)}>{checking ? t('missionCreate.checking') : t('missionCreate.review')}</Button>
                        </div>
                    </div>
                </fieldset>
            </form> : <>
                <MissionReviewSummaryList
                    form={form}
                    activeListing={activeListing}
                    effectiveUnits={effectiveUnits}
                    estimatedSubtotal={estimatedSubtotal}
                    effectiveOpenRfq={effectiveOpenRfq}
                    selectedService={selectedService}
                />
                <div className="mt-4 rounded-panel bg-amber-50 px-3.5 py-3 text-xs text-warning">{availability && t(`missionCreate.${{ok: 'availabilityOk', conflict: 'availabilityConflict', draft: 'availabilityDraft'}[availability]}`)}</div>
                <div className="mt-5 flex flex-wrap justify-end gap-3">
                    <Button type="button" variant="secondary" onClick={() => setStep(1)} disabled={busy}>{t('missionCreate.edit')}</Button>
                    <Button type="button" variant={canSendNow ? 'secondary' : undefined} onClick={() => void submit(false)}
                            disabled={busy}>{actions.create.isPending && !actions.submit.isPending ? t('missionCreate.saving') : t('missionCreate.saveDraft')}</Button>
                    {canSendNow && <Button type="button" onClick={() => void submit(true)}
                                           disabled={busy}>{busy ? t('missionCreate.sending') : t('missionCreate.sendNow')}</Button>}
                </div>
            </>}
        </Panel>
    </div>;
}
