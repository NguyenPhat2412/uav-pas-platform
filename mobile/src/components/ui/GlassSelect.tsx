import React, {useState} from 'react';
import {Modal, Pressable, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {CheckCircle2, ChevronDown, Circle, X, type LucideIcon} from 'lucide-react-native';
import {GlassSurface} from '@/components/ui/Glass';
import {FieldLabel} from '@/components/ui/FieldLabel';
import {AppText, Badge, ScaledText} from '@/components/ui';
import {useTranslateOutsideProvider} from '@/providers/I18nContext';
import {colors, font, radius, spacing} from '@/styles/tokens';

export interface GlassOption<T extends string = string> {
    value: T;
    label: string;
    description?: string;
    badge?: string;
    icon?: LucideIcon;
}

/** Interactive Liquid Glass option cards (1 or 2 columns) for touch-first selection. */
export function GlassSelectCards<T extends string>({
    label,
    required,
    optional,
    value,
    options,
    onChange,
    columns = 2,
    error,
    style,
}: {
    label?: string;
    required?: boolean;
    optional?: boolean;
    value: T;
    options: GlassOption<T>[];
    onChange: (next: T) => void;
    columns?: 1 | 2;
    error?: string | null;
    style?: StyleProp<ViewStyle>;
}) {
    const isBento = columns === 2;
    return (
        <View style={[styles.group, style]}>
            <FieldLabel label={label} required={required} optional={optional}/>
            <View style={isBento ? styles.gridTwo : styles.gridOne}>
                {options.map(option => {
                    const selected = option.value === value;
                    const Icon = option.icon;
                    const CheckIcon = selected ? CheckCircle2 : Circle;
                    const badgeNode = option.badge ? (
                        <Badge
                            label={option.badge}
                            background={selected ? colors.surface : colors.slateLight}
                            color={selected ? colors.primary : colors.slateDark}
                        />
                    ) : null;
                    const iconNode = Icon ? (
                        <View style={[styles.iconBubble, selected && styles.iconBubbleSelected]}>
                            <Icon size={16} color={selected ? colors.primary : colors.slateDark}/>
                        </View>
                    ) : null;

                    return (
                        <Pressable
                            key={option.value}
                            onPress={() => onChange(option.value)}
                            accessibilityRole="radio"
                            accessibilityState={{selected}}
                            accessibilityLabel={option.description ? `${option.label}. ${option.description}` : option.label}
                            style={({pressed}) => [isBento ? styles.cellHalf : styles.cellFull, pressed && styles.pressed]}>
                            <GlassSurface
                                interactive
                                tint={selected ? colors.primaryLight : undefined}
                                style={[
                                    styles.optionGlass,
                                    isBento && styles.optionGlassBento,
                                    selected ? styles.optionSelectedBorder : styles.optionIdleBorder,
                                ]}
                                fallback={selected ? styles.optionFallbackSelected : styles.optionFallbackIdle}>
                                {isBento ? (
                                    <>
                                        <View style={styles.optionTop}>
                                            {iconNode ?? <View/>}
                                            <View style={styles.topRightRow}>
                                                {badgeNode}
                                                <CheckIcon size={18} color={selected ? colors.primary : colors.inputBorder}/>
                                            </View>
                                        </View>
                                        <View style={styles.bentoBody}>
                                            <ScaledText numberOfLines={2} style={[styles.optionTitleBento, selected && styles.optionTitleSelected]}>
                                                {option.label}
                                            </ScaledText>
                                            {option.description ? <AppText variant="caption" numberOfLines={2}>{option.description}</AppText> : null}
                                        </View>
                                    </>
                                ) : (
                                    <>
                                        <View style={styles.optionTop}>
                                            <View style={styles.optionTitleWrap}>
                                                {iconNode}
                                                <ScaledText numberOfLines={2} style={[styles.optionTitle, selected && styles.optionTitleSelected]}>
                                                    {option.label}
                                                </ScaledText>
                                            </View>
                                            <View style={styles.topRightRow}>
                                                {badgeNode}
                                                <CheckIcon size={18} color={selected ? colors.primary : colors.inputBorder}/>
                                            </View>
                                        </View>
                                        {option.description ? <AppText variant="caption" numberOfLines={2}>{option.description}</AppText> : null}
                                    </>
                                )}
                            </GlassSurface>
                        </Pressable>
                    );
                })}
            </View>
            {error ? <ScaledText style={styles.error} accessibilityRole="alert">{error}</ScaledText> : null}
        </View>
    );
}

/** Compact Liquid Glass select trigger card that opens a bottom sheet of Liquid Glass option cards. */
export function GlassSelectField<T extends string>({
    label,
    required,
    optional,
    sheetTitle,
    placeholder,
    value,
    options,
    onChange,
    error,
    disabled = false,
    showTriggerDescription = false,
}: {
    label?: string;
    required?: boolean;
    optional?: boolean;
    sheetTitle?: string;
    placeholder?: string;
    value: T;
    options: GlassOption<T>[];
    onChange: (next: T) => void;
    error?: string | null;
    disabled?: boolean;
    showTriggerDescription?: boolean;
}) {
    const t = useTranslateOutsideProvider();
    const [open, setOpen] = useState(false);
    const current = options.find(item => item.value === value);
    const CurrentIcon = current?.icon;
    const inlineBadge = Boolean(current?.badge && current.badge.length <= 6);
    const triggerDesc = showTriggerDescription ? current?.description : undefined;

    return (
        <View style={styles.group}>
            <FieldLabel label={label} required={required} optional={optional}/>
            <Pressable
                disabled={disabled}
                onPress={() => setOpen(true)}
                accessibilityRole="button"
                accessibilityState={{disabled, expanded: open}}
                accessibilityLabel={`${label || sheetTitle || ''}: ${current?.label ?? placeholder ?? ''}`}
                style={({pressed}) => [disabled && styles.disabled, pressed && styles.pressed]}>
                <GlassSurface
                    interactive
                    tint={current ? colors.surface : undefined}
                    style={[styles.triggerGlass, error ? styles.triggerErrorBorder : styles.optionIdleBorder]}
                    fallback={styles.optionFallbackIdle}>
                    <View style={styles.triggerRow}>
                        {CurrentIcon ? (
                            <View style={[styles.iconBubble, styles.iconBubbleSelected]}>
                                <CurrentIcon size={17} color={colors.primary}/>
                            </View>
                        ) : null}
                        <View style={styles.triggerBody}>
                            <ScaledText numberOfLines={2} style={styles.triggerValue}>
                                {current?.label ?? placeholder ?? '—'}
                            </ScaledText>
                            {(triggerDesc || (current?.badge && !inlineBadge)) ? (
                                <View style={styles.triggerMetaRow}>
                                    {current?.badge && !inlineBadge ? (
                                        <Badge label={current.badge} background={colors.primaryLight} color={colors.primary}/>
                                    ) : null}
                                    {triggerDesc ? (
                                        <AppText variant="caption" numberOfLines={1} style={styles.flex}>{triggerDesc}</AppText>
                                    ) : null}
                                </View>
                            ) : null}
                        </View>
                        {current?.badge && inlineBadge ? (
                            <Badge label={current.badge} background={colors.primaryLight} color={colors.primary}/>
                        ) : null}
                        <ChevronDown size={18} color={colors.slate}/>
                    </View>
                </GlassSurface>
            </Pressable>
            {error ? <ScaledText style={styles.error} accessibilityRole="alert">{error}</ScaledText> : null}

            <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
                <View style={styles.backdrop}>
                    <Pressable
                        style={styles.backdropDismiss}
                        accessibilityRole="button"
                        accessibilityLabel={t('common.close')}
                        onPress={() => setOpen(false)}
                    />
                    <GlassSurface style={styles.sheet} fallback={styles.sheetFallback}>
                        <SafeAreaView edges={['bottom']} style={styles.sheetInner}>
                            <View style={styles.grabber}/>
                            <View style={styles.sheetHeader}>
                                <AppText variant="title" style={styles.flex} numberOfLines={1}>
                                    {sheetTitle || label || placeholder || ''}
                                </AppText>
                                <Pressable
                                    onPress={() => setOpen(false)}
                                    hitSlop={8}
                                    accessibilityRole="button"
                                    accessibilityLabel={t('common.close')}
                                    style={styles.closeBtn}>
                                    <X size={18} color={colors.slateDark}/>
                                </Pressable>
                            </View>
                            <ScrollView contentContainerStyle={styles.sheetScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                                <GlassSelectCards
                                    columns={1}
                                    value={value}
                                    options={options}
                                    onChange={next => {
                                        onChange(next);
                                        setOpen(false);
                                    }}
                                />
                            </ScrollView>
                        </SafeAreaView>
                    </GlassSurface>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    group: {gap: spacing.xs},
    fieldLabel: {fontSize: font.small, fontWeight: '600', color: colors.text},
    gridTwo: {flexDirection: 'row', flexWrap: 'wrap', alignItems: 'stretch', gap: spacing.sm},
    gridOne: {gap: spacing.sm},
    cellHalf: {flexGrow: 1, flexBasis: '47%', minWidth: 148},
    cellFull: {width: '100%'},
    optionGlass: {borderRadius: radius.card, padding: spacing.md, gap: spacing.xs, borderWidth: 1.5},
    optionGlassBento: {flex: 1, gap: spacing.sm},
    optionIdleBorder: {borderColor: colors.glassBorder},
    optionSelectedBorder: {borderColor: colors.glassBorderSelected},
    triggerErrorBorder: {borderColor: colors.danger},
    optionFallbackIdle: {backgroundColor: colors.glassSurface},
    optionFallbackSelected: {backgroundColor: colors.glassSurfaceSelected},
    optionTop: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.xs},
    optionTitleWrap: {flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
    topRightRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.xs},
    bentoBody: {gap: spacing.xs},
    iconBubble: {width: 32, height: 32, borderRadius: radius.control, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.slateLight},
    iconBubbleSelected: {backgroundColor: colors.primaryLight},
    optionTitle: {flex: 1, fontSize: font.small, fontWeight: '600', color: colors.text},
    optionTitleBento: {fontSize: font.small, fontWeight: '600', color: colors.text},
    optionTitleSelected: {color: colors.primary, fontWeight: '700'},
    triggerGlass: {borderRadius: radius.card, paddingHorizontal: spacing.md, paddingVertical: spacing.md, borderWidth: 1.5},
    triggerRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
    triggerBody: {flex: 1, gap: spacing.xs},
    triggerMetaRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.xs},
    triggerValue: {fontSize: font.body, fontWeight: '600', color: colors.text},
    flex: {flex: 1},
    error: {fontSize: font.caption, color: colors.danger},
    pressed: {opacity: 0.78},
    disabled: {opacity: 0.5},
    backdrop: {flex: 1, justifyContent: 'flex-end', backgroundColor: colors.sheetBackdrop},
    backdropDismiss: {flex: 1},
    sheet: {maxHeight: '78%', borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet, borderTopWidth: 1, borderColor: colors.glassBorder},
    sheetFallback: {backgroundColor: colors.glassSheetSurface},
    sheetInner: {paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md, gap: spacing.sm},
    grabber: {alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: colors.inputBorder},
    sheetHeader: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs},
    closeBtn: {width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.slateLight},
    sheetScroll: {paddingBottom: spacing.lg},
});
