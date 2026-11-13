import {SkeletonList} from './Skeleton';
import React, {type ComponentType, createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {
    ActivityIndicator,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleProp,
    StyleSheet,
    Text,
    TextInput,
    TextInputProps,
    TextProps,
    TextStyle,
    View,
    ViewStyle,
} from 'react-native';
import {SafeAreaView, useSafeAreaInsets, type Edge} from 'react-native-safe-area-context';
import {AlertTriangle, Eye, EyeOff, Inbox, type LucideIcon} from 'lucide-react-native';
import {GlassSurface, liquidGlass} from './Glass';
import {colors, font, radius, spacing} from '@/styles/tokens';
import {AppBackground} from '@/components/layout/AppBackground';
import {OfflineBanner} from '@/components/shared/OfflineBanner';
import {useI18n} from '@/providers/I18nContext';
import {useTextScale} from '@/providers/TextSizeContext';

export {GlassSurface, liquidGlass};

/** Widest a content column grows (phones use the full width; iPad and landscape centre it). */
export const CONTENT_WIDTH = 640;

type TextVariant = 'display' | 'heading' | 'title' | 'body' | 'small' | 'caption';

const TEXT: Record<TextVariant, TextStyle> = {
    display: {fontSize: font.display, fontWeight: '700', color: colors.text},
    heading: {fontSize: font.heading, fontWeight: '700', color: colors.text},
    title: {fontSize: font.title, fontWeight: '600', color: colors.text},
    body: {fontSize: font.body, color: colors.text},
    small: {fontSize: font.small, color: colors.textSecondary},
    caption: {fontSize: font.caption, color: colors.muted},
};

/** fontSize and lineHeight of a style times the in-app text size (Account → Cỡ chữ); nothing to add at the normal size. */
function scaledFont(style: StyleProp<TextStyle>, scale: number): TextStyle | null {
    if (scale === 1) return null;
    const {fontSize, lineHeight} = StyleSheet.flatten(style) ?? {};
    return {
        ...(fontSize ? {fontSize: Math.round(fontSize * scale)} : null),
        ...(lineHeight ? {lineHeight: Math.round(lineHeight * scale)} : null),
    };
}

/** Every piece of text in the app goes through here (or AppText), so the text size setting reaches it. */
export function ScaledText({style, ...props}: TextProps) {
    const scale = useTextScale();
    return <Text {...props} style={[style, scaledFont(style, scale)]}/>;
}

export function AppText({variant = 'body', style, children, numberOfLines, selectable, adjustsFontSizeToFit, minimumFontScale}: {
    variant?: TextVariant; style?: StyleProp<TextStyle>; children: ReactNode;
    numberOfLines?: number; selectable?: boolean; adjustsFontSizeToFit?: boolean; minimumFontScale?: number;
}) {
    return (
        <ScaledText style={[TEXT[variant], style]} numberOfLines={numberOfLines} selectable={selectable}
                    adjustsFontSizeToFit={adjustsFontSizeToFit} minimumFontScale={minimumFontScale}>{children}</ScaledText>
    );
}

/** Native stack screen with pull-to-refresh, centred max-width column, and keyboard auto-reveal. */
const KeyboardReveal = createContext<{ reveal: () => void; anchor: React.RefObject<React.ComponentRef<typeof View> | null> } | null>(null);

/** Wraps a form submit button so Screen keeps it visible above the keyboard while typing. */
export function KeyboardAnchor({children}: { children: ReactNode }) {
    const screen = useContext(KeyboardReveal);
    return <View ref={screen?.anchor} collapsable={false}>{children}</View>;
}

export function Screen({children, onRefresh, refreshing = false, scroll = true, edges = [], contentStyle, maxWidth = CONTENT_WIDTH}: {
    children: ReactNode;
    onRefresh?: () => void;
    refreshing?: boolean;
    scroll?: boolean;
    edges?: Edge[];
    contentStyle?: StyleProp<ViewStyle>;
    maxWidth?: number;
}) {
    const scrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);
    const anchor = useRef<React.ComponentRef<typeof View>>(null);
    const scrolled = useRef(0);
    const insets = useSafeAreaInsets();
    const top = edges.includes('top') ? insets.top : 0;
    const reveal = useCallback(() => {
        // Next frame: on focus the field is not yet the first responder.
        requestAnimationFrame(() => {
            const field = TextInput.State.currentlyFocusedInput();
            const keyboard = Keyboard.metrics();
            const target = anchor.current;
            if (!field || !keyboard || !target || !Keyboard.isVisible()) return;
            target.measureInWindow((_x, y, _width, height) => field.measureInWindow((_fx, fieldY) => {
                const hidden = y + height + spacing.md - keyboard.screenY;
                // Never so far that the field being typed in (and its label above it) leaves the top of the screen.
                const room = fieldY - 28 - top - spacing.sm;
                const by = Math.min(hidden, room);
                if (by > 0) scrollRef.current?.scrollTo({y: scrolled.current + by, animated: true});
            }));
        });
    }, [top]);
    useEffect(() => {
        const shown = Keyboard.addListener('keyboardDidShow', reveal);
        return () => shown.remove();
    }, [reveal]);
    const keyboardReveal = useMemo(() => ({reveal, anchor}), [reveal]);
    const column = (
        <View style={[styles.column, {maxWidth}, contentStyle]}>
            <OfflineBanner/>
            {children}
        </View>
    );
    return (
        <SafeAreaView edges={edges} style={styles.screen}>
            <AppBackground/>
            {/* A scroll view already insets itself for the keyboard; padding here as well would lift the form twice. */}
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' && !scroll ? 'padding' : undefined} style={styles.flex}>
                {scroll ? (
                    <ScrollView
                        ref={scrollRef}
                        onScroll={event => {
                            scrolled.current = event.nativeEvent.contentOffset.y;
                        }}
                        scrollEventThrottle={16}
                        contentInsetAdjustmentBehavior="automatic"
                        automaticallyAdjustKeyboardInsets
                        contentContainerStyle={styles.content}
                        keyboardShouldPersistTaps="handled"
                        refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary}/> : undefined}>
                        <KeyboardReveal.Provider value={keyboardReveal}>{column}</KeyboardReveal.Provider>
                    </ScrollView>
                ) : column}
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

export function Card({children, style, onPress, accessibilityLabel}: {
    children: ReactNode;
    style?: StyleProp<ViewStyle>;
    onPress?: () => void;
    accessibilityLabel?: string;
}) {
    if (!onPress) return <View style={[styles.card, style]}>{children}</View>;
    return (
        <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={accessibilityLabel}
                   style={({pressed}) => [styles.card, pressed && styles.pressed, style]}>
            {children}
        </Pressable>
    );
}

type ButtonTone = 'primary' | 'secondary' | 'ghost' | 'danger';

const BUTTON: Record<ButtonTone, { background: string; text: string; border: string }> = {
    primary: {background: colors.primary, text: colors.white, border: colors.primary},
    secondary: {background: colors.surface, text: colors.text, border: colors.inputBorder},
    ghost: {background: 'transparent', text: colors.primary, border: 'transparent'},
    danger: {background: colors.danger, text: colors.white, border: colors.danger},
};

export function Button({label, onPress, tone = 'primary', size = 'md', loading = false, disabled = false, icon: Icon, style}: {
    label: string; onPress: () => void; tone?: ButtonTone; size?: 'md' | 'sm';
    loading?: boolean; disabled?: boolean; icon?: ComponentType<{ size?: number; color?: string }>; style?: StyleProp<ViewStyle>;
}) {
    const palette = BUTTON[tone];
    const inactive = disabled || loading;
    const compact = size === 'sm';
    return (
        <Pressable
            onPress={onPress} disabled={inactive} accessibilityRole="button"
            accessibilityState={{disabled: inactive, busy: loading}}
            style={({pressed}) => [styles.button, compact && styles.buttonSm, {backgroundColor: palette.background, borderColor: palette.border},
                inactive && styles.disabled, pressed && styles.pressed, style]}>
            {loading ? <ActivityIndicator size="small" color={palette.text}/> : Icon ? <Icon size={compact ? 15 : 18} color={palette.text}/> : null}
            <ScaledText numberOfLines={1} style={[styles.buttonText, compact && styles.buttonTextSm, {color: palette.text}]}>{label}</ScaledText>
        </Pressable>
    );
}

export function TextField({label, error, hint, style, ...input}: TextInputProps & {
    label?: string;
    error?: string | null;
    hint?: string;
}) {
    const scale = useTextScale();
    const {t} = useI18n();
    const screen = useContext(KeyboardReveal);
    const secure = !!input.secureTextEntry;
    const [hidden, setHidden] = useState(true);
    const [focused, setFocused] = useState(false);
    const EyeIcon = hidden ? Eye : EyeOff;
    return (
        <View style={[styles.field, style as StyleProp<ViewStyle>]}>
            {label ? <ScaledText style={styles.label}>{label}</ScaledText> : null}
            <View>
                <TextInput
                    placeholderTextColor={colors.muted}
                    accessibilityLabel={label || input.placeholder}
                    {...input}
                    secureTextEntry={secure && hidden}
                    onFocus={event => {
                        setFocused(true);
                        input.onFocus?.(event);
                        screen?.reveal();
                    }}
                    onBlur={event => {
                        setFocused(false);
                        input.onBlur?.(event);
                    }}
                    style={[styles.input, scaledFont(styles.input, scale), input.multiline && styles.multiline,
                        secure && styles.inputSecure, focused && styles.inputFocused, !!error && styles.inputError]}
                />
                {secure && (
                    <Pressable onPress={() => setHidden(value => !value)} style={styles.eye} accessibilityRole="button"
                               accessibilityLabel={t(hidden ? 'authShared.showPassword' : 'authShared.hidePassword')}>
                        <EyeIcon size={20} color={colors.muted}/>
                    </Pressable>
                )}
            </View>
            {error ? <ScaledText style={styles.error} accessibilityRole="alert">{error}</ScaledText>
                : hint ? <ScaledText style={styles.hint}>{hint}</ScaledText> : null}
        </View>
    );
}

export function Badge({label, background = colors.slateLight, color = colors.slateDark, icon: Icon}: {
    label: string;
    background?: string;
    color?: string;
    icon?: LucideIcon;
}) {
    return (
        <View style={[styles.badge, {backgroundColor: background}]}>
            {Icon && <Icon size={12} color={color}/>}
            <ScaledText style={[styles.badgeText, {color}]} numberOfLines={1}>{label}</ScaledText>
        </View>
    );
}

export function SectionTitle({title, action}: { title: string; action?: ReactNode }) {
    return (
        <View style={styles.sectionTitle}>
            <AppText variant="title" style={styles.sectionTitleText}>{title}</AppText>
            {action}
        </View>
    );
}

export {Skeleton, SkeletonList} from './Skeleton';

/** First-load placeholder: card-shaped skeletons instead of a spinner; the label stays for screen readers. */
export function LoadingState({label}: { label?: string }) {
    return <SkeletonList label={label}/>;
}

export function ErrorState({message, retryLabel, onRetry}: { message: string; retryLabel?: string; onRetry?: () => void }) {
    return (
        <View style={styles.state} accessibilityRole="alert">
            <AlertTriangle size={28} color={colors.danger}/>
            <AppText variant="small" style={styles.center}>{message}</AppText>
            {onRetry && retryLabel ? <Button label={retryLabel} tone="secondary" onPress={onRetry}/> : null}
        </View>
    );
}

export function EmptyState({message, icon: Icon = Inbox, action}: { message: string; icon?: LucideIcon; action?: ReactNode }) {
    return (
        <View style={styles.state}>
            <Icon size={32} color={colors.muted}/>
            <AppText variant="small" style={styles.center}>{message}</AppText>
            {action}
        </View>
    );
}

/** Selectable chips (scrollable row by default, or wrapped inside cards when wrap is true). */
export function ChipGroup<T extends string>({options, value, onChange, wrap = false}: {
    options: { value: T; label: string }[]; value: T; onChange: (value: T) => void; wrap?: boolean;
}) {
    const items = options.map(option => {
        const active = option.value === value;
        return (
            <Pressable key={option.value} onPress={() => onChange(option.value)} accessibilityRole="button"
                       accessibilityState={{selected: active}}>
                <GlassSurface interactive tint={active ? colors.slateDark : colors.slateLight}
                              style={[styles.chip, wrap && styles.chipWrapItem, liquidGlass && styles.chipGlass]}
                              fallback={active ? styles.chipActive : undefined}>
                    <ScaledText numberOfLines={1} style={[styles.chipText, active && styles.chipTextActive]}>{option.label}</ScaledText>
                </GlassSurface>
            </Pressable>
        );
    });
    if (wrap) return <View style={styles.chipsWrap}>{items}</View>;
    return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>{items}</ScrollView>;
}

export const styles = StyleSheet.create({
    flex: {flex: 1},
    screen: {flex: 1, backgroundColor: colors.canvas},
    // Cards sit on the gradient; a hairline keeps them distinct without heavy shadows.
    content: {flexGrow: 1, padding: spacing.lg, paddingBottom: spacing.xxl},
    column: {width: '100%', alignSelf: 'center', gap: spacing.lg},
    card: {
        backgroundColor: colors.surface, borderRadius: radius.card, padding: spacing.lg, borderWidth: StyleSheet.hairlineWidth,
        borderColor: colors.border, gap: spacing.sm, overflow: 'hidden',
    },
    pressed: {opacity: 0.75},
    disabled: {opacity: 0.5},
    button: {
        minHeight: 48, borderRadius: radius.control, borderWidth: 1, paddingHorizontal: spacing.lg,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    },
    buttonSm: {minHeight: 36, paddingHorizontal: spacing.md, paddingVertical: 6, gap: 6},
    buttonText: {fontSize: font.body, fontWeight: '600', flexShrink: 1},
    buttonTextSm: {fontSize: font.small},
    field: {gap: 6},
    label: {fontSize: font.small, fontWeight: '600', color: colors.text},
    input: {
        minHeight: 48, borderRadius: radius.control, borderWidth: 1, borderColor: colors.inputBorder, backgroundColor: colors.surface,
        paddingHorizontal: spacing.md, fontSize: font.body, color: colors.text,
    },
    inputFocused: {borderColor: colors.primary},
    inputSecure: {paddingRight: 48},
    eye: {position: 'absolute', right: 0, top: 0, bottom: 0, width: 48, alignItems: 'center', justifyContent: 'center'},
    multiline: {minHeight: 96, paddingTop: spacing.md, textAlignVertical: 'top'},
    inputError: {borderColor: colors.danger},
    error: {fontSize: font.caption, color: colors.danger},
    hint: {fontSize: font.caption, color: colors.muted},
    badge: {
        flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', borderRadius: radius.control,
        paddingHorizontal: spacing.sm, paddingVertical: 3, maxWidth: '100%', flexShrink: 1,
    },
    badgeText: {fontSize: font.caption, fontWeight: '600', flexShrink: 1},
    sectionTitle: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: spacing.sm},
    sectionTitleText: {flexShrink: 1},
    state: {alignItems: 'center', justifyContent: 'center', gap: spacing.md, paddingVertical: spacing.xxl},
    center: {textAlign: 'center'},
    chips: {gap: spacing.sm, paddingVertical: 2},
    chipsWrap: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs},
    chip: {
        borderRadius: radius.control, borderWidth: 1, borderColor: colors.inputBorder, backgroundColor: colors.surface,
        paddingHorizontal: spacing.md, paddingVertical: spacing.sm, maxWidth: '100%',
    },
    chipWrapItem: {paddingHorizontal: spacing.md, paddingVertical: 6},
    chipActive: {backgroundColor: colors.slateDark, borderColor: colors.slateDark},
    // Glass draws its own edge and fill; the solid chip border would sit on top of it.
    chipGlass: {borderWidth: 0, backgroundColor: 'transparent', borderRadius: 999},
    chipText: {fontSize: font.small, color: colors.text, fontWeight: '500', flexShrink: 1},
    chipTextActive: {color: colors.white},
});
