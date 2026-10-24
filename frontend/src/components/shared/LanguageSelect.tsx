import type {ReactNode} from 'react';
import {cn} from '@/lib/utils';

export function LanguageSelect<T extends string>({value, onChange, options, className = ''}: {
    value: T; onChange: (value: T) => void; options: readonly { value: T; label: string; flag?: ReactNode }[]; className?: string;
}) {
    return (
        <div className={cn('inline-flex items-center gap-1 rounded-xl border border-border bg-slate-100/80 p-1', className)} role="group" aria-label="Ngôn ngữ">
            {options.map(option => {
                const active = option.value === value;
                return (
                    <button
                        key={option.value}
                        type="button"
                        title={option.label}
                        aria-label={option.label}
                        aria-pressed={active}
                        onClick={() => option.value !== value && onChange(option.value)}
                        className={cn(
                            'inline-flex h-7 items-center justify-center rounded-lg px-2 text-xs font-bold transition-colors cursor-pointer',
                            active ? 'bg-card text-foreground shadow-xs ring-1 ring-border' : 'text-slate-600 opacity-75 hover:opacity-100 hover:bg-card/60'
                        )}
                    >
                        {option.flag ?? option.label}
                    </button>
                );
            })}
        </div>
    );
}
