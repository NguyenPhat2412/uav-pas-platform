'use client';

import {useEffect, useRef, useState} from 'react';
import {Check, Copy, KeyRound} from 'lucide-react';
import {Alert, Button, Input} from '@/components/ui';
import {useI18n} from '@/providers/I18nContext';

/**
 * Shows a freshly rotated signing secret exactly once. The value lives only in this component's
 * props; closing the dialog drops it and the backend never returns it again.
 */
export function WebhookSecretDialog({name, secret, onClose}: { name: string; secret: string; onClose: () => void }) {
    const {t} = useI18n();
    const ref = useRef<HTMLDialogElement>(null);
    const [copied, setCopied] = useState(false);
    const [copyFailed, setCopyFailed] = useState(false);

    useEffect(() => {
        const dialog = ref.current;
        dialog?.showModal();
        return () => dialog?.close();
    }, []);

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(secret);
            setCopied(true);
            setCopyFailed(false);
        } catch {
            setCopyFailed(true);
        }
    };

    return (
        <dialog
            ref={ref}
            aria-labelledby="webhook-secret-title"
            onCancel={e => {
                e.preventDefault();
                onClose();
            }}
            className="m-auto w-[calc(100%-32px)] max-w-lg rounded-panel border border-slate-200 bg-white p-6 text-foreground shadow-2xl backdrop:bg-slate-900/45"
        >
            <div className="space-y-4">
                <h2 id="webhook-secret-title" className="inline-flex items-center gap-2 text-lg font-bold">
                    <KeyRound size={18} aria-hidden="true" className="text-primary"/>
                    {t('adminCommerce.webhooks.secret.title')}
                </h2>
                <p className="text-[13px] text-slate-600">{t('adminCommerce.webhooks.secret.intro', {name})}</p>
                <div className="flex items-stretch gap-2">
                    <div className="min-w-0 flex-1">
                        <Input
                            readOnly
                            value={secret}
                            aria-label={t('adminCommerce.webhooks.secret.label')}
                            onFocus={e => e.currentTarget.select()}
                            className="h-9 bg-slate-50 font-mono text-xs text-slate-900"
                        />
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => void copy()}
                        leftIcon={copied ? <Check size={14} aria-hidden="true"/> : <Copy size={14} aria-hidden="true"/>}
                    >
                        {copied ? t('adminCommerce.webhooks.secret.copied') : t('adminCommerce.webhooks.secret.copy')}
                    </Button>
                </div>
                {copyFailed && (
                    <Alert variant="error" role="alert" className="p-3 text-xs">
                        {t('adminCommerce.webhooks.secret.copyFailed')}
                    </Alert>
                )}
                <Alert variant="warning" role="note" className="p-3 text-[13px]">
                    {t('adminCommerce.webhooks.secret.warning')}
                </Alert>
                <footer className="flex justify-end">
                    <Button type="button" variant="primary" size="sm" onClick={onClose}>
                        {t('adminCommerce.webhooks.secret.done')}
                    </Button>
                </footer>
            </div>
        </dialog>
    );
}
