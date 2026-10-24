'use client';

import {type InputHTMLAttributes, useId, useState} from 'react';
import {Eye, EyeOff} from 'lucide-react';
import {RequiredMark} from "@/components/shared/RequiredMark";
import {useI18n} from '@/contexts/I18nContext';

export function PasswordField({
                                  label,
                                  id,
                                  disabled,
                                  ...props
                              }: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & { label?: string }) {
    const generatedId = useId();
    const inputId = id || generatedId;
    const [visible, setVisible] = useState(false);
    const {t} = useI18n();

    return <div className="portal-auth-field">
        <label htmlFor={inputId}>{label ?? t('authShared.password')}{props.required && <RequiredMark/>}</label>
        <div className="portal-password">
            <input {...props} id={inputId} type={visible ? 'text' : 'password'} disabled={disabled}/>
            <button type="button" disabled={disabled} aria-label={visible ? t('authShared.hidePassword') : t('authShared.showPassword')}
                    aria-pressed={visible} aria-controls={inputId} onClick={() => setVisible(value => !value)}
                    style={{display: 'inline-flex', alignItems: 'center', justifyContent: 'center'}}>
                {visible ? <EyeOff size={20} aria-hidden="true"/> : <Eye size={20} aria-hidden="true"/>}
            </button>
        </div>
    </div>;
}
