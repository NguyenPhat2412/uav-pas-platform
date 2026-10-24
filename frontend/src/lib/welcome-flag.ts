/** Per-tab record that the signed-in user was already greeted; cleared on sign-out. */
const PREFIX = 'uav_welcome_shown:';

/** Returns true the first time it is called for this user in the current browser session. */
export function claimWelcome(userId: number | string): boolean {
    try {
        const key = `${PREFIX}${userId}`;
        if (sessionStorage.getItem(key)) return false;
        sessionStorage.setItem(key, '1');
    } catch {
        // Storage blocked (private mode): greet anyway rather than never.
    }
    return true;
}

/** Called on sign-out so the next sign-in in the same tab is greeted again. */
export function clearWelcomeFlags() {
    try {
        Object.keys(sessionStorage).filter(key => key.startsWith(PREFIX)).forEach(key => sessionStorage.removeItem(key));
    } catch {
        // Storage unavailable: nothing was stored.
    }
}
