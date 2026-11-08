'use client';
import {AccessControl, TemplateEditor} from "@/components/access/PermissionEditor";
import {Registry} from "@/components/access/Registry";
import {RoleMatrix} from "@/components/access/RoleMatrix";

import type {AccessTab} from '@/types/access/access.types';

export type {AccessTab};

export function AccessHub({tab}: { tab: AccessTab }) {
    return <div className="space-y-5">
        {tab === 'accounts' && <AccessControl/>}
        {tab === 'templates' && <TemplateEditor/>}
        {tab === 'matrix' && <RoleMatrix/>}
        {tab === 'registry' && <Registry/>}
    </div>;
}
