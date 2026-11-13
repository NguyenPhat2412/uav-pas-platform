import React from 'react';
import {StyleSheet, View} from 'react-native';
import {useRouter} from 'expo-router';
import {ALargeSmall, Languages, ShieldAlert} from 'lucide-react-native';
import {AppText, Card, ChipGroup, Screen} from '@/components/ui';
import {AccountRow} from '@/components/profile/AccountScreen';
import {useAuth} from '@/providers/AuthContext';
import {useI18n} from '@/providers/I18nContext';
import {TEXT_SIZES, useTextSize, type TextSize} from '@/providers/TextSizeContext';
import {localeMetaMap, supportedLocales, type SupportedLocale} from '@/shared/i18n/config';
import {canUsePortal} from '@/shared/utils/auth/portal';
import {colors, spacing} from '@/styles/tokens';

/**
 * Everything behind the "Khác" tile of the account tab, shown as a native form sheet (Liquid Glass on iOS 26):
 * the admin shortcut for staff, language and text size.
 */
export function AccountMoreSheet() {
    const {t, locale, setLocale} = useI18n();
    const {user, can, switchPortal} = useAuth();
    const {size, setSize} = useTextSize();
    const router = useRouter();
    const canAdminQuick =
        canUsePortal(user?.role, 'operations') &&
        (can('USER_MANAGE') || can('USER_VIEW') || (can('DASHBOARD_VIEW') && can('MISSION_VIEW_ALL')));

    const openAdminQuick = async () => {
        if (router.canDismiss()) router.dismiss();
        await switchPortal('operations');
        router.replace('/operations/missions');
        setTimeout(() => router.push('/operations/admin-quick'), 50);
    };

    return (
        <Screen>
            {canAdminQuick && (
                <Card>
                    <AccountRow icon={ShieldAlert} label={t('mobile.adminQuick.entryLabel')} onPress={() => void openAdminQuick()}/>
                </Card>
            )}

            <Card>
                <View style={styles.title}>
                    <Languages size={18} color={colors.slateDark}/>
                    <AppText variant="title">{t('common.language')}</AppText>
                </View>
                <ChipGroup<SupportedLocale> wrap value={locale} onChange={setLocale}
                                            options={supportedLocales.map(code => ({value: code, label: `${localeMetaMap[code].flag} ${localeMetaMap[code].nativeName}`}))}/>
            </Card>

            <Card>
                <View style={styles.title}>
                    <ALargeSmall size={18} color={colors.slateDark}/>
                    <AppText variant="title">{t('mobile.account.textSize')}</AppText>
                </View>
                <ChipGroup<TextSize> wrap value={size} onChange={setSize}
                                     options={TEXT_SIZES.map(step => ({value: step.value, label: t(`mobile.account.textSizes.${step.value}`)}))}/>
            </Card>
        </Screen>
    );
}

const styles = StyleSheet.create({
    title: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
});
