import React from 'react';
import {StyleSheet, View} from 'react-native';
import {useRouter} from 'expo-router';
import {Camera, Clock3, Layers, Maximize2, Plus, Wind, type LucideIcon} from 'lucide-react-native';
import {AppText, Button, Card, EmptyState, ErrorState, LoadingState, Screen} from '@/components/ui';
import {useServices} from '@/hooks/mission/useCustomerMissions';
import {useAuth} from '@/providers/AuthContext';
import {useI18n} from '@/providers/I18nContext';
import {serviceName} from '@/shared/lib/presentation';
import {colors, radius, spacing} from '@/styles/tokens';

function Spec({icon: Icon, label, value}: { icon: LucideIcon; label: string; value: string }) {
    return (
        <View style={styles.spec} accessible accessibilityLabel={`${label}: ${value}`}>
            <Icon size={14} color={colors.slate}/>
            <AppText variant="caption" numberOfLines={1}>{value}</AppText>
        </View>
    );
}

export function ServicesScreen() {
    const {t, formatNumber} = useI18n();
    const {can} = useAuth();
    const router = useRouter();
    const services = useServices();
    const active = (services.data ?? []).filter(service => service.active);
    const contact = t('services.spec.contact');

    return (
        <Screen onRefresh={() => void services.refetch()} refreshing={services.isRefetching}>
            {services.isPending ? <LoadingState label={t('services.loading')}/>
                : services.isError ? <ErrorState message={t('services.loadError')} retryLabel={t('common.retry')} onRetry={() => void services.refetch()}/>
                    : active.length === 0 ? <EmptyState icon={Layers} message={t('services.empty')}/>
                        : active.map(service => (
                            <Card key={service.id}>
                                <AppText variant="title">{serviceName(service)}</AppText>
                                <AppText variant="small">{service.description || t('services.defaultDescription')}</AppText>
                                <View style={styles.specs}>
                                    <Spec icon={Clock3} label={t('services.spec.duration')} value={t('services.defaultDuration', {minutes: service.defaultDurationMinutes})}/>
                                    <Spec icon={Camera} label={t('services.spec.gsd')}
                                          value={service.bestGsdCm != null ? t('services.spec.gsdValue', {value: formatNumber(service.bestGsdCm)}) : contact}/>
                                    <Spec icon={Maximize2} label={t('services.spec.area')}
                                          value={service.maxAreaHectares != null ? t('services.spec.areaValue', {value: formatNumber(service.maxAreaHectares)}) : contact}/>
                                    <Spec icon={Wind} label={t('services.spec.wind')}
                                          value={service.maxWindMs != null ? t('services.spec.windValue', {value: formatNumber(service.maxWindMs)}) : contact}/>
                                </View>
                                {can('MISSION_CREATE') && (
                                    <Button label={t('services.book')} icon={Plus}
                                            onPress={() => router.push({pathname: '/customer/mission/create', params: {serviceId: String(service.id)}})}/>
                                )}
                            </Card>
                        ))}
        </Screen>
    );
}

const styles = StyleSheet.create({
    specs: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm},
    spec: {
        flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.slateLight, borderRadius: radius.control,
        paddingHorizontal: spacing.sm, paddingVertical: 4, maxWidth: '100%',
    },
});
