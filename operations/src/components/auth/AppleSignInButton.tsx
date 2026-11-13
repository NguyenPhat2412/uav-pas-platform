'use client';

import {useEffect, useState} from 'react';
import {toast} from '@/providers/ToastContext';
import {useI18n} from '@/providers/I18nContext';
import type {AppleCredentialPayload} from '@/types/auth/auth.types';

const APPLE_SDK_SRC = 'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js';
const CLIENT_ID = process.env.NEXT_PUBLIC_APPLE_CLIENT_ID?.trim() ?? '';
const REDIRECT_URI = process.env.NEXT_PUBLIC_APPLE_REDIRECT_URI?.trim() ?? '';

type AppleSignInResponse = {
    authorization?: {
        id_token?: string;
        code?: string;
        state?: string;
    };
    user?: {
        email?: string;
        name?: {
            firstName?: string;
            lastName?: string;
        };
    };
};

type AppleIDGlobal = {
    auth: {
        init: (config: {
            clientId: string;
            scope: string;
            redirectURI: string;
            nonce?: string;
            usePopup?: boolean;
        }) => void;
        signIn: () => Promise<AppleSignInResponse>;
    };
};

declare global {
    interface Window {
        AppleID?: AppleIDGlobal;
    }
}

let scriptPromise: Promise<AppleIDGlobal> | null = null;

/** Loads Apple's official Sign in with Apple JS SDK once per page; retries on next click if loading failed. */
function loadAppleIdentity(): Promise<AppleIDGlobal> {
    if (window.AppleID?.auth) return Promise.resolve(window.AppleID);
    scriptPromise ??= new Promise<AppleIDGlobal>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = APPLE_SDK_SRC;
        script.async = true;
        script.defer = true;
        script.onload = () => (window.AppleID?.auth ? resolve(window.AppleID) : reject(new Error('appleid')));
        script.onerror = () => reject(new Error('appleid'));
        document.head.appendChild(script);
    }).catch(error => {
        scriptPromise = null;
        throw error;
    });
    return scriptPromise;
}

function isApplePopupDismissed(err: unknown): boolean {
    const code =
        typeof err === 'object' && err !== null && 'error' in err
            ? String((err as { error?: unknown }).error ?? '')
            : err instanceof Error
                ? err.message
                : String(err ?? '');
    return code === 'popup_closed_by_user' || code === 'user_cancelled_authorize';
}

function AppleMark() {
    return (
        <svg
            width="18"
            height="18"
            viewBox="-93 -20 1000 1040"
            fill="currentColor"
            className="h-[18px] w-[18px] shrink-0 -translate-y-[0.5px] overflow-visible"
            aria-hidden="true"
        >
            <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76.5 0-103.7 40.8-165.9 40.8s-105.6-57-155.5-127C46.7 790.7 0 663 0 541.8c0-194.4 126.4-297.5 250.8-297.5 66.1 0 121.2 43.4 162.7 43.4 39.5 0 101.1-46 176.3-46 28.5 0 130.9 2.6 198.3 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z"/>
        </svg>
    );
}

/**
 * Side-by-side Apple sign-in / sign-up button matching GoogleSignInButton's height and fallback UX.
 */
export function AppleSignInButton({
    onCredential,
    disabled = false,
    text = 'signin_with',
}: {
    onCredential: (payload: AppleCredentialPayload) => void;
    disabled?: boolean;
    text?: 'signin_with' | 'signup_with';
}) {
    const {t} = useI18n();
    const [pending, setPending] = useState(false);

    useEffect(() => {
        if (!CLIENT_ID) return;
        void loadAppleIdentity().catch(() => {
            /* Retried on click if preloading failed. */
        });
    }, []);

    const handleClick = async () => {
        if (disabled || pending) return;
        if (!CLIENT_ID) {
            toast.info(t('auth.apple.notConfigured'));
            return;
        }
        setPending(true);
        let apple: AppleIDGlobal;
        try {
            apple = await loadAppleIdentity();
        } catch {
            setPending(false);
            toast.info(t('auth.apple.loading'));
            return;
        }
        try {
            const nonce = crypto.randomUUID();
            const redirectURI = REDIRECT_URI || window.location.origin;
            apple.auth.init({
                clientId: CLIENT_ID,
                scope: 'name email',
                redirectURI,
                nonce,
                usePopup: true,
            });
            const response = await apple.auth.signIn();
            const credential = response?.authorization?.id_token;
            if (!credential) return;
            const authorizationCode = response.authorization?.code || undefined;
            const firstName = response.user?.name?.firstName?.trim();
            const lastName = response.user?.name?.lastName?.trim();
            const fullName = [firstName, lastName].filter(Boolean).join(' ').trim() || undefined;
            const email = response.user?.email?.trim() || undefined;
            onCredential({
                credential,
                authorizationCode,
                fullName,
                nonce,
                email,
            });
        } catch (err) {
            if (!isApplePopupDismissed(err)) {
                toast.error(t('auth.loginFailed'));
            }
        } finally {
            setPending(false);
        }
    };

    return (
        <button
            type="button"
            disabled={disabled || pending}
            aria-label={t(`auth.apple.${text}`)}
            onClick={() => void handleClick()}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-control border border-slate-900 bg-slate-900 px-3 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:pointer-events-none disabled:opacity-50 cursor-pointer"
        >
            <AppleMark/>
            <span className="truncate">{t('auth.apple.short')}</span>
        </button>
    );
}
