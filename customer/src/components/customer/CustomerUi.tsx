'use client';

import type {ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes} from 'react';
import {
    Button as UiButton,
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    Input,
    StatusBadge,
    Textarea,
} from '@/components/ui';
import {keepVietnamesePhrases} from '@/lib/typography';
import {cn} from '@/lib/utils';

const variantMap = {
    primary: 'primary',
    secondary: 'outline',
    danger: 'danger',
} as const;

export function Button({
    variant = 'primary',
    className = '',
    ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'primary' | 'secondary' | 'danger';
}) {
    return (
        <UiButton
            variant={variantMap[variant]}
            size="md"
            className={cn(
                variant === 'secondary' && 'border-border-input bg-card text-foreground hover:bg-slate-50',
                className,
            )}
            {...props}
        />
    );
}

export function Field({
    label,
    className = '',
    ...props
}: InputHTMLAttributes<HTMLInputElement> & {label: string}) {
    return (
        <Input
            label={label}
            optional={!props.required}
            className={cn('h-10 px-3 py-2 text-sm', className)}
            {...props}
        />
    );
}

export function TextField({
    label,
    className = '',
    ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & {label: string}) {
    return (
        <Textarea
            label={label}
            optional={!props.required}
            className={cn('min-h-24 px-3 py-2 text-sm', className)}
            {...props}
        />
    );
}

export function Panel({
    title,
    children,
    action,
    className = '',
}: {
    title?: string;
    children: ReactNode;
    action?: ReactNode;
    className?: string;
}) {
    return (
        <Card className={cn('flex flex-col', className)}>
            {title && (
                <CardHeader className="flex-row flex-wrap items-center justify-between space-y-0 gap-3 border-b border-slate-200 bg-slate-50/70 px-4 py-3">
                    <CardTitle className="text-[15px] font-semibold tracking-tight text-slate-800">
                        {keepVietnamesePhrases(title)}
                    </CardTitle>
                    {action}
                </CardHeader>
            )}
            <CardContent className="flex-1 space-y-4 p-4">{children}</CardContent>
        </Card>
    );
}

export function Status({value}: {value: string}) {
    return <StatusBadge status={value} />;
}
