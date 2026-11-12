import React from 'react';
import {ActivityIndicator, Linking, Pressable, StyleSheet, View} from 'react-native';
import {Mail, MapPin, MessageCircle, PhoneCall} from 'lucide-react-native';
import {AppText, Card, ScaledText, SectionTitle} from '@/components/ui';
import {usePublicSiteInfo} from '@/hooks/support/usePublicSupportMobile';
import {useI18n} from '@/providers/I18nContext';
import {colors, font, radius, spacing} from '@/styles/tokens';

function formatPhone(raw: string): string {
    const trimmed = raw.trim();
    if (!trimmed || /[\s.()-]/.test(trimmed)) return trimmed;
    if (/^0\d{9}$/.test(trimmed)) return trimmed.replace(/^(0\d{3})(\d{3})(\d{3})$/, '$1 $2 $3');
    if (/^0\d{10}$/.test(trimmed)) return trimmed.replace(/^(0\d{2})(\d{4})(\d{4})$/, '$1 $2 $3');
    return trimmed;
}

/**
 * Direct contact channels card backed by PostgreSQL public site settings
 * (Zalo direct support, dispatch hotline, support email, and operations center address).
 */
export function MobileSupportContactCard() {
    const {t} = useI18n();
    const {data, isLoading} = usePublicSiteInfo();

    const zaloPhone = data?.zaloPhone?.trim() || '';
    const hotline = data?.dispatchHotline?.trim() || '';
    const email = data?.email?.trim() || '';
    const address = data?.address?.trim() || '';
    const hasAnyContact = Boolean(zaloPhone || hotline || email || address);

    if (isLoading && !hasAnyContact) {
        return (
            <Card>
                <SectionTitle title={t('mobile.support.contactSectionTitle')}/>
                <View style={styles.loadingWrap}>
                    <ActivityIndicator size="small" color={colors.primary}/>
                </View>
            </Card>
        );
    }

    if (!hasAnyContact) return null;

    const handleOpenZalo = () => {
        const digits = zaloPhone.replace(/\D/g, '');
        const normalized = digits.startsWith('84') && digits.length === 11 ? `0${digits.slice(2)}` : digits;
        if (normalized) void Linking.openURL(`https://zalo.me/${normalized}`);
    };

    const handleCallHotline = () => {
        const sanitizedPhone = hotline.replace(/[^\d+]/g, '') || hotline;
        void Linking.openURL(`tel:${sanitizedPhone}`);
    };

    const handleSendEmail = () => {
        void Linking.openURL(`mailto:${email}`);
    };

    return (
        <Card>
            <SectionTitle title={t('mobile.support.contactSectionTitle')}/>

            {zaloPhone ? (
                <View style={styles.channelRow}>
                    <View style={[styles.iconBox, styles.iconBoxPrimary]}>
                        <MessageCircle size={18} color={colors.primary}/>
                    </View>
                    <View style={styles.channelInfo}>
                        <AppText variant="caption">{t('mobile.support.zaloLabel')}</AppText>
                        <AppText style={styles.channelValue} selectable>{formatPhone(zaloPhone)}</AppText>
                    </View>
                    <Pressable onPress={handleOpenZalo} accessibilityRole="button" accessibilityLabel={t('mobile.support.chatZalo')}
                               style={({pressed}) => [styles.actionPill, styles.actionPrimary, pressed && styles.pressed]}>
                        <MessageCircle size={14} color={colors.white}/>
                        <ScaledText style={styles.actionPrimaryText}>{t('mobile.support.chatZalo')}</ScaledText>
                    </Pressable>
                </View>
            ) : null}

            {hotline ? (
                <View style={styles.channelRow}>
                    <View style={[styles.iconBox, styles.iconBoxPrimary]}>
                        <PhoneCall size={18} color={colors.primary}/>
                    </View>
                    <View style={styles.channelInfo}>
                        <AppText variant="caption">{t('mobile.support.hotlineLabel')}</AppText>
                        <AppText style={styles.channelValue} selectable>{formatPhone(hotline)}</AppText>
                    </View>
                    <Pressable onPress={handleCallHotline} accessibilityRole="button" accessibilityLabel={t('mobile.support.callNow')}
                               style={({pressed}) => [styles.actionPill, styles.actionSecondary, pressed && styles.pressed]}>
                        <PhoneCall size={14} color={colors.primary}/>
                        <ScaledText style={styles.actionSecondaryText}>{t('mobile.support.callNow')}</ScaledText>
                    </Pressable>
                </View>
            ) : null}

            {email ? (
                <View style={styles.channelRow}>
                    <View style={styles.iconBox}>
                        <Mail size={18} color={colors.slateDark}/>
                    </View>
                    <View style={styles.channelInfo}>
                        <AppText variant="caption">{t('mobile.support.emailLabel')}</AppText>
                        <AppText variant="small" style={styles.channelValue} selectable>{email}</AppText>
                    </View>
                    <Pressable onPress={handleSendEmail} accessibilityRole="button" accessibilityLabel={t('mobile.support.sendEmail')}
                               style={({pressed}) => [styles.actionPill, styles.actionSecondary, pressed && styles.pressed]}>
                        <Mail size={14} color={colors.primary}/>
                        <ScaledText style={styles.actionSecondaryText}>{t('mobile.support.sendEmail')}</ScaledText>
                    </Pressable>
                </View>
            ) : null}

            {address ? (
                <View style={styles.channelRow}>
                    <View style={styles.iconBox}>
                        <MapPin size={18} color={colors.slateDark}/>
                    </View>
                    <View style={styles.channelInfo}>
                        <AppText variant="caption">{t('mobile.support.addressLabel')}</AppText>
                        <AppText variant="small" selectable>{address}</AppText>
                    </View>
                </View>
            ) : null}
        </Card>
    );
}

const styles = StyleSheet.create({
    loadingWrap: {paddingVertical: spacing.md, alignItems: 'center', justifyContent: 'center'},
    channelRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xs},
    iconBox: {
        width: 38, height: 38, borderRadius: radius.control, backgroundColor: colors.slateLight,
        alignItems: 'center', justifyContent: 'center',
    },
    iconBoxPrimary: {backgroundColor: colors.primaryLight},
    channelInfo: {flex: 1, gap: 2},
    channelValue: {fontWeight: '600', color: colors.text},
    actionPill: {
        flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
        paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.control, borderWidth: 1,
    },
    actionPrimary: {backgroundColor: colors.primary, borderColor: colors.primary},
    actionPrimaryText: {fontSize: font.caption, fontWeight: '700', color: colors.white},
    actionSecondary: {backgroundColor: colors.primaryLight, borderColor: colors.primary},
    actionSecondaryText: {fontSize: font.caption, fontWeight: '700', color: colors.primary},
    pressed: {opacity: 0.75},
});
