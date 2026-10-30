package com.uav.platform.config.routes;

/**
 * Quản lý tập trung toàn bộ cấu hình API Routes trong hệ thống UAV PAS Platform.
 * Đảm bảo tính nhất quán giữa Spring Security, Controller RequestMapping và tài liệu OpenAPI.
 */
public final class ApiRoutes {

    private ApiRoutes() {
        // Ngăn chặn khởi tạo instance
    }

    public static final String API_V1_PREFIX = "/api/v1";

    /**
     * Nhóm route xác thực người dùng (Authentication & Authorization)
     */
    public static final class Auth {
        private Auth() {}

        public static final String BASE = API_V1_PREFIX + "/auth";
        public static final String REGISTER = "/register";
        public static final String REGISTER_OTP = "/register-otp";
        public static final String VERIFY_EMAIL = "/verify-email";
        public static final String LOGIN = "/login";
        public static final String GOOGLE = "/google";
        public static final String VERIFY_2FA = "/verify-2fa";
        public static final String RESEND_OTP = "/resend-otp";
        public static final String FORGOT_PASSWORD = "/forgot-password";
        public static final String RESET_PASSWORD = "/reset-password";
        public static final String TWO_FACTOR_STATUS = "/2fa/status";
        public static final String TWO_FACTOR_SETUP = "/2fa/setup";
        public static final String TWO_FACTOR_ENABLE = "/2fa/enable";
        public static final String TWO_FACTOR_DISABLE = "/2fa/disable";
        public static final String ME = "/me";
        public static final String REFRESH = "/refresh";
        public static final String LOGOUT = "/logout";

        // Full URL paths
        public static final String FULL_REGISTER = BASE + REGISTER;
        public static final String FULL_REGISTER_OTP = BASE + REGISTER_OTP;
        public static final String FULL_VERIFY_EMAIL = BASE + VERIFY_EMAIL;
        public static final String FULL_LOGIN = BASE + LOGIN;
        public static final String FULL_GOOGLE = BASE + GOOGLE;
        public static final String FULL_VERIFY_2FA = BASE + VERIFY_2FA;
        public static final String FULL_RESEND_OTP = BASE + RESEND_OTP;
        public static final String FULL_FORGOT_PASSWORD = BASE + FORGOT_PASSWORD;
        public static final String FULL_RESET_PASSWORD = BASE + RESET_PASSWORD;
        public static final String FULL_ME = BASE + ME;
        public static final String FULL_REFRESH = BASE + REFRESH;
        public static final String FULL_LOGOUT = BASE + LOGOUT;
        public static final String FULL_AUTH_WILDCARD = BASE + "/**";
    }

    /**
     * Nhóm route quản lý người dùng (Users Management)
     */
    public static final class Users {
        private Users() {}

        public static final String BASE = API_V1_PREFIX + "/users";
        public static final String USER_ID = "/{id}";
        public static final String PROFILE = "/profile";

        public static final String FULL_USERS = BASE;
        public static final String FULL_PROFILE = BASE + PROFILE;
        public static final String FULL_PROFILE_BILLING = FULL_PROFILE + "/billing";
        public static final String FULL_PROFILE_PASSWORD = FULL_PROFILE + "/password";
        public static final String FULL_USER_BY_ID = BASE + USER_ID;
    }

    /**
     * Nhóm route phân quyền & mẫu vai trò (Permissions & Role Templates)
     */
    public static final class Permissions {
        private Permissions() {}

        public static final String BASE = API_V1_PREFIX + "/permissions";
        public static final String ME = "/me";
        public static final String BY_USER = "/users/{userId}";
        public static final String BY_USER_CODE = "/users/{userId}/{code}";
    }

    public static final class RoleTemplates {
        private RoleTemplates() {}

        public static final String BASE = API_V1_PREFIX + "/role-templates";
        public static final String ROLE_PERMISSION = "/{role}/permissions/{code}";
    }

    public static final class Phase1 {
        private Phase1() {}

        public static final String STATIONS = API_V1_PREFIX + "/stations/**";
        public static final String UAVS = API_V1_PREFIX + "/uavs/**";
        public static final String INVENTORY = API_V1_PREFIX + "/inventory/**";
        public static final String MEDIA = API_V1_PREFIX + "/media/**";
        public static final String DASHBOARD = API_V1_PREFIX + "/dashboard/**";
        public static final String AUDIT = API_V1_PREFIX + "/audit-logs/**";
        public static final String PERMISSIONS = API_V1_PREFIX + "/permissions/**";
    }

    /**
     * Nhóm route quản lý đội bay UAV & Trạm & Kho & Media
     */
    public static final class Uavs {
        private Uavs() {}

        public static final String BASE = API_V1_PREFIX + "/uavs";
        public static final String BY_ID = "/{id}";
        public static final String ASSIGN_STATION = "/{id}/station/{stationId}";
        public static final String STATUS = "/{id}/status";
        public static final String MAINTENANCE = "/{id}/maintenance";
        public static final String HISTORY = "/{id}/history";
    }

    public static final class Stations {
        private Stations() {}

        public static final String BASE = API_V1_PREFIX + "/stations";
        public static final String BY_ID = "/{id}";
    }

    public static final class Inventory {
        private Inventory() {}

        public static final String BASE = API_V1_PREFIX + "/inventory";
        public static final String EQUIPMENT = BASE + "/equipment";
    }

    public static final class Media {
        private Media() {}

        public static final String BASE = API_V1_PREFIX + "/media";
    }

    /**
     * Nhóm route quản lý đội bay UAV (Legacy Drone Fleet aliases)
     */
    public static final class Drones {
        private Drones() {}

        public static final String BASE = API_V1_PREFIX + "/drones";
        public static final String DRONE_ID = "/{id}";
        public static final String TELEMETRY = "/{id}/telemetry";
        public static final String STATUS = "/{id}/status";
        public static final String COMMAND = "/{id}/command";

        public static final String FULL_DRONES = BASE;
    }

    /**
     * Nhóm route quản lý nhiệm vụ & kế hoạch bay (Flight Missions)
     */
    public static final class Missions {
        private Missions() {}

        public static final String BASE = API_V1_PREFIX + "/missions";
        public static final String AVAILABILITY = "/availability";
        public static final String MISSION_ID = "/{id}";
        public static final String SUBMIT = "/{id}/submit";
        public static final String CANCEL = "/{id}/cancel";
        public static final String ASSIGN_STATION = "/{id}/assign-station";
        public static final String ASSIGN_UAV = "/{id}/assign-uav";
        public static final String ASSIGN_OPERATOR = "/{id}/assign-operator";
        public static final String RESERVE_EQUIPMENT = "/{id}/reserve-equipment";
        public static final String CONFIRM = "/{id}/confirm";
        public static final String REJECT = "/{id}/reject";
        public static final String READY = "/{id}/ready";
        public static final String START = "/{id}/start";
        public static final String COMPLETE = "/{id}/complete";
        public static final String FAIL = "/{id}/fail";
        public static final String MEDIA = "/{id}/media";
        public static final String TIMELINE = "/{id}/timeline";

        // Legacy flight-plan aliases retained for Phase 1/early clients.
        public static final String WAYPOINTS = "/{id}/waypoints";
        public static final String EXECUTE = "/{id}/execute";
        public static final String ABORT = "/{id}/abort";

        public static final String FULL_MISSIONS = BASE;
        public static final String FULL_MISSION_BY_ID = BASE + MISSION_ID;
        public static final String FULL_ASSIGN_UAV = BASE + ASSIGN_UAV;
        public static final String FULL_TIMELINE = BASE + TIMELINE;
    }

    public static final class UavServices {
        private UavServices() {}

        public static final String BASE = API_V1_PREFIX + "/uav-services";
    }

    /**
     * Nhóm route Tìm kiếm Cứu nạn (SAR) & AI Biên KV260
     */
    public static final class Sar {
        private Sar() {}

        public static final String BASE = API_V1_PREFIX + "/sar";
        public static final String MISSIONS = "/missions";
        public static final String MISSION_BY_ID = "/missions/{missionId}";
        public static final String MISSION_STATUS = "/missions/{missionId}/status";
        public static final String FLIGHT_PLAN = "/flight-plan";
        public static final String TELEMETRY_EVALUATE = "/telemetry-evaluate";
        public static final String DISPATCH_RESCUE = "/missions/{missionId}/dispatch-rescue";
    }

    public static final class Ai {
        private Ai() {}

        public static final String BASE = API_V1_PREFIX + "/ai";
        public static final String DISPATCH = "/dispatch";
        public static final String MISSION_DETECTIONS = "/missions/{missionId}/detections";
        public static final String MISSION_TASKS = "/missions/{missionId}/tasks";
        public static final String VERIFY_DETECTION = "/detections/{id}/verify";
    }

    /**
     * Nhóm route Tài chính, Hạn mức & Thanh toán VietQR
     */
    public static final class Billing {
        private Billing() {}

        public static final String BASE = API_V1_PREFIX + "/billing";
        public static final String PLANS = "/plans";
        public static final String QUOTA = "/quota";
        public static final String ADMIN_QUOTAS = "/admin/quotas";
        public static final String ADMIN_QUOTA_BY_USER = "/admin/quotas/{userId}";
        public static final String INVOICES = "/invoices";
        public static final String INVOICE_BY_ID = "/invoices/{id}";
        public static final String PAY_INVOICE = "/invoices/{id}/pay";

        public static final String ADMIN = BASE + "/admin";
        public static final String ADMIN_PLANS = ADMIN + "/plans";
    }

    public static final class Webhook {
        private Webhook() {}

        public static final String BASE = API_V1_PREFIX + "/billing/webhook";
        public static final String PAYMENT_IPN = "/payment-ipn";
        public static final String WILDCARD = BASE + "/**";
    }

    public static final class Webhooks {
        private Webhooks() {}

        public static final String BASE = API_V1_PREFIX + "/webhooks";
        public static final String SUBSCRIPTIONS = "/subscriptions";
        public static final String TOGGLE_SUBSCRIPTION = "/subscriptions/{id}/toggle";
        public static final String SUBSCRIPTION_BY_ID = "/subscriptions/{id}";
        public static final String TEST_DISPATCH = "/test-dispatch";
        public static final String LOGS = "/logs";
    }

    /**
     * Nhóm route Thông báo, Cấu hình, Báo cáo, Dashboard & Kiểm toán
     */
    public static final class Notifications {
        private Notifications() {}

        public static final String BASE = API_V1_PREFIX + "/notifications";
        public static final String UNREAD_COUNT = "/unread-count";
        public static final String MARK_READ = "/{id}/read";
        public static final String MARK_ALL_READ = "/read-all";
    }

    public static final class Settings {
        private Settings() {}

        public static final String BASE = API_V1_PREFIX + "/settings";
        public static final String BY_KEY = "/{key}";
    }

    public static final class Reports {
        private Reports() {}

        public static final String BASE = API_V1_PREFIX + "/reports";
        public static final String OPERATIONS_SUMMARY = "/operations-summary";
        public static final String EXPORT_CSV = "/export-csv";
    }

    public static final class Maintenance {
        private Maintenance() {}

        public static final String BASE = API_V1_PREFIX + "/maintenance";
    }

    /**
     * Nhóm route công khai không cần đăng nhập (thông tin website)
     */
    public static final class Public {
        private Public() {}

        public static final String BASE = API_V1_PREFIX + "/public";
    }

    /**
     * Nhóm route chỉ dành cho quản trị viên (/api/v1/admin/**)
     */
    public static final class Admin {
        private Admin() {}

        public static final String BASE = API_V1_PREFIX + "/admin";
        public static final String ALERTS = BASE + "/alerts";
        public static final String SECURITY = BASE + "/security";
        public static final String DEVICE_KEYS = BASE + "/device-keys";
        public static final String FILES = BASE + "/files";
        public static final String INFRASTRUCTURE = BASE + "/infrastructure";
        public static final String ASSISTANT_CONVERSATIONS = BASE + "/assistant/conversations";
        public static final String USER_BILLING_PROFILE = BASE + "/users/{id}/billing-profile";
    }

    /**
     * Nhóm route khí tượng & an toàn cất cánh UAV (Weather & Flight-Safety)
     */
    public static final class Weather {
        public static final String BASE = API_V1_PREFIX + "/weather";
        public static final String FORECAST = "/forecast";
        public static final String BY_MISSION = "/missions/{missionId}";
        public static final String STATIONS = "/stations";
        public static final String ADMIN_PROVIDER = API_V1_PREFIX + "/admin/weather/provider";

        private Weather() {}
    }

    public static final class Dashboard {
        private Dashboard() {}

        public static final String BASE = API_V1_PREFIX + "/dashboard";
    }

    public static final class AuditLogs {
        private AuditLogs() {}

        public static final String BASE = API_V1_PREFIX + "/audit-logs";
    }

    public static final class Training {
        private Training() {}

        public static final String BASE = API_V1_PREFIX + "/training";
        public static final String BY_CODE = "/{codeOrSlug}";
        public static final String PROGRESS = "/{id}/progress";
        public static final String BY_ID = "/{id}";

        // Courses: lessons (video / slides / article), learner progress and admin authoring.
        public static final String COURSES = "/courses";
        public static final String COURSE_BY_CODE = "/courses/{codeOrSlug}";
        public static final String LESSON_BY_ID = "/lessons/{id}";
        public static final String LESSON_PROGRESS = "/lessons/{id}/progress";
        public static final String ADMIN_COURSE_LESSONS = "/admin/courses/{id}/lessons";
        public static final String ADMIN_COURSE_COVER = "/admin/courses/{id}/cover";
        public static final String ADMIN_LESSONS = "/admin/lessons";
        public static final String ADMIN_LESSON_BY_ID = "/admin/lessons/{id}";
        public static final String ADMIN_ASSETS = "/admin/assets";
        public static final String ADMIN_ASSET_CONFIRM = "/admin/assets/{id}/confirm";
    }

    /**
     * Nhóm route tài liệu API & Swagger UI
     */
    public static final class Docs {
        private Docs() {}

        public static final String API_DOCS = "/v3/api-docs/**";
        public static final String SWAGGER_UI = "/swagger-ui/**";
        public static final String SWAGGER_HTML = "/swagger-ui.html";
    }

    public static final class Health {
        private Health() {}

        public static final String ENDPOINT = "/actuator/health";
        public static final String LIVENESS = ENDPOINT + "/**";
    }

    /**
     * Danh sách route Swagger công khai (không yêu cầu JWT Bearer)
     */
    public static final String[] SWAGGER_WHITELIST = {
        Docs.API_DOCS, Docs.SWAGGER_UI, Docs.SWAGGER_HTML
    };

    /**
     * Danh sách route Auth công khai (cho phép truy cập trước khi đăng nhập)
     */
    public static final String[] PUBLIC_AUTH_WHITELIST = {
        Auth.FULL_LOGIN,
        Auth.FULL_GOOGLE,
        Auth.FULL_REGISTER,
        Auth.FULL_REGISTER_OTP,
        Auth.FULL_VERIFY_EMAIL,
        Auth.FULL_VERIFY_2FA,
        Auth.FULL_RESEND_OTP,
        Auth.FULL_FORGOT_PASSWORD,
        Auth.FULL_RESET_PASSWORD,
        Auth.FULL_REFRESH
    };
}
