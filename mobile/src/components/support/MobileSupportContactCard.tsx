import React, {useState} from 'react';
import {ActivityIndicator, Linking, Pressable, StyleSheet, View} from 'react-native';
import {ChevronDown, ChevronUp, Mail, MapPin, MessageCircle, PhoneCall} from 'lucide-react-native';
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
 * Collapsed to one row of icon shortcuts by default so the chat below gets the screen; tap the row for the details.
 */
export function MobileSupportContactCard() {
    const {t} = useI18n();
    const {data, isLoading} = usePublicSiteInfo();
    const [open, setOpen] = useState(false);

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

    const Chevron = open ? ChevronUp : ChevronDown;
    const shortcuts = [
        zaloPhone ? {key: 'zalo', icon: MessageCircle, label: t('mobile.support.chatZalo'), onPress: handleOpenZalo, primary: true} : null,
        hotline ? {key: 'call', icon: PhoneCall, label: t('mobile.support.callNow'), onPress: handleCallHotline, primary: false} : null,
        email ? {key: 'mail', icon: Mail, label: t('mobile.support.sendEmail'), onPress: handleSendEmail, primary: false} : null,
    ].filter(shortcut => shortcut !== null);

    return (
        <Card>
            <View style={styles.header}>
                <Pressable onPress={() => setOpen(value => !value)} accessibilityRole="button" accessibilityState={{expanded: open}}
                           accessibilityLabel={t('mobile.support.contactSectionTitle')} style={styles.toggle}>
                    <Chevron size={18} color={colors.muted}/>
                    <AppText variant="title">{t('mobile.support.contactSectionTitle')}</AppText>
                </Pressable>
                {!open && shortcuts.map(({key, icon: Icon, label, onPress, primary}) => (
                    <Pressable key={key} onPress={onPress} accessibilityRole="button" accessibilityLabel={label}
                               style={({pressed}) => [styles.shortcut, primary ? styles.actionPrimary : styles.actionSecondary, pressed && styles.pressed]}>
                        <Icon size={18} color={primary ? colors.white : colors.primary}/>
                    </Pressable>
                ))}
            </View>
            {open ? (<>

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
            </>) : null}
        </Card>
    );
}

const styles = StyleSheet.create({
    header: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
    toggle: {flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 44},
    shortcut: {width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center'},
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
