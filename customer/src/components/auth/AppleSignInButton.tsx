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
        <svg width="17" height="17" viewBox="0 0 170 170" fill="currentColor" aria-hidden="true">
            <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.13-1.9-14.34-6.08-3.69-3.03-7.61-7.82-11.77-14.37-5.03-7.88-9.16-17.01-12.41-27.38-3.47-11.18-5.2-21.97-5.2-32.37 0-11.97 2.99-22.29 8.97-30.96 4.7-6.93 10.96-12.39 18.78-16.38 7.82-3.99 16.26-6.06 25.32-6.21 4.92 0 10.67 1.38 17.27 4.11 6.59 2.74 10.84 4.14 12.74 4.21 1.45 0 6.15-1.64 14.09-4.91 7.5-3.02 13.84-4.29 19.04-3.83 14.08 1.14 24.66 6.7 31.72 16.69-12.63 7.66-18.84 18.37-18.61 32.14.22 10.73 4.22 19.66 11.99 26.79 3.57 3.39 7.82 6.01 12.74 7.86-1.02 2.96-2.12 5.83-3.28 8.61zM119.22 31.01c0 8.4-3.07 16.24-9.2 23.51-7.39 8.64-16.32 13.63-26.01 12.85-.12-1.01-.19-2.08-.19-3.21 0-8.06 3.51-16.68 9.74-23.75 3.11-3.57 7.06-6.54 11.86-8.91 4.79-2.34 9.33-3.63 13.61-3.86.13 1.13.19 2.26.19 3.37z"/>
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
