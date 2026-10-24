'use client';

import React, {createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState} from 'react';
import {AlertCircle, AlertTriangle, CheckCircle2, Info, X} from 'lucide-react';
import {cn} from '@/lib/utils';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
    id: string;
    type: ToastType;
    title?: string;
    message: string;
    duration?: number;
    isExiting?: boolean;
}

export interface ToastOptions {
    title?: string;
    duration?: number;
}

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
        // Remove from DOM after exit animation completes (280ms)
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

    // Listen to custom window events for global invocations
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
            <div
                className="fixed top-5 right-5 z-[999999] flex flex-col gap-3 pointer-events-none max-w-sm sm:max-w-md w-[calc(100vw-2.5rem)] sm:w-96"
                aria-live="polite"
                aria-atomic="true"
            >
                {toasts.map((item) => (
                    <div
                        key={item.id}
                        className={cn(
                            "group pointer-events-auto relative overflow-hidden rounded-xl border bg-white shadow-xl shadow-slate-900/10 transition-all",
                            item.isExiting ? "animate-slide-out-right" : "animate-slide-in-right",
                            item.type === 'success' && "border-l-4 border-l-toast-success-border border-slate-200/80",
                            item.type === 'error' && "border-l-4 border-l-toast-error-border border-slate-200/80",
                            item.type === 'warning' && "border-l-4 border-l-toast-warning-border border-slate-200/80",
                            item.type === 'info' && "border-l-4 border-l-toast-info-border border-slate-200/80"
                        )}
                        role="status"
                        onMouseEnter={() => pauseToast(item.id)}
                        onMouseLeave={() => resumeToast(item.id)}
                    >
                        <div className="flex items-start gap-3 p-4">
                            {/* Brand / Status Visual Wrap */}
                            <div className="relative flex-shrink-0">
                                <div
                                    className={cn(
                                        "w-9 h-9 rounded-lg flex items-center justify-center font-bold shadow-sm",
                                        item.type === 'success' && "bg-toast-success-bg text-toast-success-icon",
                                        item.type === 'error' && "bg-toast-error-bg text-toast-error-icon",
                                        item.type === 'warning' && "bg-toast-warning-bg text-toast-warning-icon",
                                        item.type === 'info' && "bg-toast-info-bg text-toast-info-icon"
                                    )}
                                >
                                    {item.type === 'success' && <CheckCircle2 size={20} strokeWidth={2.5}/>}
                                    {item.type === 'error' && <AlertCircle size={20} strokeWidth={2.5}/>}
                                    {item.type === 'warning' && <AlertTriangle size={20} strokeWidth={2.5}/>}
                                    {item.type === 'info' && <Info size={20} strokeWidth={2.5}/>}
                                </div>
                                <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-white border border-slate-100 shadow-sm flex items-center justify-center overflow-hidden">
                                    <img src="/vju-logo.svg" alt="UAV" className="w-3.5 h-3.5 object-contain" />
                                </div>
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0 pr-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <h4 className="text-sm font-bold text-slate-900 leading-snug truncate">
                                        {item.title || (item.type === 'success' ? 'Thành công' : item.type === 'error' ? 'Có lỗi xảy ra' : item.type === 'warning' ? 'Cảnh báo' : 'Thông báo')}
                                    </h4>
                                    <span
                                        className={cn(
                                            "text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full ml-auto shrink-0",
                                            item.type === 'success' && "bg-emerald-50 text-emerald-700 border border-emerald-200",
                                            item.type === 'error' && "bg-red-50 text-red-700 border border-red-200",
                                            item.type === 'warning' && "bg-amber-50 text-amber-700 border border-amber-200",
                                            item.type === 'info' && "bg-blue-50 text-blue-700 border border-blue-200"
                                        )}
                                    >
                                        UAV PAS
                                    </span>
                                </div>
                                <p className="text-xs text-slate-600 leading-relaxed break-words">
                                    {item.message}
                                </p>
                            </div>

                            {/* Close Button */}
                            <button
                                type="button"
                                onClick={() => dismiss(item.id)}
                                className="flex-shrink-0 text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1 rounded-md transition-colors -mr-1 -mt-1"
                                aria-label="Đóng thông báo"
                            >
                                <X size={15}/>
                            </button>
                        </div>

                        {/* Progress Bar */}
                        {item.duration && item.duration > 0 && (
                            <div className="h-0.5 w-full bg-slate-100 overflow-hidden">
                                <div
                                    className={cn(
                                        "h-full animate-toast-progress group-hover:[animation-play-state:paused]",
                                        item.type === 'success' && "bg-toast-success-progress",
                                        item.type === 'error' && "bg-toast-error-progress",
                                        item.type === 'warning' && "bg-toast-warning-progress",
                                        item.type === 'info' && "bg-toast-info-progress"
                                    )}
                                    style={{animationDuration: `${item.duration}ms`}}
                                />
                            </div>
                        )}
                    </div>
                ))}
            </div>
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
