/**
 * Pure formatting helpers for public contact numbers and Zalo deep links
 * sourced dynamically from PostgreSQL system settings.
 */

export function sanitizePhoneDigits(raw?: string | null): string {
    if (!raw) return '';
    return raw.replace(/\D/g, '');
}

export function formatPhoneDisplay(raw?: string | null): string {
    const trimmed = raw?.trim() ?? '';
    if (!trimmed) return '';
    if (/[\s.()-]/.test(trimmed)) return trimmed;

    if (/^0\d{9}$/.test(trimmed)) {
        return trimmed.replace(/^(0\d{3})(\d{3})(\d{3})$/, '$1 $2 $3');
    }
    if (/^0\d{10}$/.test(trimmed)) {
        return trimmed.replace(/^(0\d{2})(\d{4})(\d{4})$/, '$1 $2 $3');
    }
    return trimmed;
}

export function toTelHref(raw?: string | null): string | null {
    const cleaned = raw?.replace(/[^\d+]/g, '') ?? '';
    return cleaned.length >= 3 ? `tel:${cleaned}` : null;
}

export function toZaloChatUrl(raw?: string | null): string | null {
    const digits = sanitizePhoneDigits(raw);
    if (digits.length < 8) return null;
    const normalized = digits.startsWith('84') && digits.length === 11 ? `0${digits.slice(2)}` : digits;
    return `https://zalo.me/${normalized}`;
}
