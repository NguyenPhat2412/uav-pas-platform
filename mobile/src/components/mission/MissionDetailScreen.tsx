import React, {useState} from 'react';
import {Alert, Linking, Platform, Pressable, StyleSheet, View} from 'react-native';
import {useLocalSearchParams, useRouter} from 'expo-router';
import MapView, {Marker} from 'react-native-maps';
import * as ImagePicker from 'expo-image-picker';
import * as WebBrowser from 'expo-web-browser';
import {Camera, CalendarClock, CheckCircle2, CheckSquare, Copy, Download, FileText, ImagePlus, MapPin, Pencil, Send, ShieldAlert, Square, Star, XCircle} from 'lucide-react-native';
import {AppText, Badge, Button, Card, EmptyState, ErrorState, LoadingState, Screen, SectionTitle, TextField} from '@/components/ui';
import {MissionStatusBadge} from '@/components/mission/MissionBits';
import {MissionPermitCard} from '@/components/mission/MissionPermitCard';
import {Verdict} from '@/components/weather/WeatherCard';
import {useMissionAirspaceCheck} from '@/hooks/airspace/useAirspace';
import {useMissionActions, useMissionDetail, useMissionReview} from '@/hooks/mission/useCustomerMissions';
import {useMediaDownload, useMissionUpload} from '@/hooks/media/useMissionUpload';
import {useMissionWeather} from '@/hooks/weather/useWeather';
import {useAuth} from '@/providers/AuthContext';
import {useI18n} from '@/providers/I18nContext';
import {useToast} from '@/providers/ToastContext';
import {canEditMission, missionFormError} from '@/shared/forms/mission/mission-form';
import {eventNote, eventTitle, missionHint, terminalStatuses} from '@/shared/lib/presentation';
import {formatFileSize} from '@/shared/lib/format';
import type {Mission} from '@/shared/types/mission/mission.types';
import {canCancel, progressStep} from '@/utils/mission/status';
import {isFinitePoint} from '@/utils/operations/map-shapes';
import {colors, radius, spacing} from '@/styles/tokens';

const STEPS = ['draft', 'pending', 'confirmed', 'completed'] as const;

function Progress({mission}: { mission: Mission }) {
    const {t} = useI18n();
    const step = progressStep(mission.status);
    if (step < 0) return null;
    return (
        <View style={styles.steps} accessibilityLabel={t('progress.label')}>
            {STEPS.map((key, index) => {
                const done = index <= step;
                const label = index === 2 && mission.status === 'IN_PROGRESS' ? t('progress.inProgress') : t(`progress.${key}`);
                return (
                    <View key={key} style={styles.step}>
                        <View style={[styles.stepBar, done && styles.stepBarDone]}/>
                        <AppText variant="caption" style={done ? styles.stepDone : undefined} numberOfLines={1}>{label}</AppText>
                    </View>
                );
            })}
        </View>
    );
}

function SiteWeather({mission}: { mission: Mission }) {
    const {t} = useI18n();
    const weather = useMissionWeather(mission.id, mission.latitude != null && mission.longitude != null);
    if (mission.latitude == null || mission.longitude == null) return null;
    return (
        <Card>
            <SectionTitle title={t('weather.preflight.title')}/>
            {weather.isPending ? <LoadingState/>
                : weather.data ? (
                    <View style={styles.weather}>
                        <Verdict clearance={weather.data.clearance}/>
                        <AppText variant="small">{t('weather.preflight.score', {score: weather.data.safetyScore})}</AppText>
                        {weather.data.reasonCodes.map(code => (
                            <AppText key={code} variant="small">• {t(`weather.preflight.reasons.${code}`)}</AppText>
                        ))}
                    </View>
                ) : <AppText variant="small">{t('weather.preflight.loadError')}</AppText>}
        </Card>
    );
}

function StarRow({
    label,
    value,
    disabled,
    onChange,
}: {
    label: string;
    value: number;
    disabled?: boolean;
    onChange: (next: number) => void;
}) {
    return (
        <View style={styles.starGroup}>
            <AppText variant="small" style={styles.stepDone}>{label}</AppText>
            <View style={styles.starRow}>
                {[1, 2, 3, 4, 5].map(score => {
                    const active = score <= value;
                    return (
                        <Pressable
                            key={score}
                            disabled={disabled}
                            accessibilityRole="button"
                            accessibilityLabel={`${label} ${score}/5`}
                            onPress={() => onChange(score)}
                            style={({pressed}) => [styles.starBtn, pressed && styles.pressed]}>
                            <Star
                                size={18}
                                color={active ? colors.warning : colors.inputBorder}
                                fill={active ? colors.warning : 'transparent'}
                            />
                        </Pressable>
                    );
                })}
                <AppText variant="small" style={styles.stepDone}>{value}/5</AppText>
            </View>
        </View>
    );
}

function CustomerHandoverReviewCard({missionId}: { missionId: number }) {
    const {t} = useI18n();
    const toast = useToast();
    const query = useMissionReview(missionId, true);
    const actions = useMissionActions();
    const review = query.data;

    const [overrides, setOverrides] = useState<{
        overall?: number;
        dataQuality?: number;
        timeliness?: number;
        accepted?: boolean;
        comment?: string;
    }>({});

    const overall = overrides.overall ?? (review?.reviewed ? (review.overallRating ?? 5) : 5);
    const dataQuality =
        overrides.dataQuality ?? (review?.reviewed ? (review.dataQualityRating ?? review.overallRating ?? 5) : 5);
    const timeliness =
        overrides.timeliness ?? (review?.reviewed ? (review.timelinessRating ?? review.overallRating ?? 5) : 5);
    const accepted = overrides.accepted ?? (review?.reviewed ? review.deliverablesAccepted : true);
    const comment = overrides.comment ?? (review?.reviewed ? (review.comment ?? '') : '');
    const AcceptIcon = accepted ? CheckSquare : Square;

    const saveReview = () => {
        actions.upsertReview.mutate(
            {
                id: missionId,
                data: {
                    overallRating: overall,
                    dataQualityRating: dataQuality,
                    timelinessRating: timeliness,
                    deliverablesAccepted: accepted,
                    comment: comment.trim() || undefined,
                },
            },
            {
                onSuccess: () => toast.show(t('capabilities.review.savedToast'), 'success'),
                onError: error => toast.show(missionFormError(error, t), 'error'),
            },
        );
    };

    return (
        <Card>
            <SectionTitle
                title={t('capabilities.review.title')}
                action={
                    <Badge
                        icon={review?.reviewed && review.deliverablesAccepted ? CheckCircle2 : undefined}
                        label={
                            review?.reviewed && review.deliverablesAccepted
                                ? t('capabilities.review.acceptedBadge')
                                : t('capabilities.review.pendingBadge')
                        }
                        background={
                            review?.reviewed && review.deliverablesAccepted ? colors.slateLight : colors.warningLight
                        }
                        color={review?.reviewed && review.deliverablesAccepted ? colors.slateDark : colors.warning}
                    />
                }
            />
            <AppText variant="caption">{t('capabilities.review.subtitle')}</AppText>

            <StarRow
                label={t('capabilities.review.overallRating')}
                value={overall}
                disabled={actions.upsertReview.isPending}
                onChange={val => setOverrides(prev => ({...prev, overall: val}))}
            />
            <StarRow
                label={t('capabilities.review.dataQuality')}
                value={dataQuality}
                disabled={actions.upsertReview.isPending}
                onChange={val => setOverrides(prev => ({...prev, dataQuality: val}))}
            />
            <StarRow
                label={t('capabilities.review.timeliness')}
                value={timeliness}
                disabled={actions.upsertReview.isPending}
                onChange={val => setOverrides(prev => ({...prev, timeliness: val}))}
            />

            <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{checked: accepted}}
                onPress={() => setOverrides(prev => ({...prev, accepted: !accepted}))}
                style={({pressed}) => [styles.acceptRow, pressed && styles.pressed]}>
                <AcceptIcon size={20} color={accepted ? colors.primary : colors.slate}/>
                <AppText variant="small" style={styles.flex}>{t('capabilities.review.acceptDeliverables')}</AppText>
            </Pressable>

            <TextField
                label={t('capabilities.review.commentLabel')}
                placeholder={t('capabilities.review.commentPlaceholder')}
                value={comment}
                onChangeText={val => setOverrides(prev => ({...prev, comment: val}))}
                multiline
                maxLength={1500}
            />

            <Button
                label={review?.reviewed ? t('capabilities.review.update') : t('capabilities.review.submit')}
                icon={CheckCircle2}
                loading={actions.upsertReview.isPending}
                onPress={saveReview}
            />
        </Card>
    );
}

export function MissionDetailScreen() {
    const {t, formatDate, formatNumber} = useI18n();
    const {user, can} = useAuth();
    const toast = useToast();
    const router = useRouter();
    const {id} = useLocalSearchParams<{ id: string }>();
    const missionId = Number(id);
    const {detail, timeline, media} = useMissionDetail(missionId);
    const actions = useMissionActions();
    const upload = useMissionUpload(missionId);
    const download = useMediaDownload();
    const mission = detail.data;
    const airspace = useMissionAirspaceCheck(mission);

    if (detail.isPending) return <Screen><LoadingState label={t('missionDetail.loading')}/></Screen>;
    if (detail.isError || !mission) {
        return (
            <Screen>
                <ErrorState message={t('missionDetail.loadError')} retryLabel={t('common.retry')} onRetry={() => void detail.refetch()}/>
            </Screen>
        );
    }

    const owned = mission.customerId === user?.id;
    const editable = canEditMission(mission, user?.id, can('MISSION_UPDATE'));
    const cancellable = owned && canCancel(mission.status) && can('MISSION_CANCEL');
    const finished = terminalStatuses.includes(mission.status);
    const canUpload = owned && !finished && can('MISSION_MEDIA_UPLOAD');
    const hasPoint = isFinitePoint(mission.latitude, mission.longitude);
    const showPermitCard =
        (mission.permit != null && mission.permit.status !== 'NOT_REQUIRED') ||
        !!mission.flightPlan?.permitSupport ||
        !!airspace.data?.requiresPermit;

    const fail = (error: unknown) => toast.show(missionFormError(error, t), 'error');
    const submit = () => actions.submit.mutate(mission.id, {onSuccess: () => toast.show(t('mobile.missions.submitted'), 'success'), onError: fail});
    const cancel = () => Alert.alert(t('missionDetail.cancelQuestion'), t('missionDetail.cancelWarning'), [
        {text: t('missionDetail.keepRequest'), style: 'cancel'},
        {text: t('missionDetail.confirmCancel'), style: 'destructive', onPress: () => actions.cancel.mutate(mission.id, {onError: fail})},
    ]);

    const pick = async (source: 'camera' | 'library', role: 'INPUT' | 'DOCUMENT' = 'INPUT', onUploaded?: (mediaId: number) => void) => {
        const permission = source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
            toast.show(t('mobile.files.permissionDenied'), 'error');
            return;
        }
        const options: ImagePicker.ImagePickerOptions = {mediaTypes: ['images'], quality: 0.85};
        const result = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
        const asset = result.canceled ? null : result.assets[0];
        if (!asset) return;
        const contentType = asset.mimeType ?? 'image/jpeg';
        upload.mutate({
            file: {
                uri: asset.uri,
                name: asset.fileName ?? `${mission.code}-${Date.now()}.${contentType.split('/')[1] ?? 'jpg'}`,
                contentType,
                size: asset.fileSize ?? 0,
            },
            mediaRole: role,
        }, {
            onSuccess: created => {
                onUploaded?.(created.media.id);
                toast.show(t('mobile.files.uploaded'), 'success');
            },
            onError: error => toast.show(error instanceof Error ? error.message : t('mobile.files.uploadFailed'), 'error'),
        });
    };

    const open = (mediaId: number) => download.mutate(mediaId, {
        onSuccess: signed => void WebBrowser.openBrowserAsync(signed.url),
        onError: () => toast.show(t('missionDetail.downloadError'), 'error'),
    });

    const openMaps = () => {
        const label = encodeURIComponent(mission.locationName || mission.code);
        const url = Platform.OS === 'ios'
            ? `maps:?q=${label}&ll=${mission.latitude},${mission.longitude}`
            : `geo:${mission.latitude},${mission.longitude}?q=${mission.latitude},${mission.longitude}(${label})`;
        void Linking.openURL(url);
    };

    return (
        <Screen onRefresh={() => void Promise.all([detail.refetch(), timeline.refetch(), media.refetch(), airspace.refetch()])} refreshing={detail.isRefetching}>
            <Card>
                <View style={styles.row}>
                    <AppText variant="caption" style={styles.code}>{mission.code}</AppText>
                    <MissionStatusBadge status={mission.status}/>
                </View>
                <AppText variant="heading">{mission.title}</AppText>
                <Progress mission={mission}/>
                <AppText variant="small">{missionHint(mission.status)}</AppText>
            </Card>

            {(editable || cancellable || (owned && can('MISSION_CREATE'))) && (
                <View style={styles.actions}>
                    {editable && <Button label={t('missionDetail.submit')} icon={Send} loading={actions.submit.isPending} onPress={submit} style={styles.flex}/>}
                    {editable && <Button label={t('mobile.missions.edit')} icon={Pencil} tone="secondary"
                                         onPress={() => router.push({pathname: '/customer/mission/[id]/edit', params: {id: String(mission.id)}})} style={styles.flex}/>}
                    {owned && can('MISSION_CREATE') && (
                        <Button
                            label={actions.clone.isPending ? t('capabilities.clone.cloning') : t('capabilities.clone.action')}
                            icon={Copy}
                            tone="secondary"
                            loading={actions.clone.isPending}
                            onPress={() =>
                                actions.clone.mutate(mission.id, {
                                    onSuccess: cloned => {
                                        toast.show(t('capabilities.clone.successToast', {code: cloned.code}), 'success');
                                        router.push({pathname: '/customer/mission/[id]', params: {id: String(cloned.id)}});
                                    },
                                    onError: fail,
                                })
                            }
                            style={styles.flex}
                        />
                    )}
                    {cancellable && <Button label={t('missionDetail.cancelRequest')} icon={XCircle} tone="ghost" loading={actions.cancel.isPending} onPress={cancel}/>}
                </View>
            )}

            <Card>
                <View style={styles.meta}>
                    <CalendarClock size={16} color={colors.muted}/>
                    <View style={styles.flex}>
                        <AppText variant="caption">{t('missionDetail.plannedStart')}</AppText>
                        <AppText>{formatDate(mission.startTime)} → {formatDate(mission.expectedEndTime, {timeStyle: 'short'})}</AppText>
                    </View>
                </View>
                <View style={styles.meta}>
                    <MapPin size={16} color={colors.muted}/>
                    <View style={styles.flex}>
                        <AppText variant="caption">{t('missionForm.location')}</AppText>
                        <AppText>{mission.locationName || '—'}</AppText>
                    </View>
                </View>
                {hasPoint && (
                    <Pressable onPress={openMaps} accessibilityRole="button" accessibilityLabel={t('mobile.missions.openMaps')} style={styles.map}>
                        <MapView style={StyleSheet.absoluteFill} pointerEvents="none" scrollEnabled={false} zoomEnabled={false}
                                 initialRegion={{latitude: mission.latitude!, longitude: mission.longitude!, latitudeDelta: 0.02, longitudeDelta: 0.02}}>
                            <Marker coordinate={{latitude: mission.latitude!, longitude: mission.longitude!}} pinColor={colors.primary}/>
                        </MapView>
                    </Pressable>
                )}
                {mission.description ? <AppText variant="small">{mission.description}</AppText> : null}
            </Card>

            {airspace.data && airspace.data.violations.length > 0 && (
                <Card>
                    <SectionTitle
                        title={t('mobile.airspace.title')}
                        action={
                            <Badge
                                icon={ShieldAlert}
                                label={
                                    airspace.data.blocked
                                        ? t('mobile.airspace.clearance.BLOCKED')
                                        : airspace.data.requiresPermit
                                          ? t('mobile.airspace.clearance.PERMIT_REQUIRED')
                                          : t('mobile.airspace.clearance.CAUTION')
                                }
                                background={airspace.data.blocked ? colors.dangerLight : colors.warningLight}
                                color={airspace.data.blocked ? colors.danger : colors.warning}
                            />
                        }
                    />
                    {airspace.data.violations.map(violation => (
                        <AppText key={violation.zoneId} variant="small">
                            • {violation.code} ({violation.name}): {violation.message}
                        </AppText>
                    ))}
                </Card>
            )}

            {showPermitCard && (
                <MissionPermitCard
                    mission={mission}
                    mediaItems={media.data}
                    onOpenScan={open}
                    uploadScanLoading={upload.isPending}
                    onUploadScan={canUpload ? onUploaded => void pick('library', 'DOCUMENT', onUploaded) : undefined}
                    upsertLoading={actions.upsertPermit.isPending}
                    onUpsert={(data, onDone) =>
                        actions.upsertPermit.mutate(
                            {id: mission.id, data},
                            {
                                onSuccess: () => {
                                    onDone();
                                    toast.show(t('mobile.permit.savedToast'), 'success');
                                },
                                onError: fail,
                            },
                        )
                    }
                />
            )}

            {!finished && <SiteWeather mission={mission}/>}

            {owned && mission.status === 'COMPLETED' && (
                <CustomerHandoverReviewCard key={mission.id} missionId={mission.id}/>
            )}

            {owned && can('MISSION_MEDIA_VIEW') && (
                <Card>
                    <SectionTitle title={t('mobile.files.title')}/>
                    {canUpload && (
                        <View style={styles.actions}>
                            <Button label={t('mobile.files.camera')} icon={Camera} tone="secondary" disabled={upload.isPending} onPress={() => void pick('camera')} style={styles.flex}/>
                            <Button label={t('mobile.files.library')} icon={ImagePlus} tone="secondary" loading={upload.isPending} onPress={() => void pick('library')} style={styles.flex}/>
                        </View>
                    )}
                    {media.isPending ? <LoadingState/>
                        : !media.data?.length ? <EmptyState icon={FileText} message={t('mobile.files.empty')}/>
                            : media.data.map(item => (
                                <Pressable key={item.id} onPress={() => open(item.media.id)} accessibilityRole="button" style={styles.file}>
                                    <FileText size={18} color={colors.slate}/>
                                    <View style={styles.flex}>
                                        <AppText numberOfLines={1}>{item.media.originalName}</AppText>
                                        <AppText variant="caption">{formatFileSize(item.media.size, formatNumber)} · {item.createdAt ? formatDate(item.createdAt, {dateStyle: 'short'}) : ''}</AppText>
                                    </View>
                                    <Download size={18} color={colors.primary}/>
                                </Pressable>
                            ))}
                </Card>
            )}

            {owned && can('MISSION_TIMELINE_VIEW') && (
                <Card>
                    <SectionTitle title={t('mobile.missions.history')}/>
                    {timeline.isPending ? <LoadingState/>
                        : !timeline.data?.length ? <EmptyState message={t('mobile.missions.noHistory')}/>
                            : [...timeline.data].reverse().map(event => (
                                <View key={event.id} style={styles.event}>
                                    <View style={styles.dot}/>
                                    <View style={styles.flex}>
                                        <AppText>{eventTitle(event)}</AppText>
                                        {eventNote(event) ? <AppText variant="small">{eventNote(event)}</AppText> : null}
                                        {event.createdAt ? <AppText variant="caption">{formatDate(event.createdAt)}</AppText> : null}
                                    </View>
                                </View>
                            ))}
                </Card>
            )}
        </Screen>
    );
}

const styles = StyleSheet.create({
    row: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
    code: {fontWeight: '700', letterSpacing: 0.5},
    steps: {flexDirection: 'row', gap: spacing.xs, marginVertical: spacing.xs},
    step: {flex: 1, gap: 4},
    stepBar: {height: 4, borderRadius: 2, backgroundColor: colors.border},
    stepBarDone: {backgroundColor: colors.primary},
    stepDone: {color: colors.text, fontWeight: '600'},
    actions: {flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap'},
    flex: {flex: 1},
    meta: {flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start'},
    map: {height: 160, borderRadius: radius.control, overflow: 'hidden', marginTop: spacing.xs},
    weather: {gap: spacing.xs},
    file: {flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm},
    event: {flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.xs},
    dot: {width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginTop: 6},
    starGroup: {gap: spacing.xs},
    starRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.xs},
    starBtn: {
        width: 34,
        height: 34,
        borderRadius: radius.control,
        borderWidth: 1,
        borderColor: colors.inputBorder,
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
    },
    acceptRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs},
    pressed: {opacity: 0.75},
});
