'use client';

import {useCallback, useEffect, useState} from 'react';
import {usePathname, useRouter, useSearchParams} from 'next/navigation';
import type {AuthModalView, TwoFactorMethod} from '@/types/auth/auth.types';
import {type AuthChallengeState, INITIAL_CHALLENGE} from '@/components/auth/AuthModalChrome';

interface UseAuthModalSyncOptions {
    eventName: string;
    isStaffPortalPath: (next: string | null | undefined) => boolean;
    onClearFeedback: () => void;
}

export function useAuthModalSync({
    eventName,
    isStaffPortalPath,
    onClearFeedback,
}: UseAuthModalSyncOptions) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [isOpen, setIsOpen] = useState(false);
    const [view, setView] = useState<AuthModalView>('login');
    const [nextPath, setNextPath] = useState<string | null>(null);
    const [passwordLoginOpen, setPasswordLoginOpen] = useState(() =>
        isStaffPortalPath(searchParams.get('next')),
    );
    const [challenge, setChallenge] = useState<AuthChallengeState>(INITIAL_CHALLENGE);
    const [otpCode, setOtpCode] = useState('');
    const [resendCooldown, setResendCooldown] = useState(0);

    // ?auth=login|register|forgot (and ?next=) open the dialog; applied once per URL change, while rendering.
    const authQuery = searchParams.get('auth');
    const nextQuery = searchParams.get('next');
    const [appliedQuery, setAppliedQuery] = useState<string | null>(null);
    const queryKey = `${authQuery ?? ''}|${nextQuery ?? ''}`;
    if (queryKey !== appliedQuery) {
        setAppliedQuery(queryKey);
        if (nextQuery) {
            setNextPath(nextQuery);
            if (isStaffPortalPath(nextQuery)) {
                setPasswordLoginOpen(true);
            }
        }
        if (authQuery === 'login' || authQuery === 'register' || authQuery === 'forgot') {
            onClearFeedback();
            setPasswordLoginOpen(isStaffPortalPath(nextQuery));
            setView(authQuery === 'forgot' ? 'forgot-password' : authQuery);
            setIsOpen(true);
        }
    }

    useEffect(() => {
        const handleCustomOpen = (event: Event) => {
            const detail = (event as CustomEvent<{ view: AuthModalView; next?: string }>).detail;
            onClearFeedback();
            setView(detail?.view ?? 'login');
            setPasswordLoginOpen(isStaffPortalPath(detail?.next));
            if (detail?.next) setNextPath(detail.next);
            setIsOpen(true);
        };
        window.addEventListener(eventName, handleCustomOpen);
        return () => window.removeEventListener(eventName, handleCustomOpen);
    }, [eventName, isStaffPortalPath, onClearFeedback]);

    useEffect(() => {
        if (resendCooldown <= 0) return;
        const timer = window.setInterval(() => {
            setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);
        return () => window.clearInterval(timer);
    }, [resendCooldown]);

    const closeModal = useCallback(() => {
        setIsOpen(false);
        // A later open (e.g. from the header) must not reuse the deep link this one was opened for.
        setNextPath(null);
        onClearFeedback();
        if (searchParams.has('auth') || searchParams.has('next')) {
            const params = new URLSearchParams(searchParams.toString());
            params.delete('auth');
            params.delete('next');
            const qs = params.toString();
            router.replace(qs ? `${pathname}?${qs}` : pathname, {scroll: false});
        }
    }, [onClearFeedback, pathname, router, searchParams]);

    const issueChallenge = useCallback(
        (
            nextView: AuthModalView,
            next: {
                token: string;
                email: string;
                maskedEmail: string;
                mfaMethod?: TwoFactorMethod;
                devOtpPreview: string | null;
            },
        ) => {
            setChallenge({
                ...INITIAL_CHALLENGE,
                ...next,
                mfaMethod: next.mfaMethod ?? 'EMAIL',
            });
            setOtpCode('');
            setResendCooldown(60);
            setView(nextView);
        },
        [],
    );

    const refreshChallenge = useCallback(
        (next: {
            token: string;
            maskedEmail: string;
            devOtpPreview: string | null;
            forceEmail2fa: boolean;
        }) => {
            setChallenge((prev) => ({
                ...prev,
                token: next.token,
                maskedEmail: next.maskedEmail,
                devOtpPreview: next.devOtpPreview,
                mfaMethod: next.forceEmail2fa ? 'EMAIL' : prev.mfaMethod,
            }));
            setOtpCode('');
            setResendCooldown(60);
        },
        [],
    );

    return {
        router,
        isOpen,
        setIsOpen,
        view,
        setView,
        nextPath,
        setNextPath,
        passwordLoginOpen,
        setPasswordLoginOpen,
        challenge,
        otpCode,
        setOtpCode,
        resendCooldown,
        closeModal,
        issueChallenge,
        refreshChallenge,
    };
}
