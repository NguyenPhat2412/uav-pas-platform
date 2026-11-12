'use client';

import React, {type ReactNode, useCallback, useEffect, useState} from 'react';
import {ConfirmDialog} from '@/components/ui/ConfirmDialog';
import {useI18n} from '@/providers/I18nContext';

const CONFIRM_EVENT = 'uav:confirm-dialog';

export interface ConfirmOptions {
    title?: string;
    description: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'primary' | 'danger';
}

export interface ConfirmWithOptionConfig extends ConfirmOptions {
    checkboxLabel: string;
    defaultChecked?: boolean;
}

export interface PromptOptions extends ConfirmOptions {
    inputLabel?: string;
    inputPlaceholder?: string;
    defaultValue?: string;
    inputRequired?: boolean;
}

interface InternalRequest {
    id: number;
    title?: string;
    description: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'primary' | 'danger';
    checkboxLabel?: string;
    defaultChecked?: boolean;
    promptMode?: boolean;
    inputLabel?: string;
    inputPlaceholder?: string;
    defaultValue?: string;
    inputRequired?: boolean;
    resolve: (result: { confirmed: boolean; checked: boolean; value: string }) => void;
}

let requestSeq = 1;

function dispatchDialogRequest(
    request: Omit<InternalRequest, 'id' | 'resolve'>,
): Promise<{ confirmed: boolean; checked: boolean; value: string }> {
    if (typeof window === 'undefined') {
        return Promise.resolve({confirmed: false, checked: false, value: ''});
    }
    return new Promise(resolve => {
        const detail: InternalRequest = {
            ...request,
            id: requestSeq++,
            resolve,
        };
        window.dispatchEvent(new CustomEvent<InternalRequest>(CONFIRM_EVENT, {detail}));
    });
}

/**
 * Accessible async replacement for `window.confirm`.
 * Accepts either a plain message string or structured `ConfirmOptions`.
 */
export async function confirmDialog(messageOrOptions: string | ConfirmOptions): Promise<boolean> {
    const options: ConfirmOptions =
        typeof messageOrOptions === 'string'
            ? {description: messageOrOptions}
            : messageOrOptions;
    const result = await dispatchDialogRequest({
        ...options,
        variant: options.variant ?? 'danger',
    });
    return result.confirmed;
}

/**
 * Accessible single-step confirmation with an additional secondary checkbox
 * (replaces back-to-back `window.confirm` sequences).
 */
export async function confirmWithOption(
    options: ConfirmWithOptionConfig,
): Promise<{ confirmed: boolean; checked: boolean }> {
    const result = await dispatchDialogRequest({
        ...options,
        variant: options.variant ?? 'danger',
    });
    return {confirmed: result.confirmed, checked: result.checked};
}

/**
 * Accessible async replacement for `window.prompt`.
 * Resolves to the trimmed input string on confirm, or `null` when cancelled.
 */
export async function promptDialog(options: PromptOptions): Promise<string | null> {
    const result = await dispatchDialogRequest({
        ...options,
        variant: options.variant ?? 'primary',
        promptMode: true,
        inputRequired: options.inputRequired ?? true,
    });
    return result.confirmed ? result.value : null;
}

export function ConfirmProvider({children}: { children: ReactNode }) {
    const {t} = useI18n();
    const [queue, setQueue] = useState<InternalRequest[]>([]);
    const active = queue[0] ?? null;

    useEffect(() => {
        const onRequest = (event: Event) => {
            const detail = (event as CustomEvent<InternalRequest>).detail;
            if (!detail) return;
            setQueue(prev => [...prev, detail]);
        };
        window.addEventListener(CONFIRM_EVENT, onRequest);
        return () => {
            window.removeEventListener(CONFIRM_EVENT, onRequest);
        };
    }, []);

    const finish = useCallback(
        (target: InternalRequest, payload: { confirmed: boolean; checked: boolean; value: string }) => {
            target.resolve(payload);
            setQueue(prev => prev.filter(item => item.id !== target.id));
        },
        [],
    );

    return (
        <>
            {children}
            {active && (
                <ConfirmDialog
                    key={active.id}
                    open
                    title={active.title ?? t('common.confirm')}
                    description={active.description}
                    confirmLabel={active.confirmLabel ?? t('common.confirm')}
                    cancelLabel={active.cancelLabel ?? t('common.cancel')}
                    closeLabel={t('common.close')}
                    variant={active.variant}
                    checkboxLabel={active.checkboxLabel}
                    defaultChecked={active.defaultChecked}
                    promptMode={active.promptMode}
                    inputLabel={active.inputLabel}
                    inputPlaceholder={active.inputPlaceholder}
                    defaultValue={active.defaultValue}
                    inputRequired={active.inputRequired}
                    onConfirm={({checked, value}) => finish(active, {confirmed: true, checked, value})}
                    onCancel={() => finish(active, {confirmed: false, checked: false, value: ''})}
                />
            )}
        </>
    );
}
