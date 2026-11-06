import React from 'react';
import {Platform, Pressable, StyleSheet, View} from 'react-native';
import {usePathname, useRouter} from 'expo-router';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable} from 'expo-glass-effect';
import {AssistantMascot} from '@/components/assistant/AssistantMascot';
import {useI18n} from '@/providers/I18nContext';
import {colors} from '@/styles/tokens';

const TAB_ROOTS = [
    '/customer/home',
    '/customer/missions',
    '/customer/weather',
    '/customer/notifications',
    '/customer/account',
    '/operations/missions',
    '/operations/sar',
    '/operations/fleet',
    '/operations/weather',
    '/operations/account',
];
const glass = Platform.OS === 'ios' && isLiquidGlassAvailable() && isGlassEffectAPIAvailable();
const SIZE = 58;
// Clears the floating Liquid Glass tab bar (about 62 pt tall above the home indicator).
const ABOVE_TAB_BAR = 74;

/** The floating mascot button over the tab screens, like the web widget's launcher; opens the chat sheet. */
export function AssistantLauncher() {
    const {t} = useI18n();
    const router = useRouter();
    const pathname = usePathname();
    const insets = useSafeAreaInsets();
    if (!TAB_ROOTS.includes(pathname)) return null;
    const target = pathname.startsWith('/operations') ? '/operations/assistant' : '/customer/assistant';
    const content = <AssistantMascot size={42}/>;
    return (
        <View pointerEvents="box-none" style={[styles.wrap, {bottom: insets.bottom + ABOVE_TAB_BAR}]}>
            <Pressable onPress={() => router.push(target)} accessibilityRole="button" accessibilityLabel={t('admin.assistant.open')}
                       style={({pressed}) => [pressed && styles.pressed]}>
                {glass
                    ? <GlassView isInteractive glassEffectStyle="regular" style={styles.button}>{content}</GlassView>
                    : <View style={[styles.button, styles.solid]}>{content}</View>}
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: {position: 'absolute', right: 16},
    button: {width: SIZE, height: SIZE, borderRadius: SIZE / 2, alignItems: 'center', justifyContent: 'center', overflow: 'hidden'},
    solid: {
        backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border,
        shadowColor: colors.text, shadowOpacity: 0.18, shadowRadius: 10, shadowOffset: {width: 0, height: 4},
    },
    pressed: {transform: [{scale: 0.94}]},
});
