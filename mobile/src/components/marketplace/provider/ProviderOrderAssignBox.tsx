import React, {useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {Plane, Play, UserCheck} from 'lucide-react-native';
import {Button} from '@/components/ui';
import {GlassSelectField, type GlassOption} from '@/components/ui/GlassSelect';
import {type ProviderPilot} from '@/hooks/marketplace/useProviderStudio';
import {useI18n} from '@/providers/I18nContext';
import {useToast} from '@/providers/ToastContext';
import type {ProviderUav} from '@/shared/types/marketplace/marketplace.types';
import {cleanEntityName} from '@/utils/marketplace/clean-text';
import {spacing} from '@/styles/tokens';

/**
 * Pilot + UAV assignment & simulated flight start box on accepted Partner Studio orders
 * (`POST /api/v1/marketplace/provider/orders/{missionId}/assign` + `/start`, CONTRACT.md §3).
 * Displays UAV serial bold on line 1 + model caption on line 2, and disables "Lưu phân công"
 * until selection changes so "Bắt đầu bay thực hiện" stays the single primary CTA.
 */
export function ProviderOrderAssignBox({
    uavs,
    pilots,
    currentUavId,
    currentPilotUserId,
    assigning,
    starting,
    onAssign,
    onStart,
}: {
    uavs: ProviderUav[];
    pilots: ProviderPilot[];
    currentUavId?: number | null;
    currentPilotUserId?: number | null;
    assigning: boolean;
    starting: boolean;
    onAssign: (payload: { pilotId?: number; uavId: number }) => void;
    onStart: () => void;
}) {
    const {t} = useI18n();
    const toast = useToast();
    const initialPilot =
        pilots.find(
            p =>
                currentPilotUserId != null &&
                (p.pilotUserId === currentPilotUserId || p.id === currentPilotUserId),
        )?.id ?? '';
    const initialUav = currentUavId != null ? String(currentUavId) : String(uavs[0]?.id ?? '');

    const [pilotId, setPilotId] = useState(initialPilot ? String(initialPilot) : '');
    const [uavId, setUavId] = useState(initialUav);

    const dirty =
        pilotId !== (initialPilot ? String(initialPilot) : '') ||
        uavId !== initialUav ||
        currentUavId == null;

    const pilotOptions: GlassOption<string>[] = [
        {value: '', label: t('mobile.overnight.assignPilotPlaceholder'), icon: UserCheck},
        ...pilots.map(p => ({
            value: String(p.id),
            label: cleanEntityName(p.fullName),
            description: p.licenseNumber || p.specialization || undefined,
            icon: UserCheck,
        })),
    ];

    const uavOptions: GlassOption<string>[] = uavs.map(u => ({
        value: String(u.id),
        label: u.serialNumber,
        description: cleanEntityName(u.model),
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
                    showTriggerDescription
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
                    showTriggerDescription
                />
            ) : null}
            <View style={styles.row}>
                {uavOptions.length > 0 ? (
                    <Button
                        size="sm"
                        tone="secondary"
                        icon={UserCheck}
                        disabled={!dirty}
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
