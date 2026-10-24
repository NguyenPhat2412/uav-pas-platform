'use client';

import {clearWelcomeFlags} from '@/lib/welcome-flag';
import React, {createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState} from 'react';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import type {AuthResponse, RegisterRequest, UserResponse} from "@/features/auth/types/auth.types";
import {authService} from "@/features/auth/services/auth.service";
import {apiClient, PERMISSIONS_EVENT, SESSION_EVENT, setAuthSession} from "@/lib/api";
import {toast} from '@/contexts/ToastContext';
import {useI18n} from '@/contexts/I18nContext';

interface AuthContextType {
    user: UserResponse | null;
    token: string | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    permissions: string[];
    permissionsReady: boolean;
    permissionError: Error | null;
    can: (code: string) => boolean;
    refreshPermissions: () => Promise<unknown>;
    /** Re-reads the signed-in user, e.g. after the profile name changed; ignored if the session switched meanwhile. */
    refreshUser: () => Promise<void>;
    login: (usernameOrEmail: string, password: string) => Promise<AuthResponse>;
    register: (data: RegisterRequest) => Promise<UserResponse>;
    completeAuth: (response: AuthResponse) => AuthResponse;
    logout: () => Promise<void>;
}

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
        queryFn: ({signal}) => apiClient.get<string[]>('/api/v1/permissions/me', {signal}),
        enabled: !!user,
        staleTime: 0,
        refetchInterval: 15_000,
        refetchOnWindowFocus: true,
        retry: false,
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
        const storageChanged = (event: StorageEvent) => {
            if (event.key === 'token' || event.key === 'uav_session' || event.key === null) {
                // Other-tab account changes must never reuse the current tab's cache or identity.
                window.location.reload();
            }
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
    const permissions = permissionQuery.isError ? [] : permissionQuery.data ?? [];
    return <AuthContext.Provider value={{
        user, token, isLoading, isAuthenticated: !!user,
        permissions, permissionsReady: permissionQuery.isSuccess, permissionError: permissionQuery.error,
        can: code => permissions.includes(code), refreshPermissions: permissionQuery.refetch, refreshUser,
        login, register, completeAuth, logout
    }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
}
