import {redirect} from 'next/navigation';
import {resolveLegacyOperationsTab} from '@/features/auth/utils/portal';

export default async function LegacyOperationsAliasPage({searchParams}: { searchParams: Promise<{ tab?: string }> }) {
    const {tab} = await searchParams;
    redirect(resolveLegacyOperationsTab(tab));
}
