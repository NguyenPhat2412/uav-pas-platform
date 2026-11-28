import React, {useState} from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {AlertCircle, Check, CheckCheck, Clock} from 'lucide-react-native';
import {ScaledText} from '@/components/ui';
import type {ResolvedMessageReceipt} from '@/shared/utils/message-status';
import {colors, font, radius, spacing} from '@/styles/tokens';

export function SupportMessageStatusRow({
    receipt,
    onRetry,
}: {
    receipt: ResolvedMessageReceipt | null;
    onRetry?: () => void;
}) {
    const [expanded, setExpanded] = useState(false);
    if (!receipt) return null;

    if (receipt.status === 'sending') {
        return (
            <View style={styles.row} accessibilityLiveRegion="polite">
                <Clock size={12} color={colors.muted}/>
                <ScaledText style={styles.mutedLabel}>{receipt.label}</ScaledText>
            </View>
        );
    }

    if (receipt.status === 'failed') {
        return (
            <Pressable
                onPress={onRetry}
                accessibilityRole="button"
                accessibilityLabel={receipt.label}
                style={({pressed}) => [styles.failedBtn, pressed && styles.pressed]}
            >
                <AlertCircle size={12} color={colors.danger}/>
                <ScaledText style={styles.failedLabel}>{receipt.label}</ScaledText>
            </Pressable>
        );
    }

    if (receipt.status === 'sent') {
        return (
            <View style={styles.row}>
                <Check size={12} color={colors.muted}/>
                <ScaledText style={styles.mutedLabel}>{receipt.label}</ScaledText>
            </View>
        );
    }

    if (receipt.status === 'delivered') {
        return (
            <Pressable
                onPress={() => receipt.detail && setExpanded(prev => !prev)}
                accessibilityRole="button"
                style={({pressed}) => [styles.row, pressed && styles.pressed]}
            >
                <CheckCheck size={13} color={colors.slate}/>
                <ScaledText style={styles.deliveredLabel}>
                    {expanded && receipt.detail ? receipt.detail : receipt.label}
                </ScaledText>
            </Pressable>
        );
    }

    return (
        <Pressable
            onPress={() => receipt.detail && setExpanded(prev => !prev)}
            accessibilityRole="button"
            style={({pressed}) => [styles.row, pressed && styles.pressed]}
        >
            <View style={styles.seenAvatar}>
                <ScaledText style={styles.seenAvatarText}>{receipt.viewerInitials}</ScaledText>
            </View>
            <CheckCheck size={13} color={colors.primary}/>
            <ScaledText style={styles.seenLabel}>
                {expanded && receipt.detail ? receipt.detail : receipt.label}
            </ScaledText>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-end',
        gap: 4,
        paddingHorizontal: 2,
    },
    mutedLabel: {
        fontSize: font.caption - 1,
        color: colors.muted,
        fontWeight: '500',
    },
    deliveredLabel: {
        fontSize: font.caption - 1,
        color: colors.slate,
        fontWeight: '500',
    },
    seenLabel: {
        fontSize: font.caption - 1,
        color: colors.slateDark,
        fontWeight: '600',
    },
    seenAvatar: {
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: colors.slateDark,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    seenAvatarText: {
        fontSize: 8,
        fontWeight: '800',
        color: colors.white,
    },
    failedBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-end',
        gap: 4,
        paddingHorizontal: spacing.sm,
        paddingVertical: 3,
        borderRadius: radius.control,
        backgroundColor: colors.dangerLight,
    },
    failedLabel: {
        fontSize: font.caption - 1,
        fontWeight: '700',
        color: colors.danger,
    },
    pressed: {opacity: 0.72},
});
