'use client';

import Image from 'next/image';
import React from 'react';
import {AlertCircle, AlertTriangle, CheckCircle2, Info, X} from 'lucide-react';
import {cn} from '@/lib/utils';
import type {ToastItem, ToastOptions, ToastType, ToastViewportProps} from '@/types/ui';

export type {ToastItem, ToastOptions, ToastType, ToastViewportProps};

export function ToastViewport({toasts, onDismiss, onPause, onResume}: ToastViewportProps) {
    return (
        <div
            className="pointer-events-none fixed top-4 right-4 left-4 z-[999999] flex w-auto max-w-[calc(100vw-2rem)] flex-col gap-3 sm:top-5 sm:right-5 sm:left-auto sm:w-96 sm:max-w-md"
            aria-live="polite"
            aria-atomic="true"
        >
            {toasts.map((item) => (
                <div
                    key={item.id}
                    className={cn(
                        'group pointer-events-auto relative w-full max-w-full overflow-hidden rounded-overlay border bg-white shadow-xl shadow-slate-900/10 transition-[opacity,transform]',
                        item.isExiting ? 'opacity-0 sm:animate-slide-out-right' : 'sm:animate-slide-in-right',
                        item.type === 'success' && 'border-l-4 border-l-toast-success-border border-slate-200/80',
                        item.type === 'error' && 'border-l-4 border-l-toast-error-border border-slate-200/80',
                        item.type === 'warning' && 'border-l-4 border-l-toast-warning-border border-slate-200/80',
                        item.type === 'info' && 'border-l-4 border-l-toast-info-border border-slate-200/80'
                    )}
                    role="status"
                    onMouseEnter={() => onPause(item.id)}
                    onMouseLeave={() => onResume(item.id)}
                >
                    <div className="flex items-start gap-3 p-4">
                        <div className="relative flex-shrink-0">
                            <div
                                className={cn(
                                    'w-9 h-9 rounded-panel flex items-center justify-center font-bold',
                                    item.type === 'success' && 'bg-toast-success-bg text-toast-success-icon',
                                    item.type === 'error' && 'bg-toast-error-bg text-toast-error-icon',
                                    item.type === 'warning' && 'bg-toast-warning-bg text-toast-warning-icon',
                                    item.type === 'info' && 'bg-toast-info-bg text-toast-info-icon'
                                )}
                            >
                                {item.type === 'success' && <CheckCircle2 size={20} strokeWidth={2.5}/>}
                                {item.type === 'error' && <AlertCircle size={20} strokeWidth={2.5}/>}
                                {item.type === 'warning' && <AlertTriangle size={20} strokeWidth={2.5}/>}
                                {item.type === 'info' && <Info size={20} strokeWidth={2.5}/>}
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-panel bg-white border border-slate-100 flex items-center justify-center overflow-hidden">
                                <Image src="/uav-pas-logo.svg" alt="UAV" width={14} height={14} className="w-3.5 h-3.5 object-contain"/>
                            </div>
                        </div>

                        <div className="min-w-0 flex-1 pr-1">
                            <div className="mb-1 flex flex-wrap items-start justify-between gap-1.5">
                                <h4 className="min-w-0 flex-1 text-sm leading-snug font-bold break-words text-slate-900">
                                    {item.title ||
                                        (item.type === 'success'
                                            ? 'Thành công'
                                            : item.type === 'error'
                                                ? 'Có lỗi xảy ra'
                                                : item.type === 'warning'
                                                    ? 'Cảnh báo'
                                                    : 'Thông báo')}
                                </h4>
                                <span
                                    className={cn(
                                        'shrink-0 rounded-badge px-1.5 py-0.5 text-[10px] font-semibold tracking-wider whitespace-nowrap uppercase',
                                        item.type === 'success' && 'bg-uav-blue-light text-uav-blue border border-blue-200',
                                        item.type === 'error' && 'bg-red-50 text-red-700 border border-red-200',
                                        item.type === 'warning' && 'bg-amber-50 text-amber-700 border border-amber-200',
                                        item.type === 'info' && 'bg-blue-50 text-blue-700 border border-blue-200'
                                    )}
                                >
                                    UAV PAS
                                </span>
                            </div>
                            <p className="text-xs leading-relaxed break-words text-slate-600">{item.message}</p>
                        </div>

                        <button
                            type="button"
                            onClick={() => onDismiss(item.id)}
                            className="flex-shrink-0 text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1 rounded-control transition-colors -mr-1 -mt-1"
                            aria-label="Đóng thông báo"
                        >
                            <X size={15}/>
                        </button>
                    </div>

                    {item.duration && item.duration > 0 && (
                        <div className="h-0.5 w-full bg-slate-100 overflow-hidden">
                            <div
                                className={cn(
                                    'h-full animate-toast-progress group-hover:[animation-play-state:paused]',
                                    item.type === 'success' && 'bg-toast-success-progress',
                                    item.type === 'error' && 'bg-toast-error-progress',
                                    item.type === 'warning' && 'bg-toast-warning-progress',
                                    item.type === 'info' && 'bg-toast-info-progress'
                                )}
                                style={{animationDuration: `${item.duration}ms`}}
                            />
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
