import React, {type ButtonHTMLAttributes, type PropsWithChildren} from 'react';
import {cn} from '@/lib/utils';

export function Button({children, ...props}: PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>>) {
    return <button {...props}>{children}</button>;
}

export interface VjuLogoProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    size?: number;
    className?: string;
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

export {PortalAuthLayout} from "@/components/shared/PortalAuthLayout";

export {LanguageSelect} from "@/components/shared/LanguageSelect";
export {AuthCredentials} from "@/components/shared/AuthCredentials";
