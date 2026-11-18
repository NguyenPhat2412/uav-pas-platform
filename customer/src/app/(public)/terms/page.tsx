import {pageMetadata} from '@/content/marketing/metadata';
import {TermsPageView} from '@/components/marketing/TermsPageView';

export const metadata = pageMetadata(
    'Quy chế Hoạt động & Hồ sơ Pháp lý Đối tác',
    'Quy chế vận hành nền tảng UAV PAS, danh mục chứng từ pháp lý bắt buộc và cơ chế đối soát thanh toán.',
    '/terms',
    false,
);

export default function TermsPage() {
    return <TermsPageView />;
}
