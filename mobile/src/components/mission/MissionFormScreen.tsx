import React, {useState} from 'react';
import {Platform, Pressable, StyleSheet, View} from 'react-native';
import {useLocalSearchParams, useRouter} from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import {CloudSun, Save, Send} from 'lucide-react-native';
import {AppText, Button, Card, ChipGroup, ErrorState, LoadingState, ScaledText, Screen, SectionTitle, TextField} from '@/components/ui';
import {MissionFlightPlanSection, sitePlanToInput} from '@/components/mission/MissionFlightPlanSection';
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
    missionTypes,
    type MissionFormErrors,
} from '@/shared/forms/mission/mission-form';
import {displayLabel, serviceName} from '@/shared/lib/presentation';
import {applyFlightWindow} from '@/shared/utils/weather/flight-window';
import type {Mission, MissionInput, MissionPriority, SavedFlightSite} from '@/shared/types/mission/mission.types';
import {fromLocalIso, newMissionDraft, withEnd, withPoint, withStart} from '@/forms/mission/mission-draft';
import {isFinitePoint} from '@/utils/operations/map-shapes';
import {colors, font, radius, spacing} from '@/styles/tokens';

const PRIORITIES: MissionPriority[] = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];

function DateField({label, value, onChange, error}: { label: string; value: string; onChange: (date: Date) => void; error?: string }) {
    const date = fromLocalIso(value) ?? new Date();
    return (
        <View style={styles.dateRow}>
            <AppText variant="small" style={styles.dateLabel}>{label}</AppText>
            {/* iOS shows a compact button that opens the native calendar and clock. */}
            <DateTimePicker value={date} mode="datetime" display={Platform.OS === 'ios' ? 'compact' : 'default'} minuteInterval={5}
                            accentColor={colors.primary} onChange={(_event, next) => next && onChange(next)}/>
            {error ? <AppText variant="caption" style={styles.error}>{error}</AppText> : null}
        </View>
    );
}

/** Shared by create and edit; the backend validates every field and answers per field. */
function MissionForm({initial, mission}: { initial: MissionInput; mission?: Mission }) {
    const {t, formatDate} = useI18n();
    const {can} = useAuth();
    const toast = useToast();
    const router = useRouter();
    const services = useServices();
    const flightSites = useSavedFlightSites();
    const actions = useMissionActions();
    const location = useDeviceLocation();
    const [form, setForm] = useState<MissionInput>(initial);
    const [errors, setErrors] = useState<MissionFormErrors>({});
    const [message, setMessage] = useState<string | null>(null);
    const set = <K extends keyof MissionInput>(key: K, value: MissionInput[K]) => setForm(current => ({...current, [key]: value}));
    const busy = actions.create.isPending || actions.update.isPending || actions.submit.isPending;

    const fail = (error: unknown) => {
        const fields = missionFieldErrors(error);
        setErrors(fields ?? {});
        setMessage(fields ? t('missionForm.checkErrors') : missionFormError(error, t));
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

    const chooseService = (value: string) => {
        const service = services.data?.find(item => String(item.id) === value);
        setForm(current => ({...current, serviceId: service?.id, missionType: missionTypeForService(service?.code, current.missionType)}));
    };

    const point =
        form.latitude != null && form.longitude != null && isFinitePoint(form.latitude, form.longitude)
            ? {latitude: form.latitude, longitude: form.longitude}
            : null;

    const forecast = usePointForecast(
        point ? {lat: point.latitude, lng: point.longitude} : null,
        form.startTime,
        form.serviceId,
    );
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
        if (found) setForm(current => withPoint(current, found.lat, found.lng));
        else toast.show(t('weather.workspace.locateDenied'), 'error');
    };

    return (
        <Screen>
            <Card>
                <SectionTitle title={t('missionCreate.serviceOptional')}/>
                {services.isPending ? <LoadingState/> : (
                    <ChipGroup value={form.serviceId != null ? String(form.serviceId) : ''} onChange={chooseService}
                               options={[{value: '', label: t('missionCreate.noService')},
                                   ...(services.data ?? []).filter(service => service.active).map(service => ({value: String(service.id), label: serviceName(service)}))]}/>
                )}
                <AppText variant="small" style={styles.label}>{t('missions.type')}</AppText>
                <ChipGroup value={form.missionType} onChange={value => set('missionType', value)}
                           options={missionTypes.map(type => ({value: type, label: displayLabel(type)}))}/>
                {errors.missionType ? <AppText variant="caption" style={styles.error}>{errors.missionType}</AppText> : null}
            </Card>

            <Card>
                <TextField label={t('missionForm.title')} value={form.title} onChangeText={value => set('title', value)} maxLength={180} error={errors.title}/>
                <TextField label={t('missionForm.description')} value={form.description ?? ''} onChangeText={value => set('description', value)} multiline
                           maxLength={2000} error={errors.description}/>
            </Card>

            <Card>
                <DateField label={t('missionForm.start')} value={form.startTime} onChange={date => setForm(current => withStart(current, date))}
                           error={errors.startTime ?? errors.requestedDate}/>
                <DateField label={t('missionForm.expectedEnd')} value={form.expectedEndTime} onChange={date => setForm(current => withEnd(current, date))}
                           error={errors.expectedEndTime}/>
                <AppText variant="caption">{t('missionForm.timeHint')}</AppText>

                {recommendedWindows.length > 0 && (
                    <View style={styles.windowsSection}>
                        <View style={styles.windowsHeader}>
                            <CloudSun size={15} color={colors.slateDark}/>
                            <AppText variant="small" style={styles.dateLabel}>{t('mobile.missions.safeWindowsTitle')}</AppText>
                        </View>
                        <View style={styles.windowsRow}>
                            {recommendedWindows.map(win => {
                                const selected = form.startTime.slice(0, 16) === win.startTime.slice(0, 16);
                                return (
                                    <Pressable
                                        key={win.startTime}
                                        accessibilityRole="button"
                                        accessibilityState={{selected}}
                                        onPress={() => {
                                            setForm(current => applyFlightWindow(current, win.startTime));
                                            toast.show(t('mobile.missions.windowApplied'), 'info');
                                        }}
                                        style={({pressed}) => [styles.windowChip, selected && styles.windowChipActive, pressed && styles.pressed]}>
                                        <ScaledText style={[styles.windowChipText, selected && styles.windowChipTextActive]}>
                                            {formatDate(win.startTime, {dateStyle: 'short', timeStyle: 'short'})} · {win.safetyScore}%
                                        </ScaledText>
                                    </Pressable>
                                );
                            })}
                        </View>
                    </View>
                )}
            </Card>

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

            <Card>
                <AppText variant="small" style={styles.label}>{t('missionForm.priority')}</AppText>
                <ChipGroup value={form.priority ?? 'NORMAL'} onChange={value => set('priority', value)}
                           options={PRIORITIES.map(priority => ({value: priority, label: displayLabel(priority)}))}/>
                <TextField label={t('missionForm.notes')} value={form.notes ?? ''} onChangeText={value => set('notes', value)} multiline maxLength={2000}
                           error={errors.notes}/>
            </Card>

            {message ? <AppText variant="small" style={styles.error}>{message}</AppText> : null}
            {mission ? <Button label={t('common.save')} icon={Save} loading={busy} onPress={() => void save(false)}/> : (
                <View style={styles.actions}>
                    {can('MISSION_UPDATE') && <Button label={t('missionDetail.submit')} icon={Send} loading={busy} onPress={() => void save(true)}/>}
                    <Button label={t('mobile.missions.saveDraft')} icon={Save} tone="secondary" disabled={busy} onPress={() => void save(false)}/>
                </View>
            )}
        </Screen>
    );
}

export function MissionCreateScreen() {
    const {serviceId} = useLocalSearchParams<{ serviceId?: string }>();
    const services = useServices();
    const id = serviceId ? Number(serviceId) : undefined;
    const service = services.data?.find(item => item.id === id);
    // Wait for the catalogue when a service was chosen, so its duration and type seed the draft.
    if (id && services.isPending) return <Screen><LoadingState/></Screen>;
    const draft = newMissionDraft(new Date(), service?.id, service?.defaultDurationMinutes);
    return <MissionForm initial={service ? {...draft, missionType: missionTypeForService(service.code, draft.missionType)} : draft}/>;
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
    label: {fontWeight: '600', color: colors.text, marginTop: spacing.xs},
    error: {color: colors.danger},
    dateRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: spacing.sm},
    dateLabel: {fontWeight: '600', color: colors.text},
    windowsSection: {gap: spacing.xs, paddingTop: spacing.xs, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border},
    windowsHeader: {flexDirection: 'row', alignItems: 'center', gap: spacing.xs},
    windowsRow: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs},
    windowChip: {borderRadius: radius.control, borderWidth: 1, borderColor: colors.inputBorder, backgroundColor: colors.surface, paddingHorizontal: spacing.md, paddingVertical: spacing.xs},
    windowChipActive: {backgroundColor: colors.slateDark, borderColor: colors.slateDark},
    windowChipText: {fontSize: font.caption, fontWeight: '600', color: colors.text},
    windowChipTextActive: {color: colors.white},
    pressed: {opacity: 0.75},
    actions: {gap: spacing.sm},
});
