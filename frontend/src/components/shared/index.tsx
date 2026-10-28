import React, {type ButtonHTMLAttributes, type PropsWithChildren} from 'react';
import {cn} from '@/lib/utils';
import type {VjuLogoProps} from '@/types/ui';

export type {VjuLogoProps};

export function Button({children, ...props}: PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>>) {
    return <button {...props}>{children}</button>;
}

export function VjuLogo({size = 32, className, alt = 'VJU - Trường Đại học Việt Nhật', ...props}: VjuLogoProps) {
    return (
        <img
            src="/vju-logo.svg"
            alt={alt}
            width={size}
            height={size}
            className={cn('inline-block shrink-0 object-contain', className)}
            {...props}
        />
    );
}

export {LanguageSelect} from "@/components/shared/LanguageSelect";
