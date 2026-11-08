import type {FieldLabelMarkProps} from '@/types/ui';

// Visual cue only; the control itself carries `required` for assistive technology.
export function RequiredMark() {
    return <span className="ml-0.5 font-bold text-danger" aria-hidden="true">*</span>;
}

export function OptionalMark({label = 'Tuỳ chọn'}: { label?: string }) {
    return <span className="ml-1.5 text-[11px] font-normal text-slate-400">({label})</span>;
}

export function FieldLabelMark({required, optional, optionalLabel}: FieldLabelMarkProps) {
    if (required) return <RequiredMark/>;
    if (optional) return <OptionalMark label={optionalLabel}/>;
    return null;
}
