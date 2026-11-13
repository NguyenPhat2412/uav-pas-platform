import React from 'react';
import {ActivityIndicator, Pressable, StyleSheet, View} from 'react-native';
import {router, type NativeStackHeaderProps} from 'expo-router';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {ChevronLeft, X, type LucideIcon} from 'lucide-react-native';
import {AppBackground} from '@/components/layout/AppBackground';
import {GlassSurface, liquidGlass, ScaledText} from '@/components/ui';
import {useOptionalAuth} from '@/providers/AuthContext';
import {useI18n} from '@/providers/I18nContext';
import {resolvePortalEntryHref} from '@/utils/operations/portal-routing';
import {colors, font} from '@/styles/tokens';

const SHEETS = new Set(['modal', 'formSheet', 'pageSheet', 'fullScreenModal']);

/** A round icon button for headerRight (notifications, locate…), same look as the back button; `count` shows unread items. */
export function HeaderIconButton({icon: Icon, label, onPress, count = 0, loading = false}: {
    icon: LucideIcon;
    label: string;
    onPress: () => void;
    count?: number;
    loading?: boolean;
}) {
    return (
        <Pressable onPress={onPress} disabled={loading} hitSlop={8} accessibilityRole="button"
                   accessibilityLabel={count > 0 ? `${label} (${count})` : label}
                   style={({pressed}) => [pressed && styles.roundPressed]}>
            <GlassSurface interactive style={styles.roundShape} fallback={styles.round}>
                {loading ? <ActivityIndicator color={colors.primary}/> : <Icon size={20} color={colors.text} strokeWidth={2}/>}
            </GlassSurface>
            {count > 0 && <View style={styles.count}><ScaledText style={styles.countText}>{count > 99 ? '99+' : count}</ScaledText></View>}
        </Pressable>
    );
}

/**
 * The app's header. It is opaque and sits below the status bar / Dynamic Island, so content never scrolls under the
 * title or the back button. Left: a round back button (✕ on a sheet); centre: the title; right: the screen's
 * headerRight. A tab root (headerBackVisible: false, headerTitleAlign: 'left') shows a bold left-aligned title and no
 * button. Opened without history (a deep link), back goes to the home tab.
 */
export function AppHeader({back, options, route, navigation}: NativeStackHeaderProps) {
    const insets = useSafeAreaInsets();
    const activePortal = useOptionalAuth()?.activePortal ?? 'customer';
    const {t} = useI18n();
    const sheet = SHEETS.has(options.presentation ?? '');
    const title = typeof options.headerTitle === 'string' ? options.headerTitle : options.title ?? route.name;
    // A screen may draw its own title (the home greeting); it fills the title slot.
    const customTitle = typeof options.headerTitle === 'function' ? options.headerTitle({children: title, tintColor: colors.text}) : null;
    const right = options.headerRight?.({tintColor: colors.primary, canGoBack: !!back});
    const root = options.headerBackVisible === false;
    const leftTitle = options.headerTitleAlign === 'left';

    const leave = () => {
        if (navigation.canGoBack()) navigation.goBack();
        else router.replace(resolvePortalEntryHref(activePortal));
    };
    const Icon = sheet ? X : ChevronLeft;
    const label = sheet ? t('common.close') : t('common.back');

    return (
        // A sheet starts below the status bar already; a pushed screen needs the top inset.
        <View style={[styles.bar, {paddingTop: sheet ? 6 : insets.top}]}>
            {/* The top slice of the page artwork: radar and grid run on from the header into the page. */}
            <AppBackground/>
            <View style={styles.row}>
                {!root && (
                    <View style={styles.side}>
                        <Pressable onPress={leave} hitSlop={8} accessibilityRole="button" accessibilityLabel={label}
                                   style={({pressed}) => [pressed && styles.roundPressed]}>
                            <GlassSurface interactive style={styles.roundShape} fallback={styles.round}>
                                <Icon size={sheet ? 20 : 22} color={colors.text} strokeWidth={2.2}/>
                            </GlassSurface>
                        </Pressable>
                    </View>
                )}
                {customTitle ? <View style={styles.customTitle}>{customTitle}</View>
                    : <ScaledText style={[styles.title, leftTitle && styles.titleLeft]} numberOfLines={1} accessibilityRole="header">{title}</ScaledText>}
                <View style={[styles.side, styles.sideRight, root && leftTitle && styles.sideAuto]}>{right}</View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    // Opaque (content never shows through); the hairline marks where the page scrolls under the bar.
    bar: {overflow: 'hidden', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border},
    row: {height: 52, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 8},
    // Equal side slots keep the title centred whatever sits on the right.
    side: {minWidth: 44, alignItems: 'flex-start', justifyContent: 'center'},
    sideRight: {alignItems: 'flex-end'},
    roundShape: {width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center'},
    // Solid fallback where Liquid Glass is unavailable (older iOS, Android).
    round: {
        backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border,
        shadowColor: colors.text, shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: {width: 0, height: 2}, elevation: 1,
    },
    roundPressed: liquidGlass ? {transform: [{scale: 0.94}]} : {opacity: 0.7},
    sideAuto: {minWidth: 0},
    customTitle: {flex: 1, justifyContent: 'center', paddingLeft: 4},
    count: {
        position: 'absolute', top: -4, right: -6, minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5,
        backgroundColor: colors.primary, borderWidth: 1.5, borderColor: colors.surface, alignItems: 'center', justifyContent: 'center',
    },
    countText: {color: colors.white, fontSize: 11, fontWeight: '700'},
    title: {flex: 1, textAlign: 'center', fontSize: font.title, fontWeight: '600', color: colors.text},
    titleLeft: {textAlign: 'left', fontSize: font.heading, fontWeight: '700', paddingLeft: 4},
});
