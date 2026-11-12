'use client';

import Link from 'next/link';
import type {RefObject} from 'react';
import {Alert, Badge, Button, Spinner} from '@/components/ui';
import {ChatMessages} from '@/components/assistant/ChatMessages';
import {SuperheroLogo} from '@/components/assistant/SuperheroLogo';
import {useI18n} from '@/providers/I18nContext';
import type {AssistantPortal, ChatMessage} from '@/types/assistant/assistant.types';
import {cn} from '@/lib/utils';

/** Suggested starter questions per portal; the backend's built-in platform guide answers them. */
const FAQ: Record<AssistantPortal, {group: string; keys: readonly string[]}> = {
    ADMIN: {group: 'faq', keys: ['statuses', 'dispatch', 'payment', 'createMission', 'maintenance', 'sarRth']},
    OPERATIONS: {group: 'faqOperations', keys: ['assigned', 'preflight', 'telemetry', 'sarRth', 'maintenance', 'report']},
    CUSTOMER: {group: 'faqCustomer', keys: ['createMission', 'statuses', 'payment', 'quota', 'results', 'cancel']},
};

const HELLO_BODY: Record<AssistantPortal, string> = {
    ADMIN: 'helloBody',
    OPERATIONS: 'helloBodyOperations',
    CUSTOMER: 'helloBodyCustomer',
};

interface AssistantWidgetMessageListProps {
    portal: AssistantPortal;
    listRef: RefObject<HTMLDivElement | null>;
    messages: ChatMessage[];
    isInfoPending: boolean;
    enabled: boolean;
    canManageSettings: boolean;
    displayName: string;
    expanded: boolean;
    isSending: boolean;
    dropping: boolean;
    onAsk: (question: string) => void;
    onClose: () => void;
}

export function AssistantWidgetMessageList({
    portal,
    listRef,
    messages,
    isInfoPending,
    enabled,
    canManageSettings,
    displayName,
    expanded,
    isSending,
    dropping,
    onAsk,
    onClose,
}: AssistantWidgetMessageListProps) {
    const {t} = useI18n();
    const faq = FAQ[portal];

    return (
        <div
            ref={listRef}
            className="relative flex-1 space-y-2.5 overflow-y-auto bg-slate-50/60 px-2.5 py-2.5"
            aria-live="polite"
        >
            {isInfoPending ? (
                <div className="flex justify-center py-6">
                    <Spinner size="sm" label={t('admin.assistant.loading')} className="text-xs text-slate-500"/>
                </div>
            ) : !enabled ? (
                <div className="m-auto max-w-[280px] space-y-3 py-6 text-center">
                    <div className="flex justify-center">
                        <SuperheroLogo size={56}/>
                    </div>
                    <Alert variant="info" title={t('admin.assistant.offTitle')} className="p-3 text-left">
                        <p className="m-0 text-xs text-slate-600">
                            {t(canManageSettings ? 'admin.assistant.offBody' : 'admin.assistant.offBodyUser')}
                        </p>
                    </Alert>
                    {canManageSettings && (
                        <Link
                            href="/admin/settings#assistant"
                            onClick={onClose}
                            className="inline-flex h-8 items-center rounded-control bg-primary px-3 text-xs font-bold text-primary-foreground hover:bg-primary-hover"
                        >
                            {t('admin.assistant.openSettings')}
                        </Link>
                    )}
                </div>
            ) : !messages.length ? (
                <div className="text-center">
                    <p className="mb-0.5 mt-0 text-sm font-semibold text-slate-800">
                        {t('admin.assistant.hello', {name: displayName})}
                    </p>
                    <p className="m-0 text-xs text-slate-500">{t(`admin.assistant.${HELLO_BODY[portal]}`)}</p>
                    <div className="mb-1.5 mt-3 flex justify-start">
                        <Badge variant="outline" size="sm" className="border-slate-200 bg-white text-slate-500">
                            {t('admin.assistant.faqTitle')}
                        </Badge>
                    </div>
                    <ul className={cn('m-0 grid list-none gap-1 p-0 text-left', expanded && 'sm:grid-cols-2')}>
                        {faq.keys.map((key) => {
                            const question = t(`admin.assistant.${faq.group}.${key}`);
                            return (
                                <li key={key}>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => onAsk(question)}
                                        disabled={isSending}
                                        className="h-auto w-full justify-start border-slate-200 bg-white px-2.5 py-1 text-left text-[12.5px] font-normal leading-5 text-slate-700 hover:border-primary hover:bg-uav-red-light hover:text-primary"
                                    >
                                        {question}
                                    </Button>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            ) : (
                <ChatMessages messages={messages}/>
            )}

            {isSending && (
                <div className="flex items-center gap-2" role="status" aria-label={t('admin.assistant.thinking')}>
                    <SuperheroLogo size={26}/>
                    <span className="inline-flex gap-1 rounded-overlay border border-slate-200 bg-white px-3 py-2.5">
                        {[0, 150, 300].map((d) => (
                            <span
                                key={d}
                                className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400"
                                style={{animationDelay: `${d}ms`}}
                            />
                        ))}
                    </span>
                </div>
            )}

            {dropping && (
                <div className="pointer-events-none absolute inset-2 flex items-center justify-center rounded-overlay border-2 border-dashed border-primary bg-uav-red-light/80 text-sm font-semibold text-primary">
                    {t('admin.assistant.dropHere')}
                </div>
            )}
        </div>
    );
}
