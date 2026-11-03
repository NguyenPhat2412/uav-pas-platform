import React, {createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import {queryKeys} from '@/shared/lib/query';
import type {AuthResponse, UserResponse} from '@/shared/types/auth/auth.types';
import {authService, permissionService} from '@/api/auth/auth.api';
import {ApiError} from '@/lib/api/client';
import {onSessionEnded, restoreSession, sessionStore} from '@/lib/api/session';

/** loading: reading the Keychain / asking /auth/me. unreachable: a session exists but the API could not be reached. */
export type AuthStatus = 'loading' | 'signed-out' | 'signed-in' | 'unreachable';

interface AuthValue {
    status: AuthStatus;
    user: UserResponse | null;
    permissions: string[];
    permissionsReady: boolean;
    can: (code: string) => boolean;
    /** Resolves to the response; when mfaRequired is set the caller continues with the code screen. */
    login: (usernameOrEmail: string, password: string) => Promise<AuthResponse>;
    loginWithGoogle: (idToken: string) => Promise<AuthResponse>;
    /** Stores the tokens of a finished sign-in (password, 2FA or email verification) and opens the portal. */
    completeAuth: (response: AuthResponse) => Promise<void>;
    logout: () => Promise<void>;
    retry: () => void;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | undefined>(undefined);

export function AuthProvider({children}: { children: ReactNode }) {
    const client = useQueryClient();
    const [status, setStatus] = useState<AuthStatus>('loading');
    const [user, setUser] = useState<UserResponse | null>(null);
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
            if (!await restoreSession()) {
                if (active) setStatus('signed-out');
                return;
            }
            try {
                const me = await authService.me();
                if (!active) return;
                identity.current = me.id;
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
    }, [attempt]);

    const completeAuth = useCallback(async (response: AuthResponse) => {
        if (response.mfaRequired || !response.accessToken || !response.refreshToken || !response.user) {
            throw new Error('Sign-in is not finished yet');
        }
        // Another account's cached data must never show for this one.
        if (identity.current !== response.user.id) client.clear();
        await sessionStore.save({accessToken: response.accessToken, refreshToken: response.refreshToken});
        identity.current = response.user.id;
        setUser(response.user);
        setStatus('signed-in');
    }, [client]);

    const login = useCallback(async (usernameOrEmail: string, password: string) => {
        const response = await authService.login({usernameOrEmail: usernameOrEmail.trim(), password});
        if (!response.mfaRequired) await completeAuth(response);
        return response;
    }, [completeAuth]);

    const loginWithGoogle = useCallback(async (idToken: string) => {
        const response = await authService.google(idToken);
        if (!response.mfaRequired) await completeAuth(response);
        return response;
    }, [completeAuth]);

    const logout = useCallback(async () => {
        const refreshToken = sessionStore.read()?.refreshToken;
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

    const value = useMemo<AuthValue>(() => {
        const revoked = permissionQuery.error instanceof ApiError && permissionQuery.error.status === 403;
        const permissions = permissionQuery.data && !revoked ? permissionQuery.data : [];
        return {
            status, user, permissions,
            permissionsReady: permissionQuery.data !== undefined && !revoked,
            can: code => permissions.includes(code),
            login, loginWithGoogle, completeAuth, logout, refreshUser,
            retry: () => {
                setStatus('loading');
                setAttempt(count => count + 1);
            },
        };
    }, [status, user, permissionQuery.data, permissionQuery.error, login, loginWithGoogle, completeAuth, logout, refreshUser]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
}
