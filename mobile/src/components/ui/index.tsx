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
import {colors, font, radius, spacing} from '@/styles/tokens';
import {AppBackground} from '@/components/layout/AppBackground';
import {OfflineBanner} from '@/components/shared/OfflineBanner';
import {useI18n} from '@/providers/I18nContext';
import {useTextScale} from '@/providers/TextSizeContext';

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

export function AppText({variant = 'body', style, children, numberOfLines, selectable}: {
    variant?: TextVariant;
    style?: StyleProp<TextStyle>;
    children: ReactNode;
    numberOfLines?: number;
    selectable?: boolean;
}) {
    return <ScaledText style={[TEXT[variant], style]} numberOfLines={numberOfLines} selectable={selectable}>{children}</ScaledText>;
}

/**
 * A page inside a native stack: the scroll view insets itself under the (glass) header, the tab bar and the keyboard
 * (contentInsetAdjustmentBehavior), with pull-to-refresh when onRefresh is given. Content sits in one centred column
 * (maxWidth) so it never stretches across an iPad. Screens without a header (sign-in) pass edges for the safe area.
 */
/** What a Screen offers the form inside it: a way to re-check the keyboard, and the slot for the element to keep in view. */
const KeyboardReveal = createContext<{ reveal: () => void; anchor: React.RefObject<React.ComponentRef<typeof View> | null> } | null>(null);

/**
 * Wrap a form's submit button: while the keyboard is up the Screen scrolls it into view above the keyboard,
 * whichever field is being typed in, as long as that field itself stays visible.
 */
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

export function Button({label, onPress, tone = 'primary', loading = false, disabled = false, icon: Icon, style}: {
    label: string;
    onPress: () => void;
    tone?: ButtonTone;
    loading?: boolean;
    disabled?: boolean;
    icon?: ComponentType<{ size?: number; color?: string }>;
    style?: StyleProp<ViewStyle>;
}) {
    const palette = BUTTON[tone];
    const inactive = disabled || loading;
    return (
        <Pressable
            onPress={onPress}
            disabled={inactive}
            accessibilityRole="button"
            accessibilityState={{disabled: inactive, busy: loading}}
            style={({pressed}) => [styles.button, {backgroundColor: palette.background, borderColor: palette.border},
                inactive && styles.disabled, pressed && styles.pressed, style]}>
            {loading ? <ActivityIndicator color={palette.text}/> : Icon ? <Icon size={18} color={palette.text}/> : null}
            <ScaledText style={[styles.buttonText, {color: palette.text}]}>{label}</ScaledText>
        </Pressable>
    );
}

export function TextField({label, error, hint, style, ...input}: TextInputProps & {
    label: string;
    error?: string | null;
    hint?: string;
}) {
    const scale = useTextScale();
    const {t} = useI18n();
    const screen = useContext(KeyboardReveal);
    const secure = !!input.secureTextEntry;
    const [hidden, setHidden] = useState(true);
    const EyeIcon = hidden ? Eye : EyeOff;
    return (
        <View style={[styles.field, style as StyleProp<ViewStyle>]}>
            <ScaledText style={styles.label}>{label}</ScaledText>
            <View>
                <TextInput
                    placeholderTextColor={colors.muted}
                    accessibilityLabel={label}
                    {...input}
                    secureTextEntry={secure && hidden}
                    onFocus={event => {
                        input.onFocus?.(event);
                        screen?.reveal();
                    }}
                    style={[styles.input, scaledFont(styles.input, scale), input.multiline && styles.multiline,
                        secure && styles.inputSecure, !!error && styles.inputError]}
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
            <AppText variant="title">{title}</AppText>
            {action}
        </View>
    );
}

export function LoadingState({label}: { label?: string }) {
    return (
        <View style={styles.state} accessibilityLiveRegion="polite">
            <ActivityIndicator color={colors.primary}/>
            {label ? <AppText variant="small">{label}</AppText> : null}
        </View>
    );
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

/** A horizontal row of selectable chips (filters, segmented choices). */
export function ChipGroup<T extends string>({options, value, onChange}: {
    options: { value: T; label: string }[];
    value: T;
    onChange: (value: T) => void;
}) {
    return (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {options.map(option => {
                const active = option.value === value;
                return (
                    <Pressable key={option.value} onPress={() => onChange(option.value)} accessibilityRole="button"
                               accessibilityState={{selected: active}}
                               style={[styles.chip, active && styles.chipActive]}>
                        <ScaledText style={[styles.chipText, active && styles.chipTextActive]}>{option.label}</ScaledText>
                    </Pressable>
                );
            })}
        </ScrollView>
    );
}

export const styles = StyleSheet.create({
    flex: {flex: 1},
    screen: {flex: 1, backgroundColor: colors.canvas},
    // Cards sit on the gradient; a hairline keeps them distinct without heavy shadows.
    content: {flexGrow: 1, padding: spacing.lg, paddingBottom: spacing.xxl},
    column: {width: '100%', alignSelf: 'center', gap: spacing.lg},
    card: {
        backgroundColor: colors.surface, borderRadius: radius.card, padding: spacing.lg, borderWidth: StyleSheet.hairlineWidth,
        borderColor: colors.border, gap: spacing.sm,
    },
    pressed: {opacity: 0.75},
    disabled: {opacity: 0.5},
    button: {
        minHeight: 48, borderRadius: radius.control, borderWidth: 1, paddingHorizontal: spacing.lg,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    },
    buttonText: {fontSize: font.body, fontWeight: '600'},
    field: {gap: 6},
    label: {fontSize: font.small, fontWeight: '600', color: colors.text},
    input: {
        minHeight: 48, borderRadius: radius.control, borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.surface,
        paddingHorizontal: spacing.md, fontSize: font.body, color: colors.text,
    },
    inputSecure: {paddingRight: 48},
    eye: {position: 'absolute', right: 0, top: 0, bottom: 0, width: 48, alignItems: 'center', justifyContent: 'center'},
    multiline: {minHeight: 96, paddingTop: spacing.md, textAlignVertical: 'top'},
    inputError: {borderColor: colors.danger},
    error: {fontSize: font.caption, color: colors.danger},
    hint: {fontSize: font.caption, color: colors.muted},
    badge: {
        flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', borderRadius: radius.control,
        paddingHorizontal: spacing.sm, paddingVertical: 3,
    },
    badgeText: {fontSize: font.caption, fontWeight: '600'},
    sectionTitle: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
    state: {alignItems: 'center', justifyContent: 'center', gap: spacing.md, paddingVertical: spacing.xxl},
    center: {textAlign: 'center'},
    chips: {gap: spacing.sm, paddingVertical: 2},
    chip: {
        borderRadius: radius.control, borderWidth: 1, borderColor: colors.inputBorder, backgroundColor: colors.surface,
        paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    },
    chipActive: {backgroundColor: colors.slateDark, borderColor: colors.slateDark},
    chipText: {fontSize: font.small, color: colors.text, fontWeight: '500'},
    chipTextActive: {color: colors.white},
});
