'use client';
import {type ReactNode, useEffect, useId, useRef} from 'react';
import {X} from 'lucide-react';
import {useI18n} from '@/contexts/I18nContext';

export function Drawer({title, onClose, children, wide = false}: {
    title: string;
    onClose: () => void;
    children: ReactNode;
    wide?: boolean
}) {
    const {t} = useI18n();
    const ref = useRef<HTMLDialogElement>(null);
    const label = useId();
    useEffect(() => {
        const dialog = ref.current;
        const previous = document.activeElement as HTMLElement | null;
        const overflow = document.body.style.overflow;
        dialog?.showModal();
        document.body.style.overflow = 'hidden';
        return () => {
            dialog?.close();
            document.body.style.overflow = overflow;
            previous?.focus();
        };
    }, []);
    return (
        <dialog
            ref={ref}
            aria-labelledby={label}
            onCancel={event => {
                event.preventDefault();
                onClose();
            }}
            className={`fixed inset-y-0 right-0 left-auto m-0 h-full max-h-none w-full border-l border-border bg-card p-0 text-foreground shadow-2xl backdrop:bg-slate-900/40 backdrop:backdrop-blur-xs ${
                wide ? 'max-w-3xl' : 'max-w-xl'
            }`}
        >
            <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-border bg-card/95 px-6 py-4 backdrop-blur-md">
                <h2 id={label} className="text-lg font-bold tracking-tight text-foreground">{title}</h2>
                <button
                    type="button"
                    aria-label={t('opsShared.state.close')}
                    onClick={onClose}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border text-slate-600 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
                >
                    <X size={18}/>
                </button>
            </header>
            <div className="space-y-5 p-6 overflow-y-auto max-h-[calc(100vh-4.5rem)]">{children}</div>
        </dialog>
    );
}

export function Tabs({items, value, onChange}: {
    items: { id: string; label: string }[];
    value: string;
    onChange: (id: string) => void
}) {
    const {t} = useI18n();
    const id = useId();
    return (
        <div role="tablist" aria-label={t('opsShared.state.detailTabs')} className="flex flex-wrap gap-1.5 rounded-xl bg-slate-100 p-1">
            {items.map((item, index) => {
                const selected = value === item.id;
                return (
                    <button
                        type="button"
                        key={item.id}
                        id={`${id}-${item.id}`}
                        role="tab"
                        aria-selected={selected}
                        tabIndex={selected ? 0 : -1}
                        className={`rounded-lg px-3.5 py-2 text-xs font-bold transition-colors cursor-pointer ${
                            selected ? 'bg-card text-primary shadow-xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                        onClick={() => onChange(item.id)}
                        onKeyDown={event => {
                            const offset = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
                            const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : offset ? (index + offset + items.length) % items.length : -1;
                            if (next >= 0) {
                                event.preventDefault();
                                onChange(items[next].id);
                                document.getElementById(`${id}-${items[next].id}`)?.focus();
                            }
                        }}
                    >
                        {item.label}
                    </button>
                );
            })}
        </div>
    );
}

export function Metadata({items}: { items: [string, ReactNode][] }) {
    return (
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {items.map(([label, value]) => (
                <div key={label} className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
                    <dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</dt>
                    <dd className="mt-1 text-sm font-semibold text-slate-900 break-words">{value ?? '—'}</dd>
                </div>
            ))}
        </dl>
    );
}
