/**
 * The colour stops of a sky-theme background (Tailwind classes such as
 * "bg-gradient-to-br from-[#fff8e6] via-[#ffecc2] to-[#ffd98f]"), in order, for an SVG gradient on the phone.
 * Import-free so the tests run it directly.
 */
export function gradientStops(background: string): string[] {
    const stops = background.match(/#[0-9a-fA-F]{6}\b/g) ?? [];
    if (stops.length === 0) return ['#f7f8fa', '#e9edf1'];
    return stops.length === 1 ? [stops[0], stops[0]] : stops;
}

/** Twelve hours ahead in 3-hour steps, like the web home strip; undefined means "now". */
export function nextHours(now: Date, steps: readonly number[] = [3, 6, 9, 12]): (string | undefined)[] {
    const base = new Date(now);
    base.setMinutes(0, 0, 0);
    const pad = (n: number) => String(n).padStart(2, '0');
    const local = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    return [undefined, ...steps.map(hours => local(new Date(base.getTime() + hours * 3_600_000)))];
}
