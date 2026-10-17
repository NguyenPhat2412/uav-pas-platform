import { redirect } from 'next/navigation';

export default async function LegacyOperationsAlias({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const tab = (await searchParams).tab;
  const target = tab === 'uavs' ? '/uavs' : tab === 'equipment' ? '/inventory' : tab === 'media' ? '/media' : tab === 'audit' ? '/audit' : '/stations';
  redirect(target);
}
