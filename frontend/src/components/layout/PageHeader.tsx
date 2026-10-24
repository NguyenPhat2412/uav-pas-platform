'use client';
import {keepVietnamesePhrases} from "@/lib/typography";
import {useI18n} from '@/contexts/I18nContext';
import Link from 'next/link';
import {ArrowLeft, Plus} from 'lucide-react';
import {Button} from '@/components/ui';

export function PageHeader({title, meta, action, backHref}: {
    title: string;
    meta?: string;
    action?: { label: string; onClick?: () => void; href?: string };
    backHref?: string
}) {
    const {t} = useI18n();
    return <header className="page-header">
        <div className="min-w-0">
            {backHref && <Link href={backHref}
                               className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-primary"><ArrowLeft
                size={14}/> {t('opsShared.state.back')}</Link>}
            <h1>{keepVietnamesePhrases(title)}</h1>
            {meta && <p>{meta}</p>}
        </div>
        {action && (action.href ?
            <Link href={action.href}><Button size="sm" leftIcon={<Plus size={15}/>}>{action.label}</Button></Link> :
            <Button size="sm" leftIcon={<Plus size={15}/>} onClick={action.onClick}>{action.label}</Button>)}
    </header>;
}

export function SectionHeading({title, meta, action}: { title: string; meta?: string; action?: React.ReactNode }) {
    return <div className="section-heading">
        <div><h2>{keepVietnamesePhrases(title)}</h2>{meta && <span>{meta}</span>}</div>
        {action}</div>;
}
