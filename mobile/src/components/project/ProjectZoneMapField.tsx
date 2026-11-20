import React from 'react';
import {StyleSheet, View} from 'react-native';
import MapView, {Marker, Polygon} from 'react-native-maps';
import {LocateFixed, RotateCcw} from 'lucide-react-native';
import {AppText, Badge, Button, FieldLabel} from '@/components/ui';
import {useDeviceLocation} from '@/hooks/location/useDeviceLocation';
import {useI18n} from '@/providers/I18nContext';
import {useToast} from '@/providers/ToastContext';
import {
    circleToGeoJsonPolygon,
    geoJsonPolygonToVertices,
    verticesToGeoJsonPolygon,
} from '@/shared/forms/project/project-form';
import {airspaceMapTone, colors, radius, spacing} from '@/styles/tokens';

/**
 * Interactive Apple Map polygon / GPS flight-zone picker producing `areaGeoJson`
 * for both Project boundaries and the 3-step Project Subscription wizard.
 */
export function ProjectZoneMapField({
    label,
    required = false,
    optional = false,
    value,
    onChange,
}: {
    label: string;
    required?: boolean;
    optional?: boolean;
    value?: string | null;
    onChange: (nextGeoJson: string) => void;
}) {
    const {t} = useI18n();
    const toast = useToast();
    const location = useDeviceLocation();
    const vertices = geoJsonPolygonToVertices(value);
    const coords = vertices.map(([latitude, longitude]) => ({latitude, longitude}));

    const center =
        coords[0] ?? {
            latitude: location.point.lat,
            longitude: location.point.lng,
        };

    const handleTapMap = (latitude: number, longitude: number) => {
        const next: [number, number][] = [...vertices, [latitude, longitude]];
        if (next.length >= 3) {
            onChange(verticesToGeoJsonPolygon(next));
        } else {
            onChange(circleToGeoJsonPolygon(latitude, longitude, 180));
        }
    };

    const handleUseMyGps = async () => {
        const found = await location.locate();
        if (!found) {
            toast.show(t('weather.workspace.locateDenied'), 'error');
            return;
        }
        onChange(circleToGeoJsonPolygon(found.lat, found.lng, 220));
        toast.show(t('mobile.shop.gpsAppliedToast'), 'info');
    };

    return (
        <View style={styles.wrap}>
            <View style={styles.headerRow}>
                <FieldLabel label={label} required={required} optional={optional}/>
                {coords.length > 0 ? (
                    <Badge
                        label={t('mobile.overnight.polygonPointsCount', {count: coords.length})}
                        background={colors.primaryLight}
                        color={colors.primary}
                    />
                ) : null}
            </View>
            <AppText variant="caption">{t('mobile.overnight.drawAreaHint')}</AppText>

            <View style={styles.mapFrame}>
                <MapView
                    style={styles.map}
                    initialRegion={{
                        latitude: center.latitude,
                        longitude: center.longitude,
                        latitudeDelta: 0.015,
                        longitudeDelta: 0.015,
                    }}
                    onPress={event => {
                        const {latitude, longitude} = event.nativeEvent.coordinate;
                        handleTapMap(latitude, longitude);
                    }}>
                    {coords.length >= 3 ? (
                        <Polygon
                            coordinates={coords}
                            strokeColor={airspaceMapTone.CORRIDOR.stroke}
                            fillColor={airspaceMapTone.CORRIDOR.fill}
                            strokeWidth={2}
                        />
                    ) : null}
                    {coords.map((pt, idx) => (
                        <Marker
                            key={`${pt.latitude}-${pt.longitude}-${idx}`}
                            coordinate={pt}
                            pinColor={colors.primary}
                        />
                    ))}
                </MapView>
            </View>

            <View style={styles.btnRow}>
                <Button
                    size="sm"
                    tone="secondary"
                    icon={LocateFixed}
                    loading={location.locating}
                    label={t('mobile.shop.useMyGpsBtn')}
                    onPress={() => void handleUseMyGps()}
                    style={styles.flex}
                />
                {coords.length > 0 ? (
                    <Button
                        size="sm"
                        tone="ghost"
                        icon={RotateCcw}
                        label={t('mobile.overnight.clearPolygonBtn')}
                        onPress={() => onChange('')}
                    />
                ) : null}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: {gap: spacing.xs},
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing.xs,
    },
    mapFrame: {
        height: 210,
        borderRadius: radius.card,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.slateLight,
    },
    map: {flex: 1},
    btnRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.xs},
    flex: {flex: 1},
});
