import type {
    ListingModerationInput,
    ListingModerationStatus,
    PayoutProcessInput,
    ProviderModerationInput,
    ProviderVerificationStatus,
} from '@/types/marketplace/marketplace.types';

export function formatMarketplaceVnd(amount: number): string {
    return `${new Intl.NumberFormat('vi-VN').format(Math.round(amount || 0))} ₫`;
}

export type ProviderModerationErrorCode = 'INVALID_FEE_RATE' | 'NOTE_REQUIRED';
export type ListingModerationErrorCode = 'NOTE_REQUIRED';
export type PayoutProcessErrorCode = 'TRANSFER_REF_REQUIRED' | 'ADMIN_NOTE_REQUIRED';

export function validateProviderModerationInput(params: {
    status: ProviderVerificationStatus;
    rawFeePct?: string;
    rawNote?: string;
}):
    | { ok: true; payload: ProviderModerationInput }
    | { ok: false; code: ProviderModerationErrorCode; message: string } {
    let commissionRateOverride: number | undefined;
    if (params.rawFeePct !== undefined && params.rawFeePct.trim() !== '') {
        const pct = Number(params.rawFeePct);
        if (!Number.isFinite(pct) || pct < 0 || pct > 50) {
            return {
                ok: false,
                code: 'INVALID_FEE_RATE',
                message: 'Mức phí hoa hồng riêng của đối tác phải nằm trong khoảng từ 0% đến 50%.',
            };
        }
        commissionRateOverride = pct / 100;
    }

    const reviewNote = params.rawNote?.trim() || undefined;
    if ((params.status === 'REJECTED' || params.status === 'SUSPENDED') && !reviewNote) {
        return {
            ok: false,
            code: 'NOTE_REQUIRED',
            message: 'Vui lòng nhập ghi chú lý do khi yêu cầu bổ sung hồ sơ hoặc đình chỉ đối tác.',
        };
    }

    return {
        ok: true,
        payload: {
            status: params.status,
            reviewNote,
            commissionRateOverride,
        },
    };
}

export function validateListingModerationInput(params: {
    status: ListingModerationStatus;
    rawNote?: string;
    featured: boolean;
}):
    | { ok: true; payload: ListingModerationInput }
    | { ok: false; code: ListingModerationErrorCode; message: string } {
    const moderationNote = params.rawNote?.trim() || undefined;
    if ((params.status === 'REJECTED' || params.status === 'PAUSED') && !moderationNote) {
        return {
            ok: false,
            code: 'NOTE_REQUIRED',
            message: 'Vui lòng nhập lý do khi từ chối hoặc tạm ẩn dịch vụ.',
        };
    }
    return {
        ok: true,
        payload: buildListingModerationInput(params),
    };
}

export function buildListingModerationInput(params: {
    status: ListingModerationStatus;
    rawNote?: string;
    featured: boolean;
}): ListingModerationInput {
    return {
        status: params.status,
        moderationNote: params.rawNote?.trim() || undefined,
        featured: params.featured,
    };
}

export function validatePayoutProcessInput(params: {
    approve: boolean;
    rawBankTransferRef?: string;
    rawAdminNote?: string;
}):
    | { ok: true; payload: PayoutProcessInput }
    | { ok: false; code: PayoutProcessErrorCode; message: string } {
    const bankTransferRef = params.rawBankTransferRef?.trim() || undefined;
    const adminNote = params.rawAdminNote?.trim() || undefined;

    if (params.approve && !bankTransferRef) {
        return {
            ok: false,
            code: 'TRANSFER_REF_REQUIRED',
            message: 'Vui lòng nhập mã giao dịch UNC ngân hàng trước khi xác nhận đã chuyển khoản.',
        };
    }
    if (!params.approve && !adminNote) {
        return {
            ok: false,
            code: 'ADMIN_NOTE_REQUIRED',
            message: 'Vui lòng nhập ghi chú lý do kế toán khi từ chối và hoàn số dư về ví đối tác.',
        };
    }

    return {
        ok: true,
        payload: {
            approve: params.approve,
            bankTransferRef,
            adminNote,
        },
    };
}
