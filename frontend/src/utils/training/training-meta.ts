import type {LucideIcon} from 'lucide-react';
import {
    Crosshair,
    Database,
    GraduationCap,
    LifeBuoy,
    Lock,
    MapPinned,
    PlaneTakeoff,
    Radio,
    Receipt,
    Route,
    Router,
    ScanLine,
    Server,
    ShieldCheck,
    Siren,
    Webhook,
    Wrench,
} from 'lucide-react';
import type {TrainingPortalTier} from '@/types/training/training.types';

export const PORTAL_META: Record<
    TrainingPortalTier,
    {
        title: string;
        subtitle: string;
        /** Who reads this tier, as admins see it ("Tài liệu đào tạo cho …"). */
        audience: string;
        categories: Record<string, string>;
    }
> = {
    CUSTOMER: {
        title: 'Hướng dẫn sử dụng dịch vụ',
        subtitle: 'Cách đặt nhiệm vụ bay, chuẩn bị hiện trường và nhận dữ liệu.',
        audience: 'khách hàng',
        categories: {
            SITE_PREP: 'Khảo sát & Chuẩn bị Bãi đáp',
            SENSOR_GSD: 'Cảm biến & Độ phân giải GSD',
            DATA_DELIVERY: 'Nghiệm thu Dữ liệu & AI',
            EMERGENCY_SAFETY: 'An toàn & Khẩn cấp',
            MISSION_PLANNING: 'Khởi tạo & Tọa độ bay',
            SAFETY_COMPLIANCE: 'An toàn bãi đáp & Hành lang',
            DATA_DELIVERABLES: 'Nghiệm thu dữ liệu & AI',
            BILLING_SLA: 'Hạn mức & Đối soát SLA',
        },
    },
    OPERATIONS: {
        title: 'Đào tạo & SOP điều hành',
        subtitle: 'Quy trình chuẩn cho kiểm tra trước bay, điều phối, xử lý khẩn cấp và bảo dưỡng.',
        audience: 'đội điều hành',
        categories: {
            FLIGHT_SOP: 'Quy trình Bay & BVLOS',
            SAR_TACTICAL: 'Tác chiến SAR & AI Detection',
            EMERGENCY_SAFETY: 'Ứng phó Khẩn cấp & Failsafe',
            MAINTENANCE: 'Bảo dưỡng & Logistics',
            PREFLIGHT_SOP: 'Kiểm tra Pre-flight & Trạm',
            BVLOS_DISPATCH: 'Điều phối BVLOS & Telemetry',
            EMERGENCY_SAR: 'Ứng cứu SAR & Khẩn cấp',
            MAINTENANCE_LOGISTICS: 'Bảo dưỡng & Kho thiết bị',
        },
    },
    ADMIN: {
        title: 'Quy chuẩn quản trị',
        subtitle: 'Phân quyền, bảo mật, AI Router, webhook và đối soát tài chính.',
        audience: 'quản trị viên',
        categories: {
            RBAC_SECURITY: 'Bảo mật RBAC & 2FA',
            BILLING_QUOTA: 'Đối soát Billing & Hạn mức',
            INFRA_TELEMETRY: 'Hạ tầng AI Router & Webhook',
            AI_ROUTER_GOVERNANCE: 'Điều phối AI Router',
            WEBHOOK_BILLING_AUDIT: 'Kiểm toán Webhook & Billing',
        },
    },
};

export const LEVEL_LABELS: Record<string, {label: string; toneClass: string}> = {
    FUNDAMENTAL: {
        label: 'Cơ bản',
        toneClass: 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300',
    },
    FOUNDATION: {
        label: 'Cơ bản',
        toneClass: 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300',
    },
    STANDARD_SOP: {
        label: 'Chuẩn SOP',
        toneClass: 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300',
    },
    STANDARD: {
        label: 'Tiêu chuẩn',
        toneClass: 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300',
    },
    ADVANCED_TACTICAL: {
        label: 'Nâng cao',
        toneClass: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300',
    },
    ADVANCED: {
        label: 'Chuyên sâu',
        toneClass: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300',
    },
    MANDATORY: {
        label: 'Trọng yếu',
        toneClass: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300',
    },
    SOP_CRITICAL: {
        label: 'Trọng yếu',
        toneClass: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300',
    },
};
export function trainingCategoryLabel(portal: TrainingPortalTier, categoryKey: string): string {
    return (
        PORTAL_META[portal]?.categories?.[categoryKey] ||
        PORTAL_META.CUSTOMER.categories[categoryKey] ||
        PORTAL_META.OPERATIONS.categories[categoryKey] ||
        PORTAL_META.ADMIN.categories[categoryKey] ||
        categoryKey
    );
}

/** Icon for a course without a cover image, by category; fall back to `GraduationCap`. */
export const TRAINING_CATEGORY_ICONS: Record<string, LucideIcon> = {
    SITE_PREP: MapPinned,
    SENSOR_GSD: ScanLine,
    DATA_DELIVERY: Database,
    DATA_DELIVERABLES: Database,
    EMERGENCY_SAFETY: Siren,
    EMERGENCY_SAR: LifeBuoy,
    MISSION_PLANNING: Route,
    SAFETY_COMPLIANCE: ShieldCheck,
    BILLING_SLA: Receipt,
    BILLING_QUOTA: Receipt,
    FLIGHT_SOP: PlaneTakeoff,
    PREFLIGHT_SOP: PlaneTakeoff,
    SAR_TACTICAL: Crosshair,
    BVLOS_DISPATCH: Radio,
    MAINTENANCE: Wrench,
    MAINTENANCE_LOGISTICS: Wrench,
    RBAC_SECURITY: Lock,
    INFRA_TELEMETRY: Server,
    AI_ROUTER_GOVERNANCE: Router,
    WEBHOOK_BILLING_AUDIT: Webhook,
};

export {GraduationCap as TrainingDefaultCategoryIcon};

/** Where an admin manages a portal's courses: /admin/training/customer, /operations or /admin. */
export function adminTrainingHome(portal: TrainingPortalTier): string {
    return `/admin/training/${portal.toLowerCase()}`;
}

/** Link from the admin pages to the learner view of a course; `portal` keeps the right sidebar item lit while it loads. */
export function adminTrainingPreviewHref(slug: string, portal: TrainingPortalTier): string {
    return `/admin/training/learn/${encodeURIComponent(slug)}?portal=${portal}`;
}
