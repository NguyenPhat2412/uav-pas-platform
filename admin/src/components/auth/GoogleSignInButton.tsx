'use client';

import {useEffect, useRef, useState} from 'react';
import {toast} from '@/providers/ToastContext';
import {useI18n} from '@/providers/I18nContext';

const GSI_SRC = 'https://accounts.google.com/gsi/client';
const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() ?? '';

type GoogleCredentialResponse = { credential?: string };
type GoogleIdentity = {
    accounts: {
        id: {
            initialize: (config: {
                client_id: string;
                callback: (response: GoogleCredentialResponse) => void;
                ux_mode?: 'popup' | 'redirect';
                auto_select?: boolean;
                cancel_on_tap_outside?: boolean;
            }) => void;
            renderButton: (parent: HTMLElement, options: Record<string, string | number>) => void;
        };
    };
};

declare global {
    interface Window {
        google?: GoogleIdentity;
    }
}

let scriptPromise: Promise<GoogleIdentity> | null = null;

/** Loads Google Identity Services once per page; a failed load can be retried on the next mount. */
function loadGoogleIdentity(): Promise<GoogleIdentity> {
    if (window.google?.accounts?.id) return Promise.resolve(window.google);
    scriptPromise ??= new Promise<GoogleIdentity>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = GSI_SRC;
        script.async = true;
        script.defer = true;
        script.onload = () => (window.google?.accounts?.id ? resolve(window.google) : reject(new Error('gsi')));
        script.onerror = () => reject(new Error('gsi'));
        document.head.appendChild(script);
    }).catch(error => {
        scriptPromise = null;
        throw error;
    });
    return scriptPromise;
}

function GoogleMark() {
    return (
        <svg
            width="18"
            height="18"
            viewBox="-2 -2 52 52"
            className="h-[18px] w-[18px] shrink-0 overflow-visible"
            aria-hidden="true"
        >
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
        </svg>
    );
}

/**
 * "Đăng nhập / Đăng ký bằng Google". Google draws its own button (required by its branding rules) sized
 * to the form; until a client id is configured, or while the script loads, a look-alike placeholder holds
 * the place so the form does not jump. Both texts hit the same endpoint: a first sign-in creates the account.
 */
export function GoogleSignInButton({onCredential, disabled = false, text = 'signin_with'}: {
    onCredential: (credential: string) => void;
    disabled?: boolean;
    text?: 'signin_with' | 'signup_with';
}) {
    const {t, locale} = useI18n();
    const slot = useRef<HTMLDivElement>(null);
    const callback = useRef(onCredential);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        callback.current = onCredential;
    }, [onCredential]);

    useEffect(() => {
        if (!CLIENT_ID) return;
        let active = true;
        loadGoogleIdentity()
            .then(google => {
                const parent = slot.current;
                if (!active || !parent) return;
                google.accounts.id.initialize({
                    client_id: CLIENT_ID,
                    callback: response => {
                        if (response.credential) callback.current(response.credential);
                    },
                    ux_mode: 'popup',
                    auto_select: false,
                    cancel_on_tap_outside: true,
                });
                parent.replaceChildren();
                google.accounts.id.renderButton(parent, {
                    type: 'standard',
                    theme: 'outline',
                    size: 'large',
                    text,
                    shape: 'rectangular',
                    logo_alignment: 'center',
                    locale,
                    width: Math.min(400, Math.max(140, Math.round(parent.getBoundingClientRect().width))),
                });
                setReady(true);
            })
            .catch(() => {
                if (active) setReady(false);
            });
        return () => {
            active = false;
        };
    }, [text, locale]);

    return (
        <div className={`relative h-10 w-full ${disabled ? 'pointer-events-none opacity-50' : ''}`}>
            <div ref={slot} className={`flex h-10 w-full justify-center ${ready ? '' : 'invisible absolute inset-0'}`}/>
            {!ready && (
                <button
                    type="button"
                    aria-label={t(`auth.google.${text}`)}
                    onClick={() => toast.info(t(CLIENT_ID ? 'auth.google.loading' : 'auth.google.notConfigured'))}
                    className="flex h-10 w-full items-center justify-center gap-2 rounded-control border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 cursor-pointer"
                >
                    <GoogleMark/>
                    <span className="truncate">{t('auth.google.short')}</span>
                </button>
            )}
        </div>
    );
}
