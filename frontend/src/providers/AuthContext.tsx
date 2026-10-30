'use client';

import {clearWelcomeFlags} from '@/lib/welcome-flag';
import React, {createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState} from 'react';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import type {AuthContextType, AuthResponse, RegisterRequest, UserResponse} from "@/features/auth/types/auth.types";
import {authService} from '@/features/auth/api/auth.api';
import {API_ROUTES, ApiError, apiClient, PERMISSIONS_EVENT, rememberSessionUser, SESSION_EVENT, SESSION_STORAGE_KEY, sessionOwnerOf, setAuthSession} from "@/lib/api";
import {toast} from '@/providers/ToastContext';
import {useI18n} from '@/providers/I18nContext';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({children}: { children: ReactNode }) {
    const client = useQueryClient();
    const {t} = useI18n();
    const [user, setUser] = useState<UserResponse | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const identity = useRef<number | null>(null);
    const permissionSignature = useRef<string | null>(null);
    const permissionQuery = useQuery({
        queryKey: ['session', user?.id ?? 'anonymous', 'permissions'],
        queryFn: ({signal}) => apiClient.get<string[]>(API_ROUTES.permissions.me, {signal}),
        enabled: !!user,
        staleTime: 0,
        refetchInterval: 15_000,
        refetchOnWindowFocus: true,
        // One retry absorbs a blip; a background failure after that keeps the last good set (see below).
        retry: 1,
    });

    useEffect(() => {
        const receiveSession = (event: Event) => {
            const session = (event as CustomEvent<AuthResponse | null>).detail;
            if (!session || identity.current !== session.user?.id) {
                void client.cancelQueries();
                client.clear();
                permissionSignature.current = null;
            }
            identity.current = session?.user?.id ?? null;
            setToken(session ? 'cookie' : null);
            setUser(session?.user ?? null);
            setIsLoading(false);
        };
        const permissionsChanged = () => void client.invalidateQueries({queryKey: ['session', identity.current ?? 'anonymous', 'permissions']});
        // Another tab signed in, switched account or signed out (uav_session changed). Cookies are shared, so ask the
        // backend who this browser is now instead of trusting the marker: a tab that merely failed to load must not
        // sign the others out.
        const followOtherTab = async () => {
            const expected = identity.current;
            try {
                const current = await authService.getMe();
                if (identity.current !== expected || !current || current.id === expected) return;
                // Other-tab account changes must never reuse the current tab's cache, identity or open drafts.
                if (expected !== null) window.location.reload();
                else setAuthSession({user: current}, {broadcast: false});
            } catch (error) {
                const ended = error instanceof ApiError && error.status === 401;
                if (ended && identity.current === expected && expected !== null) setAuthSession(null, {broadcast: false});
            }
        };
        const storageChanged = (event: StorageEvent) => {
            if (event.key !== SESSION_STORAGE_KEY && event.key !== null) return;
            const owner = sessionOwnerOf(event.key === null ? null : event.newValue);
            if (owner !== null && owner === String(identity.current)) return;
            void followOtherTab();
        };
        window.addEventListener(SESSION_EVENT, receiveSession);
        window.addEventListener(PERMISSIONS_EVENT, permissionsChanged);
        window.addEventListener('storage', storageChanged);
        return () => {
            window.removeEventListener(SESSION_EVENT, receiveSession);
            window.removeEventListener(PERMISSIONS_EVENT, permissionsChanged);
            window.removeEventListener('storage', storageChanged);
        };
    }, [client]);

    useEffect(() => {
        let active = true;
        const initialize = async () => {
            try {
                // With HttpOnly cookies, browser sends uav_access_token automatically
                const current = await authService.getMe();
                if (active && current) {
                    identity.current = current.id;
                    rememberSessionUser(current.id);
                    setUser(current);
                    setToken('cookie');
                }
            } catch (error) {
                if (active && !(error instanceof Error && error.name === 'AbortError')) {
                    identity.current = null;
                    setUser(null);
                    setToken(null);
                    setAuthSession(null);
                }
            } finally {
                if (active) setIsLoading(false);
            }
        };
        void initialize();
        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        if (!permissionQuery.data) return;
        const signature = [...permissionQuery.data].sort().join(',');
        if (permissionSignature.current !== null && permissionSignature.current !== signature) {
            // Discard data whose authorization scope may have changed, including existing Mission queries.
            void client.resetQueries({predicate: query => query.queryKey[2] !== 'permissions'});
        }
        permissionSignature.current = signature;
    }, [permissionQuery.data, client]);

    const completeAuth = useCallback((response: AuthResponse) => {
        if (!response.mfaRequired && response.user) {
            identity.current = response.user.id;
            setUser(response.user);
            setToken('cookie');
            setAuthSession(response);
        }
        return response;
    }, []);

    const authenticate = useCallback(async (action: () => Promise<AuthResponse>) => {
        setIsLoading(true);
        try {
            const response = await action();
            return completeAuth(response);
        } finally {
            setIsLoading(false);
        }
    }, [completeAuth]);
    const login = useCallback((usernameOrEmail: string, password: string) => authenticate(() => authService.login({
        usernameOrEmail,
        password
    })), [authenticate]);
    const register = useCallback((data: RegisterRequest) => authService.register(data), []);
    const logout = useCallback(async () => {
        clearWelcomeFlags();
        identity.current = null;
        setUser(null);
        setToken(null);
        setAuthSession(null);
        void client.cancelQueries();
        client.clear();
        try {
            // Backend invalidates session and clears uav_access_token and uav_refresh_token cookies via Set-Cookie
            await authService.logout();
            toast.info(t('authShared.loggedOutSecure'), t('authShared.logoutTitle'));
        } catch { /* The local session is already cleared; failure cannot restore private data. */
            toast.info(t('authShared.loggedOut'), t('authShared.logoutTitle'));
        }
    }, [client, t]);
    const refreshUser = useCallback(async () => {
        const expected = identity.current;
        try {
            const current = await authService.getMe();
            if (current && current.id === expected && identity.current === expected) setUser(current);
        } catch { /* Keep the current user; a broken session is handled by the API client. */
        }
    }, []);
    // A failed background refetch keeps the last good set so guarded pages (and their drafts) stay mounted; the
    // blocking error only shows when nothing has loaded for this account yet. A 403 on the caller's own permission
    // list is authoritative, though: it means no access at all.
    const permissionsRevoked = permissionQuery.error instanceof ApiError && permissionQuery.error.status === 403;
    const hasPermissions = permissionQuery.data !== undefined && !permissionsRevoked;
    const permissions = hasPermissions ? permissionQuery.data ?? [] : [];
    return <AuthContext.Provider value={{
        user, token, isLoading, isAuthenticated: !!user,
        permissions, permissionsReady: hasPermissions, permissionError: hasPermissions ? null : permissionQuery.error,
        can: code => permissions.includes(code), refreshPermissions: permissionQuery.refetch, refreshUser,
        login, register, completeAuth, logout
    }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
}
