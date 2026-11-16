import React from 'react';
import {StyleSheet, Text} from 'react-native';
import {useI18n} from '@/providers/I18nContext';
import {useTextScale} from '@/providers/TextSizeContext';
import {colors, font} from '@/styles/tokens';

const OPTIONAL_TEXT = {
    vi: 'Tuỳ chọn',
    en: 'Optional',
    ja: '任意',
} as const;

const TRAILING_MARKER_RE = /\s*(?:[(（](?:tuỳ chọn|tùy chọn|bắt buộc|optional|required|任意|必須)[)）]|\*)\s*$/i;

export function cleanFieldLabel(label: string): string {
    return label.replace(TRAILING_MARKER_RE, '');
}

export function FieldLabel({label, required = false, optional = false}: {
    label?: string;
    required?: boolean;
    optional?: boolean;
}) {
    const {locale} = useI18n();
    const scale = useTextScale();
    if (!label) return null;
    const baseLabel = required || optional ? cleanFieldLabel(label) : label;
    const optionalWord = OPTIONAL_TEXT[locale] ?? OPTIONAL_TEXT.vi;
    const labelSize = scale === 1 ? font.small : Math.round(font.small * scale);
    const metaSize = scale === 1 ? font.caption : Math.round(font.caption * scale);

    return (
        <Text style={[styles.label, {fontSize: labelSize}]}>
            {baseLabel}
            {required ? (
                <Text style={styles.required}> *</Text>
            ) : optional ? (
                <Text style={[styles.optional, {fontSize: metaSize}]}>{` (${optionalWord})`}</Text>
            ) : null}
        </Text>
    );
}

const styles = StyleSheet.create({
    label: {fontSize: font.small, fontWeight: '600', color: colors.text},
    required: {color: colors.danger, fontWeight: '700'},
    optional: {color: colors.muted, fontWeight: '400'},
});
