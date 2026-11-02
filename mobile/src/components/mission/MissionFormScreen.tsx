import React, {useState} from 'react';
import {Platform, StyleSheet, View} from 'react-native';
import {useLocalSearchParams, useRouter} from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import MapView, {Marker, type MapPressEvent} from 'react-native-maps';
import {LocateFixed, Save, Send} from 'lucide-react-native';
import {AppText, Button, Card, ChipGroup, ErrorState, LoadingState, Screen, SectionTitle, TextField} from '@/components/ui';
import {useMissionActions, useMissionDetail, useServices} from '@/hooks/mission/useCustomerMissions';
import {useDeviceLocation} from '@/hooks/location/useDeviceLocation';
import {useAuth} from '@/providers/AuthContext';
import {useI18n} from '@/providers/I18nContext';
import {useToast} from '@/providers/ToastContext';
import {missionFieldErrors, missionFormError, missionFormFromDetail, missionTypeForService, missionTypes, type MissionFormErrors} from '@/shared/forms/mission/mission-form';
import {displayLabel, serviceName} from '@/shared/lib/presentation';
import type {Mission, MissionInput, MissionPriority} from '@/shared/types/mission/mission.types';
import {fromLocalIso, newMissionDraft, withEnd, withPoint, withStart} from '@/forms/mission/mission-draft';
import {colors, radius, spacing} from '@/styles/tokens';

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
    const {t} = useI18n();
    const {can} = useAuth();
    const toast = useToast();
    const router = useRouter();
    const services = useServices();
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
            // A failed send still leaves a saved draft; the detail screen offers "send" again.
            if (sendNow) await actions.submit.mutateAsync(created.id).catch(() => undefined);
            toast.show(sendNow ? t('mobile.missions.submitted') : t('mobile.missions.saved'), 'success');
            router.replace({pathname: '/customer/mission/[id]', params: {id: String(created.id)}});
        } catch (error) {
            fail(error);
        }
    };

    const chooseService = (value: string) => {
        const service = services.data?.find(item => String(item.id) === value);
        setForm(current => ({...current, serviceId: service?.id, missionType: missionTypeForService(service?.code, current.missionType)}));
    };

    const point = form.latitude != null && form.longitude != null ? {latitude: form.latitude, longitude: form.longitude} : null;
    const center = point ?? {latitude: location.point.lat, longitude: location.point.lng};

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
            </Card>

            <Card>
                <TextField label={t('missionForm.location')} value={form.locationName} onChangeText={value => set('locationName', value)} maxLength={255}
                           error={errors.locationName}/>
                <AppText variant="caption">{t('mobile.missions.tapMap')}</AppText>
                <View style={styles.map}>
                    <MapView style={StyleSheet.absoluteFill}
                             region={{...center, latitudeDelta: point ? 0.02 : 0.08, longitudeDelta: point ? 0.02 : 0.08}}
                             onPress={(event: MapPressEvent) => setForm(current => withPoint(current, event.nativeEvent.coordinate.latitude, event.nativeEvent.coordinate.longitude))}>
                        {point && <Marker coordinate={point} pinColor={colors.primary}/>}
                    </MapView>
                </View>
                <Button label={t('weather.workspace.myLocation')} icon={LocateFixed} tone="secondary" loading={location.locating}
                        onPress={async () => {
                            const found = await location.locate();
                            if (found) setForm(current => withPoint(current, found.lat, found.lng));
                            else toast.show(t('weather.workspace.locateDenied'), 'error');
                        }}/>
                {errors.latitude || errors.longitude ? <AppText variant="caption" style={styles.error}>{errors.latitude ?? errors.longitude}</AppText> : null}
            </Card>

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
    map: {height: 200, borderRadius: radius.control, overflow: 'hidden'},
    actions: {gap: spacing.sm},
});
