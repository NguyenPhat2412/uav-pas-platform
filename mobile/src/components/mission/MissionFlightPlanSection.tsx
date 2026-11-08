import React, {useMemo, useState} from 'react';
import {Alert, Pressable, StyleSheet, View} from 'react-native';
import MapView, {Circle, Marker, Polygon, type MapPressEvent} from 'react-native-maps';
import {BookmarkPlus, LocateFixed, MapPinned, Save, Trash2} from 'lucide-react-native';
import {AppText, Button, Card, ScaledText, SectionTitle, TextField} from '@/components/ui';
import {useI18n} from '@/providers/I18nContext';
import type {MissionFormErrors} from '@/shared/forms/mission/mission-form';
import type {MissionInput, SavedFlightSite} from '@/shared/types/mission/mission.types';
import {isFinitePoint, verticesToMapCoordinates} from '@/utils/operations/map-shapes';
import {airspaceMapTone, colors, font, radius, spacing} from '@/styles/tokens';

export interface MissionFlightPlanSectionProps {
    form: MissionInput;
    errors: MissionFormErrors;
    savedSites: SavedFlightSite[];
    creatingSite: boolean;
    locating: boolean;
    defaultCenter: {latitude: number; longitude: number};
    onChangeLocationName: (value: string) => void;
    onSelectPoint: (latitude: number, longitude: number) => void;
    onLocateCurrent: () => Promise<void>;
    onApplySite: (site: SavedFlightSite) => void;
    onSaveSite: (name: string, hasGeometry: boolean) => Promise<boolean>;
    onDeleteSite: (site: SavedFlightSite) => void;
}

export function sitePlanToInput(plan?: SavedFlightSite['flightPlan']): MissionInput['flightPlan'] {
    if (!plan) return undefined;
    return {
        areaType: plan.areaType,
        vertices: plan.vertices,
        radiusMeters: plan.radiusMeters,
        takeoffLatitude: plan.takeoffLatitude,
        takeoffLongitude: plan.takeoffLongitude,
        altitudeAglMeters: plan.altitudeAglMeters,
        targetGsdCm: plan.targetGsdCm,
        forwardOverlap: plan.forwardOverlap,
        sideOverlap: plan.sideOverlap,
        sensors: plan.sensors,
        obstacles: plan.obstacles,
        permitSupport: plan.permitSupport,
    };
}

/** Saved flight sites selector and interactive flight corridor/area map card. */
export function MissionFlightPlanSection({
    form,
    errors,
    savedSites,
    creatingSite,
    locating,
    defaultCenter,
    onChangeLocationName,
    onSelectPoint,
    onLocateCurrent,
    onApplySite,
    onSaveSite,
    onDeleteSite,
}: MissionFlightPlanSectionProps) {
    const {t} = useI18n();
    const [showSaveSite, setShowSaveSite] = useState(false);
    const [siteName, setSiteName] = useState('');

    const point =
        form.latitude != null && form.longitude != null && isFinitePoint(form.latitude, form.longitude)
            ? {latitude: form.latitude, longitude: form.longitude}
            : null;

    const preservedPolygon = useMemo(
        () => (form.flightPlan?.areaType === 'POLYGON' ? verticesToMapCoordinates(form.flightPlan.vertices) : []),
        [form.flightPlan],
    );

    const preservedCircle = useMemo(() => {
        if (
            form.flightPlan?.areaType === 'CIRCLE' &&
            Array.isArray(form.flightPlan.vertices) &&
            form.flightPlan.vertices.length >= 1 &&
            Array.isArray(form.flightPlan.vertices[0]) &&
            isFinitePoint(form.flightPlan.vertices[0][0], form.flightPlan.vertices[0][1]) &&
            typeof form.flightPlan.radiusMeters === 'number' &&
            form.flightPlan.radiusMeters > 0
        ) {
            return {
                center: {latitude: form.flightPlan.vertices[0][0], longitude: form.flightPlan.vertices[0][1]},
                radius: form.flightPlan.radiusMeters,
            };
        }
        return null;
    }, [form.flightPlan]);

    const hasPreservedArea = preservedPolygon.length >= 3 || preservedCircle != null;
    const center =
        point ??
        (preservedPolygon.length >= 3
            ? preservedPolygon[0]
            : preservedCircle
              ? preservedCircle.center
              : defaultCenter);

    const confirmDeleteSite = (site: SavedFlightSite) => {
        Alert.alert(
            t('capabilities.flightSites.deleteTitle'),
            t('capabilities.flightSites.deleteDescription', {name: site.name}),
            [
                {text: t('capabilities.flightSites.cancel'), style: 'cancel'},
                {text: t('capabilities.flightSites.deleteConfirm'), style: 'destructive', onPress: () => onDeleteSite(site)},
            ],
        );
    };

    const submitSaveSite = async () => {
        const saved = await onSaveSite(siteName, Boolean(point) || hasPreservedArea);
        if (saved) {
            setSiteName('');
            setShowSaveSite(false);
        }
    };

    return (
        <>
            <Card>
                <SectionTitle title={t('capabilities.flightSites.title')}/>
                <AppText variant="caption">{t('capabilities.flightSites.subtitle')}</AppText>
                {savedSites.length === 0 ? (
                    <AppText variant="small">{t('capabilities.flightSites.empty')}</AppText>
                ) : (
                    <View style={styles.chipsRow}>
                        {savedSites.map(site => (
                            <View key={site.id} style={styles.siteChipWrap}>
                                <Pressable
                                    accessibilityRole="button"
                                    onPress={() => onApplySite(site)}
                                    style={({pressed}) => [styles.siteChipBody, pressed && styles.pressed]}>
                                    <MapPinned size={13} color={colors.primary}/>
                                    <ScaledText style={styles.chipText} numberOfLines={1}>{site.name}</ScaledText>
                                </Pressable>
                                <Pressable
                                    accessibilityRole="button"
                                    accessibilityLabel={t('capabilities.flightSites.deleteConfirm')}
                                    onPress={() => confirmDeleteSite(site)}
                                    style={({pressed}) => [styles.siteDeleteBtn, pressed && styles.pressed]}>
                                    <Trash2 size={13} color={colors.muted}/>
                                </Pressable>
                            </View>
                        ))}
                    </View>
                )}
                {showSaveSite ? (
                    <View style={styles.saveSiteForm}>
                        <TextField
                            label={t('capabilities.flightSites.nameLabel')}
                            placeholder={t('capabilities.flightSites.namePlaceholder')}
                            value={siteName}
                            onChangeText={setSiteName}
                            maxLength={120}
                        />
                        <View style={styles.siteFormActions}>
                            <Button
                                label={t('capabilities.flightSites.saveConfirm')}
                                icon={Save}
                                disabled={!siteName.trim()}
                                loading={creatingSite}
                                onPress={() => void submitSaveSite()}
                                style={styles.flex}
                            />
                            <Button
                                label={t('capabilities.flightSites.cancel')}
                                tone="secondary"
                                onPress={() => {
                                    setShowSaveSite(false);
                                    setSiteName('');
                                }}
                            />
                        </View>
                    </View>
                ) : (
                    <Button
                        label={t('capabilities.flightSites.saveCurrent')}
                        icon={BookmarkPlus}
                        tone="secondary"
                        onPress={() => {
                            setSiteName(form.locationName.trim());
                            setShowSaveSite(true);
                        }}
                    />
                )}
            </Card>

            <Card>
                <TextField label={t('missionForm.location')} value={form.locationName} onChangeText={onChangeLocationName} maxLength={255} error={errors.locationName}/>
                <AppText variant="caption">
                    {hasPreservedArea ? t('mobile.missions.preservedGeometry') : t('mobile.missions.tapMap')}
                </AppText>
                <View style={styles.map}>
                    <MapView
                        style={StyleSheet.absoluteFill}
                        region={{...center, latitudeDelta: point || hasPreservedArea ? 0.02 : 0.08, longitudeDelta: point || hasPreservedArea ? 0.02 : 0.08}}
                        onPress={(event: MapPressEvent) => onSelectPoint(event.nativeEvent.coordinate.latitude, event.nativeEvent.coordinate.longitude)}>
                        {preservedPolygon.length >= 3 && (
                            <Polygon
                                coordinates={preservedPolygon}
                                strokeColor={airspaceMapTone.CORRIDOR.stroke}
                                fillColor={airspaceMapTone.CORRIDOR.fill}
                                strokeWidth={2}
                            />
                        )}
                        {preservedCircle && (
                            <Circle
                                center={preservedCircle.center}
                                radius={preservedCircle.radius}
                                strokeColor={airspaceMapTone.CORRIDOR.stroke}
                                fillColor={airspaceMapTone.CORRIDOR.fill}
                                strokeWidth={2}
                            />
                        )}
                        {point && <Marker coordinate={point} pinColor={colors.primary}/>}
                    </MapView>
                </View>
                <Button label={t('weather.workspace.myLocation')} icon={LocateFixed} tone="secondary" loading={locating} onPress={() => void onLocateCurrent()}/>
                {errors.latitude || errors.longitude ? <AppText variant="caption" style={styles.error}>{errors.latitude ?? errors.longitude}</AppText> : null}
            </Card>
        </>
    );
}

const styles = StyleSheet.create({
    error: {color: colors.danger},
    chipsRow: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs},
    chipText: {fontSize: font.caption, fontWeight: '600', color: colors.text},
    pressed: {opacity: 0.75},
    siteChipWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: radius.control,
        borderWidth: 1,
        borderColor: colors.inputBorder,
        backgroundColor: colors.surface,
        overflow: 'hidden',
        maxWidth: '100%',
    },
    siteChipBody: {flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, flexShrink: 1},
    siteDeleteBtn: {paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: colors.border},
    saveSiteForm: {gap: spacing.sm, paddingTop: spacing.xs, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border},
    siteFormActions: {flexDirection: 'row', gap: spacing.sm, alignItems: 'center'},
    flex: {flex: 1},
    map: {height: 200, borderRadius: radius.control, overflow: 'hidden'},
});
