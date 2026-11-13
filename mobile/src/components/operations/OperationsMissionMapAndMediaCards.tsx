import React from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import MapView, {Circle, Marker, Polygon} from 'react-native-maps';
import {Camera, Download, ExternalLink, FileText, ImagePlus} from 'lucide-react-native';
import {AppText, Button, Card, ChipGroup, EmptyState, LoadingState, SectionTitle} from '@/components/ui';
import {useI18n} from '@/providers/I18nContext';
import {formatFileSize} from '@/shared/lib/format';
import {eventNote, eventTitle} from '@/shared/lib/presentation';
import type {AirspaceZone} from '@/shared/types/airspace/airspace.types';
import type {Mission, MissionEvent, MissionMedia} from '@/shared/types/mission/mission.types';
import type {UavTelemetry} from '@/shared/types/uav/telemetry.types';
import {isFinitePoint, verticesToMapCoordinates} from '@/utils/operations/map-shapes';
import {airspaceMapTone, colors, radius, sarMapTone, spacing} from '@/styles/tokens';

export {
    OperationsCustomerReviewSummaryCard,
    OperationsMissionOverviewCards,
} from './OperationsMissionOverviewAndReviewCards';

export type UploadRoleOption = 'OUTPUT' | 'DOCUMENT' | 'FLIGHT_DATA';

export function OperationsMissionMapCard({
    mission,
    zones,
    corridorPolygon,
    flightCircle,
    hasPoint,
    hasLiveTelemetryPoint,
    liveTelemetry,
    assignedUavLabel,
    mapCenter,
    onOpenMaps,
}: {
    mission: Mission;
    zones: AirspaceZone[];
    corridorPolygon: { latitude: number; longitude: number }[];
    flightCircle: { center: { latitude: number; longitude: number }; radius: number } | null;
    hasPoint: boolean;
    hasLiveTelemetryPoint: boolean;
    liveTelemetry?: UavTelemetry;
    assignedUavLabel: string | null;
    mapCenter: { latitude: number; longitude: number };
    onOpenMaps: () => void;
}) {
    const {t} = useI18n();
    return (
        <Card>
            <SectionTitle
                title={t('mobile.ops.map.title')}
                action={
                    hasPoint ? (
                        <Pressable onPress={onOpenMaps} accessibilityRole="button" style={styles.mapLink}>
                            <ExternalLink size={14} color={colors.primary}/>
                            <AppText variant="caption" style={styles.linkText}>{t('mobile.missions.openMaps')}</AppText>
                        </Pressable>
                    ) : undefined
                }
            />
            <View style={styles.mapFrame}>
                <MapView
                    style={StyleSheet.absoluteFill}
                    initialRegion={{
                        latitude: mapCenter.latitude,
                        longitude: mapCenter.longitude,
                        latitudeDelta: 0.03,
                        longitudeDelta: 0.03,
                    }}>
                    {zones.map(zone => {
                        const tone = airspaceMapTone[zone.zoneType];
                        if (
                            zone.geometryType === 'CIRCLE' &&
                            isFinitePoint(zone.centerLat, zone.centerLng) &&
                            typeof zone.radiusMeters === 'number' &&
                            Number.isFinite(zone.radiusMeters) &&
                            zone.radiusMeters > 0
                        ) {
                            return (
                                <Circle
                                    key={`zone-${zone.id}`}
                                    center={{latitude: zone.centerLat, longitude: zone.centerLng}}
                                    radius={zone.radiusMeters}
                                    strokeColor={tone.stroke}
                                    fillColor={tone.fill}
                                    strokeWidth={2}
                                />
                            );
                        }
                        const poly = verticesToMapCoordinates(zone.vertices);
                        if (poly.length >= 3) {
                            return (
                                <Polygon
                                    key={`zone-${zone.id}`}
                                    coordinates={poly}
                                    strokeColor={tone.stroke}
                                    fillColor={tone.fill}
                                    strokeWidth={2}
                                />
                            );
                        }
                        return null;
                    })}
                    {corridorPolygon.length >= 3 && (
                        <Polygon
                            coordinates={corridorPolygon}
                            strokeColor={airspaceMapTone.CORRIDOR.stroke}
                            fillColor={airspaceMapTone.CORRIDOR.fill}
                            strokeWidth={2}
                        />
                    )}
                    {flightCircle && (
                        <Circle
                            center={flightCircle.center}
                            radius={flightCircle.radius}
                            strokeColor={airspaceMapTone.CORRIDOR.stroke}
                            fillColor={airspaceMapTone.CORRIDOR.fill}
                            strokeWidth={2}
                        />
                    )}
                    {hasPoint && (
                        <Marker
                            coordinate={{latitude: mission.latitude!, longitude: mission.longitude!}}
                            title={mission.code}
                            description={mission.locationName}
                            pinColor={colors.primary}
                        />
                    )}
                    {hasLiveTelemetryPoint && liveTelemetry && (
                        <Marker
                            coordinate={{latitude: liveTelemetry.latitude, longitude: liveTelemetry.longitude}}
                            title={assignedUavLabel ?? `UAV #${liveTelemetry.uavId}`}
                            pinColor={sarMapTone.uavPin}
                        />
                    )}
                </MapView>
            </View>
            <AppText variant="caption">{t('mobile.ops.map.legend')}</AppText>
        </Card>
    );
}

export function OperationsMissionMediaAndTimelineCards({
    canViewMedia,
    canUploadMedia,
    canViewTimeline,
    finished,
    uploadRole,
    onUploadRoleChange,
    uploadPending,
    mediaPending,
    mediaItems,
    timelinePending,
    timelineEvents,
    onPickCamera,
    onPickLibrary,
    onOpenFile,
}: {
    canViewMedia: boolean;
    canUploadMedia: boolean;
    canViewTimeline: boolean;
    finished: boolean;
    uploadRole: UploadRoleOption;
    onUploadRoleChange: (role: UploadRoleOption) => void;
    uploadPending: boolean;
    mediaPending: boolean;
    mediaItems?: MissionMedia[];
    timelinePending: boolean;
    timelineEvents?: MissionEvent[];
    onPickCamera: () => void;
    onPickLibrary: () => void;
    onOpenFile: (mediaId: number) => void;
}) {
    const {t, formatDate, formatNumber} = useI18n();
    const roleOptions: { value: UploadRoleOption; label: string }[] = [
        {value: 'OUTPUT', label: t('opsMissions.detail.media.roleOutput')},
        {value: 'DOCUMENT', label: t('opsMissions.detail.media.roleDocument')},
        {value: 'FLIGHT_DATA', label: t('opsMissions.detail.media.roleFlightData')},
    ];
    const roleLabelMap: Record<string, string> = {
        OUTPUT: t('opsMissions.detail.media.roleOutput'),
        DOCUMENT: t('opsMissions.detail.media.roleDocument'),
        FLIGHT_DATA: t('opsMissions.detail.media.roleFlightData'),
        INPUT: t('mobile.files.title'),
    };

    return (
        <>
            {(canViewMedia || canUploadMedia) && (
                <Card>
                    <SectionTitle
                        title={t('opsMissions.detail.media.title')}
                        action={
                            mediaItems ? (
                                <AppText variant="caption">{t('opsMissions.detail.media.count', {count: mediaItems.length})}</AppText>
                            ) : undefined
                        }
                    />
                    {!finished && canUploadMedia && (
                        <View style={styles.uploadBlock}>
                            <ChipGroup options={roleOptions} value={uploadRole} onChange={onUploadRoleChange}/>
                            <View style={styles.actions}>
                                <Button
                                    size="sm"
                                    label={t('mobile.files.camera')}
                                    icon={Camera}
                                    tone="secondary"
                                    disabled={uploadPending}
                                    onPress={onPickCamera}
                                    style={styles.flex}
                                />
                                <Button
                                    size="sm"
                                    label={t('mobile.files.libraryMedia')}
                                    icon={ImagePlus}
                                    tone="secondary"
                                    loading={uploadPending}
                                    onPress={onPickLibrary}
                                    style={styles.flex}
                                />
                            </View>
                        </View>
                    )}
                    {!canViewMedia ? (
                        <AppText variant="small">{t('opsMissions.detail.media.noPermission')}</AppText>
                    ) : mediaPending ? (
                        <LoadingState/>
                    ) : !mediaItems?.length ? (
                        <EmptyState icon={FileText} message={t('opsMissions.detail.media.empty')}/>
                    ) : (
                        mediaItems.map(item => (
                            <Pressable key={item.id} onPress={() => onOpenFile(item.media.id)} accessibilityRole="button" style={styles.fileRow}>
                                <FileText size={18} color={colors.slate}/>
                                <View style={styles.flex}>
                                    <AppText numberOfLines={1}>{item.media.originalName}</AppText>
                                    <AppText variant="caption">
                                        {roleLabelMap[item.mediaRole] ?? item.mediaRole} · {formatFileSize(item.media.size, formatNumber)}
                                    </AppText>
                                </View>
                                <Download size={18} color={colors.primary}/>
                            </Pressable>
                        ))
                    )}
                </Card>
            )}

            {canViewTimeline && (
                <Card>
                    <SectionTitle title={t('opsMissions.detail.timeline.title')}/>
                    {timelinePending ? (
                        <LoadingState/>
                    ) : !timelineEvents?.length ? (
                        <EmptyState message={t('mobile.missions.noHistory')}/>
                    ) : (
                        [...timelineEvents].reverse().map(event => (
                            <View key={event.id} style={styles.eventRow}>
                                <View style={styles.dot}/>
                                <View style={styles.flex}>
                                    <AppText>{eventTitle(event)}</AppText>
                                    {eventNote(event) ? <AppText variant="small">{eventNote(event)}</AppText> : null}
                                    {event.createdAt ? <AppText variant="caption">{formatDate(event.createdAt)}</AppText> : null}
                                </View>
                            </View>
                        ))
                    )}
                </Card>
            )}
        </>
    );
}

const styles = StyleSheet.create({
    flex: {flex: 1},
    mapLink: {flexDirection: 'row', alignItems: 'center', gap: 4},
    linkText: {color: colors.primary, fontWeight: '600'},
    mapFrame: {height: 176, borderRadius: radius.control, overflow: 'hidden'},
    actions: {flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap'},
    uploadBlock: {gap: spacing.sm},
    fileRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm},
    eventRow: {flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.xs},
    dot: {width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginTop: 6},
});
