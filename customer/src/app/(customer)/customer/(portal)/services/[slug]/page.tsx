import CustomerServiceDetailPage from '@/components/marketplace/booking/CustomerServiceDetailView';

export default async function CustomerServiceDetailRoutePage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const {slug} = await params;
    return <CustomerServiceDetailPage slug={slug}/>;
}
