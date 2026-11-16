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

export function validateProviderModerationInput(params: {
    status: ProviderVerificationStatus;
    rawFeePct?: string;
    rawNote?: string;
}): { ok: true; payload: ProviderModerationInput } | { ok: false; message: string } {
    let commissionRateOverride: number | undefined;
    if (params.rawFeePct !== undefined && params.rawFeePct.trim() !== '') {
        const pct = Number(params.rawFeePct);
        if (!Number.isFinite(pct) || pct < 0 || pct > 50) {
            return {
                ok: false,
                message: 'Mức phí hoa hồng riêng của đối tác phải nằm trong khoảng từ 0% đến 50%.',
            };
        }
        commissionRateOverride = pct / 100;
    }

    const reviewNote = params.rawNote?.trim() || undefined;
    if ((params.status === 'REJECTED' || params.status === 'SUSPENDED') && !reviewNote) {
        return {
            ok: false,
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
}): { ok: true; payload: PayoutProcessInput } | { ok: false; message: string } {
    const bankTransferRef = params.rawBankTransferRef?.trim() || undefined;
    const adminNote = params.rawAdminNote?.trim() || undefined;

    if (params.approve && !bankTransferRef) {
        return {
            ok: false,
            message: 'Vui lòng nhập mã giao dịch UNC ngân hàng trước khi xác nhận đã chuyển khoản.',
        };
    }
    if (!params.approve && !adminNote) {
        return {
            ok: false,
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
