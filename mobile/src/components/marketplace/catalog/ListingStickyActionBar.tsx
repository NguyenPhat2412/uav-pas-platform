import React from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {FolderKanban, MessageSquareText, Store} from 'lucide-react-native';
import {AppText, ScaledText} from '@/components/ui';
import {useI18n} from '@/providers/I18nContext';
import {colors, font, radius, spacing} from '@/styles/tokens';

/**
 * Shopee-style sticky conversion bar pinned at the bottom of a Flight Service detail page:
 * - Left: Quick Chat Advisor icon action (1-line label)
 * - Right: Prominent primary CTA ("Đăng ký cho dự án" + illustrative price, 1-line labels)
 */
export function ListingStickyActionBar({
    priceLabel,
    hasShop,
    canBook,
    onChatPress,
    onShopPress,
    onCheckoutPress,
}: {
    priceLabel: string;
    hasShop: boolean;
    canBook: boolean;
    onChatPress: () => void;
    onShopPress?: () => void;
    onCheckoutPress: () => void;
}) {
    const insets = useSafeAreaInsets();
    const {t} = useI18n();

    return (
        <View style={[styles.bar, {paddingBottom: Math.max(insets.bottom, spacing.sm)}]}>
            <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('mobile.shop.chatAdvisorBtn')}
                onPress={onChatPress}
                style={({pressed}) => [styles.iconAction, pressed && styles.pressed]}>
                <MessageSquareText size={19} color={colors.slateDark}/>
                <AppText variant="caption" style={styles.iconLabel} numberOfLines={1}>
                    {t('mobile.shop.chatAdvisorBtn')}
                </AppText>
            </Pressable>

            {hasShop && onShopPress ? (
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('mobile.shop.visitShopBtn')}
                    onPress={onShopPress}
                    style={({pressed}) => [styles.iconAction, styles.iconDivider, pressed && styles.pressed]}>
                    <Store size={19} color={colors.slateDark}/>
                    <AppText variant="caption" style={styles.iconLabel} numberOfLines={1}>
                        {t('mobile.shop.visitShopBtn')}
                    </AppText>
                </Pressable>
            ) : null}

            {canBook ? (
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${t('mobile.overnight.subscribeForProjectBtn')} ${priceLabel}`}
                    onPress={onCheckoutPress}
                    style={({pressed}) => [styles.checkoutBtn, pressed && styles.pressed]}>
                    <FolderKanban size={18} color={colors.white}/>
                    <View style={styles.checkoutTextCol}>
                        <ScaledText
                            style={styles.checkoutTitle}
                            numberOfLines={1}
                            adjustsFontSizeToFit
                            minimumFontScale={0.85}>
                            {t('mobile.overnight.subscribeForProjectBtn')}
                        </ScaledText>
                        <ScaledText
                            style={styles.checkoutPrice}
                            numberOfLines={1}
                            adjustsFontSizeToFit
                            minimumFontScale={0.85}>
                            {priceLabel} · {t('mobile.shop.illustrativePrice')}
                        </ScaledText>
                    </View>
                </Pressable>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    bar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingHorizontal: spacing.md,
        paddingTop: spacing.sm,
        backgroundColor: colors.surface,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: colors.border,
    },
    iconAction: {
        minWidth: 54,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        paddingVertical: 4,
        paddingHorizontal: spacing.xs,
    },
    iconDivider: {
        borderLeftWidth: StyleSheet.hairlineWidth,
        borderLeftColor: colors.border,
        paddingLeft: spacing.sm,
    },
    iconLabel: {color: colors.slateDark, fontWeight: '600'},
    checkoutBtn: {
        flex: 1,
        minHeight: 50,
        borderRadius: radius.control,
        backgroundColor: colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        paddingHorizontal: spacing.md,
        paddingVertical: 6,
    },
    checkoutTextCol: {alignItems: 'flex-start', flexShrink: 1},
    checkoutTitle: {color: colors.white, fontSize: font.small, fontWeight: '700', lineHeight: 16},
    checkoutPrice: {color: colors.primaryLight, fontSize: font.caption, fontWeight: '700', lineHeight: 15},
    pressed: {opacity: 0.78},
});
