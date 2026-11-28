const ILLUSTRATIVE_NAME_RE =
    /\s*(?:[—–·-]\s*|\(\s*)(?:giá\s+)?(?:minh\s*ho[ạa]|mô\s*phỏng|giả\s*lập|illustrative)\s*\)?/gi;

/**
 * Strips any legacy illustrative suffix from entity names & titles
 * (UI-REVIEW-9-FIXES #1: never attach illustrative labels to service, UAV, pilot, project, or fleet names).
 */
export function cleanEntityName(raw?: string | null): string {
    if (!raw) return '';
    return raw
        .replace(ILLUSTRATIVE_NAME_RE, ' ')
        .replace(/\bRTK\b/gi, 'GNSS')
        .replace(/\s*·\s*/g, ' · ')
        .replace(/\s{2,}/g, ' ')
        .trim();
}

/**
 * Strips redundant inline illustrative suffixes from short card descriptions
 * so the single muted price badge + page footer note carry the disclaimer cleanly.
 */
export function cleanDescriptionText(raw?: string | null): string {
    if (!raw) return '';
    return raw
        .replace(/\s*(?:[—–·-]\s*|\(\s*)giá\s+minh\s*ho[ạa]\s*\)?\.?$/gi, '.')
        .replace(/\(\s*(minh\s*ho[ạa]|mô\s*phỏng)\s*\)/gi, '— $1')
        .replace(/\bRTK\b/gi, 'GNSS')
        .trim();
}

/**
 * Maps S0's HTTP 409 concurrency / scheduling error codes (`UAV_TIME_CONFLICT`,
 * `OPERATOR_TIME_CONFLICT`, `UAV_IN_USE`, `NO_UAV_AVAILABLE`) to trilingual UI messages,
 * falling back to backend `message` when present.
 */
export function formatProviderConflictError(
    err: unknown,
    t: (key: string) => string,
): string {
    const rec = err && typeof err === 'object' ? (err as { code?: unknown; message?: unknown }) : null;
    const code = typeof rec?.code === 'string' ? rec.code : '';
    if (code === 'UAV_TIME_CONFLICT') return t('mobile.overnight.conflictUavTime');
    if (code === 'OPERATOR_TIME_CONFLICT') return t('mobile.overnight.conflictOperatorTime');
    if (code === 'UAV_IN_USE') return t('mobile.overnight.conflictUavInUse');
    if (code === 'NO_UAV_AVAILABLE') return t('mobile.overnight.conflictNoUavAvailable');
    if (typeof rec?.message === 'string' && rec.message.trim()) return rec.message.trim();
    return t('mobile.provider.saveError');
}

export function isHttpConflict(err: unknown): boolean {
    return Boolean(
        err &&
            typeof err === 'object' &&
            'status' in err &&
            (err as { status?: unknown }).status === 409,
    );
}
