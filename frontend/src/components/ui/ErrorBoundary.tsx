'use client';

import React, {Component, type ReactNode} from 'react';
import {AlertTriangle, RotateCcw} from 'lucide-react';
import {useI18n} from '@/contexts/I18nContext';

interface ErrorBoundaryProps {
    children: ReactNode;
    fallbackTitle?: string;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

// Function component so the fallback can read the active language; only rendered under portal providers.
function ErrorFallback({title, message, onReset}: { title?: string; message?: string; onReset: () => void }) {
    const {t} = useI18n();
    return (
        <div
            className="rounded-2xl border border-red-200 bg-red-50/60 p-6 text-center text-slate-800 shadow-sm flex flex-col items-center justify-center min-h-[220px]">
            <div
                className="w-12 h-12 rounded-full bg-uav-red-light border border-red-200 text-primary flex items-center justify-center mb-3">
                <AlertTriangle size={24}/>
            </div>
            <h4 className="text-sm font-bold text-slate-900 mb-1">
                {title || t('opsShared.errorBoundary.title')}
            </h4>
            <p className="text-xs text-slate-500 max-w-md mb-4">
                {message || t('opsShared.errorBoundary.detail')}
            </p>
            <button
                type="button"
                onClick={onReset}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 shadow-xs transition cursor-pointer"
            >
                <RotateCcw size={13}/> {t('opsShared.errorBoundary.reset')}
            </button>
        </div>
    );
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = {hasError: false, error: null};
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return {hasError: true, error};
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    handleReset = () => {
        this.setState({hasError: false, error: null});
    };

    render() {
        if (this.state.hasError) {
            return <ErrorFallback title={this.props.fallbackTitle} message={this.state.error?.message}
                                  onReset={this.handleReset}/>;
        }

        return this.props.children;
    }
}
