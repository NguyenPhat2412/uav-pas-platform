'use client';

import type {ReactNode} from 'react';
import {Eraser, Maximize2, Minimize2, X} from 'lucide-react';
import {Button} from '@/components/ui';
import {SuperheroLogo} from '@/components/assistant/SuperheroLogo';
import {useI18n} from '@/providers/I18nContext';

interface AssistantWidgetHeaderProps {
    subtitle: string;
    hasMessages: boolean;
    isSending: boolean;
    expanded: boolean;
    onClear: () => void;
    onToggleExpand: () => void;
    onClose: () => void;
}

export function AssistantWidgetHeader({
    subtitle,
    hasMessages,
    isSending,
    expanded,
    onClear,
    onToggleExpand,
    onClose,
}: AssistantWidgetHeaderProps) {
    const {t} = useI18n();

    return (
        <header className="flex items-center gap-2.5 border-b border-slate-200 px-3 py-2">
            <SuperheroLogo size={28}/>
            <div className="min-w-0 flex-1 leading-tight">
                <h2 className="m-0 truncate text-[13px] font-bold text-slate-900">{t('admin.assistant.title')}</h2>
                <p className="m-0 truncate text-[10.5px] text-slate-500">{subtitle}</p>
            </div>
            <HeaderActionButton label={t('admin.assistant.clear')} onClick={onClear} disabled={!hasMessages || isSending}>
                <Eraser size={15}/>
            </HeaderActionButton>
            <HeaderActionButton
                label={t(expanded ? 'admin.assistant.collapse' : 'admin.assistant.expand')}
                onClick={onToggleExpand}
            >
                {expanded ? <Minimize2 size={15}/> : <Maximize2 size={15}/>}
            </HeaderActionButton>
            <HeaderActionButton label={t('admin.assistant.close')} onClick={onClose}>
                <X size={16}/>
            </HeaderActionButton>
        </header>
    );
}

function HeaderActionButton({
    label,
    onClick,
    disabled,
    children,
}: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
    children: ReactNode;
}) {
    return (
        <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClick}
            disabled={disabled}
            aria-label={label}
            title={label}
            className="h-7 w-7 p-0 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40"
        >
            {children}
        </Button>
    );
}
