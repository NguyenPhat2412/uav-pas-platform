import { redirect } from 'next/navigation';

export default async function LegacyOperationsAlias({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const tab = (await searchParams).tab;
  const target = tab === 'uavs' ? "/operations/uavs" : tab === 'equipment' ? "/operations/inventory" : tab === 'media' ? "/operations/media" : tab === 'audit' ? "/operations/audit" : "/operations/stations";
  redirect(target);
}
