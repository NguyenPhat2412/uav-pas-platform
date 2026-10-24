import type {ReactNode} from 'react';

export function LanguageSelect<T extends string>({value, onChange, options, className = ''}: {
    value: T; onChange: (value: T) => void; options: readonly { value: T; label: string; flag?: ReactNode }[]; className?: string;
}) {
    return <div className={`portal-language ${className}`} role="group" aria-label="Ngôn ngữ">
        {options.map(option => <button key={option.value} type="button" title={option.label}
                                       aria-label={option.label} aria-pressed={option.value === value}
                                       onClick={() => option.value !== value && onChange(option.value)}>
            {option.flag ?? option.label}
        </button>)}
    </div>;
}
