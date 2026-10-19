'use client';
import { keepVietnamesePhrases } from "@/lib/typography";
import { displayLabel } from "@/components/shared/presentation";
import { Button as SharedButton } from "@/components/shared";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react';
export function Button({ variant = 'primary', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' }) { return <SharedButton className={`button button-${variant}`} {...props} />; }
export function Field({ label, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string }) { return <label className="field"><span>{label}</span><input {...props} /></label>; }
export function TextField({ label, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) { return <label className="field"><span>{label}</span><textarea {...props} /></label>; }
export function Panel({ title, children, action, style, className = '' }: { title?: string; children: ReactNode; action?: ReactNode; style?: React.CSSProperties; className?: string }) { return <section className={`panel ${className}`} style={style}>{title && <header className="panel-header"><h2>{keepVietnamesePhrases(title)}</h2>{action}</header>}<div className="panel-body">{children}</div></section>; }
export function Status({ value }: { value: string }) { return <span className="mission-status" data-status={value}>{displayLabel(value)}</span>; }
