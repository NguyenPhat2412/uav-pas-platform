import Image from 'next/image';
import React, {type ButtonHTMLAttributes, type PropsWithChildren} from 'react';
import {cn} from '@/lib/utils';
import type {AppLogoProps} from '@/types/ui';

export type {AppLogoProps};

export function Button({children, ...props}: PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>>) {
    return <button {...props}>{children}</button>;
}

export function AppLogo({size = 32, className, alt = 'UAV PAS'}: AppLogoProps) {
    return (
        <Image
            src="/uav-pas-logo.svg"
            alt={alt}
            width={size}
            height={size}
            className={cn('inline-block shrink-0 object-contain', className)}
        />
    );
}

export {LanguageSelect} from "@/components/shared/LanguageSelect";
