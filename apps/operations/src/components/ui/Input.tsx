import React, { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, id, leftIcon, rightIcon, ...props }, ref) => {
    return (
      <div className="flex min-w-0 flex-col w-full">
        {label && (
          <label
            htmlFor={id}
            className="block font-label-lg text-label-lg font-medium text-on-surface mb-2"
          >
            {label}
          </label>
        )}
        <div className="relative min-w-0 w-full flex items-center">
          {leftIcon && (
            <div className="absolute left-3.5 flex items-center pointer-events-none text-outline select-none">
              {leftIcon}
            </div>
          )}
          <input
            id={id}
            ref={ref}
            className={cn(
              'min-w-0 w-full h-12 px-4 rounded-xl bg-card text-body-lg font-body-lg text-on-surface placeholder:text-outline transition-colors duration-150 outline-none focus:outline-2 focus:outline-ring shadow-sm border border-border-input',
              leftIcon && 'pl-11',
              rightIcon && 'pr-11',
              error && 'border-danger focus:outline-danger',
              className
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3.5 flex items-center pointer-events-none text-outline select-none">
              {rightIcon}
            </div>
          )}
        </div>
        {error ? (
          <p className="font-body-sm text-body-sm text-error mt-1.5">{error}</p>
        ) : helperText ? (
          <p className="font-body-md text-body-md text-secondary mt-1.5">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
