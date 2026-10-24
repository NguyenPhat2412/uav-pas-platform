'use client';

import React, {createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState} from 'react';
import {type ToastItem, type ToastOptions, type ToastType, ToastViewport} from '@/components/ui/Toast';

export type {ToastItem, ToastOptions, ToastType};

interface ToastContextType {
    toasts: ToastItem[];
    show: (type: ToastType, message: string, options?: ToastOptions) => string;
    dismiss: (id: string) => void;
    success: (message: string, titleOrOptions?: string | ToastOptions) => string;
    error: (message: string, titleOrOptions?: string | ToastOptions) => string;
    warning: (message: string, titleOrOptions?: string | ToastOptions) => string;
    info: (message: string, titleOrOptions?: string | ToastOptions) => string;
}

const TOAST_EVENT = 'uav:toast';
const ToastContext = createContext<ToastContextType | undefined>(undefined);

function normalizeOptions(titleOrOptions?: string | ToastOptions): ToastOptions {
    if (typeof titleOrOptions === 'string') {
        return {title: titleOrOptions};
    }
    return titleOrOptions || {};
}

/**
 * Global toast dispatcher for use anywhere, including outside the React component tree
 * (e.g. API clients, background services, event handlers).
 */
export const toast = {
    show: (type: ToastType, message: string, options?: ToastOptions) => {
        if (typeof window !== 'undefined') {
            const id = 'toast_' + Math.random().toString(36).substring(2, 9);
            window.dispatchEvent(
                new CustomEvent(TOAST_EVENT, {
                    detail: {id, type, message, ...options},
                })
            );
            return id;
        }
        return '';
    },
    success: (message: string, titleOrOptions?: string | ToastOptions) =>
        toast.show('success', message, normalizeOptions(titleOrOptions)),
    error: (message: string, titleOrOptions?: string | ToastOptions) =>
        toast.show('error', message, normalizeOptions(titleOrOptions)),
    warning: (message: string, titleOrOptions?: string | ToastOptions) =>
        toast.show('warning', message, normalizeOptions(titleOrOptions)),
    info: (message: string, titleOrOptions?: string | ToastOptions) =>
        toast.show('info', message, normalizeOptions(titleOrOptions)),
};

export function ToastProvider({children}: { children: ReactNode }) {
    const [toasts, setToasts] = useState<ToastItem[]>([]);
    const timersRef = useRef<Map<string, { timeoutId: NodeJS.Timeout; remaining: number; startedAt: number }>>(new Map());

    const dismiss = useCallback((id: string) => {
        setToasts((prev) =>
            prev.map((t) => (t.id === id ? {...t, isExiting: true} : t))
        );
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
            timersRef.current.delete(id);
        }, 280);
    }, []);

    const show = useCallback(
        (type: ToastType, message: string, options?: ToastOptions) => {
            const id = 'toast_' + Math.random().toString(36).substring(2, 9);
            const duration = options?.duration ?? (type === 'error' ? 5500 : 4200);

            const newItem: ToastItem = {
                id,
                type,
                title: options?.title,
                message,
                duration,
                isExiting: false,
            };

            setToasts((prev) => {
                const trimmed = prev.length >= 5 ? prev.slice(prev.length - 4) : prev;
                return [...trimmed, newItem];
            });

            const timeoutId = setTimeout(() => {
                dismiss(id);
            }, duration);

            timersRef.current.set(id, {
                timeoutId,
                remaining: duration,
                startedAt: Date.now(),
            });

            return id;
        },
        [dismiss]
    );

    const success = useCallback(
        (message: string, titleOrOptions?: string | ToastOptions) =>
            show('success', message, normalizeOptions(titleOrOptions)),
        [show]
    );

    const error = useCallback(
        (message: string, titleOrOptions?: string | ToastOptions) =>
            show('error', message, normalizeOptions(titleOrOptions)),
        [show]
    );

    const warning = useCallback(
        (message: string, titleOrOptions?: string | ToastOptions) =>
            show('warning', message, normalizeOptions(titleOrOptions)),
        [show]
    );

    const info = useCallback(
        (message: string, titleOrOptions?: string | ToastOptions) =>
            show('info', message, normalizeOptions(titleOrOptions)),
        [show]
    );

    useEffect(() => {
        const handleCustomToast = (event: Event) => {
            const detail = (event as CustomEvent<ToastItem>).detail;
            if (detail && detail.message) {
                show(detail.type || 'info', detail.message, {
                    title: detail.title,
                    duration: detail.duration,
                });
            }
        };

        window.addEventListener(TOAST_EVENT, handleCustomToast);
        return () => {
            window.removeEventListener(TOAST_EVENT, handleCustomToast);
        };
    }, [show]);

    const pauseToast = (id: string) => {
        const timer = timersRef.current.get(id);
        if (timer) {
            clearTimeout(timer.timeoutId);
            const elapsed = Date.now() - timer.startedAt;
            timer.remaining = Math.max(0, timer.remaining - elapsed);
        }
    };

    const resumeToast = (id: string) => {
        const timer = timersRef.current.get(id);
        if (timer && timer.remaining > 0) {
            timer.startedAt = Date.now();
            timer.timeoutId = setTimeout(() => {
                dismiss(id);
            }, timer.remaining);
        }
    };

    return (
        <ToastContext.Provider
            value={{
                toasts,
                show,
                dismiss,
                success,
                error,
                warning,
                info,
            }}
        >
            {children}
            <ToastViewport toasts={toasts} onDismiss={dismiss} onPause={pauseToast} onResume={resumeToast}/>
        </ToastContext.Provider>
    );
}

export function useToast(): ToastContextType {
    const context = useContext(ToastContext);
    if (!context) {
        return {
            toasts: [],
            show: toast.show,
            dismiss: () => {},
            success: toast.success,
            error: toast.error,
            warning: toast.warning,
            info: toast.info,
        };
    }
    return context;
}
