/** searchAreaPolygon is stored as JSON [[lat, lng], ...]; anything else draws no polygon. */
export function parseSearchArea(raw: string | null): Array<[number, number]> {
    if (!raw) return [];
    try {
        const value: unknown = JSON.parse(raw);
        if (!Array.isArray(value)) return [];
        const points = value.filter((p): p is [number, number] =>
            Array.isArray(p) && p.length >= 2 && Number.isFinite(p[0]) && Number.isFinite(p[1])
            && Math.abs(p[0]) <= 90 && Math.abs(p[1]) <= 180);
        return points.length >= 3 ? points : [];
    } catch {
        return [];
    }
}
