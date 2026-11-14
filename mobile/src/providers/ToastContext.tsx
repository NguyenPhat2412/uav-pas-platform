import React, {createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {Animated, Pressable, StyleSheet, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {AlertTriangle, CheckCircle2, Info} from 'lucide-react-native';
import {colors, font, radius, spacing} from '@/styles/tokens';

type ToastKind = 'success' | 'error' | 'info';

interface ToastMessage {
    id: number;
    kind: ToastKind;
    message: string;
}

interface ToastValue {
    show: (message: string, kind?: ToastKind) => void;
}

const sharedToast = globalThis as { __uavToastContext?: React.Context<ToastValue | undefined> };
const ToastContext = (sharedToast.__uavToastContext ??= createContext<ToastValue | undefined>(undefined));

const ICON = {success: CheckCircle2, error: AlertTriangle, info: Info} as const;
const TONE = {
    success: {background: colors.slateDark, text: colors.white},
    error: {background: colors.danger, text: colors.white},
    info: {background: colors.text, text: colors.white},
} as const;

/** One short message at a time dropping in at the top of the screen, dismissed by tapping or after four seconds. */
export function ToastProvider({children}: { children: ReactNode }) {
    const insets = useSafeAreaInsets();
    const [toast, setToast] = useState<ToastMessage | null>(null);
    const [opacity] = useState(() => new Animated.Value(0));
    const counter = useRef(0);

    const show = useCallback((message: string, kind: ToastKind = 'info') => {
        counter.current += 1;
        setToast({id: counter.current, kind, message});
    }, []);

    useEffect(() => {
        if (!toast) return;
        Animated.spring(opacity, {toValue: 1, friction: 6, tension: 90, useNativeDriver: true}).start();
        const timer = setTimeout(() => {
            Animated.timing(opacity, {toValue: 0, duration: 180, useNativeDriver: true}).start(() => setToast(null));
        }, 4000);
        return () => clearTimeout(timer);
    }, [toast, opacity]);

    const value = useMemo(() => ({show}), [show]);
    const Icon = toast ? ICON[toast.kind] : Info;
    const tone = toast ? TONE[toast.kind] : TONE.info;

    return (
        <ToastContext.Provider value={value}>
            {children}
            {toast && (
                <Animated.View pointerEvents="box-none" style={[styles.wrap, {
                    top: insets.top + spacing.sm, opacity,
                    transform: [{translateY: opacity.interpolate({inputRange: [0, 1], outputRange: [-120, 0]})}],
                }]}>
                    <Pressable accessibilityRole="alert" onPress={() => setToast(null)} style={[styles.toast, {backgroundColor: tone.background}]}>
                        <Icon size={18} color={tone.text}/>
                        <View style={styles.body}>
                            <Text style={[styles.text, {color: tone.text}]}>{toast.message}</Text>
                        </View>
                    </Pressable>
                </Animated.View>
            )}
        </ToastContext.Provider>
    );
}

export function useToast(): ToastValue {
    const context = useContext(ToastContext);
    if (!context) throw new Error('useToast must be used within a ToastProvider');
    return context;
}

const styles = StyleSheet.create({
    wrap: {position: 'absolute', left: spacing.lg, right: spacing.lg},
    toast: {
        flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
        borderRadius: radius.card, shadowColor: colors.text, shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: {width: 0, height: 4},
    },
    body: {flex: 1},
    text: {fontSize: font.small, fontWeight: '600'},
});
