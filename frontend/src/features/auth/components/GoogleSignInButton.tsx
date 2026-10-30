'use client';

import {useEffect, useRef, useState} from 'react';
import {toast} from '@/contexts/ToastContext';

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
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z"/>
            <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
            <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z"/>
        </svg>
    );
}

/**
 * "Đăng nhập bằng Google". Google draws its own button (required by its branding rules) sized to the
 * form; until a client id is configured, or while the script loads, a look-alike placeholder holds the
 * place so the form does not jump.
 */
export function GoogleSignInButton({onCredential, disabled = false}: {
    onCredential: (credential: string) => void;
    disabled?: boolean;
}) {
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
                    text: 'signin_with',
                    shape: 'rectangular',
                    logo_alignment: 'center',
                    locale: 'vi',
                    width: Math.min(400, Math.max(200, Math.round(parent.getBoundingClientRect().width))),
                });
                setReady(true);
            })
            .catch(() => {
                if (active) setReady(false);
            });
        return () => {
            active = false;
        };
    }, []);

    return (
        <div className={`relative h-10 w-full ${disabled ? 'pointer-events-none opacity-50' : ''}`}>
            <div ref={slot} className={`flex h-10 w-full justify-center ${ready ? '' : 'invisible absolute inset-0'}`}/>
            {!ready && (
                <button
                    type="button"
                    onClick={() => toast.info(CLIENT_ID
                        ? 'Đang tải đăng nhập Google, vui lòng thử lại sau giây lát.'
                        : 'Đăng nhập Google chưa được cấu hình.')}
                    className="flex h-10 w-full items-center justify-center gap-2.5 rounded-control border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                >
                    <GoogleMark/>
                    Đăng nhập bằng Google
                </button>
            )}
        </div>
    );
}
