/** Pages a user opened most recently in one portal, newest first, kept in this browser only. */
const LIMIT = 6;

/** The list stored under a key, from its raw JSON; malformed or missing values give an empty list. */
export function parseRecentPages(raw: string | null): string[] {
    try {
        const parsed: unknown = JSON.parse(raw ?? '[]');
        return Array.isArray(parsed) ? parsed.filter((href): href is string => typeof href === 'string').slice(0, LIMIT) : [];
    } catch {
        return [];
    }
}

export function readRecentPages(key: string): string[] {
    try {
        return parseRecentPages(localStorage.getItem(key));
    } catch {
        return [];
    }
}

export function rememberRecentPage(key: string, href: string) {
    try {
        const next = [href, ...readRecentPages(key).filter(item => item !== href)].slice(0, LIMIT);
        localStorage.setItem(key, JSON.stringify(next));
    } catch {
        // storage unavailable (private mode, quota): the list is a convenience only
    }
}

export const ADMIN_RECENT_PAGES_KEY = 'uav_admin_recent_pages';
export const OPERATIONS_RECENT_PAGES_KEY = 'uav_ops_recent_pages';
export const CUSTOMER_RECENT_PAGES_KEY = 'uav_customer_recent_pages';
