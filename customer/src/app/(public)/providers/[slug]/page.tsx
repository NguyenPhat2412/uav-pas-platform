import {pageMetadata} from '@/content/marketing/metadata';
import {PublicProviderStorefront} from '@/components/marketplace/catalog/PublicProviderStorefront';

export const metadata = pageMetadata(
    'Gian hàng Đối tác UAV',
    'Hồ sơ năng lực, chứng chỉ bay, danh mục thiết bị và đánh giá nghiệm thu của đối tác trên sàn UAV PAS.',
    '/services',
);

export default async function ProviderStorefrontPage({params}: { params: Promise<{ slug: string }> }) {
    const {slug} = await params;
    return <PublicProviderStorefront slug={slug}/>;
}
