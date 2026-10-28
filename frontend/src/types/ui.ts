import type {
    ButtonHTMLAttributes,
    HTMLAttributes,
    ImgHTMLAttributes,
    InputHTMLAttributes,
    ReactNode,
    SelectHTMLAttributes,
    TextareaHTMLAttributes
} from 'react';
import type {ColumnDef} from '@tanstack/react-table';
import type {LucideIcon} from 'lucide-react';

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
    variant?: 'info' | 'success' | 'warning' | 'error';
    icon?: ReactNode;
    title?: string;
}

export interface BadgeProps extends HTMLAttributes<HTMLDivElement> {
    variant?:
        | 'default'
        | 'primary'
        | 'secondary'
        | 'success'
        | 'warning'
        | 'error'
        | 'outline'
        | 'telemetry';
    size?: 'sm' | 'md';
    icon?: ReactNode;
    pulse?: boolean;
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    isLoading?: boolean;
    loadingText?: string;
    leftIcon?: ReactNode;
    rightIcon?: ReactNode;
}

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'surface' | 'glass';
}

export interface ErrorBoundaryProps {
    children: ReactNode;
    fallbackTitle?: string;
}

export interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

export interface FieldLabelMarkProps {
    required?: boolean;
    optional?: boolean;
    optionalLabel?: string;
}

export interface FormFieldProps extends FieldLabelMarkProps {
    id?: string;
    label?: ReactNode;
    error?: string;
    helperText?: ReactNode;
    className?: string;
    labelClassName?: string;
    children: ReactNode;
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement>, FieldLabelMarkProps {
    label?: string;
    error?: string;
    helperText?: string;
    leftIcon?: ReactNode;
    rightIcon?: ReactNode;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement>, FieldLabelMarkProps {
    label?: string;
    error?: string;
    helperText?: string;
}

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement>, FieldLabelMarkProps {
    label?: string;
    error?: string;
    helperText?: string;
}

export interface LanguageSwitcherProps {
    variant?: 'pill' | 'dropdown' | 'compact';
    className?: string;
}

export interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>, FieldLabelMarkProps {
    label?: string;
    error?: string;
    helperText?: string;
    leftIcon?: ReactNode;
}

export interface SpinnerProps {
    size?: 'sm' | 'md' | 'lg' | number;
    className?: string;
    label?: string;
}

export interface SwitchProps {
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    disabled?: boolean;
    label?: ReactNode;
    title?: string;
    'aria-label'?: string;
    className?: string;
}

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
    id: string;
    type: ToastType;
    title?: string;
    message: string;
    duration?: number;
    isExiting?: boolean;
}

export interface ToastOptions {
    title?: string;
    duration?: number;
}

export interface ToastViewportProps {
    toasts: ToastItem[];
    onDismiss: (id: string) => void;
    onPause: (id: string) => void;
    onResume: (id: string) => void;
}

export type TableColumn<T> = ColumnDef<T, unknown>;

export interface TableFilter {
    column: string;
    label: string;
    options: { value: string; label: string }[];
}

export interface VjuLogoProps extends ImgHTMLAttributes<HTMLImageElement> {
    size?: number;
    className?: string;
}

export type AdminNavGroup =
    | 'overview'
    | 'customer'
    | 'operations'
    | 'fleet'
    | 'commerce'
    | 'access'
    | 'training'
    | 'intelligence'
    | 'security'
    | 'system'
    | 'infrastructure';
export type OperationsNavGroup = 'command' | 'missions' | 'assets' | 'monitoring';
export type CustomerNavGroup = 'overview' | 'missions' | 'services' | 'support';
export type CustomerNavBadge = 'activeMissions' | 'pendingInvoices' | 'unreadNotifications';

export interface SidebarRouteItem<G extends string = string> {
    href: string;
    key: string;
    group: G;
    icon: LucideIcon;
    permission?: string;
    /** Các URL phụ / đường dẫn cũ sẽ tự động kích hoạt (highlight) mục Sidebar này */
    aliases?: string[];
    defaultLabel?: string;
    badge?: CustomerNavBadge;
}

export interface ToastContextType {
    toasts: ToastItem[];
    show: (type: ToastType, message: string, options?: ToastOptions) => string;
    dismiss: (id: string) => void;
    success: (message: string, titleOrOptions?: string | ToastOptions) => string;
    error: (message: string, titleOrOptions?: string | ToastOptions) => string;
    warning: (message: string, titleOrOptions?: string | ToastOptions) => string;
    info: (message: string, titleOrOptions?: string | ToastOptions) => string;
}

