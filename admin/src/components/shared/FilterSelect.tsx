'use client';

/**
 * One compact filter: a native select whose options can carry a count, e.g. "Bảo trì (1)".
 * Replaces rows of filter chips so a toolbar keeps one control per filter. The label is shown in
 * front of the value ("Trạng thái: Tất cả") and is also the accessible name.
 */
export function FilterSelect<T extends string>({label, value, onChange, options, className = ''}: {
    label: string;
    value: T;
    onChange: (next: T) => void;
    options: readonly { value: T; label: string; count?: number }[];
    className?: string;
}) {
    return (
        <label className={`inline-flex h-9 items-center gap-1.5 rounded-control border border-border-input bg-card pl-3 text-xs text-slate-500 ${className}`}>
            <span className="whitespace-nowrap">{label}:</span>
            <select
                className="h-full min-w-0 cursor-pointer appearance-none bg-transparent pr-8 text-xs font-semibold text-slate-800 outline-none"
                value={value}
                onChange={event => onChange(event.target.value as T)}
            >
                {options.map(option => (
                    <option key={option.value} value={option.value}>
                        {option.count === undefined ? option.label : `${option.label} (${option.count})`}
                    </option>
                ))}
            </select>
        </label>
    );
}
