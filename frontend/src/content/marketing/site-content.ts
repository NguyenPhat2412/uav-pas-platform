import type {Readiness} from '@/types/marketing/marketing.types';

export type {Readiness};

export const readinessLabels: Record<Readiness, string> = {
    AVAILABLE: 'Đã hỗ trợ',
    'IN DEVELOPMENT': 'Đang phát triển',
    PLANNED: 'Dự kiến',
};

export {customerUrl, publicUrl} from "@/content/marketing/origins";

export const capabilities = [
    {
        title: 'Yêu cầu dịch vụ',
        text: 'Bắt đầu từ nhu cầu dịch vụ và mục tiêu nhiệm vụ rõ ràng.',
        status: 'AVAILABLE' as Readiness
    },
    {
        title: 'Điều phối nhiệm vụ',
        text: 'Đội vận hành xem xét yêu cầu và điều phối bước tiếp theo.',
        status: 'AVAILABLE' as Readiness
    },
    {
        title: 'Quản lý hình ảnh nhiệm vụ',
        text: 'Lưu kết quả nhiệm vụ trong đúng không gian làm việc.',
        status: 'AVAILABLE' as Readiness
    },
    {
        title: 'Phát hiện có AI hỗ trợ',
        text: 'Dự kiến hỗ trợ xem xét hình ảnh nhiệm vụ dưới sự giám sát của con người.',
        status: 'PLANNED' as Readiness
    },
    {
        title: 'Hỗ trợ tìm kiếm cứu nạn',
        text: 'Quy trình dự kiến dành cho hoạt động ứng phó được phê duyệt và có giám sát.',
        status: 'PLANNED' as Readiness
    },
    {
        title: 'Thanh toán và gói dịch vụ',
        text: 'Quy trình thương mại đang được lên kế hoạch và chưa được công bố.',
        status: 'PLANNED' as Readiness
    },
];

export const services = [
    {
        slug: 'uav-rental',
        title: 'Thuê UAV',
        text: 'Yêu cầu thiết bị UAV và người điều khiển cho một nhiệm vụ cụ thể.',
        status: 'AVAILABLE' as Readiness
    },
    {
        slug: 'aerial-inspection',
        title: 'Khảo sát khu vực',
        text: 'Chuẩn bị yêu cầu kiểm tra có cấu trúc và xem xét kết quả nhiệm vụ.',
        status: 'AVAILABLE' as Readiness
    },
    {
        slug: 'aerial-recording',
        title: 'Quay chụp trên không',
        text: 'Ghi lại hình ảnh từ trên cao theo yêu cầu thương mại hoặc vận hành đã được phê duyệt.',
        status: 'AVAILABLE' as Readiness
    },
    {
        slug: 'data-collection',
        title: 'Thu thập dữ liệu',
        text: 'Mô tả khu vực, đầu ra và các ràng buộc của nhiệm vụ thu thập dữ liệu.',
        status: 'AVAILABLE' as Readiness
    },
];

export const solutions = [
    {
        slug: 'managed-uav-operations',
        title: 'Vận hành UAV theo yêu cầu',
        text: 'Bắt đầu yêu cầu về thiết bị UAV và người điều khiển.',
        status: 'AVAILABLE' as Readiness
    },
    {
        slug: 'infrastructure-inspection',
        title: 'Khảo sát công trình và khu vực',
        text: 'Chuyển nhu cầu kiểm tra thành yêu cầu nhiệm vụ để đội vận hành xem xét.',
        status: 'AVAILABLE' as Readiness
    },
    {
        slug: 'ai-detection',
        title: 'Phát hiện có AI hỗ trợ',
        text: 'Công cụ hỗ trợ xem xét dự kiến, với kết quả do con người xác minh.',
        status: 'PLANNED' as Readiness
    },
    {
        slug: 'search-and-rescue',
        title: 'Hỗ trợ tìm kiếm cứu nạn',
        text: 'Tính năng dự kiến có giám sát dành cho quy trình ứng phó được phê duyệt.',
        status: 'PLANNED' as Readiness
    },
];

export const legacySolutionSlugAliases: Record<string, string> = {
    'uav-rental': 'managed-uav-operations',
    'aerial-inspection': 'infrastructure-inspection',
};

export const steps = [
    {number: '01', title: 'Tìm hiểu dịch vụ', text: 'Chọn dịch vụ hoặc giải pháp phù hợp với mục tiêu nhiệm vụ.'},
    {number: '02', title: 'Tạo tài khoản', text: 'Tạo tài khoản và cung cấp thông tin cần thiết cho yêu cầu.'},
    {
        number: '03',
        title: 'Gửi yêu cầu nhiệm vụ',
        text: 'Cung cấp địa điểm, thời gian, đầu ra và các ràng buộc vận hành.'
    },
    {number: '04', title: 'Đội vận hành xem xét', text: 'Đội vận hành xem xét yêu cầu và điều phối bước tiếp theo.'},
    {
        number: '05',
        title: 'Theo dõi tiến độ',
        text: 'Theo dõi cập nhật nhiệm vụ và hình ảnh liên quan trong tài khoản của bạn.'
    },
];
