'use client';
import {AccessControl, TemplateEditor} from "@/features/access/components/PermissionEditor";
import {Registry} from "@/features/access/components/Registry";
import {RoleMatrix} from "@/features/access/components/RoleMatrix";

import type {AccessTab} from '@/features/access/types/access.types';

export type {AccessTab};

export function AccessHub({tab}: { tab: AccessTab }) {
    return <div className="space-y-5">
        {tab === 'accounts' && <AccessControl/>}
        {tab === 'templates' && <TemplateEditor/>}
        {tab === 'matrix' && <RoleMatrix/>}
        {tab === 'registry' && <Registry/>}
    </div>;
}
