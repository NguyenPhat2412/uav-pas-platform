// Visual cue only; the control itself carries `required` for assistive technology.
export function RequiredMark() {
    return <span className="ml-0.5 font-bold text-danger" aria-hidden="true">*</span>;
}
