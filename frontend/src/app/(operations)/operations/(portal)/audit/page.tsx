'use client';
import {AuditPanel} from "@/features/audit/components/AuditPanel";
import {OperationsPage} from '@/components/layout/OperationsPage';
import {useI18n} from '@/contexts/I18nContext';

export default function AuditPage() {
    const {t} = useI18n();
    return <OperationsPage title={t('opsAssets.pages.audit.title')}
                           meta={t('opsAssets.pages.audit.meta')} permission="AUDIT_READ"
                           activeResource="audit"><AuditPanel/></OperationsPage>;
}
