import type {
    PaymentGatewayConfig,
    PaymentGatewayConfigInput,
} from '@/types/billing/billing-admin.types';

export interface NapasBankPreset {
    bin: string;
    shortName: string;
    fullName: string;
}

export const NAPAS_BANK_PRESETS: readonly NapasBankPreset[] = [
    {bin: '970436', shortName: 'Vietcombank', fullName: 'Vietcombank (NH TMCP Ngoại thương VN)'},
    {bin: '970418', shortName: 'BIDV', fullName: 'BIDV (NH TMCP Đầu tư & Phát triển VN)'},
    {bin: '970415', shortName: 'VietinBank', fullName: 'VietinBank (NH TMCP Công thương VN)'},
    {bin: '970405', shortName: 'Agribank', fullName: 'Agribank (NH NN & PTNT Việt Nam)'},
    {bin: '970422', shortName: 'MB Bank', fullName: 'MB Bank (NH TMCP Quân Đội)'},
    {bin: '970407', shortName: 'Techcombank', fullName: 'Techcombank (NH TMCP Kỹ thương VN)'},
    {bin: '970416', shortName: 'ACB', fullName: 'ACB (NH TMCP Á Châu)'},
    {bin: '970432', shortName: 'VPBank', fullName: 'VPBank (NH TMCP Việt Nam Thịnh Vượng)'},
    {bin: '970423', shortName: 'TPBank', fullName: 'TPBank (NH TMCP Tiên Phong)'},
    {bin: '970403', shortName: 'Sacombank', fullName: 'Sacombank (NH TMCP Sài Gòn Thương Tín)'},
] as const;

export interface PaymentGatewayDraft {
    bankBin: string;
    bankName: string;
    accountNumber: string;
    accountName: string;
    vatPercent: string;
}

export interface PaymentGatewayFieldErrors {
    bankBin?: string;
    bankName?: string;
    accountNumber?: string;
    accountName?: string;
    vatPercent?: string;
}

export function paymentGatewayDraftFromConfig(config: PaymentGatewayConfig): PaymentGatewayDraft {
    const vatPct = Math.round((config.vatRate ?? 0.1) * 1000) / 10;
    return {
        bankBin: config.bankBin ?? '',
        bankName: config.bankName ?? '',
        accountNumber: config.accountNumber ?? '',
        accountName: config.accountName ?? '',
        vatPercent: String(vatPct),
    };
}

export function validatePaymentGatewayDraft(draft: PaymentGatewayDraft): PaymentGatewayFieldErrors {
    const errors: PaymentGatewayFieldErrors = {};
    const bin = draft.bankBin.trim();
    const acct = draft.accountNumber.trim();
    const holder = draft.accountName.trim();
    const bankName = draft.bankName.trim();
    const anyBankFilled = Boolean(bin || acct || holder);

    if (anyBankFilled) {
        if (!/^\d{6}$/.test(bin)) {
            errors.bankBin = 'Mã BIN NAPAS phải gồm đúng 6 chữ số (ví dụ: 970436).';
        }
        if (!/^[0-9A-Za-z]{4,19}$/.test(acct)) {
            errors.accountNumber = 'Số tài khoản gồm 4–19 ký tự chữ hoặc số, không khoảng trắng.';
        }
        if (!holder) {
            errors.accountName = 'Vui lòng nhập tên chủ tài khoản thụ hưởng.';
        } else if (holder.length > 120) {
            errors.accountName = 'Tên chủ tài khoản tối đa 120 ký tự.';
        }
    }

    if (bankName.length > 120) {
        errors.bankName = 'Tên ngân hàng tối đa 120 ký tự.';
    }

    const vatNum = Number(draft.vatPercent.trim());
    if (draft.vatPercent.trim() === '' || Number.isNaN(vatNum) || vatNum < 0 || vatNum > 100) {
        errors.vatPercent = 'Thuế suất GTGT phải từ 0% đến 100%.';
    }

    return errors;
}

export function canSubmitPaymentGateway(draft: PaymentGatewayDraft): boolean {
    return Object.keys(validatePaymentGatewayDraft(draft)).length === 0;
}

export function toPaymentGatewayPayload(draft: PaymentGatewayDraft): PaymentGatewayConfigInput {
    const vatPct = Number(draft.vatPercent.trim());
    const vatRate = Number.isFinite(vatPct) ? Math.round(vatPct * 100) / 10000 : 0.1;
    return {
        bankBin: draft.bankBin.trim(),
        bankName: draft.bankName.trim(),
        accountNumber: draft.accountNumber.trim(),
        accountName: draft.accountName.trim().toUpperCase(),
        vatRate,
    };
}
