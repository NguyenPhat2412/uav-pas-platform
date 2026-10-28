import type {ReactNode} from 'react';
import {ChevronDown} from 'lucide-react';
import {cn} from '@/lib/utils';

/**
 * Shows the current language's flag; clicking opens the browser's own <select> list. The select sits
 * invisibly over the flag, so it keeps native keyboard, screen-reader and mobile picker behaviour.
 */
export function LanguageSelect<T extends string>({value, onChange, options, className = ''}: {
    value: T; onChange: (value: T) => void; options: readonly { value: T; label: string; flag?: ReactNode }[]; className?: string;
}) {
    const current = options.find(option => option.value === value) ?? options[0];
    return (
        <span className={cn('relative inline-flex h-9 items-center gap-1 rounded-control border border-border bg-card pl-2 pr-1.5 text-slate-500 transition-colors hover:bg-slate-50 focus-within:outline-2 focus-within:outline-primary', className)}
              title={current?.label}>
            <span aria-hidden="true" className="inline-flex items-center">{current?.flag ?? current?.label}</span>
            <ChevronDown size={14} aria-hidden="true"/>
            <select
                value={value}
                onChange={event => event.target.value !== value && onChange(event.target.value as T)}
                aria-label="Ngôn ngữ / Language"
                className="absolute inset-0 h-full w-full cursor-pointer appearance-none opacity-0"
            >
                {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
        </span>
    );
}
