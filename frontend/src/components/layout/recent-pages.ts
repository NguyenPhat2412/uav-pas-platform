/** Pages a user opened most recently in one portal, newest first, kept in this browser only. */
const LIMIT = 6;

export function readRecentPages(key: string): string[] {
    try {
        const parsed: unknown = JSON.parse(localStorage.getItem(key) ?? '[]');
        return Array.isArray(parsed) ? parsed.filter((href): href is string => typeof href === 'string').slice(0, LIMIT) : [];
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
