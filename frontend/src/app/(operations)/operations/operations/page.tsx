import {redirect} from 'next/navigation';
import {resolveLegacyOperationsTab} from '@/utils/auth/portal';

export default async function LegacyOperationsAliasPage({searchParams}: { searchParams: Promise<{ tab?: string }> }) {
    const {tab} = await searchParams;
    redirect(resolveLegacyOperationsTab(tab));
}
