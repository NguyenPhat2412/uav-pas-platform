'use client';

import React, {useRef} from 'react';
import type {OtpCodeInputProps} from '@/features/auth/types/auth.types';

export function OtpCodeInput({
    value,
    onChange,
    length = 6,
    disabled = false,
    autoFocus = true,
}: OtpCodeInputProps) {
    const inputsRef = useRef<Array<HTMLInputElement | null>>([]);
    const digits = Array.from({length}, (_, idx) => value[idx] ?? '');

    const focusAt = (index: number) => {
        const clamped = Math.max(0, Math.min(length - 1, index));
        inputsRef.current[clamped]?.focus();
        inputsRef.current[clamped]?.select();
    };

    const setDigitAt = (index: number, raw: string) => {
        const clean = raw.replace(/\D/g, '');
        if (!clean) {
            const next = [...digits];
            next[index] = '';
            onChange(next.join(''));
            return;
        }
        const next = [...digits];
        for (let i = 0; i < clean.length && index + i < length; i++) {
            next[index + i] = clean[i];
        }
        onChange(next.join('').slice(0, length));
        const nextFocus = Math.min(length - 1, index + clean.length);
        focusAt(nextFocus);
    };

    return (
        <div className="flex items-center justify-between gap-2" role="group" aria-label="Mã xác thực OTP 6 chữ số">
            {digits.map((digit, index) => (
                <input
                    key={index}
                    ref={(el) => {
                        inputsRef.current[index] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    autoComplete={index === 0 ? 'one-time-code' : 'off'}
                    maxLength={6}
                    disabled={disabled}
                    autoFocus={autoFocus && index === 0}
                    value={digit}
                    aria-label={`Chữ số OTP thứ ${index + 1}`}
                    onChange={(e) => setDigitAt(index, e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Backspace') {
                            if (digits[index]) {
                                setDigitAt(index, '');
                            } else if (index > 0) {
                                setDigitAt(index - 1, '');
                                focusAt(index - 1);
                            }
                            e.preventDefault();
                        } else if (e.key === 'ArrowLeft' && index > 0) {
                            focusAt(index - 1);
                            e.preventDefault();
                        } else if (e.key === 'ArrowRight' && index < length - 1) {
                            focusAt(index + 1);
                            e.preventDefault();
                        }
                    }}
                    onPaste={(e) => {
                        e.preventDefault();
                        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
                        if (pasted) {
                            onChange(pasted);
                            focusAt(Math.min(length - 1, pasted.length));
                        }
                    }}
                    className="h-12 w-full rounded-control border border-slate-300 bg-slate-50/70 text-center font-mono text-lg font-bold text-slate-900 transition-colors focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/15 disabled:opacity-50"
                />
            ))}
        </div>
    );
}
