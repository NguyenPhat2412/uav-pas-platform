/** Pure helpers for the admin plan statistics; no React so tests can import them directly. */

export interface StackSegment {
    key: string;
    value: number;
    /** Sum of the segments below this one. */
    offset: number;
}

export interface StackedColumn {
    month: string;
    total: number;
    segments: StackSegment[];
}

export interface MonthAmounts {
    month: string;
    byPlan: Record<string, number>;
    missionRevenue: number;
}

/** Key of the mission revenue segment; plan segments use their plan code. */
export const MISSION_KEY = '__mission';

/**
 * Change from `previous` to `current` in percent, rounded to one decimal. Null when there is no
 * baseline (previous is zero or missing), so the UI can say "new" instead of a misleading +∞%.
 */
export function percentChange(current: number, previous: number): number | null {
    if (!Number.isFinite(current) || !Number.isFinite(previous) || previous <= 0) return null;
    return Math.round(((current - previous) / previous) * 1000) / 10;
}

/**
 * Stacks each month bottom-up in `codes` order, then mission revenue on top. Zero and negative
 * amounts get no segment; offsets are running sums so a segment spans [offset, offset + value].
 */
export function stackMonths(months: MonthAmounts[], codes: string[]): StackedColumn[] {
    return months.map(month => {
        const entries: [string, number][] = [
            ...codes.map(code => [code, month.byPlan[code] ?? 0] as [string, number]),
            [MISSION_KEY, month.missionRevenue ?? 0],
        ];
        let offset = 0;
        const segments: StackSegment[] = [];
        for (const [key, raw] of entries) {
            const value = Number(raw) || 0;
            if (value <= 0) continue;
            segments.push({key, value, offset});
            offset += value;
        }
        return {month: month.month, total: offset, segments};
    });
}

/** Plan codes that earned anything in the window, in catalog order; keeps the legend short. */
export function earningCodes(months: MonthAmounts[], codes: string[]): string[] {
    return codes.filter(code => months.some(month => (month.byPlan[code] ?? 0) > 0));
}

/** Rounded axis ceiling and evenly spaced ticks (0 first) for a peak value. */
export function axisTicks(peak: number, steps = 4): number[] {
    if (!(peak > 0)) return [0, 1];
    const raw = peak / steps;
    const magnitude = 10 ** Math.floor(Math.log10(raw));
    const step = [1, 2, 2.5, 5, 10].map(m => m * magnitude).find(s => s >= raw) ?? magnitude * 10;
    const count = Math.ceil(peak / step);
    return Array.from({length: count + 1}, (_, i) => Math.round(i * step * 100) / 100);
}

/** Percentage clamped to 0–100 for drawing bars; the label keeps the real value. */
export function clampPercent(value: number): number {
    if (!Number.isFinite(value)) return 0;
    return Math.min(100, Math.max(0, value));
}
