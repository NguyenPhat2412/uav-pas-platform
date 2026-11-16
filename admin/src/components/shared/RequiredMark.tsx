import type {ReactNode} from 'react';
import {getPresentationLocale} from '@/lib/presentation';
import type {FieldLabelMarkProps} from '@/types/ui';

const OPTIONAL_LABELS = {
    vi: 'Tuỳ chọn',
    en: 'Optional',
    ja: '任意',
} as const;

const TRAILING_MARKER_RE = /\s*(?:[(（](?:tuỳ chọn|tùy chọn|bắt buộc|optional|required|任意|必須)[)）]|\*)\s*$/i;

export function stripFieldLabelMarker(label: ReactNode): ReactNode {
    return typeof label === 'string' ? label.replace(TRAILING_MARKER_RE, '') : label;
}

// Visual cue only; the control itself carries `required` for assistive technology.
export function RequiredMark() {
    return <span className="ml-0.5 font-bold text-danger" aria-hidden="true">*</span>;
}

export function OptionalMark({label}: { label?: string }) {
    const resolved = label ?? OPTIONAL_LABELS[getPresentationLocale()] ?? OPTIONAL_LABELS.vi;
    return <span className="ml-1.5 text-xs font-normal text-muted">({resolved})</span>;
}

export function FieldLabelMark({required, optional, optionalLabel}: FieldLabelMarkProps) {
    if (required) return <RequiredMark/>;
    if (optional) return <OptionalMark label={optionalLabel}/>;
    return null;
}
