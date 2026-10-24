// Visual cue only; the control itself carries `required` for assistive technology.
export function RequiredMark() {
    return <span className="required-mark" aria-hidden="true">*</span>;
}
