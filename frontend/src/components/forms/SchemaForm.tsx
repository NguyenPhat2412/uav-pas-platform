'use client';
import {useId} from 'react';
import {type Resolver, useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {Button} from '@/components/ui';
import {ErrorNotice} from '@/components/data/WorkspaceState';
import {RequiredMark} from '@/components/shared/RequiredMark';

export interface FormField {
    name: string;
    label: string;
    type?: 'text' | 'number' | 'date' | 'datetime-local' | 'textarea' | 'select';
    options?: { value: string; label: string }[];
    hint?: string;
    required?: boolean;
}

export type FormValues = Record<string, string>;

export function SchemaForm({schema, fields, defaults, onSubmit, busy, error, submitLabel = 'Lưu', children}: {
    schema: z.ZodType;
    fields: FormField[];
    defaults: FormValues;
    onSubmit: (values: FormValues) => Promise<unknown>;
    busy?: boolean;
    error?: Error | null;
    submitLabel?: string;
    children?: React.ReactNode
}) {
    const id = useId();
    const resolver = zodResolver as unknown as (value: z.ZodType) => Resolver<FormValues>;
    const {register, handleSubmit, formState: {errors, isSubmitting}} = useForm<FormValues>({
        resolver: resolver(schema),
        defaultValues: defaults
    });
    return (
        <form
            noValidate
            onSubmit={handleSubmit(async values => {
                try {
                    await onSubmit(values);
                } catch { /* Mutation error is rendered by owner. */
                }
            })}
            className="space-y-5"
        >
            <fieldset disabled={busy || isSubmitting} className="space-y-5">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {fields.map(field => {
                        const fieldId = `${id}-${field.name}`;
                        const fieldError = errors[field.name];
                        const inputClass =
                            'w-full min-h-11 rounded-control border border-border-input bg-card px-3.5 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/20 aria-[invalid=true]:border-danger';
                        return (
                            <div
                                className={field.type === 'textarea' ? 'flex flex-col gap-1.5 sm:col-span-2' : 'flex flex-col gap-1.5'}
                                key={field.name}
                            >
                                <label htmlFor={fieldId} className="text-xs font-bold text-slate-700">
                                    {field.label}{field.required && <RequiredMark/>}
                                </label>
                                {field.type === 'select' ? (
                                    <select
                                        id={fieldId}
                                        className={inputClass}
                                        {...register(field.name)}
                                        aria-invalid={!!fieldError}
                                        aria-describedby={`${fieldId}-help`}
                                    >
                                        {field.options?.map(option => (
                                            <option value={option.value} key={option.value}>{option.label}</option>
                                        ))}
                                    </select>
                                ) : field.type === 'textarea' ? (
                                    <textarea
                                        id={fieldId}
                                        className={`${inputClass} min-h-24`}
                                        {...register(field.name)}
                                        aria-invalid={!!fieldError}
                                        aria-describedby={`${fieldId}-help`}
                                    />
                                ) : (
                                    <input
                                        id={fieldId}
                                        className={inputClass}
                                        type={field.type || 'text'}
                                        step={field.type === 'number' ? 'any' : undefined}
                                        {...register(field.name)}
                                        aria-invalid={!!fieldError}
                                        aria-describedby={`${fieldId}-help`}
                                    />
                                )}
                                {(fieldError || field.hint) && (
                                    <small
                                        id={`${fieldId}-help`}
                                        className={fieldError ? 'text-xs font-semibold text-danger' : 'text-xs text-slate-500'}
                                    >
                                        {fieldError ? String(fieldError.message) : field.hint}
                                    </small>
                                )}
                            </div>
                        );
                    })}
                </div>
                {children}
                <ErrorNotice error={error}/>
                <div className="flex items-center justify-end gap-3 pt-2">
                    <Button type="submit" size="sm" isLoading={busy || isSubmitting}>{submitLabel}</Button>
                </div>
            </fieldset>
        </form>
    );
}

export const requiredText = (max = 120) => z.string().trim().min(1, 'Không được để trống.').max(max, `Tối đa ${max} ký tự.`);
export const positiveInteger = z.string().refine(value => /^\d+$/.test(value) && Number(value) > 0 && Number(value) <= 2147483647, 'Nhập số nguyên từ 1 đến 2.147.483.647.');
export const optionalText = (max = 255) => z.string().trim().max(max, `Tối đa ${max} ký tự.`);
