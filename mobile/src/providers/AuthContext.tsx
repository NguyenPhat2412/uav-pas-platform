import React, {createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import * as SplashScreen from 'expo-splash-screen';
import {queryKeys} from '@/shared/lib/query';
import {canUsePortal} from '@/shared/utils/auth/portal';
import type {AuthResponse, UserResponse} from '@/shared/types/auth/auth.types';
import {authService, permissionService, type AppleLoginPayload} from '@/api/auth/auth.api';
import {notificationsService} from '@/api/notification/notifications.api';
import {ApiError} from '@/lib/api/client';
import {onSessionEnded, restoreSession, sessionStore} from '@/lib/api/session';
import {
    readSavedPortal,
    readSavedPushEndpoint,
    savePortal,
    savePushEndpoint,
    type PortalPreference,
} from '@/lib/storage/preferences';
import {clearQueryCache, persistQueryCache, restoreQueryCache} from '@/lib/storage/query-cache';
import {resolveMobilePortal} from '@/utils/operations/portal-routing';

/** loading: reading the Keychain / asking /auth/me. unreachable: a session exists but the API could not be reached. */
export type AuthStatus = 'loading' | 'signed-out' | 'signed-in' | 'unreachable';

interface AuthValue {
    status: AuthStatus;
    user: UserResponse | null;
    permissions: string[];
    permissionsReady: boolean;
    can: (code: string) => boolean;
    activePortal: PortalPreference;
    switchPortal: (portal: PortalPreference) => Promise<void>;
    /** Resolves to the response; when mfaRequired is set the caller continues with the code screen. */
    login: (usernameOrEmail: string, password: string) => Promise<AuthResponse>;
    loginWithGoogle: (idToken: string) => Promise<AuthResponse>;
    loginWithApple: (payload: AppleLoginPayload) => Promise<AuthResponse>;
    /** Stores the tokens of a finished sign-in (password, 2FA or email verification) and opens the portal. */
    completeAuth: (response: AuthResponse) => Promise<void>;
    logout: () => Promise<void>;
    retry: () => void;
    refreshUser: () => Promise<void>;
}

// Preserve the single Context instance across Metro Fast Refresh so HMR in auth/session modules never splits Provider & consumers.
const globalWithAuth = globalThis as typeof globalThis & {
    __UAV_PAS_AUTH_CONTEXT__?: React.Context<AuthValue | undefined>;
};
const AuthContext =
    globalWithAuth.__UAV_PAS_AUTH_CONTEXT__ ??
    (globalWithAuth.__UAV_PAS_AUTH_CONTEXT__ = createContext<AuthValue | undefined>(undefined));

export function AuthProvider({children}: { children: ReactNode }) {
    const client = useQueryClient();
    const [status, setStatus] = useState<AuthStatus>('loading');
    const [user, setUser] = useState<UserResponse | null>(null);
    const [savedPortal, setSavedPortal] = useState<PortalPreference | null>(null);
    const [attempt, setAttempt] = useState(0);
    const identity = useRef<number | null>(null);

    const permissionQuery = useQuery({
        queryKey: queryKeys.of(user?.id, 'permissions'),
        queryFn: ({signal}) => permissionService.mine(signal),
        enabled: status === 'signed-in',
        staleTime: 0,
        refetchInterval: 60_000,
        retry: 1,
    });

    const endSession = useCallback(() => {
        void clearQueryCache(identity.current);
        identity.current = null;
        void client.cancelQueries();
        client.clear();
        setUser(null);
        setStatus('signed-out');
    }, [client]);

    // A refused refresh anywhere in the app (or a sign-out) returns here.
    useEffect(() => onSessionEnded(endSession), [endSession]);

    useEffect(() => {
        let active = true;
        void (async () => {
            const [portalPref, hasSession] = await Promise.all([readSavedPortal(), restoreSession()]);
            if (!active) return;
            setSavedPortal(portalPref);
            if (!hasSession) {
                setStatus('signed-out');
                return;
            }
            try {
                const me = await authService.me();
                if (!active) return;
                identity.current = me.id;
                await restoreQueryCache(client, me.id);
                if (!active) return;
                setUser(me);
                setStatus('signed-in');
            } catch (error) {
                if (!active) return;
                // Offline, overloaded or rate limited says nothing about the session: keep the tokens and offer a retry.
                const unreachable = error instanceof ApiError && (error.status === 0 || error.status === 429 || error.status >= 500);
                if (unreachable) setStatus('unreachable');
                else await sessionStore.clear('expired');
            }
        })();
        return () => {
            active = false;
        };
    }, [attempt, client]);

    // The native splash stays up until we know where to send the user; on a slow network it gives way after 1.5 s to
    // AppSplash's 3D loader so the launch never looks frozen.
    useEffect(() => {
        const hide = () => void SplashScreen.hideAsync().catch(() => undefined);
        if (status !== 'loading') return hide();
        const timer = setTimeout(hide, 1500);
        return () => clearTimeout(timer);
    }, [status]);

    useEffect(() => {
        if (status !== 'signed-in' || user?.id == null) return;
        return persistQueryCache(client, user.id);
    }, [status, user?.id, client]);

    const completeAuth = useCallback(async (response: AuthResponse) => {
        if (response.mfaRequired || !response.accessToken || !response.refreshToken || !response.user) {
            throw new Error('Sign-in is not finished yet');
        }
        // Another account's cached data must never show for this one.
        if (identity.current !== response.user.id) {
            client.clear();
            await restoreQueryCache(client, response.user.id);
        }
        const portalPref = await readSavedPortal();
        setSavedPortal(portalPref);
        await sessionStore.save({accessToken: response.accessToken, refreshToken: response.refreshToken});
        identity.current = response.user.id;
        setUser(response.user);
        setStatus('signed-in');
    }, [client]);

    const switchPortal = useCallback(async (portal: PortalPreference) => {
        const next: PortalPreference = canUsePortal(user?.role, 'operations') ? portal : 'customer';
        setSavedPortal(next);
        await savePortal(next);
    }, [user?.role]);

    const login = useCallback(async (usernameOrEmail: string, password: string) => {
        const response = await authService.login({usernameOrEmail: usernameOrEmail.trim(), password});
        if (!response.mfaRequired) await completeAuth(response);
        return response;
    }, [completeAuth]);

    const loginWithGoogle = useCallback(async (idToken: string) => {
        const response = await authService.google(idToken);
        if (!response.mfaRequired && response.mfaMethod !== 'PENDING_APPROVAL') await completeAuth(response);
        return response;
    }, [completeAuth]);

    const loginWithApple = useCallback(async (payload: AppleLoginPayload) => {
        const response = await authService.loginWithApple(payload);
        if (!response.mfaRequired && response.mfaMethod !== 'PENDING_APPROVAL') await completeAuth(response);
        return response;
    }, [completeAuth]);

    const logout = useCallback(async () => {
        const refreshToken = sessionStore.read()?.refreshToken;
        const pushEndpoint = await readSavedPushEndpoint();
        if (pushEndpoint) {
            await savePushEndpoint(null);
            await Promise.race([
                notificationsService.unregisterPushEndpoint(pushEndpoint).catch(() => undefined),
                new Promise<void>(resolve => setTimeout(resolve, 1200)),
            ]);
        }
        // Leave locally first: a failed network call must not keep private data on screen.
        await sessionStore.clear('signed-out');
        endSession();
        if (refreshToken) await authService.logout(refreshToken).catch(() => undefined);
    }, [endSession]);

    const refreshUser = useCallback(async () => {
        const expected = identity.current;
        const me = await authService.me();
        if (me.id === expected) setUser(me);
    }, []);

    const activePortal = useMemo<PortalPreference>(
        () => resolveMobilePortal(user?.role, savedPortal),
        [user?.role, savedPortal],
    );

    const value = useMemo<AuthValue>(() => {
        const revoked = permissionQuery.error instanceof ApiError && permissionQuery.error.status === 403;
        const permissions = permissionQuery.data && !revoked ? permissionQuery.data : [];
        return {
            status,
            user,
            permissions,
            permissionsReady: permissionQuery.data !== undefined && !revoked,
            can: code => permissions.includes(code),
            activePortal,
            switchPortal,
            login,
            loginWithGoogle,
            loginWithApple,
            completeAuth,
            logout,
            refreshUser,
            retry: () => {
                setStatus('loading');
                setAttempt(count => count + 1);
            },
        };
    }, [status, user, permissionQuery.data, permissionQuery.error, activePortal, switchPortal, login, loginWithGoogle, loginWithApple, completeAuth, logout, refreshUser]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useOptionalAuth(): AuthValue | undefined {
    return useContext(AuthContext);
}

export function useAuth(): AuthValue {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
}
