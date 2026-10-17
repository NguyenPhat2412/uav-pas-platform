'use client';
import { useId } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui';
import { ErrorNotice } from '@/components/data/WorkspaceState';
export interface FormField { name: string; label: string; type?: 'text' | 'number' | 'date' | 'datetime-local' | 'textarea' | 'select'; options?: { value: string; label: string }[]; hint?: string; }
export type FormValues = Record<string, string>;
export function SchemaForm({ schema, fields, defaults, onSubmit, busy, error, submitLabel = 'Lưu', children }: { schema: z.ZodType; fields: FormField[]; defaults: FormValues; onSubmit: (values: FormValues) => Promise<unknown>; busy?: boolean; error?: Error | null; submitLabel?: string; children?: React.ReactNode }) {
  const id = useId();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({ resolver: zodResolver(schema as z.ZodObject) as Resolver<FormValues>, defaultValues: defaults });
  return <form noValidate onSubmit={handleSubmit(async values => { try { await onSubmit(values); } catch { /* Mutation error is rendered by owner. */ } })} className="schema-form"><fieldset disabled={busy || isSubmitting}><div className="form-grid">{fields.map(field => { const fieldId = `${id}-${field.name}`; const error = errors[field.name]; return <div className={field.type === 'textarea' ? 'form-field form-field-wide' : 'form-field'} key={field.name}><label htmlFor={fieldId}>{field.label}</label>{field.type === 'select' ? <select id={fieldId} {...register(field.name)} aria-invalid={!!error} aria-describedby={`${fieldId}-help`}>{field.options?.map(option => <option value={option.value} key={option.value}>{option.label}</option>)}</select> : field.type === 'textarea' ? <textarea id={fieldId} {...register(field.name)} aria-invalid={!!error} aria-describedby={`${fieldId}-help`} /> : <input id={fieldId} type={field.type || 'text'} step={field.type === 'number' ? 'any' : undefined} {...register(field.name)} aria-invalid={!!error} aria-describedby={`${fieldId}-help`} />}<small id={`${fieldId}-help`} className={error ? 'form-error' : ''}>{error ? String(error.message) : field.hint}</small></div>; })}</div>{children}<ErrorNotice error={error} /><div className="form-actions"><Button type="submit" size="sm" isLoading={busy || isSubmitting}>{submitLabel}</Button></div></fieldset></form>;
}
export const requiredText = (max = 120) => z.string().trim().min(1, 'Không được để trống.').max(max, `Tối đa ${max} ký tự.`);
export const positiveInteger = z.string().refine(value => /^\d+$/.test(value) && Number(value) > 0 && Number(value) <= 2147483647, 'Nhập số nguyên từ 1 đến 2.147.483.647.');
export const optionalText = (max = 255) => z.string().trim().max(max, `Tối đa ${max} ký tự.`);
