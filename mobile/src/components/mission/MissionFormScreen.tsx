import React, {useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {useLocalSearchParams, useRouter} from 'expo-router';
import {AlertTriangle, ArrowLeft, ArrowRight, Clock3, Flame, Gauge, LocateFixed, Save, Send} from 'lucide-react-native';
import {AppText, Button, Card, ErrorState, LoadingState, Screen, TextField} from '@/components/ui';
import {GlassSelectField, type GlassOption} from '@/components/ui/GlassSelect';
import {MissionBookingOptionsCard} from '@/components/mission/MissionBookingOptionsCard';
import {MissionCheckoutStepper, MissionCheckoutSummaryCard, type CheckoutStep} from '@/components/mission/MissionCheckoutStepper';
import {MissionFlightPlanSection, sitePlanToInput} from '@/components/mission/MissionFlightPlanSection';
import {MissionScheduleWeatherCard} from '@/components/mission/MissionScheduleWeatherCard';
import {usePublicListingDetail} from '@/hooks/marketplace/useMarketplaceCatalog';
import {useMissionActions, useMissionDetail, useSavedFlightSites, useServices} from '@/hooks/mission/useCustomerMissions';
import {useDeviceLocation} from '@/hooks/location/useDeviceLocation';
import {usePointForecast} from '@/hooks/weather/useWeather';
import {useAuth} from '@/providers/AuthContext';
import {useI18n} from '@/providers/I18nContext';
import {useToast} from '@/providers/ToastContext';
import {
    flightPlanComplete,
    missionFieldErrors,
    missionFormError,
    missionFormFromDetail,
    missionTypeForService,
    type MissionFormErrors,
} from '@/shared/forms/mission/mission-form';
import {displayLabel} from '@/shared/lib/presentation';
import {applyFlightWindow} from '@/shared/utils/weather/flight-window';
import type {MarketplaceListing} from '@/shared/types/marketplace/marketplace.types';
import type {Mission, MissionInput, MissionPriority, SavedFlightSite} from '@/shared/types/mission/mission.types';
import {newMissionDraft, withEnd, withPoint, withStart} from '@/forms/mission/mission-draft';
import {isFinitePoint} from '@/utils/operations/map-shapes';
import {colors, spacing} from '@/styles/tokens';

function MissionForm({initial, mission, initialListing}: { initial: MissionInput; mission?: Mission; initialListing?: MarketplaceListing | null }) {
    const {t} = useI18n();
    const {can} = useAuth();
    const toast = useToast();
    const router = useRouter();
    const services = useServices();
    const flightSites = useSavedFlightSites();
    const actions = useMissionActions();
    const location = useDeviceLocation();
    const [step, setStep] = useState<CheckoutStep>(1);
    const [form, setForm] = useState<MissionInput>(initial);
    const [errors, setErrors] = useState<MissionFormErrors>({});
    const [message, setMessage] = useState<string | null>(null);
    const set = <K extends keyof MissionInput>(key: K, value: MissionInput[K]) => setForm(current => ({...current, [key]: value}));
    const busy = actions.create.isPending || actions.update.isPending || actions.submit.isPending;

    const priorityOptions: GlassOption<MissionPriority>[] = [
        {value: 'LOW', label: displayLabel('LOW'), description: t('mobile.booking.priorityDesc.LOW'), icon: Clock3},
        {value: 'NORMAL', label: displayLabel('NORMAL'), description: t('mobile.booking.priorityDesc.NORMAL'), icon: Gauge},
        {value: 'HIGH', label: displayLabel('HIGH'), description: t('mobile.booking.priorityDesc.HIGH'), icon: AlertTriangle},
        {value: 'URGENT', label: displayLabel('URGENT'), description: t('mobile.booking.priorityDesc.URGENT'), icon: Flame},
    ];

    const fail = (error: unknown) => {
        const fields = missionFieldErrors(error);
        setErrors(fields ?? {});
        setMessage(fields ? t('missionForm.checkErrors') : missionFormError(error, t));
        if (fields) {
            if (fields.title || fields.description || fields.serviceId || fields.bookingUnits) setStep(1);
            else if (fields.locationName || fields.startTime || fields.expectedEndTime || fields.requestedDate || fields.flightPlan) setStep(2);
        }
    };

    const save = async (sendNow: boolean) => {
        setErrors({});
        setMessage(null);
        try {
            if (mission) {
                await actions.update.mutateAsync({id: mission.id, data: form, expectedVersion: mission.version});
                toast.show(t('mobile.missions.saved'), 'success');
                router.back();
                return;
            }
            const created = await actions.create.mutateAsync(form);
            if (sendNow) {
                try {
                    await actions.submit.mutateAsync(created.id);
                    toast.show(t('mobile.missions.submitted'), 'success');
                } catch (submitError) {
                    toast.show(`${t('mobile.missions.submitDraftSavedWarning')} ${missionFormError(submitError, t)}`, 'error');
                }
            } else {
                toast.show(t('mobile.missions.saved'), 'success');
            }
            router.replace({pathname: '/customer/mission/[id]', params: {id: String(created.id)}});
        } catch (error) {
            fail(error);
        }
    };

    const point =
        form.latitude != null && form.longitude != null && isFinitePoint(form.latitude, form.longitude)
            ? {latitude: form.latitude, longitude: form.longitude}
            : null;
    const forecast = usePointForecast(point ? {lat: point.latitude, lng: point.longitude} : null, form.startTime, form.serviceId);
    const recommendedWindows = forecast.data?.recommendedWindows?.slice(0, 4) ?? [];
    const savedSites = flightSites.data ?? [];

    const applyFlightSite = (site: SavedFlightSite) => {
        setForm(current => ({
            ...current,
            locationName: site.locationName || current.locationName,
            latitude: site.latitude ?? current.latitude,
            longitude: site.longitude ?? current.longitude,
            missionType: site.defaultMissionType || current.missionType,
            notes: site.notes ?? current.notes,
            flightPlan: sitePlanToInput(site.flightPlan) ?? current.flightPlan,
        }));
        toast.show(t('capabilities.flightSites.appliedToast', {name: site.name}), 'info');
    };

    const handleSaveSite = async (rawName: string, hasGeometry: boolean): Promise<boolean> => {
        const hasCompletePlan = Boolean(form.flightPlan && flightPlanComplete(form.flightPlan));
        if (!hasGeometry && !hasCompletePlan) {
            toast.show(t('capabilities.flightSites.missingCoords'), 'error');
            return false;
        }
        const trimmedName = rawName.trim().slice(0, 120);
        if (!trimmedName) return false;
        try {
            const created = await actions.createFlightSite.mutateAsync({
                name: trimmedName,
                locationName: (form.locationName.trim() || trimmedName).slice(0, 255),
                latitude: form.latitude ?? null,
                longitude: form.longitude ?? null,
                defaultMissionType: form.missionType,
                flightPlan: hasCompletePlan ? (form.flightPlan ?? null) : null,
                notes: form.notes?.trim() ? form.notes.trim().slice(0, 1000) : null,
            });
            toast.show(t('capabilities.flightSites.savedToast', {name: created.name}), 'success');
            return true;
        } catch (error) {
            toast.show(missionFormError(error, t), 'error');
            return false;
        }
    };

    const handleDeleteSite = (site: SavedFlightSite) => {
        actions.deleteFlightSite.mutate(site.id, {
            onSuccess: () => toast.show(t('capabilities.flightSites.deletedToast'), 'info'),
            onError: error => toast.show(missionFormError(error, t), 'error'),
        });
    };

    const handleLocateCurrent = async () => {
        const found = await location.locate();
        if (found) {
            setForm(current => withPoint(current, found.lat, found.lng));
            toast.show(t('mobile.shop.gpsAppliedToast'), 'info');
        } else {
            toast.show(t('weather.workspace.locateDenied'), 'error');
        }
    };

    return (
        <Screen>
            <MissionCheckoutStepper step={step} onSelectStep={setStep}/>

            {step === 1 && (
                <>
                    <MissionBookingOptionsCard
                        form={form}
                        errors={errors}
                        services={services.data ?? []}
                        servicesLoading={services.isPending}
                        initialListing={initialListing}
                        isEditing={Boolean(mission)}
                        onChange={setForm}
                    />
                    <Card>
                        <TextField label={t('missionForm.title')} required value={form.title} onChangeText={value => set('title', value)} maxLength={180} error={errors.title}/>
                        <TextField label={t('missionForm.description')} optional value={form.description ?? ''} onChangeText={value => set('description', value)} multiline
                                   maxLength={2000} error={errors.description}/>
                    </Card>
                </>
            )}

            {step === 2 && (
                <>
                    <Button tone="secondary" icon={LocateFixed} loading={location.locating} label={t('mobile.shop.useMyGpsBtn')} onPress={() => void handleLocateCurrent()}/>
                    <MissionFlightPlanSection
                        form={form}
                        errors={errors}
                        savedSites={savedSites}
                        creatingSite={actions.createFlightSite.isPending}
                        locating={location.locating}
                        defaultCenter={{latitude: location.point.lat, longitude: location.point.lng}}
                        onChangeLocationName={value => set('locationName', value)}
                        onSelectPoint={(latitude, longitude) => setForm(current => withPoint(current, latitude, longitude))}
                        onLocateCurrent={handleLocateCurrent}
                        onApplySite={applyFlightSite}
                        onSaveSite={handleSaveSite}
                        onDeleteSite={handleDeleteSite}
                    />
                    <MissionScheduleWeatherCard
                        startTime={form.startTime}
                        expectedEndTime={form.expectedEndTime}
                        startError={errors.startTime ?? errors.requestedDate}
                        endError={errors.expectedEndTime}
                        recommendedWindows={recommendedWindows}
                        onChangeStart={date => setForm(current => withStart(current, date))}
                        onChangeEnd={date => setForm(current => withEnd(current, date))}
                        onSelectWindow={iso => {
                            setForm(current => applyFlightWindow(current, iso));
                            toast.show(t('mobile.missions.windowApplied'), 'info');
                        }}
                    />
                </>
            )}

            {step === 3 && (
                <>
                    <MissionCheckoutSummaryCard form={form} listing={initialListing}/>
                    <Card>
                        <GlassSelectField<MissionPriority>
                            label={t('missionForm.priority')} required
                            sheetTitle={t('missionForm.priority')}
                            value={form.priority ?? 'NORMAL'}
                            options={priorityOptions}
                            onChange={value => set('priority', value)}
                        />
                        <TextField label={t('missionForm.notes')} optional value={form.notes ?? ''} onChangeText={value => set('notes', value)} multiline maxLength={2000}
                                   error={errors.notes}/>
                    </Card>
                </>
            )}

            {message ? <AppText variant="small" style={styles.error}>{message}</AppText> : null}

            {step < 3 ? (
                <View style={styles.navRow}>
                    {step > 1 && <Button tone="secondary" icon={ArrowLeft} label={t('mobile.shop.prevStepBtn')} onPress={() => setStep(1)} style={styles.flex}/>}
                    <Button icon={ArrowRight} label={t('mobile.shop.nextStepBtn')} onPress={() => setStep(prev => (prev === 1 ? 2 : 3))} style={styles.flex}/>
                </View>
            ) : mission ? (
                <View style={styles.actions}>
                    <Button label={t('common.save')} icon={Save} loading={busy} onPress={() => void save(false)}/>
                    <Button tone="secondary" icon={ArrowLeft} label={t('mobile.shop.prevStepBtn')} disabled={busy} onPress={() => setStep(2)}/>
                </View>
            ) : (
                <View style={styles.actions}>
                    {can('MISSION_UPDATE') && <Button label={t('mobile.shop.confirmCheckoutBtn')} icon={Send} loading={busy} onPress={() => void save(true)}/>}
                    <View style={styles.navRow}>
                        <Button tone="secondary" icon={ArrowLeft} label={t('mobile.shop.prevStepBtn')} disabled={busy} onPress={() => setStep(2)} style={styles.flex}/>
                        <Button label={t('mobile.missions.saveDraft')} icon={Save} tone="secondary" disabled={busy} onPress={() => void save(false)} style={styles.flex}/>
                    </View>
                </View>
            )}
        </Screen>
    );
}

export function MissionCreateScreen() {
    const {serviceId, listingSlug, units, rfq} = useLocalSearchParams<{ serviceId?: string; listingSlug?: string; units?: string; rfq?: string }>();
    const services = useServices();
    const listingDetail = usePublicListingDetail(listingSlug);
    const id = serviceId ? Number(serviceId) : undefined;
    const service = services.data?.find(item => item.id === id);

    if ((id && services.isPending) || (listingSlug && listingDetail.isPending)) {
        return <Screen><LoadingState/></Screen>;
    }

    const listing = listingDetail.data?.listing ?? null;
    const draft = newMissionDraft(new Date(), listing?.categoryServiceId ?? service?.id, service?.defaultDurationMinutes);
    const parsedUnits = units ? Number(units) : undefined;
    const minUnits = Number(listing?.minBookingUnits || 1);

    const seeded: MissionInput = listing
        ? {
              ...draft,
              title: listing.title,
              missionType: listing.missionType,
              listingId: listing.id,
              bookingUnits: parsedUnits && Number.isFinite(parsedUnits) ? Math.max(parsedUnits, minUnits) : minUnits,
          }
        : rfq === '1' || rfq === 'true'
          ? {
                ...draft,
                openRfq: true,
                missionType: service ? missionTypeForService(service.code, draft.missionType) : draft.missionType,
            }
          : service
            ? {...draft, missionType: missionTypeForService(service.code, draft.missionType)}
            : draft;

    return <MissionForm initial={seeded} initialListing={listing}/>;
}

export function MissionEditScreen() {
    const {t} = useI18n();
    const {id} = useLocalSearchParams<{ id: string }>();
    const {detail} = useMissionDetail(Number(id));
    if (detail.isPending) return <Screen><LoadingState label={t('missionDetail.loading')}/></Screen>;
    if (!detail.data) return <Screen><ErrorState message={t('missionDetail.loadError')} retryLabel={t('common.retry')} onRetry={() => void detail.refetch()}/></Screen>;
    return <MissionForm initial={missionFormFromDetail(detail.data)} mission={detail.data}/>;
}

const styles = StyleSheet.create({
    flex: {flex: 1},
    error: {color: colors.danger},
    navRow: {flexDirection: 'row', gap: spacing.sm},
    actions: {gap: spacing.sm},
});
