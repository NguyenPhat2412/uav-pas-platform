'use client';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
export function Drawer({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const label = useId();
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    dialog?.showModal();
    document.body.style.overflow = 'hidden';
    return () => { dialog?.close(); document.body.style.overflow = overflow; previous?.focus(); };
  }, []);
  return <dialog ref={ref} aria-labelledby={label} onCancel={event => { event.preventDefault(); onClose(); }} className={`workspace-drawer ${wide ? 'workspace-drawer-wide' : ''}`}><header><h2 id={label}>{title}</h2><button type="button" aria-label="Đóng" onClick={onClose} className="icon-button"><X size={18} /></button></header><div className="drawer-body">{children}</div></dialog>;
}
export function Tabs({ items, value, onChange }: { items: { id: string; label: string }[]; value: string; onChange: (id: string) => void }) {
  const id = useId();
  return <div role="tablist" aria-label="Chi tiết" className="workspace-tabs">{items.map((item, index) => <button type="button" key={item.id} id={`${id}-${item.id}`} role="tab" aria-selected={value === item.id} tabIndex={value === item.id ? 0 : -1} onClick={() => onChange(item.id)} onKeyDown={event => {
    const offset = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : offset ? (index + offset + items.length) % items.length : -1;
    if (next >= 0) { event.preventDefault(); onChange(items[next].id); document.getElementById(`${id}-${items[next].id}`)?.focus(); }
  }}>{item.label}</button>)}</div>;
}
export function Metadata({ items }: { items: [string, ReactNode][] }) {
  return <dl className="metadata-grid">{items.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value ?? '—'}</dd></div>)}</dl>;
}
