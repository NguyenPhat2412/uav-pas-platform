import type {AdminProviderDocument, ProviderVerificationStatus} from '@/types/marketplace/marketplace.types';

export type ProviderDocumentTypeCode =
    | 'IDENTITY_CARD'
    | 'BUSINESS_LICENSE'
    | 'PILOT_CERTIFICATE'
    | 'UAV_REGISTRATION'
    | 'INSURANCE_POLICY'
    | 'FLIGHT_OPERATION_PERMIT'
    | 'PLATFORM_FEE_AGREEMENT'
    | 'TAX_SETTLEMENT_DOSSIER';

export type DocumentRequirementLevel = 'REQUIRED' | 'CONDITIONAL' | 'NOT_APPLICABLE';

export interface ProviderDocumentRequirement {
    code: ProviderDocumentTypeCode;
    individual: DocumentRequirementLevel;
    company: DocumentRequirementLevel;
    purposeVi: string;
    purposeEn: string;
}

export const ALL_PROVIDER_DOCUMENT_REQUIREMENTS: readonly ProviderDocumentRequirement[] = [
    {
        code: 'IDENTITY_CARD',
        individual: 'REQUIRED',
        company: 'REQUIRED',
        purposeVi: 'Xác thực danh tính cá nhân hoặc người đại diện pháp luật.',
        purposeEn: 'Verify identity of individual operator or legal representative.',
    },
    {
        code: 'BUSINESS_LICENSE',
        individual: 'NOT_APPLICABLE',
        company: 'REQUIRED',
        purposeVi: 'Chứng minh tư cách pháp nhân / hộ kinh doanh đang hoạt động.',
        purposeEn: 'Confirm active business registration for organizations.',
    },
    {
        code: 'PILOT_CERTIFICATE',
        individual: 'REQUIRED',
        company: 'REQUIRED',
        purposeVi: 'Chứng chỉ điều khiển UAV / năng định tổ lái còn hiệu lực.',
        purposeEn: 'Valid UAV operator certificate / pilot qualification.',
    },
    {
        code: 'UAV_REGISTRATION',
        individual: 'REQUIRED',
        company: 'REQUIRED',
        purposeVi: 'Hồ sơ đăng ký tàu bay và danh sách số serial thiết bị.',
        purposeEn: 'Aircraft registration and serial number inventory.',
    },
    {
        code: 'INSURANCE_POLICY',
        individual: 'REQUIRED',
        company: 'REQUIRED',
        purposeVi: 'Bảo hiểm trách nhiệm dân sự khi vận hành bay thương mại.',
        purposeEn: 'Commercial flight third-party liability insurance policy.',
    },
    {
        code: 'FLIGHT_OPERATION_PERMIT',
        individual: 'CONDITIONAL',
        company: 'CONDITIONAL',
        purposeVi: 'Bắt buộc khi bay tại khu vực kiểm soát hoặc nhiệm vụ chuyên ngành.',
        purposeEn: 'Required for controlled airspace or specialized operations.',
    },
    {
        code: 'PLATFORM_FEE_AGREEMENT',
        individual: 'REQUIRED',
        company: 'REQUIRED',
        purposeVi: 'Xác nhận biểu phí nền tảng và quy chế đối soát thanh toán.',
        purposeEn: 'Signed platform commission and settlement fee schedule.',
    },
    {
        code: 'TAX_SETTLEMENT_DOSSIER',
        individual: 'CONDITIONAL',
        company: 'REQUIRED',
        purposeVi: 'Mã số thuế, thông tin xuất hoá đơn và tài khoản nhận đối soát.',
        purposeEn: 'Tax registration and settlement payout bank dossier.',
    },
] as const;

export interface VerificationStageInfo {
    step: number;
    status: ProviderVerificationStatus;
    titleVi: string;
    titleEn: string;
    descVi: string;
    descEn: string;
}

export const VERIFICATION_WORKFLOW_STAGES: readonly VerificationStageInfo[] = [
    {
        step: 1,
        status: 'DRAFT',
        titleVi: 'Khởi tạo hồ sơ',
        titleEn: 'Draft dossier',
        descVi: 'Đối tác khai báo đơn vị, khu vực bay và tài khoản nhận đối soát.',
        descEn: 'Partner enters profile, base province, and settlement bank details.',
    },
    {
        step: 2,
        status: 'PENDING_REVIEW',
        titleVi: 'Nộp & chờ thẩm định',
        titleEn: 'Submitted for review',
        descVi: 'Đối tác tải đủ bộ giấy tờ bắt buộc và gửi lên hàng chờ xét duyệt.',
        descEn: 'Partner uploads mandatory documents and submits for admin review.',
    },
    {
        step: 3,
        status: 'VERIFIED',
        titleVi: 'Đạt chuẩn & kích hoạt',
        titleEn: 'Verified & activated',
        descVi: 'Hồ sơ hợp lệ được xác minh, mở ví đối soát và quyền đăng dịch vụ.',
        descEn: 'Approved dossier activates settlement wallet and service listings.',
    },
    {
        step: 4,
        status: 'REJECTED',
        titleVi: 'Yêu cầu bổ sung',
        titleEn: 'Revision required',
        descVi: 'Thiếu hoặc sai lệch giấy tờ; quản trị viên ghi rõ lý do để đối tác nộp lại.',
        descEn: 'Missing or invalid documents; admin notes exact items to fix.',
    },
    {
        step: 5,
        status: 'SUSPENDED',
        titleVi: 'Tạm khoá giám sát',
        titleEn: 'Suspended',
        descVi: 'Tạm ngưng đối tác và ẩn dịch vụ khi hết hạn giấy phép hoặc vi phạm SLA.',
        descEn: 'Temporarily paused with published listings hidden on violations/expiry.',
    },
] as const;

export interface ChecklistItemSummary {
    requirement: ProviderDocumentRequirement;
    level: DocumentRequirementLevel;
    documents: AdminProviderDocument[];
    uploaded: boolean;
    hasApproved: boolean;
    hasRejected: boolean;
    hasPending: boolean;
}

export interface ProviderDocumentChecklistSummary {
    items: ChecklistItemSummary[];
    requiredTotal: number;
    requiredUploaded: number;
    requiredMissing: ChecklistItemSummary[];
    approvedCount: number;
    pendingCount: number;
    rejectedCount: number;
    otherDocuments: AdminProviderDocument[];
}

export function getRequirementLevel(
    req: ProviderDocumentRequirement,
    providerType: 'INDIVIDUAL' | 'COMPANY',
): DocumentRequirementLevel {
    return providerType === 'COMPANY' ? req.company : req.individual;
}

export function computeProviderDocumentChecklist(
    providerType: 'INDIVIDUAL' | 'COMPANY',
    documents: AdminProviderDocument[],
): ProviderDocumentChecklistSummary {
    const knownCodes = new Set<string>(ALL_PROVIDER_DOCUMENT_REQUIREMENTS.map(r => r.code));
    const byType = new Map<string, AdminProviderDocument[]>();
    const otherDocuments: AdminProviderDocument[] = [];

    for (const doc of documents) {
        if (knownCodes.has(doc.documentType)) {
            const list = byType.get(doc.documentType) ?? [];
            list.push(doc);
            byType.set(doc.documentType, list);
        } else {
            otherDocuments.push(doc);
        }
    }

    const items: ChecklistItemSummary[] = ALL_PROVIDER_DOCUMENT_REQUIREMENTS.map(requirement => {
        const matched = byType.get(requirement.code) ?? [];
        const level = getRequirementLevel(requirement, providerType);
        const upperStatuses = matched.map(d => (d.status || '').toUpperCase());
        return {
            requirement,
            level,
            documents: matched,
            uploaded: matched.length > 0,
            hasApproved: upperStatuses.some(s => s === 'APPROVED' || s === 'VERIFIED'),
            hasRejected: upperStatuses.some(s => s === 'REJECTED'),
            hasPending: upperStatuses.some(s => s === 'PENDING'),
        };
    });

    const requiredItems = items.filter(item => item.level === 'REQUIRED');
    const requiredMissing = requiredItems.filter(item => !item.uploaded);

    let approvedCount = 0;
    let pendingCount = 0;
    let rejectedCount = 0;
    for (const doc of documents) {
        const s = (doc.status || '').toUpperCase();
        if (s === 'APPROVED' || s === 'VERIFIED') approvedCount += 1;
        else if (s === 'REJECTED') rejectedCount += 1;
        else pendingCount += 1;
    }

    return {
        items,
        requiredTotal: requiredItems.length,
        requiredUploaded: requiredItems.length - requiredMissing.length,
        requiredMissing,
        approvedCount,
        pendingCount,
        rejectedCount,
        otherDocuments,
    };
}
