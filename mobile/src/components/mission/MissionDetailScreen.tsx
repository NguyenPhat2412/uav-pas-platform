import React, {useState} from 'react';
import {Alert, Linking, Platform, Pressable, StyleSheet, View} from 'react-native';
import {useLocalSearchParams, useRouter} from 'expo-router';
import MapView, {Marker} from 'react-native-maps';
import * as ImagePicker from 'expo-image-picker';
import * as WebBrowser from 'expo-web-browser';
import {AlertTriangle, Camera, CalendarClock, Copy, Download, FileText, ImagePlus, MapPin, Pencil, Send, ShieldAlert, XCircle} from 'lucide-react-native';
import {AppText, Badge, Button, Card, EmptyState, ErrorState, LoadingState, Screen, SectionTitle} from '@/components/ui';
import {CustomerHandoverReviewCard} from '@/components/mission/CustomerHandoverReviewCard';
import {MissionStatusBadge} from '@/components/mission/MissionBits';
import {MissionProgress, MissionSiteWeather} from '@/components/mission/MissionDetailBits';
import {MissionPermitCard} from '@/components/mission/MissionPermitCard';
import {MobileMission3DReplayCard} from '@/components/mission/MobileMission3DReplayCard';
import {MobileMissionInspectionReportCard} from '@/components/mission/MobileMissionInspectionReportCard';
import {fromLocalIso, withStart} from '@/forms/mission/mission-draft';
import {useMissionAirspaceCheck} from '@/hooks/airspace/useAirspace';
import {useMissionActions, useMissionDetail} from '@/hooks/mission/useCustomerMissions';
import {useMediaDownload, useMissionUpload} from '@/hooks/media/useMissionUpload';
import {useAuth} from '@/providers/AuthContext';
import {useI18n} from '@/providers/I18nContext';
import {useToast} from '@/providers/ToastContext';
import {canEditMission, missionFormError, missionFormFromDetail} from '@/shared/forms/mission/mission-form';
import {eventNote, eventTitle, missionHint, terminalStatuses} from '@/shared/lib/presentation';
import {formatFileSize} from '@/shared/lib/format';
import {canCancel} from '@/utils/mission/status';
import {isFinitePoint} from '@/utils/operations/map-shapes';
import {colors, radius, spacing} from '@/styles/tokens';

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
    const [refreshing, setRefreshing] = useState(false);
    // Read the clock once per mount: render must stay pure, and a pull-to-refresh remounts nothing but refetches.
    const [openedAt] = useState(() => Date.now());

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
    const canClone = owned && can('MISSION_CREATE');
    const finished = terminalStatuses.includes(mission.status);
    const canUpload = owned && !finished && can('MISSION_MEDIA_UPLOAD');
    const hasPoint = isFinitePoint(mission.latitude, mission.longitude);
    const parsedStart = fromLocalIso(mission.startTime);
    const isPastSchedule = editable && !!parsedStart && parsedStart.getTime() <= openedAt;
    const showPermitCard =
        (mission.permit != null && mission.permit.status !== 'NOT_REQUIRED') ||
        !!mission.flightPlan?.permitSupport ||
        !!airspace.data?.requiresPermit;
    const showPostFlightReport = mission.status === 'IN_PROGRESS' || mission.status === 'COMPLETED';
    const submitting = actions.submit.isPending || actions.update.isPending;

    const fail = (error: unknown) => toast.show(missionFormError(error, t), 'error');
    const goEdit = () => router.push({pathname: '/customer/mission/[id]/edit', params: {id: String(mission.id)}});

    const rescheduleAndSubmit = async () => {
        try {
            const now = new Date();
            const nextStart = new Date(
                now.getFullYear(), now.getMonth(), now.getDate() + 1,
                parsedStart?.getHours() ?? 8, parsedStart?.getMinutes() ?? 0,
            );
            const data = withStart(missionFormFromDetail(mission), nextStart);
            await actions.update.mutateAsync({id: mission.id, data, expectedVersion: mission.version});
            await actions.submit.mutateAsync(mission.id);
            toast.show(t('mobile.missions.submitted'), 'success');
        } catch (error) {
            fail(error);
        }
    };

    const submit = () => {
        if (isPastSchedule) {
            Alert.alert(t('mobile.missions.pastStartTitle'), t('mobile.missions.pastStartPrompt'), [
                {text: t('mobile.missions.rescheduleAndSubmit'), onPress: () => void rescheduleAndSubmit()},
                {text: t('mobile.missions.editManually'), onPress: goEdit},
                {text: t('common.cancel'), style: 'cancel'},
            ]);
            return;
        }
        actions.submit.mutate(mission.id, {onSuccess: () => toast.show(t('mobile.missions.submitted'), 'success'), onError: fail});
    };

    const cancel = () => Alert.alert(t('missionDetail.cancelQuestion'), t('missionDetail.cancelWarning'), [
        {text: t('missionDetail.keepRequest'), style: 'cancel'},
        {text: t('missionDetail.confirmCancel'), style: 'destructive', onPress: () => actions.cancel.mutate(mission.id, {onError: fail})},
    ]);

    const handleRefresh = async () => {
        setRefreshing(true);
        try {
            await Promise.all([detail.refetch(), timeline.refetch(), media.refetch(), airspace.refetch()]);
        } finally {
            setRefreshing(false);
        }
    };

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
        <Screen onRefresh={() => void handleRefresh()} refreshing={refreshing}>
            <Card>
                <View style={styles.row}>
                    <AppText variant="caption" style={styles.code}>{mission.code}</AppText>
                    <MissionStatusBadge status={mission.status}/>
                </View>
                <AppText variant="heading">{mission.title}</AppText>
                <MissionProgress mission={mission}/>
                <AppText variant="small">{missionHint(mission.status)}</AppText>

                {(editable || cancellable || canClone) && (
                    <View style={styles.actionSection}>
                        {editable && (
                            <View style={styles.actionRow}>
                                <Button size="sm" label={t('mobile.missions.submitAction')} icon={Send} loading={submitting} onPress={submit} style={styles.actionPrimary}/>
                                <Button size="sm" label={t('mobile.missions.edit')} icon={Pencil} tone="secondary" onPress={goEdit} style={styles.actionSecondary}/>
                            </View>
                        )}
                        {(canClone || cancellable) && (
                            <View style={styles.actionRow}>
                                {canClone && (
                                    <Button
                                        size="sm"
                                        label={actions.clone.isPending ? t('mobile.missions.cloningAction') : t('mobile.missions.cloneAction')}
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
                                {cancellable && (
                                    <Button size="sm" label={t('mobile.missions.cancelShort')} icon={XCircle} tone="ghost"
                                            loading={actions.cancel.isPending} onPress={cancel} style={styles.cancelBtn}/>
                                )}
                            </View>
                        )}
                    </View>
                )}
            </Card>

            <Card>
                <View style={styles.meta}>
                    <CalendarClock size={16} color={colors.muted}/>
                    <View style={styles.flex}>
                        <AppText variant="caption">{t('missionDetail.plannedStart')}</AppText>
                        <AppText>{formatDate(mission.startTime)} → {formatDate(mission.expectedEndTime, {timeStyle: 'short'})}</AppText>
                    </View>
                </View>
                {isPastSchedule && (
                    <Pressable onPress={submit} accessibilityRole="button" style={styles.pastNotice}>
                        <AlertTriangle size={15} color={colors.warning}/>
                        <AppText variant="caption" style={styles.pastNoticeText}>{t('mobile.missions.pastStartWarning')}</AppText>
                    </Pressable>
                )}
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
                                    airspace.data.blocked ? t('mobile.airspace.clearance.BLOCKED')
                                        : airspace.data.requiresPermit ? t('mobile.airspace.clearance.PERMIT_REQUIRED')
                                            : t('mobile.airspace.clearance.CAUTION')
                                }
                                background={airspace.data.blocked ? colors.dangerLight : colors.warningLight}
                                color={airspace.data.blocked ? colors.danger : colors.warning}
                            />
                        }
                    />
                    {airspace.data.violations.map(v => (
                        <AppText key={v.zoneId} variant="small">• {v.name}: {v.message}</AppText>
                    ))}
                </Card>
            )}

            {showPermitCard && (
                <MissionPermitCard
                    mission={mission} mediaItems={media.data} onOpenScan={open} uploadScanLoading={upload.isPending}
                    onUploadScan={canUpload ? onUploaded => void pick('library', 'DOCUMENT', onUploaded) : undefined}
                    upsertLoading={actions.upsertPermit.isPending}
                    onUpsert={(data, onDone) =>
                        actions.upsertPermit.mutate({id: mission.id, data}, {
                            onSuccess: () => {
                                onDone();
                                toast.show(t('mobile.permit.savedToast'), 'success');
                            },
                            onError: fail,
                        })
                    }
                />
            )}

            {!finished && <MissionSiteWeather mission={mission}/>}

            <MobileMission3DReplayCard missionId={mission.id} portal="customer"/>

            {showPostFlightReport && <MobileMissionInspectionReportCard missionId={mission.id} portal="customer" onOpenMedia={open}/>}

            {owned && mission.status === 'COMPLETED' && <CustomerHandoverReviewCard key={mission.id} missionId={mission.id}/>}

            {owned && can('MISSION_MEDIA_VIEW') && (
                <Card>
                    <SectionTitle title={t('mobile.files.title')}/>
                    {canUpload && (
                        <View style={styles.actionRow}>
                            <Button size="sm" label={t('mobile.files.camera')} icon={Camera} tone="secondary" disabled={upload.isPending} onPress={() => void pick('camera')} style={styles.flex}/>
                            <Button size="sm" label={t('mobile.files.library')} icon={ImagePlus} tone="secondary" loading={upload.isPending} onPress={() => void pick('library')} style={styles.flex}/>
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
    row: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap'},
    code: {fontWeight: '700', letterSpacing: 0.5},
    actionSection: {marginTop: spacing.xs, paddingTop: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, gap: spacing.xs},
    actionRow: {flexDirection: 'row', gap: spacing.xs, alignItems: 'center'},
    actionPrimary: {flex: 2},
    actionSecondary: {flex: 1},
    cancelBtn: {borderColor: colors.border, borderWidth: 1, backgroundColor: colors.surface},
    flex: {flex: 1},
    meta: {flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start'},
    pastNotice: {
        flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.xs, paddingHorizontal: spacing.sm,
        borderRadius: radius.control, backgroundColor: colors.warningLight,
    },
    pastNoticeText: {flex: 1, color: colors.warning, fontWeight: '600'},
    map: {height: 152, borderRadius: radius.control, overflow: 'hidden', marginTop: spacing.xs},
    file: {flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm},
    event: {flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.xs},
    dot: {width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginTop: 6},
});
