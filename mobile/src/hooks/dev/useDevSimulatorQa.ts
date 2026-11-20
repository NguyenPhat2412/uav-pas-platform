import {useEffect, useRef} from 'react';
import {Linking, LogBox} from 'react-native';
import {useGlobalSearchParams, usePathname} from 'expo-router';
import {setDevApiBaseUrl} from '@/config/env';
import {setDevSimulatedOffline} from '@/hooks/network/useNetworkStatus';
import {useAuth} from '@/providers/AuthContext';
import {TEXT_SIZES, useTextSize, type TextSize} from '@/providers/TextSizeContext';
import type {AuthResponse} from '@/shared/types/auth/auth.types';

interface DevQaPayload {
    id?: string;
    api?: string;
    user?: string;
    pass?: string;
    auth?: AuthResponse;
    logout?: boolean;
    textSize?: TextSize;
    offline?: 'banner' | 'modal' | 'off';
    maxWidth?: number | null;
    scrollToEnd?: boolean;
}

function decodeHexJson(hex: string): DevQaPayload | null {
    try {
        const bytes = new Uint8Array(hex.length / 2);
        for (let i = 0; i < bytes.length; i += 1) {
            bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
        }
        const text = new TextDecoder().decode(bytes);
        return JSON.parse(text) as DevQaPayload;
    } catch {
        return null;
    }
}

/**
 * Development-only Simulator QA listener (`__DEV__` only, no-op in production):
 * decodes hex-encoded QA commands from `__devQa` so special characters in URLs
 * or passwords are never mangled by `simctl openurl` / `NSURL`.
 */
export function useDevSimulatorQa(): void {
    const auth = useAuth();
    const {setSize} = useTextSize();
    const pathname = usePathname();
    const globalParams = useGlobalSearchParams<{ __devQa?: string }>();
    const authRef = useRef(auth);
    const sizeRef = useRef(setSize);
    const pathRef = useRef(pathname);
    const handledRef = useRef<string>('');

    useEffect(() => {
        authRef.current = auth;
        sizeRef.current = setSize;
        pathRef.current = pathname;
    }, [auth, pathname, setSize]);

    useEffect(() => {
        if (typeof __DEV__ === 'undefined' || !__DEV__) return;

        const runPayload = async (hex?: string | null) => {
            if (!hex || hex === handledRef.current) return;
            const cmd = decodeHexJson(hex);
            if (!cmd) return;
            handledRef.current = hex;
            LogBox.ignoreAllLogs(true);

            if (cmd.api) {
                setDevApiBaseUrl(cmd.api);
            }
            if ('maxWidth' in cmd) {
                (globalThis as { __uavDevMaxWidth?: number | null }).__uavDevMaxWidth = cmd.maxWidth ?? null;
            }
            if (cmd.textSize && TEXT_SIZES.some(item => item.value === cmd.textSize)) {
                sizeRef.current(cmd.textSize);
            }
            if (cmd.offline === 'banner') {
                setDevSimulatedOffline(true, true);
            } else if (cmd.offline === 'modal') {
                setDevSimulatedOffline(true, false);
            } else if (cmd.offline === 'off') {
                setDevSimulatedOffline(false, false);
            }
            if (cmd.logout) {
                await authRef.current.logout();
            }
            if (cmd.auth) {
                try {
                    await authRef.current.completeAuth(cmd.auth);
                    await authRef.current.switchPortal('customer');
                } catch {}
            } else if (cmd.user && cmd.pass) {
                try {
                    if (authRef.current.status === 'signed-in' && authRef.current.user?.username !== cmd.user) {
                        await authRef.current.logout();
                    }
                    if (authRef.current.status !== 'signed-in') {
                        await authRef.current.login(cmd.user, cmd.pass);
                    }
                    await authRef.current.switchPortal('customer');
                } catch {}
            }
            if ('scrollToEnd' in cmd) {
                const g = globalThis as {
                    __uavScrollBottom?: boolean;
                    __uavScrollRefs?: Record<string, { current?: { scrollToEnd?: (opts?: { animated?: boolean }) => void } | null }>;
                };
                g.__uavScrollBottom = Boolean(cmd.scrollToEnd);
                if (cmd.scrollToEnd) {
                    const triggerScroll = () => {
                        for (const ref of Object.values(g.__uavScrollRefs ?? {})) {
                            ref?.current?.scrollToEnd?.({animated: false});
                        }
                    };
                    setTimeout(triggerScroll, 200);
                    setTimeout(triggerScroll, 800);
                }
            }
        };

        if (typeof globalParams.__devQa === 'string') {
            void runPayload(globalParams.__devQa);
        }

        const extractHex = (rawUrl?: string | null) => {
            if (!rawUrl) return;
            const match = rawUrl.match(/[?&]__devQa=([0-9a-fA-F]+)/);
            if (match?.[1]) void runPayload(match[1]);
        };

        void Linking.getInitialURL().then(extractHex);
        const sub = Linking.addEventListener('url', event => extractHex(event.url));
        return () => sub.remove();
    }, [globalParams.__devQa]);
}
