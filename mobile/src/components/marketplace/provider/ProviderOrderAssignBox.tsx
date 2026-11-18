import React, {useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {Plane, Play, UserCheck} from 'lucide-react-native';
import {Button} from '@/components/ui';
import {GlassSelectField, type GlassOption} from '@/components/ui/GlassSelect';
import {type ProviderPilot} from '@/hooks/marketplace/useProviderStudio';
import {useI18n} from '@/providers/I18nContext';
import {useToast} from '@/providers/ToastContext';
import type {ProviderUav} from '@/shared/types/marketplace/marketplace.types';
import {spacing} from '@/styles/tokens';

/**
 * Pilot + UAV assignment & simulated flight start box on accepted Partner Studio orders
 * (`POST /api/v1/marketplace/provider/orders/{missionId}/assign` + `/start`, CONTRACT.md §3).
 */
export function ProviderOrderAssignBox({
    uavs,
    pilots,
    assigning,
    starting,
    onAssign,
    onStart,
}: {
    uavs: ProviderUav[];
    pilots: ProviderPilot[];
    assigning: boolean;
    starting: boolean;
    onAssign: (payload: { pilotId?: number; uavId: number }) => void;
    onStart: () => void;
}) {
    const {t} = useI18n();
    const toast = useToast();
    const [pilotId, setPilotId] = useState('');
    const [uavId, setUavId] = useState('');

    const pilotOptions: GlassOption<string>[] = [
        {value: '', label: t('mobile.overnight.assignPilotPlaceholder'), icon: UserCheck},
        ...pilots.map(p => ({
            value: String(p.id),
            label: p.fullName,
            description: p.licenseNumber || p.status,
            icon: UserCheck,
        })),
    ];

    const uavOptions: GlassOption<string>[] = uavs.map(u => ({
        value: String(u.id),
        label: u.model,
        description: `SN: ${u.serialNumber}`,
        icon: Plane,
    }));

    const handleAssign = () => {
        const chosenUavId = Number(uavId || uavs[0]?.id || 0);
        if (!chosenUavId) {
            toast.show(t('mobile.provider.saveError'), 'error');
            return;
        }
        onAssign({
            pilotId: pilotId ? Number(pilotId) : undefined,
            uavId: chosenUavId,
        });
    };

    return (
        <View style={styles.stack}>
            {pilots.length > 0 ? (
                <GlassSelectField<string>
                    label={t('mobile.overnight.assignPilotLabel')}
                    optional
                    sheetTitle={t('mobile.overnight.assignPilotLabel')}
                    value={pilotId}
                    options={pilotOptions}
                    onChange={setPilotId}
                />
            ) : null}
            {uavOptions.length > 0 ? (
                <GlassSelectField<string>
                    label={t('mobile.provider.assignUavLabel')}
                    required
                    sheetTitle={t('mobile.provider.assignUavLabel')}
                    value={uavId || String(uavs[0]?.id ?? '')}
                    options={uavOptions}
                    onChange={setUavId}
                />
            ) : null}
            <View style={styles.row}>
                {uavOptions.length > 0 ? (
                    <Button
                        size="sm"
                        tone="secondary"
                        icon={UserCheck}
                        loading={assigning}
                        label={t('mobile.overnight.assignOrderBtn')}
                        onPress={handleAssign}
                        style={styles.flex}
                    />
                ) : null}
                <Button
                    size="sm"
                    icon={Play}
                    loading={starting}
                    label={t('mobile.provider.startFlightBtn')}
                    onPress={onStart}
                    style={styles.flex}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    stack: {gap: spacing.xs, paddingTop: spacing.xs},
    row: {flexDirection: 'row', gap: spacing.xs},
    flex: {flex: 1},
});
