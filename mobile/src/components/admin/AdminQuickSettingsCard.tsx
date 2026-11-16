import React, {useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {Save, Settings2} from 'lucide-react-native';
import {AppText, Badge, Button, Card, EmptyState, LoadingState, TextField} from '@/components/ui';
import {
    useAdminMarketplaceMutations,
    useAdminPlatformSettings,
} from '@/hooks/marketplace/useAdminMarketplaceMobile';
import {useI18n} from '@/providers/I18nContext';
import {useToast} from '@/providers/ToastContext';
import {extractActionableError} from '@/shared/forms/marketplace/marketplace-forms';
import {colors, spacing} from '@/styles/tokens';

export function AdminSettingsTabContent() {
    const {t} = useI18n();
    const toast = useToast();
    const settingsQuery = useAdminPlatformSettings();
    const mutations = useAdminMarketplaceMutations();
    const [drafts, setDrafts] = useState<Record<string, string>>({});

    if (settingsQuery.isPending) return <LoadingState/>;
    const rows = (settingsQuery.data ?? []).filter(
        s => s.category === 'MARKETPLACE' || s.category === 'BILLING',
    );
    if (!rows.length) {
        return <EmptyState icon={Settings2} message={t('mobile.adminQuick.settings.empty')}/>;
    }

    return (
        <>
            {rows.map(item => {
                const value = drafts[item.configKey] ?? item.configValue;
                const isBool = item.valueType === 'BOOLEAN';
                return (
                    <Card key={item.configKey}>
                        <View style={styles.rowBetween}>
                            <AppText variant="small" style={styles.bold}>
                                {item.configKey}
                            </AppText>
                            <Badge
                                label={item.category}
                                background={colors.slateLight}
                                color={colors.slateDark}
                            />
                        </View>
                        {item.description ? <AppText variant="caption">{item.description}</AppText> : null}
                        {isBool ? (
                            <Button
                                size="sm"
                                tone={value === 'true' ? 'primary' : 'secondary'}
                                label={value === 'true' ? 'TRUE (ON)' : 'FALSE (OFF)'}
                                onPress={() =>
                                    mutations.updateSetting.mutate(
                                        {key: item.configKey, value: value === 'true' ? 'false' : 'true'},
                                        {
                                            onSuccess: () =>
                                                toast.show(t('mobile.adminQuick.settings.savedToast'), 'success'),
                                        },
                                    )
                                }
                            />
                        ) : (
                            <View style={styles.row}>
                                <View style={styles.flex}>
                                    <TextField
                                        label={item.valueType} required
                                        value={value}
                                        onChangeText={txt =>
                                            setDrafts(prev => ({...prev, [item.configKey]: txt}))
                                        }
                                    />
                                </View>
                                <Button
                                    size="sm"
                                    icon={Save}
                                    label={t('common.save')}
                                    onPress={() =>
                                        mutations.updateSetting.mutate(
                                            {key: item.configKey, value: value.trim()},
                                            {
                                                onSuccess: () =>
                                                    toast.show(t('mobile.adminQuick.settings.savedToast'), 'success'),
                                                onError: err =>
                                                    toast.show(
                                                        extractActionableError(err, t('mobile.provider.saveError')),
                                                        'error',
                                                    ),
                                            },
                                        )
                                    }
                                />
                            </View>
                        )}
                    </Card>
                );
            })}
        </>
    );
}

const styles = StyleSheet.create({
    row: {flexDirection: 'row', alignItems: 'center', gap: spacing.xs},
    rowBetween: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.xs},
    bold: {fontWeight: '700', color: colors.text, flex: 1},
    flex: {flex: 1},
});
