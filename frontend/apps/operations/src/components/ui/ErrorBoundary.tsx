'use client';

import React, { Component, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-2xl border border-red-200 bg-red-50/60 p-6 text-center text-slate-800 shadow-sm flex flex-col items-center justify-center min-h-[220px]">
          <div className="w-12 h-12 rounded-full bg-[#fdf2f2] border border-[#fecaca] text-[#ab2523] flex items-center justify-center mb-3">
            <AlertTriangle size={24} />
          </div>
          <h4 className="text-sm font-bold text-slate-900 mb-1">
            {this.props.fallbackTitle || 'Không thể hiển thị khu vực này'}
          </h4>
          <p className="text-xs text-slate-500 max-w-md mb-4 font-mono">
            {this.state.error?.message || 'Đã xảy ra lỗi kết xuất dữ liệu.'}
          </p>
          <button
            type="button"
            onClick={this.handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 shadow-xs transition cursor-pointer"
          >
            <RotateCcw size={13} /> Khôi phục Widget
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
