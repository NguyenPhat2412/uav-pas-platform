import {
    Activity,
    Archive,
    BookOpenCheck,
    CirclePlus,
    BarChart3,
    Bell,
    Boxes,
    CloudSun,
    ClipboardList,
    CreditCard,
    Crosshair,
    Gamepad2,
    Database,
    FileCheck2,
    FileKey2,
    FileLock2,
    FileSpreadsheet,
    FolderOpen,
    Gauge,
    GraduationCap,
    HardDrive,
    Inbox,
    KeyRound,
    Languages,
    LayoutDashboard,
    Lock,
    Mail,
    Map as MapIcon,
    MapPinned,
    MessagesSquare,
    Package,
    PlaneTakeoff,
    Radio,
    ReceiptText,
    Rocket,
    Router,
    ScrollText,
    Server,
    Settings,
    ShieldAlert,
    ShieldCheck,
    Siren,
    Store,
    TableProperties,
    User,
    Users,
    Wallet,
    Wrench,
} from 'lucide-react';
import {activeDestination} from '@/lib/navigation';
import type {
    AdminNavGroup,
    AdminNavSubGroup,
    CustomerNavBadge,
    CustomerNavGroup,
    OperationsNavGroup,
    SidebarRouteItem,
    SidebarSubGroupMeta,
} from '@/types/ui';

export type {
    AdminNavGroup,
    AdminNavSubGroup,
    CustomerNavBadge,
    CustomerNavGroup,
    OperationsNavGroup,
    SidebarRouteItem,
    SidebarSubGroupMeta,
};

/**
 * Cấu hình tập trung toàn bộ đường dẫn (routes) hiển thị trên thanh Sidebar của 3 cổng:
 * 1. Admin Portal (`ADMIN_SIDEBAR_GROUPS`, `ADMIN_SIDEBAR_ROUTES`)
 * 2. Operations Portal (`OPERATIONS_SIDEBAR_GROUPS`, `OPERATIONS_SIDEBAR_ROUTES`)
 * 3. Customer Portal (`CUSTOMER_SIDEBAR_GROUPS`, `CUSTOMER_SIDEBAR_ROUTES`)
 *
 * Bạn chỉ cần thêm / sửa / sắp xếp các mục tại file này để quản lý toàn bộ Sidebar.
 */

// ============================================================================
// 1. ADMIN PORTAL SIDEBAR ROUTES (7 Nhóm Chuyên biệt)
// ============================================================================
// The admin sidebar lists admin pages only; customer and operations pages are reached through
// the portal switcher, so each portal keeps its own navigation.
export const ADMIN_SIDEBAR_GROUPS: readonly AdminNavGroup[] = [
    'overview',
    'commerce',
    'access',
    'training',
    'intelligence',
    'security',
    'system',
    'infrastructure',
] as const;

/**
 * Các nhóm con cấp 2 (Hybrid 3-Level Sidebar):
 * Chỉ áp dụng cho các nhóm lớn có nhiều trang con (overview, commerce, access, infrastructure),
 * giữ nguyên cây 2 cấp gọn nhẹ cho các nhóm nhỏ 3–4 mục (training, intelligence, security, system).
 */
export const ADMIN_SIDEBAR_SUBGROUPS: readonly SidebarSubGroupMeta<AdminNavGroup, AdminNavSubGroup>[] = [
    // 1. Tổng quan (overview)
    {
        key: 'operationsPulse',
        group: 'overview',
        icon: LayoutDashboard,
        defaultLabel: 'Điều hành & Hỗ trợ',
    },
    {
        key: 'airspaceWeather',
        group: 'overview',
        icon: MapIcon,
        defaultLabel: 'Bản đồ & Không phận',
    },
    // 2. Dịch vụ & tài chính (commerce)
    {
        key: 'catalogPlans',
        group: 'commerce',
        icon: Package,
        defaultLabel: 'Danh mục & Gói cước',
    },
    {
        key: 'marketplace3p',
        group: 'commerce',
        icon: Store,
        defaultLabel: 'Sàn đối tác 3P',
    },
    {
        key: 'billingLedger',
        group: 'commerce',
        icon: ReceiptText,
        defaultLabel: 'Đối soát & Sổ cái',
    },
    // 3. Người dùng & quyền (access — `/admin/users` giữ cấp 2 trực tiếp, 4 trang RBAC gom vào nhóm con)
    {
        key: 'rbacGovernance',
        group: 'access',
        icon: ShieldCheck,
        defaultLabel: 'Phân quyền & Vai trò',
    },
    // 8. Hạ tầng (infrastructure)
    {
        key: 'runtimeOps',
        group: 'infrastructure',
        icon: Server,
        defaultLabel: 'Máy chủ & Triển khai',
    },
    {
        key: 'dataComms',
        group: 'infrastructure',
        icon: Database,
        defaultLabel: 'Lưu trữ, Dữ liệu & Email',
    },
] as const;

export const ADMIN_SIDEBAR_ROUTES: SidebarRouteItem<AdminNavGroup, AdminNavSubGroup>[] = [
    // 1. Nhóm: Tổng quan & Phân tích (overview — 2 nhóm con cấp 2)
    {
        href: '/admin/dashboard',
        key: 'dashboard',
        group: 'overview',
        subGroup: 'operationsPulse',
        icon: LayoutDashboard,
        permission: 'DASHBOARD_VIEW',
    },
    {
        href: '/admin/reports',
        key: 'reports',
        group: 'overview',
        subGroup: 'operationsPulse',
        icon: BarChart3,
        permission: 'DASHBOARD_VIEW',
    },
    {
        href: '/admin/notifications',
        key: 'notifications',
        group: 'overview',
        subGroup: 'operationsPulse',
        icon: Inbox,
        permission: 'DASHBOARD_VIEW',
    },
    {
        href: '/admin/notifications/modules',
        key: 'notificationModules',
        defaultLabel: 'Modules thông báo',
        group: 'overview',
        subGroup: 'operationsPulse',
        icon: Bell,
        permission: 'DASHBOARD_VIEW',
    },
    {
        href: '/admin/support',
        key: 'supportInbox',
        defaultLabel: 'Tin nhắn hỗ trợ',
        group: 'overview',
        subGroup: 'operationsPulse',
        icon: MessagesSquare,
        permission: 'SUPPORT_MANAGE',
    },
    {
        href: '/admin/fleet-map',
        key: 'fleetMap',
        defaultLabel: 'Bản đồ đội bay',
        group: 'overview',
        subGroup: 'airspaceWeather',
        icon: MapIcon,
        permission: 'MISSION_VIEW_ALL',
    },
    {
        href: '/admin/weather',
        key: 'weather',
        defaultLabel: 'Thời tiết bay',
        group: 'overview',
        subGroup: 'airspaceWeather',
        icon: CloudSun,
        permission: 'MISSION_VIEW_ALL',
    },
    {
        href: '/admin/airspace',
        key: 'airspace',
        defaultLabel: 'Vùng không phận',
        group: 'overview',
        subGroup: 'airspaceWeather',
        icon: ShieldAlert,
        permission: 'USER_MANAGE',
    },

    // 2. Nhóm: Dịch vụ & Tài chính (commerce — 3 nhóm con cấp 2)
    {
        href: '/admin/services',
        key: 'services',
        group: 'commerce',
        subGroup: 'catalogPlans',
        icon: Package,
        permission: 'MISSION_CONFIRM',
    },
    {
        href: '/admin/billing/plans',
        key: 'billingPlans',
        group: 'commerce',
        subGroup: 'catalogPlans',
        icon: CreditCard,
        permission: 'USER_MANAGE',
        aliases: ['/admin/billing'],
    },
    {
        href: '/admin/billing/quotas',
        key: 'billingQuotas',
        group: 'commerce',
        subGroup: 'catalogPlans',
        icon: Gauge,
        permission: 'USER_MANAGE',
    },
    {
        href: '/admin/marketplace/providers',
        key: 'marketplaceProviders',
        defaultLabel: 'Duyệt đối tác KYC',
        group: 'commerce',
        subGroup: 'marketplace3p',
        icon: Store,
        permission: 'MARKETPLACE_MODERATE',
    },
    {
        href: '/admin/marketplace/listings',
        key: 'marketplaceListings',
        defaultLabel: 'Kiểm duyệt tin đăng',
        group: 'commerce',
        subGroup: 'marketplace3p',
        icon: Boxes,
        permission: 'MARKETPLACE_MODERATE',
    },
    {
        href: '/admin/billing/payouts',
        key: 'billingPayouts',
        defaultLabel: 'Giải ngân đối tác',
        group: 'commerce',
        subGroup: 'marketplace3p',
        icon: Wallet,
        permission: 'PAYOUT_MANAGE',
    },
    {
        href: '/admin/billing/invoices',
        key: 'billingInvoices',
        group: 'commerce',
        subGroup: 'billingLedger',
        icon: FileSpreadsheet,
        permission: 'USER_MANAGE',
    },
    {
        href: '/admin/billing/transactions',
        key: 'billingTransactions',
        group: 'commerce',
        subGroup: 'billingLedger',
        icon: ReceiptText,
        permission: 'USER_MANAGE',
    },
    {
        href: '/admin/billing/outbox',
        key: 'billingOutbox',
        group: 'commerce',
        subGroup: 'billingLedger',
        icon: Inbox,
        permission: 'USER_MANAGE',
    },

    // 3. Nhóm: Người dùng & Phân quyền (access — `/admin/users` trực tiếp + nhóm con RBAC)
    {
        href: '/admin/users',
        key: 'users',
        group: 'access',
        icon: Users,
        permission: 'USER_VIEW',
    },
    {
        href: '/admin/access-control',
        key: 'accessControl',
        group: 'access',
        subGroup: 'rbacGovernance',
        icon: ShieldCheck,
        permission: 'USER_PERMISSION_MANAGE',
    },
    {
        href: '/admin/access-control/role-templates',
        key: 'roleTemplates',
        group: 'access',
        subGroup: 'rbacGovernance',
        icon: KeyRound,
        permission: 'USER_PERMISSION_MANAGE',
        aliases: ['/admin/role-templates'],
    },
    {
        href: '/admin/access-control/role-matrix',
        key: 'roleMatrix',
        group: 'access',
        subGroup: 'rbacGovernance',
        icon: TableProperties,
        permission: 'USER_PERMISSION_MANAGE',
        aliases: ['/admin/role-matrix'],
    },
    {
        href: '/admin/access-control/permissions',
        key: 'permissions',
        group: 'access',
        subGroup: 'rbacGovernance',
        icon: Lock,
        permission: 'USER_PERMISSION_MANAGE',
        aliases: ['/admin/permissions'],
    },

    // 4. Nhóm: Đào tạo & SOP (training — 2 cấp gọn nhẹ)
    {
        href: '/admin/training/customer',
        key: 'trainingCustomer',
        defaultLabel: 'Đào tạo khách hàng',
        group: 'training',
        icon: BookOpenCheck,
    },
    {
        href: '/admin/training/operations',
        key: 'trainingOperations',
        defaultLabel: 'SOP điều hành',
        group: 'training',
        icon: Crosshair,
    },
    {
        href: '/admin/training/admin',
        key: 'trainingAdmin',
        defaultLabel: 'Quy chuẩn quản trị',
        group: 'training',
        icon: FileCheck2,
    },

    // 5. Nhóm: Trí tuệ Nhân tạo & Tích hợp (intelligence — 2 cấp gọn nhẹ)
    {
        href: '/admin/ai-router',
        key: 'aiRouter',
        group: 'intelligence',
        icon: Router,
        permission: 'USER_PERMISSION_MANAGE',
    },
    {
        href: '/admin/ai-router/conversations',
        key: 'aiConversations',
        group: 'intelligence',
        icon: MessagesSquare,
        permission: 'USER_PERMISSION_MANAGE',
    },
    {
        href: '/admin/webhooks',
        key: 'webhooks',
        group: 'intelligence',
        icon: Radio,
        permission: 'USER_MANAGE',
    },

    // 6. Nhóm: Bảo mật (security — 2 cấp gọn nhẹ)
    {
        href: '/admin/security/sessions',
        key: 'securitySessions',
        group: 'security',
        icon: ShieldCheck,
        permission: 'USER_PERMISSION_MANAGE',
        aliases: ['/admin/security'],
    },
    {
        href: '/admin/security/policy',
        key: 'securityPolicy',
        group: 'security',
        icon: FileLock2,
        permission: 'USER_PERMISSION_MANAGE',
    },
    {
        href: '/admin/security/secrets',
        key: 'securitySecrets',
        group: 'security',
        icon: KeyRound,
        permission: 'USER_PERMISSION_MANAGE',
    },
    {
        href: '/admin/device-keys',
        key: 'deviceKeys',
        group: 'security',
        icon: KeyRound,
        permission: 'USER_PERMISSION_MANAGE',
    },

    // 7. Nhóm: Hệ thống & Kiểm toán (system — 2 cấp gọn nhẹ)
    {
        href: '/admin/alerts',
        key: 'alerts',
        group: 'system',
        icon: Siren,
        permission: 'DASHBOARD_VIEW',
    },
    {
        href: '/admin/settings',
        key: 'settings',
        group: 'system',
        icon: Settings,
        permission: 'USER_MANAGE',
    },
    {
        href: '/admin/translations',
        key: 'translations',
        defaultLabel: 'Ngôn ngữ hệ thống (i18n)',
        group: 'system',
        icon: Languages,
        permission: 'USER_MANAGE',
    },
    {
        href: '/admin/audit-logs',
        key: 'auditLogs',
        group: 'system',
        icon: ScrollText,
        permission: 'AUDIT_VIEW',
    },

    // 8. Nhóm: Hạ tầng (infrastructure — 2 nhóm con cấp 2)
    {
        href: '/admin/infrastructure',
        key: 'infrastructure',
        group: 'infrastructure',
        subGroup: 'runtimeOps',
        icon: Server,
        permission: 'USER_PERMISSION_MANAGE',
    },
    {
        href: '/admin/system-health',
        key: 'systemHealth',
        group: 'infrastructure',
        subGroup: 'runtimeOps',
        icon: Activity,
        permission: 'USER_PERMISSION_MANAGE',
    },
    {
        href: '/admin/infrastructure/deployment',
        key: 'infrastructureDeployment',
        group: 'infrastructure',
        subGroup: 'runtimeOps',
        icon: Rocket,
        permission: 'USER_PERMISSION_MANAGE',
    },
    {
        href: '/admin/infrastructure/backups',
        key: 'infrastructureBackups',
        group: 'infrastructure',
        subGroup: 'runtimeOps',
        icon: Archive,
        permission: 'USER_PERMISSION_MANAGE',
    },
    {
        href: '/admin/infrastructure/storage',
        key: 'infrastructureStorage',
        group: 'infrastructure',
        subGroup: 'dataComms',
        icon: HardDrive,
        permission: 'USER_PERMISSION_MANAGE',
    },
    {
        href: '/admin/files',
        key: 'files',
        group: 'infrastructure',
        subGroup: 'dataComms',
        icon: FolderOpen,
        permission: 'USER_PERMISSION_MANAGE',
    },
    {
        href: '/admin/infrastructure/database',
        key: 'infrastructureDatabase',
        group: 'infrastructure',
        subGroup: 'dataComms',
        icon: Database,
        permission: 'USER_PERMISSION_MANAGE',
    },
    {
        href: '/admin/infrastructure/email',
        key: 'infrastructureEmail',
        group: 'infrastructure',
        subGroup: 'dataComms',
        icon: Mail,
        permission: 'USER_PERMISSION_MANAGE',
    },
];

// ============================================================================
// 2. OPERATIONS PORTAL SIDEBAR ROUTES
// ============================================================================
export const OPERATIONS_SIDEBAR_GROUPS: readonly OperationsNavGroup[] = [
    'command',
    'missions',
    'assets',
    'monitoring',
] as const;

export const OPERATIONS_SIDEBAR_ROUTES: SidebarRouteItem<OperationsNavGroup>[] = [
    // Nhóm: Điều hành & Giám sát (command)
    {
        href: '/operations/overview',
        key: 'overview',
        group: 'command',
        icon: LayoutDashboard,
        permission: 'DASHBOARD_VIEW',
    },
    {
        href: '/operations/sar-cockpit',
        key: 'sar',
        group: 'command',
        icon: Crosshair,
        permission: 'MISSION_VIEW',
        aliases: ['/operations/flight-ops'],
    },
    {
        href: '/operations/simulation',
        key: 'simulation',
        group: 'command',
        icon: Gamepad2,
        permission: 'UAV_VIEW',
    },
    {
        href: '/operations/weather',
        key: 'weather',
        group: 'command',
        icon: CloudSun,
        permission: 'MISSION_VIEW',
    },

    // Nhóm: Điều phối nhiệm vụ (missions)
    {
        href: '/operations/dispatch/missions',
        key: 'dispatchMissions',
        group: 'missions',
        icon: Activity,
        permission: 'MISSION_VIEW_ALL',
        aliases: ['/operations/missions/dispatch', '/operations/admin/missions'],
    },
    {
        href: '/operations/assigned-missions',
        key: 'assignedMissions',
        group: 'missions',
        icon: ClipboardList,
        permission: 'MISSION_VIEW',
        aliases: ['/operations/missions/assigned', '/operations/operator/missions'],
    },

    // Nhóm: Trạm & Đội bay (assets)
    {
        href: '/operations/stations',
        key: 'stations',
        group: 'assets',
        icon: MapPinned,
        permission: 'STATION_VIEW',
    },
    {
        href: '/operations/uavs',
        key: 'uavs',
        group: 'assets',
        icon: PlaneTakeoff,
        permission: 'UAV_VIEW',
    },
    {
        href: '/operations/maintenance',
        key: 'maintenance',
        group: 'assets',
        icon: Wrench,
        permission: 'UAV_MAINTENANCE_VIEW',
    },
    {
        href: '/operations/inventory',
        key: 'inventory',
        group: 'assets',
        icon: Boxes,
        permission: 'INVENTORY_VIEW',
    },

    // Nhóm: Giám sát & Nhật ký (monitoring)
    {
        href: '/operations/media',
        key: 'media',
        group: 'monitoring',
        icon: FileKey2,
        permission: 'MEDIA_VIEW',
    },
    {
        href: '/operations/notifications',
        key: 'notifications',
        group: 'monitoring',
        icon: Bell,
    },
    {
        href: '/operations/audit',
        key: 'audit',
        group: 'monitoring',
        icon: Activity,
        permission: 'AUDIT_VIEW',
    },
    {
        href: '/operations/training',
        key: 'training',
        defaultLabel: 'Đào tạo & SOP UAV',
        group: 'monitoring',
        icon: GraduationCap,
    },
];

// ============================================================================
// 3. CUSTOMER PORTAL SIDEBAR ROUTES
// ============================================================================
export const CUSTOMER_SIDEBAR_GROUPS: readonly CustomerNavGroup[] = [
    'overview',
    'missions',
    'services',
    'support',
] as const;

// Grouped by what the customer is doing: checking in, running flights, buying, getting help.
export const CUSTOMER_SIDEBAR_ROUTES: SidebarRouteItem<CustomerNavGroup>[] = [
    // Nhóm: Tổng quan (overview)
    {
        href: '/customer/dashboard',
        key: 'dashboard',
        defaultLabel: 'Tổng quan',
        group: 'overview',
        icon: LayoutDashboard,
        permission: 'MISSION_VIEW',
    },
    {
        href: '/customer/notifications',
        key: 'notifications',
        defaultLabel: 'Thông báo',
        group: 'overview',
        icon: Bell,
        badge: 'unreadNotifications',
    },

    // Nhóm: Nhiệm vụ bay (missions)
    {
        href: '/customer/missions/create',
        key: 'createRequest',
        defaultLabel: 'Tạo yêu cầu',
        group: 'missions',
        icon: CirclePlus,
        permission: 'MISSION_CREATE',
    },
    {
        href: '/customer/missions',
        key: 'missions',
        defaultLabel: 'Nhiệm vụ của tôi',
        group: 'missions',
        icon: Activity,
        permission: 'MISSION_VIEW',
        badge: 'activeMissions',
    },
    {
        href: '/customer/weather',
        key: 'weather',
        defaultLabel: 'Thời tiết bay',
        group: 'missions',
        icon: CloudSun,
        permission: 'MISSION_VIEW',
    },

    // Nhóm: Dịch vụ & thanh toán (services)
    {
        href: '/customer/services',
        key: 'services',
        defaultLabel: 'Dịch vụ UAV',
        group: 'services',
        icon: Boxes,
        permission: 'MISSION_VIEW',
    },
    {
        href: '/customer/billing',
        key: 'billing',
        defaultLabel: 'Gói cước & hóa đơn',
        group: 'services',
        icon: CreditCard,
        badge: 'pendingInvoices',
    },

    // Nhóm: Hỗ trợ & tài khoản (support)
    {
        href: '/customer/training',
        key: 'training',
        defaultLabel: 'Hướng dẫn sử dụng',
        group: 'support',
        icon: GraduationCap,
    },
    {
        href: '/customer/profile',
        key: 'profile',
        defaultLabel: 'Tài khoản',
        group: 'support',
        icon: User,
    },
];

/**
 * Tìm mục Sidebar đang active dựa trên pathname hiện tại, hỗ trợ tự động ánh xạ
 * các đường dẫn alias (ví dụ `/admin/role-templates` -> `/admin/access-control/role-templates`)
 * và ưu tiên đường dẫn con cụ thể nhất.
 */
export function resolveSidebarActiveItem<T extends { href: string; aliases?: string[] }>(
    visibleItems: readonly T[],
    pathname: string,
    activeResource?: string,
): T | undefined {
    // An alias only claims a path that no item links to directly, so /admin/billing/quotas stays
    // with its own entry instead of the plans entry that aliases /admin/billing.
    const ownsDirectly = visibleItems.some(item => pathname === item.href || pathname.startsWith(`${item.href}/`));
    const ownerPath = ownsDirectly ? undefined : visibleItems.find(item =>
        item.aliases?.some(alias => pathname === alias || pathname.startsWith(`${alias}/`)),
    )?.href;
    return activeDestination(visibleItems, ownerPath ?? pathname, activeResource);
}
