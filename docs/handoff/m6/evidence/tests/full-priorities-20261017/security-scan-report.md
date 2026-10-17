# Security Review: uav-pas-main-integration

## Scope

Single-pass Standard source audit of registered baseline; four genuine findings validated and retained. Later canonical fixes are follow-up evidence, not a new complete audit.

- Scan mode: repository
- Target kind: git_worktree
- Target ID: target_sha256_478f48c6d6e5cb8d93bc474675a604ed86d394838bfafecff17ed6492b932efb
- Revision: 55c2fd7464f6f653b89aaca3166dc39d9adf142a
- Snapshot digest: codex-security-snapshot/v1:sha256:5d2aa34b65c4641242ff67ed2ef04487f0b981a4c3715a16a58ef18f2046c22c
- Inventory strategy: repository
- Included paths: .
- Excluded paths: none
- Artifacts reviewed: artifacts/baseline-return.json, artifacts/architecture-review.json, artifacts/resource-review.json, artifacts/payment-original-source-anchors.json, artifacts/canonical-followup-verification.md
- Scan context: Hoàn thiện các ưu tiên còn thiếu; ưu tiên luồng nghiệp vụ trên giao diện và sửa lỗi thực tế; vẫn không đổi auth contract. Không ghi access token, refresh token, password, signed URL hoặc secret vào evidence. Không deploy production. Quy tắc người dùng chốt: giữ giờ dự kiến; tắt tự lập hóa đơn đến khi chốt giá. Khi bật tự lập, cho hoàn tất nhiệm vụ; ghi chờ lập hóa đơn và tự thử lại không tạo trùng. Media JPEG/PNG/WebP/PDF tối đa100MB,MP4/WebM1GB; dọn bản chưa xác nhận sau24h, giữ tệp đã xác nhận/bàn giao. Chưa có staging; hoàn thiệnCI và diễn tậptriểnkhai/khôi phục localhost. Hóa đơn nhiệm vụ không cộnggiờ; hóađơngói áp dụngđịnhmứccủagói. Cập nhật trực tiếp của người dùng được xác minh trong chat01a147a3-4de3-7633-855a-6abff9527756 ngày17/10/2026: tất cả phiên UAV chỉ làm việc trên /Volumes/D/Codex/projects/uav-pas-platform. Bản /Volumes/D/Codex/projects/uav-pas-main-integration đã ngừng chỉnh sửa; dữ liệu và bằng chứng được bảo toàn. Scan hiện tại vẫn gắn với target/snapshot ban đầu, không được gọi là audit hoàn chỉnh của canonical mới. Công việc đang đối chiếu baseline11918d5 và main55c2fd7 theo cấu trúc frontend/backend/docs; không sửa lịch sử Git. Người dùng cho phép phối hợp với phiên sắp xếp thư mục.

Limitations and exclusions:
- Whole-repository security review remains incomplete:83 deduplicated fully reviewed source files vs host estimate1677 files. Final newly authorized backend refactor has not received a complete independent security audit.
- No real HTTPS staging, cross-domain SSO, productionsecret overrides/privateIPv6reachability, provider/government/hardware verification.
- Root and legacy production dependency audits0; full dev-toolchain audit retains5HIGH per tree; no fixedrelease established.
- Excluded work/\*\*, node_modules/\*\*, \*\*/.next/\*\*, \*\*/target/\*\*, .git/\*\*: Local private runtime, dependencies/build outputs and repository internals; current product source remains in scope.

### Scan Summary

| Field | Value |
| --- | --- |
| Scan outcome | completed |
| Reportable findings | 4 |
| Severity mix | high: 1, medium: 2, low: 1 |
| Confidence mix | high: 4 |
| Coverage | partial |
| Validation mode | offline source validation plus disposable localhost tests; no external receiver/provider sends |

Canonical artifacts: `scan-manifest.json`, `findings.json`, and `coverage.json`. This report is a deterministic projection of those files.

## Threat Model

Generated architecture model for the current source under /Volumes/D/Codex/projects/uav-pas-main-integration, scope '.'. UAV PAS is a customer booking, mission dispatch, UAV/inventory/maintenance, media, SAR, billing and administration application. Four Next.js workspace portals run locally on 3100–3103; a separate unified Next frontend remains supported and is the frontend selected by root Compose. Both use a Spring Boot API, PostgreSQL and S3-compatible object storage. Spring Boot enables scheduled jobs. Root Compose builds /app/app.jar and publishes backend port 8080; its unified frontend publishes 3000. Evidence: package.json:1; apps/web/package.json:1; apps/customer/package.json:5; apps/operations/package.json:1; apps/admin/package.json:1; docker-compose.yml:35; docker-compose.yml:64; backend/Dockerfile:17; backend/src/main/java/com/uav/platform/UavPlatformApplication.java:7. This is architecture mapping, not completed security-audit coverage.

### Assets

- Accounts, BCrypt-managed authentication authority, current roles and effective permissions, JWT signing authority, browser access/refresh cookies, database refresh-token records and revocation identifiers. Refresh credentials reside in refresh_tokens.token; revocation identifiers reside in invalidated_tokens.token_id. Browser session storage removes legacy token keys; current UI identity/cache are held separately. Evidence: backend/src/main/java/com/uav/platform/security/SecurityConfig.java:32; backend/src/main/java/com/uav/platform/security/jwt/JwtTokenProvider.java:31; backend/src/main/java/com/uav/platform/modules/user/entity/RefreshToken.java:18; backend/src/main/java/com/uav/platform/modules/user/entity/InvalidatedToken.java:21; packages/api-client/src/index.ts:34; packages/query/src/session/AuthContext.tsx:43.
- PostgreSQL holds identities, permissions, mission/customer relationships, resource allocations, invoices, quotas, notifications, audit data and media metadata. Direct startup defaults to jdbc:postgresql://localhost:5500/uav_pas_dev; root Compose overrides this to jdbc:postgresql://postgres:5432/\<POSTGRES_DB, default uav_pas_dev\>. Compose persists database files in postgres_data mounted at /var/lib/postgresql/data. Secret credentials are supplied by deployment configuration, not reproduced here. Evidence: backend/src/main/resources/application.properties:15; docker-compose.yml:5; docker-compose.yml:11; docker-compose.yml:39; docker-compose.yml:42.
- Media objects and their capability URLs: generated object keys are \<lowercase MediaType\>/\<UUID\>-\<originalName with characters outside a-zA-Z0-9._- replaced by underscore\>. Default bucket is uav-pas. Direct startup uses localhost:9000 for storage and signing unless public endpoint overrides signing; Compose uses minio:9000 for backend operations and localhost:9000 for browser signing. Thus default browser resource paths are /uav-pas/\<generated object key\>, with signature material omitted. MinIO persists its storage in minio_data mounted at /data; the internal object-store representation is owned by MinIO, not an application filesystem path. Evidence: backend/src/main/java/com/uav/platform/modules/media/service/impl/IMediaService.java:64; backend/src/main/java/com/uav/platform/modules/media/service/impl/S3CompatibleStorageService.java:42; backend/src/main/java/com/uav/platform/modules/media/service/impl/S3CompatibleStorageService.java:54; docker-compose.yml:20; docker-compose.yml:28; docker-compose.yml:47.
- Mission execution and handover integrity, exclusive UAV allocation, customer/operator visibility, and billing/quota consequences. Completion locks the mission, requires the assigned operator and IN_PROGRESS state, validates handover notes and required confirmed results, then releases resources and applies billing/quota logic. Evidence: backend/src/main/java/com/uav/platform/modules/mission/service/impl/IMissionService.java:633; backend/src/main/java/com/uav/platform/modules/mission/service/impl/IMissionService.java:765; backend/src/main/java/com/uav/platform/modules/mission/service/impl/IMissionService.java:851; backend/src/main/java/com/uav/platform/modules/mission/service/impl/IMissionService.java:890.
- Outbound webhook subscription destinations, per-subscription signing secrets, event payloads and delivery logs; payment callback integrity and transaction records. Webhook delivery logs persist serialized event payload and response body; payment transactions persist the callback request representation. Evidence: backend/src/main/java/com/uav/platform/modules/webhook/service/impl/IWebhookService.java:72; backend/src/main/java/com/uav/platform/modules/webhook/service/impl/IWebhookService.java:192; backend/src/main/java/com/uav/platform/modules/billing/service/impl/IBillingService.java:238; backend/src/main/java/com/uav/platform/modules/billing/service/impl/IBillingService.java:260.
- Exported operational information is returned as UTF-8 CSV attachment uav_pas_operations_report.csv directly in an HTTP response, rather than written to a server export directory. Evidence: backend/src/main/java/com/uav/platform/modules/reporting/controller/ReportController.java:32.

### Trust Boundaries

- Browser/API boundary: API destination comes from build-time NEXT_PUBLIC_API_URL, falling back to http://localhost:8080. The shared client includes API cookies and a readable XSRF cookie header only for the API origin; storage requests omit browser credentials. Spring owns stateless authentication, protected-route enforcement, CORS and CSRF. Public auth, payment-webhook, health and Swagger exemptions remain distinct. Evidence: packages/api-client/src/index.ts:25; packages/api-client/src/index.ts:89; frontend/src/lib/api.client.ts:18; backend/src/main/java/com/uav/platform/security/SecurityConfig.java:67; backend/src/main/java/com/uav/platform/config/CorsConfig.java:15.
- Authentication lifecycle: login/refresh retain JSON token compatibility and issue HttpOnly cookies. Access cookie path is /; refresh path is /api/v1/auth. Default flags are Secure=false, SameSite=Lax, host-only domain. Bearer takes precedence over cookie authentication. JWT validation checks signature/expiry and the filter consults revocation plus current account availability and role. Refresh rotation serializes on user/session ownership and replaces that user's previous refresh row. Evidence: backend/src/main/java/com/uav/platform/modules/user/controller/AuthController.java:54; backend/src/main/java/com/uav/platform/modules/user/controller/AuthController.java:73; backend/src/main/java/com/uav/platform/security/AuthCookieHelper.java:21; backend/src/main/java/com/uav/platform/security/AuthCookieHelper.java:31; backend/src/main/java/com/uav/platform/security/AuthCookieHelper.java:45; backend/src/main/java/com/uav/platform/security/jwt/JwtAuthenticationFilter.java:56; backend/src/main/java/com/uav/platform/security/jwt/JwtAuthenticationFilter.java:87; backend/src/main/java/com/uav/platform/modules/user/service/impl/IRefreshTokenService.java:47; backend/src/main/java/com/uav/platform/modules/user/service/impl/IRefreshTokenService.java:74.
- Authorization boundary: server permission evaluation reloads active/unlocked users and resolves explicit user overrides before role-template/default permissions. UI permissions and hidden controls are presentation/cache controls, not the enforcement boundary. Administrative permission mutations use a serialized recovery guard intended to retain an active account with USER_MANAGE and PERMISSION_MANAGE. Evidence: backend/src/main/java/com/uav/platform/modules/user/service/impl/IPermissionService.java:62; backend/src/main/java/com/uav/platform/modules/user/service/impl/IPermissionService.java:90; backend/src/main/java/com/uav/platform/security/AccessRecoveryGuard.java:26; packages/query/src/session/AuthContext.tsx:32; packages/query/src/session/AuthContext.tsx:99.
- Media capability boundary: API permission checks and linked-resource/owner checks govern registration, upload grants, download grants, confirmation and deletion. Mission links additionally check participant/global visibility and writable state. The object store independently enforces 15-minute signatures and signed upload If-None-Match; confirmation checks stored size/content type. Delete schedules object removal after database commit. Evidence: backend/src/main/java/com/uav/platform/modules/media/controller/MediaController.java:21; backend/src/main/java/com/uav/platform/modules/media/service/impl/IMediaAccessService.java:29; backend/src/main/java/com/uav/platform/modules/media/service/impl/IMediaAccessService.java:52; backend/src/main/java/com/uav/platform/modules/media/service/impl/IMediaService.java:72; backend/src/main/java/com/uav/platform/modules/media/service/impl/IMediaService.java:76; backend/src/main/java/com/uav/platform/modules/media/service/impl/IMediaService.java:83; backend/src/main/java/com/uav/platform/modules/media/service/impl/S3CompatibleStorageService.java:94.
- Payment inbound boundary is not HMAC-only. The callback accepts a valid HMAC or the configured shared-secret compatibility value; without either, an authenticated invoice owner or USER_MANAGE account may proceed. It checks invoice existence, already-paid state and submitted amount, then updates invoice/quota/payment rows and broadcasts PAYMENT_COMPLETED. Evidence: backend/src/main/java/com/uav/platform/modules/billing/controller/PaymentIpnController.java:28; backend/src/main/java/com/uav/platform/modules/billing/service/impl/IBillingService.java:191; backend/src/main/java/com/uav/platform/modules/billing/service/impl/IBillingService.java:215; backend/src/main/java/com/uav/platform/modules/billing/service/impl/IBillingService.java:283; backend/src/main/java/com/uav/platform/modules/billing/service/impl/IBillingService.java:299.
- Privileged outbound webhook boundary: USER_MANAGE or administrator authority governs subscriptions, test dispatch and log access. Stored target URLs determine destinations; events carry business payloads and HMAC signatures. The dispatcher validates URL schemes/host patterns and a DNS result, disables redirects, and applies 3-second connection/4-second request timeouts. Actual DNS/network/egress isolation is external. A separate target-string branch simulates success without performing network delivery. Evidence: backend/src/main/java/com/uav/platform/modules/webhook/controller/WebhookController.java:27; backend/src/main/java/com/uav/platform/modules/webhook/controller/WebhookController.java:53; backend/src/main/java/com/uav/platform/modules/webhook/service/impl/IWebhookService.java:52; backend/src/main/java/com/uav/platform/modules/webhook/service/impl/IWebhookService.java:157; backend/src/main/java/com/uav/platform/modules/webhook/service/impl/IWebhookService.java:162.
- Report export boundary: DASHBOARD_READ permits summary/CSV access; the service scopes mission/SAR/detection aggregates to customer/operator visibility unless global mission/user-management permission permits all. UAV and station aggregates are separately global in this implementation. Evidence: backend/src/main/java/com/uav/platform/modules/reporting/controller/ReportController.java:26; backend/src/main/java/com/uav/platform/modules/reporting/service/impl/IReportService.java:55.
- Operator/startup boundary: deployment environment selects database, signing key, cookie/CORS and storage credentials. Flyway runs classpath:db/migration and Hibernate defaults to validate, but ordinary startup also enables a compatibility ApplicationRunner that alters user/permission schema. Stabilization explicitly disables that runner. Backend storage initialization may create its bucket and apply CORS when ensure-bucket is true. Evidence: backend/src/main/resources/application.properties:21; backend/src/main/java/com/uav/platform/config/Phase1SchemaInitializer.java:12; backend/src/main/java/com/uav/platform/config/Phase1SchemaInitializer.java:25; backend/src/main/resources/application-stabilization.properties:7; backend/src/main/java/com/uav/platform/modules/media/service/impl/S3CompatibleStorageService.java:65.
- Build/CI boundary: checked-in source, package installs, Maven and Docker execute with developer/runner authority. CI builds/tests workspace and unified frontends, then runs backend tests against disposable loopback PostgreSQL/MinIO. CI database state is tmpfs at /var/lib/postgresql/data; disposable MinIO writes /data in its container filesystem. No publication/deployment step is established by this workflow. Evidence: .github/workflows/m1-foundation.yml:18; .github/workflows/m1-foundation.yml:24; .github/workflows/m1-foundation.yml:57; .github/workflows/m1-foundation.yml:68; .github/workflows/m1-foundation.yml:79; docker-compose.stabilization.yml:9; docker-compose.stabilization.yml:10; docker-compose.stabilization.yml:21; infra/minio-test/Dockerfile:14.

### Attacker Capabilities

- Unauthenticated callers can submit public authentication/payment-callback inputs and access permitted health/API-documentation surfaces; they do not initially possess account, signing or deployment authority. Evidence: backend/src/main/java/com/uav/platform/security/SecurityConfig.java:90; backend/src/main/java/com/uav/platform/modules/billing/controller/PaymentIpnController.java:28.
- Authenticated customers/operators control their submitted business data, identifiers, media metadata/content and workflow requests. They do not inherently gain other users' resource ownership or administrative permission. Relevant enforced boundaries are permission checks, participant/owner checks and mission state/locking, rather than portal hostname. Evidence: backend/src/main/java/com/uav/platform/modules/user/service/impl/IPermissionService.java:62; backend/src/main/java/com/uav/platform/modules/media/service/impl/IMediaAccessService.java:29; backend/src/main/java/com/uav/platform/modules/mission/service/impl/IMissionService.java:633.
- An authorized webhook manager can choose subscription targets and signing material and request test dispatch. A destination operator controls HTTP responses received and persisted by the dispatcher. This is distinct from ordinary customer authority. Evidence: backend/src/main/java/com/uav/platform/modules/webhook/controller/WebhookController.java:33; backend/src/main/java/com/uav/platform/modules/webhook/controller/WebhookController.java:53; backend/src/main/java/com/uav/platform/modules/webhook/service/impl/IWebhookService.java:179.
- A holder of an issued media URL has its time-limited storage capability independently of subsequent API requests. Application session cookies are not required at the storage endpoint. Evidence: backend/src/main/java/com/uav/platform/modules/media/service/impl/S3CompatibleStorageService.java:94; packages/api-client/src/index.ts:89.
- Repository/deployment operators already possess process/configuration and database/storage credential authority; do not invent isolation from those operators or treat their authorized configuration as an attacker-controlled input.

### Security Objectives

- User-origin constraint: preserve the existing auth contract; prioritize actual UI business workflows and reproducible defects; do not deploy production.
- User-origin constraint: do not include access tokens, refresh tokens, passwords, signed URLs or secret values in evidence.
- Maintain current authenticated identity, effective permission and resource ownership checks for each sensitive business operation; retain account-aware cache clearing and stale-session rejection. Evidence: backend/src/main/java/com/uav/platform/modules/user/service/impl/IPermissionService.java:62; packages/api-client/src/index.ts:51; packages/query/src/session/AuthContext.tsx:43.
- Keep mission/resource state transitions and handover data consistent, preserve confirmed results, and bind storage grants to authorized objects. Evidence: backend/src/main/java/com/uav/platform/modules/mission/service/impl/IMissionService.java:633; backend/src/main/java/com/uav/platform/modules/media/service/impl/IMediaService.java:72; backend/src/main/java/com/uav/platform/modules/media/service/impl/IMediaService.java:76.
- Keep API cookies/CSRF separate from storage capability requests, and keep JWT/storage/payment-signing configuration server-side. Evidence: packages/api-client/src/index.ts:89; backend/src/main/java/com/uav/platform/modules/media/service/impl/S3CompatibleStorageService.java:54; docs/architecture/DEPLOYMENT_AND_CICD_PLAN.md:32.
- Keep exported/reporting and external integration status faithful to what source actually computes or sends. Planned flight time, verified detections, simulated AI inference and simulated webhook delivery must not be assumed to prove real flight hours, rescues or external acknowledgement. Evidence: backend/src/main/java/com/uav/platform/modules/reporting/service/impl/IReportService.java:76; backend/src/main/java/com/uav/platform/modules/reporting/service/impl/IReportService.java:91; backend/src/main/java/com/uav/platform/modules/reporting/service/impl/IReportService.java:115; backend/src/main/java/com/uav/platform/modules/sar/service/impl/IAiService.java:131; backend/src/main/java/com/uav/platform/modules/webhook/service/impl/IWebhookService.java:157.

### Assumptions

- No supplied threat model or knowledge base. Security policy resolver returned no applicable text for backend, apps, packages, frontend, infra, .github and docs; parent reported the root resolver empty. Graph discovery was used first, with offline source fallback for omitted/insufficient media and configuration coverage. No application execution, network contact, source changes or scan execution occurred in this review.
- Private .env values, running processes, actual production topology and Docker-managed host volume directories were not inspected. Values above are source defaults or explicit Compose mappings, not assertions about a running deployment. Host storage backing for named volumes depends on Docker/Compose runtime and cannot be resolved from these files alone.
- Cross-domain staging remains unproven in the repository's own auth design. Local localhost ports share a hostname and do not establish multi-host SSO. Deployment must supply intended HTTPS, cookie domain/Secure policy and exact origins. Evidence: docs/architecture/CROSS_DOMAIN_AUTH_DESIGN.md:13; docs/architecture/CROSS_DOMAIN_AUTH_DESIGN.md:15; docs/architecture/CROSS_DOMAIN_AUTH_DESIGN.md:23.
- Separate API and object-store CORS settings do not establish shared behavior: API defaults allow localhost 3000 and 3100–3103, but storage bucket CORS defaults to only localhost:3000. Bucket CORS application also tolerates storage HTTP 501. Actual browser object access therefore depends on storage/proxy CORS configuration; no proxy-level control was established. Evidence: backend/src/main/resources/application.properties:7; docker-compose.yml:50; backend/src/main/java/com/uav/platform/modules/media/service/impl/S3CompatibleStorageService.java:78.
- Deployment docs say app values are validated and artifacts independently buildable, but the API client directly consumes NEXT_PUBLIC_API_URL, and the inspected admin Dockerfile copies all apps/packages before building. A public environment validator exists, but the graph showed no callers. Treat validation/build independence as claims needing integration evidence, not component-enforced guarantees. Evidence: docs/architecture/DEPLOYMENT_AND_CICD_PLAN.md:22; docs/architecture/DEPLOYMENT_AND_CICD_PLAN.md:62; packages/config/src/index.ts:2; packages/api-client/src/index.ts:25; apps/admin/Dockerfile:3.
- Development-only wording on Phase1SchemaInitializer does not restrict its activation: matchIfMissing=true enables it in ordinary startup; stabilization explicitly disables it. Hibernate validate and Flyway settings alone therefore do not mean startup performs no additional DDL. Evidence: backend/src/main/java/com/uav/platform/config/Phase1SchemaInitializer.java:12; backend/src/main/resources/application.properties:21; backend/src/main/resources/application-stabilization.properties:7.
- The priorities design calls for removing misleading simulated success; current source still simulates webhook delivery for certain target substrings and AI inference results. No real UAV/edge/cloud inference or external rescue acknowledgement should be inferred from those branches. Evidence: docs/superpowers/specs/2026-10-17-full-priorities-design.md:13; backend/src/main/java/com/uav/platform/modules/webhook/service/impl/IWebhookService.java:157; backend/src/main/java/com/uav/platform/modules/sar/service/impl/IAiService.java:131.
- Reporting currently sums startTime-to-expectedEndTime and counts verified person detections while CSV labels imply accumulated flight hours/rescued people. The design explicitly calls for truthful metrics and leaves billing policy decisions pending. This is an established semantic discrepancy, not a vulnerability conclusion. Evidence: backend/src/main/java/com/uav/platform/modules/reporting/service/impl/IReportService.java:76; backend/src/main/java/com/uav/platform/modules/reporting/service/impl/IReportService.java:91; backend/src/main/java/com/uav/platform/modules/reporting/service/impl/IReportService.java:115; docs/superpowers/specs/2026-10-17-full-priorities-design.md:11; docs/superpowers/specs/2026-10-17-full-priorities-design.md:18.
- Upload request validation establishes nonempty name/content type, positive size and a media enum; it does not establish an accepted MIME allowlist or maximum size policy. The project design lists those policy choices as pending. No abuse or deployment impact was validated. Evidence: backend/src/main/java/com/uav/platform/modules/media/config/request/MediaUploadRequest.java:11; docs/superpowers/specs/2026-10-17-full-priorities-design.md:20.
- The payment callback's authenticated owner/manager and shared-secret compatibility paths are real controls, not equivalent to independent gateway verification. The intended production payment trust policy is not established by the callback label. Evidence: backend/src/main/java/com/uav/platform/modules/billing/service/impl/IBillingService.java:191; backend/src/main/java/com/uav/platform/modules/billing/service/impl/IBillingService.java:215; backend/src/main/java/com/uav/platform/modules/billing/service/impl/IBillingService.java:299.
- Post-review user decisions on 2026-10-17: planned hours retained; automatic invoices disabled until price approval; later invoice failures use durable pending/retry without duplicates; supported media limits and 24h unconfirmed retention approved; verified mission invoices grant no hours and plan invoices use the plan limit. No staging exists; only local rehearsal is authorized. Earlier references to pending policies describe the inspected baseline, not current decision status.

## Findings

| Finding | Severity | Confidence | Detailed write-up |
| --- | --- | --- | --- |
| [Customers can settle their own invoices without payment verification (baseline; fixed in working tree)](#finding-1) | high | high | inline below |
| [Operators can forge safety alerts for missions assigned to other users](#finding-2) | medium | high | inline below |
| [A source-embedded default secret authenticates anonymous payment callbacks (baseline; removed in working tree)](#finding-3) | medium | high | inline below |
| [Webhook validation permits private IPv6 unique-local destinations](#finding-4) | low | high | inline below |

### Confidence Scale

| Label | Meaning |
| --- | --- |
| high | Direct evidence supports the finding with no material unresolved blocker. |
| medium | Evidence supports a plausible issue, but material runtime or reachability proof remains. |
| low | Evidence is incomplete and the item is retained only for explicit follow-up. |

<a id="finding-1"></a>

### [1] Customers can settle their own invoices without payment verification (baseline; fixed in working tree)

| Field | Value |
| --- | --- |
| Severity | high |
| Confidence | high |
| Confidence rationale | Independent baseline and parent source trace, plus isolated unsigned FAILED callback runtime reproduction. |
| Category | Missing payment-provider authorization |
| CWE | CWE-862 |
| Affected lines | backend/src/main/java/com/uav/platform/modules/billing/controller/PaymentIpnController.java:28-37, backend/src/main/java/com/uav/platform/modules/billing/service/impl/IBillingService.java:195-221, backend/src/main/java/com/uav/platform/modules/billing/service/impl/IBillingService.java:228-261 |

#### Summary

Baseline observation: POST /api/v1/billing/webhook/payment-ipn accepts customer-controlled invoice, amount and transaction fields. processPaymentIpn permits an invalid or absent payment signature whenever the requester is authenticated, then accepts invoice ownership as authorization to settle payment. It marks the invoice PAID and adds 50 flight hours. Task2 remediation is implemented and locally verified; this is retained as a genuine pre-fix finding, not a claim that the same bypass remains in the working tree.

#### Root Cause

Only an authenticated payment-provider notification may mark an invoice paid or grant purchased flight quota. The original callback treated authenticated invoice ownership as sufficient payment authorization, before marking paid and granting a fixed50-hour bonus.

**Callback forwards untrusted payment fields and optional signature** — `backend/src/main/java/com/uav/platform/modules/billing/controller/PaymentIpnController.java:28-37`

Optional proof and browser Authentication are passed alongside caller-controlled invoice/amount/status to the billing service.

```java
    @PostMapping("/payment-ipn")
    public ResponseEntity<PaymentIpnResponse> handlePaymentIpn(
            @Valid @RequestBody PaymentIpnRequest request,
            @RequestHeader(value = "X-Signature-SHA256", required = false) String signatureHeader,
            @RequestHeader(value = "X-Webhook-Secret", required = false) String webhookSecret,
            Authentication auth
    ) {
        log.info("Received Payment IPN Callback for invoiceCode={}", request != null ? request.invoiceCode() : null);
        String resolvedSignature = (signatureHeader != null && !signatureHeader.isBlank()) ? signatureHeader : webhookSecret;
        return ResponseEntity.ok(billingService.processPaymentIpn(request, resolvedSignature, auth));
```

**Baseline rejection required both missing proof and missing login** — `backend/src/main/java/com/uav/platform/modules/billing/service/impl/IBillingService.java:199`

This exact pre-fix conditional expression was independently captured in the baseline audit: any authenticated caller bypassed mandatory provider proof. Original finding and runtime evidence are retained; this expression has since been removed.

```java
if (!validSignature && !isAuthenticated) {
```

**Baseline owner authorization led to settlement** — `backend/src/main/java/com/uav/platform/modules/billing/service/impl/IBillingService.java:219`

Ownership or management permission substituted for verified external payment before the paid-state/quota mutation.

```java
if (!isOwner && !canManage) {
```

**Baseline paid-state mutation** — `backend/src/main/java/com/uav/platform/modules/billing/service/impl/IBillingService.java:238`

The pre-fix service marked the invoice paid. Parent reproduced statusPAID and quota20→70 from an unsignedFAILED request on owned disposable data.

```java
invoice.setStatus(InvoiceStatus.PAID);
```

#### Validation

Before fix: authenticated customer unsignedFAILED callback returned200, invoicePAID, quota20→70. After Task2: disabled provider returns503, invoicePENDING, quota unchanged; PostgreSQL tests reject unsigned/failed/tampered/raw-secret proof and ensure signed replay idempotency. Original auditor supplied exact retained source lines199/219/238; accepted ownership is the negation of the denial guard, not a literal disjunction.

Validation method: independent baseline source review, parent trace and isolated runtime before/after

**Callback forwards untrusted payment fields and optional signature** — `backend/src/main/java/com/uav/platform/modules/billing/controller/PaymentIpnController.java:28-37`

Optional proof and browser Authentication are passed alongside caller-controlled invoice/amount/status to the billing service.

```java
    @PostMapping("/payment-ipn")
    public ResponseEntity<PaymentIpnResponse> handlePaymentIpn(
            @Valid @RequestBody PaymentIpnRequest request,
            @RequestHeader(value = "X-Signature-SHA256", required = false) String signatureHeader,
            @RequestHeader(value = "X-Webhook-Secret", required = false) String webhookSecret,
            Authentication auth
    ) {
        log.info("Received Payment IPN Callback for invoiceCode={}", request != null ? request.invoiceCode() : null);
        String resolvedSignature = (signatureHeader != null && !signatureHeader.isBlank()) ? signatureHeader : webhookSecret;
        return ResponseEntity.ok(billingService.processPaymentIpn(request, resolvedSignature, auth));
```

**Baseline rejection required both missing proof and missing login** — `backend/src/main/java/com/uav/platform/modules/billing/service/impl/IBillingService.java:199`

This exact pre-fix conditional expression was independently captured in the baseline audit: any authenticated caller bypassed mandatory provider proof. Original finding and runtime evidence are retained; this expression has since been removed.

```java
if (!validSignature && !isAuthenticated) {
```

**Baseline owner authorization led to settlement** — `backend/src/main/java/com/uav/platform/modules/billing/service/impl/IBillingService.java:219`

Ownership or management permission substituted for verified external payment before the paid-state/quota mutation.

```java
if (!isOwner && !canManage) {
```

**Baseline paid-state mutation** — `backend/src/main/java/com/uav/platform/modules/billing/service/impl/IBillingService.java:238`

The pre-fix service marked the invoice paid. Parent reproduced statusPAID and quota20→70 from an unsignedFAILED request on owned disposable data.

```java
invoice.setStatus(InvoiceStatus.PAID);
```

Limitations:
- Original evidence locations describe source at discovery, before authorized implementation edits.
- No real money movement/provider/staging tested.

#### Dataflow

POST /api/v1/billing/webhook/payment-ipn accepts customer-controlled invoice, amount and transaction fields. processPaymentIpn permits an invalid or absent payment signature whenever the requester is authenticated, then accepts invoice ownership as authorization to settle payment. It marks the invoice PAID and adds 50 flight hours.

**Callback forwards untrusted payment fields and optional signature** — `backend/src/main/java/com/uav/platform/modules/billing/controller/PaymentIpnController.java:28-37`

Optional proof and browser Authentication are passed alongside caller-controlled invoice/amount/status to the billing service.

```java
    @PostMapping("/payment-ipn")
    public ResponseEntity<PaymentIpnResponse> handlePaymentIpn(
            @Valid @RequestBody PaymentIpnRequest request,
            @RequestHeader(value = "X-Signature-SHA256", required = false) String signatureHeader,
            @RequestHeader(value = "X-Webhook-Secret", required = false) String webhookSecret,
            Authentication auth
    ) {
        log.info("Received Payment IPN Callback for invoiceCode={}", request != null ? request.invoiceCode() : null);
        String resolvedSignature = (signatureHeader != null && !signatureHeader.isBlank()) ? signatureHeader : webhookSecret;
        return ResponseEntity.ok(billingService.processPaymentIpn(request, resolvedSignature, auth));
```

**Baseline rejection required both missing proof and missing login** — `backend/src/main/java/com/uav/platform/modules/billing/service/impl/IBillingService.java:199`

This exact pre-fix conditional expression was independently captured in the baseline audit: any authenticated caller bypassed mandatory provider proof. Original finding and runtime evidence are retained; this expression has since been removed.

```java
if (!validSignature && !isAuthenticated) {
```

**Baseline owner authorization led to settlement** — `backend/src/main/java/com/uav/platform/modules/billing/service/impl/IBillingService.java:219`

Ownership or management permission substituted for verified external payment before the paid-state/quota mutation.

```java
if (!isOwner && !canManage) {
```

**Baseline paid-state mutation** — `backend/src/main/java/com/uav/platform/modules/billing/service/impl/IBillingService.java:238`

The pre-fix service marked the invoice paid. Parent reproduced statusPAID and quota20→70 from an unsignedFAILED request on owned disposable data.

```java
invoice.setStatus(InvoiceStatus.PAID);
```

#### Reachability

An authenticated customer with an unpaid invoice. Existing authenticated owner path bypassed provider proof.

Limitations:
- The service rejects another customer's invoice, underpayment and an already-paid invoice. Those checks do not establish that any payment occurred. The normal payInvoice endpoint fails closed with PAYMENT_UNAVAILABLE, but the callback bypasses that behavior. Existing security tests cover unsigned anonymous requests and cross-customer requests, not unsigned requests from the invoice owner.

#### Severity

**High** — An ordinary invoice owner could forge payment success and enlarge quota without paying; user authentication was accepted as payment proof even with a strong provider secret configured.

This rates the verified baseline path. Current disabled-by-default, payload-bound provider verification removes the observed bypass; future provider integration needs independent verification.

#### Remediation

Require valid provider authentication for every payment callback, irrespective of browser identity or invoice ownership. Keep customer payment initiation separate from settlement. Verify the successful provider transaction and its binding to the invoice before changing invoice or quota state.

Tests:
- Unsigned ownerFAILED callback cannot change invoice or quota.
- Signed successful exact replay returns stable receipt; plan limits preserve consumed hours; mission invoice grants no quota.

<a id="finding-2"></a>

### [2] Operators can forge safety alerts for missions assigned to other users

| Field | Value |
| --- | --- |
| Severity | medium |
| Confidence | high |
| Confidence rationale | Parent independently traced controller permission, unused authentication, caller-selected mission ID and notification sink in current source. |
| Category | Authorization bypass / IDOR |
| CWE | CWE-639 |
| Affected lines | backend/src/main/java/com/uav/platform/modules/sar/controller/SarController.java:53-56, backend/src/main/java/com/uav/platform/modules/sar/service/impl/ISarService.java:185-244, backend/src/main/java/com/uav/platform/modules/sar/service/impl/ISarService.java:301-345, backend/src/main/java/com/uav/platform/modules/user/config/PermissionDataInitializer.java:59-64 |

#### Summary

POST /api/v1/sar/telemetry-evaluate accepts an arbitrary missionId and telemetry. evaluateTelemetry does not use its Authentication argument or call requireMissionAccess. Low battery or a geofence violation invokes triggerSafetyAlert, which broadcasts signed events and resolves the supplied mission ID to send a notification to its operator or customer. An operator can inject false critical-battery and geofence alerts into another mission's notifications and configured external webhook subscribers, impersonating platform safety reporting.

#### Root Cause

Operational alerts and external safety events for a mission must be restricted to its authorized participants or a user with global mission authority. The controller forwards operational users to a calculation service that omits requireMissionAccess before sending side effects.

**Operational role can submit arbitrary mission telemetry** — `backend/src/main/java/com/uav/platform/modules/sar/controller/SarController.java:53-56`

Controller checks operational permission then forwards caller-selected missionId and telemetry to evaluateTelemetry.

```java
    @PostMapping("/telemetry-evaluate")
    @PreAuthorize("@permissionService.has(authentication, 'MISSION_STATUS_UPDATE') or @permissionService.has(authentication, 'MISSION_VIEW_ALL')")
    public ResponseEntity<TelemetryEvaluateResponse> evaluateTelemetry(@RequestBody TelemetryEvaluateRequest request, Authentication auth) {
        return ResponseEntity.ok(sarService.evaluateTelemetry(request, auth));
```

**Evaluation starts without mission ownership check** — `backend/src/main/java/com/uav/platform/modules/sar/service/impl/ISarService.java:185-199`

Authentication is accepted but no mission lookup or ownership guard precedes calculation on supplied telemetry.

```java
    @Override
    public TelemetryEvaluateResponse evaluateTelemetry(TelemetryEvaluateRequest request, Authentication authentication) {
        double cruiseSpeed = request.cruiseSpeedMs() > 0 ? request.cruiseSpeedMs() : 12.0;
        double dischargeRate = (request.dischargeRatePctPerMin() != null && request.dischargeRatePctPerMin() > 0)
            ? request.dischargeRatePctPerMin() : 2.2;
        double safetyReserve = (request.safetyReservePct() != null && request.safetyReservePct() >= 0)
            ? request.safetyReservePct() : 20.0;

        double distMeters = haversineDistance(
            request.currentLat(), request.currentLng(),
            request.homeLat(), request.homeLng()
        );
        double returnTimeSec = distMeters / cruiseSpeed;
        double returnTimeMin = returnTimeSec / 60.0;
        double flightDrainPct = returnTimeMin * dischargeRate;
```

**Attacker input selects safety alert side effects** — `backend/src/main/java/com/uav/platform/modules/sar/service/impl/ISarService.java:225-229`

Low battery or geofence breach calls triggerSafetyAlert on the same request.

```java
            recommendation = "CAUTION: Approaching RTH battery threshold (" + requiredBatteryPct + "%). Prepare recovery.";
        }

        if (mustTriggerRth || !insideGeofence) {
            alertDispatched = triggerSafetyAlert(request, distMeters, requiredBatteryPct, mustTriggerRth, insideGeofence, recommendation);
```

**Platform broadcasts caller-supplied mission alert** — `backend/src/main/java/com/uav/platform/modules/sar/service/impl/ISarService.java:309-325`

The mission ID and UAV identity remain caller-controlled when broadcast to subscribers.

```java
            Map<String, Object> alertPayload = Map.of(
                "missionId", req.missionId() != null ? req.missionId() : 0L,
                "uavCode", req.uavCode() != null ? req.uavCode() : "UAV-SAR-01",
                "batteryPct", req.batteryPct(),
                "requiredBatteryPct", requiredBatteryPct,
                "distanceToHomeMeters", Math.round(distMeters),
                "insideGeofence", insideGeofence,
                "recommendation", recommendation
            );
            if (!insideGeofence) {
                webhookService.broadcastEvent("GEOFENCE_BREACH", alertPayload);
            }
            if (mustTriggerRth) {
                webhookService.broadcastEvent("BATTERY_CRITICAL_RTH", alertPayload);
            }
            dispatched = true;
        }
```

**Another mission's participant receives the alert** — `backend/src/main/java/com/uav/platform/modules/sar/service/impl/ISarService.java:326-342`

Mission lookup chooses operator/customer recipient but does not authorize the sender.

```java
        if (notificationService != null && req.missionId() != null) {
            missionRepository.findById(req.missionId()).ifPresent(mission -> {
                Long targetUserId = mission.getOperator() != null
                    ? mission.getOperator().getId()
                    : (mission.getCustomer() != null ? mission.getCustomer().getId() : null);
                if (targetUserId != null) {
                    try {
                        notificationService.sendNotification(new CreateNotificationRequest(
                            targetUserId,
                            "UAV Safety Alert: " + (req.uavCode() != null ? req.uavCode() : "UAV-SAR-01"),
                            recommendation,
                            NotificationType.SYSTEM,
                            "MISSION",
                            mission.getId()
                        ));
                    } catch (RuntimeException ignored) {
                    }
```

**Sibling SAR operations have a mission access guard** — `backend/src/main/java/com/uav/platform/modules/sar/service/impl/ISarService.java:69-85`

The reusable guard rejects unrelated users but is not called by telemetry evaluation.

```java
    private void requireMissionAccess(Mission mission, Authentication auth, boolean requireOperationalAuthority) {
        if (mission == null || auth == null || permissionService == null) {
            return;
        }
        if (permissionService.has(auth, "MISSION_VIEW_ALL") || permissionService.has(auth, "USER_MANAGE")) {
            return;
        }
        String actor = auth.getName();
        boolean isOperator = mission.getOperator() != null && java.util.Objects.equals(mission.getOperator().getUsername(), actor);
        boolean isCustomer = mission.getCustomer() != null && java.util.Objects.equals(mission.getCustomer().getUsername(), actor);
        if (!isOperator && !isCustomer) {
            throw new org.springframework.security.access.AccessDeniedException("You do not have permission to access this mission");
        }
        if (requireOperationalAuthority && !isOperator && !permissionService.has(auth, "MISSION_STATUS_UPDATE")) {
            throw new org.springframework.security.access.AccessDeniedException("Only assigned operators or commanders can modify SAR operational status");
        }
    }
```

#### Validation

Parent confirmed default operators hold MISSION_STATUS_UPDATE, evaluateTelemetry ignores Authentication, and alert payload plus notification recipient derive from supplied missionId. Sibling guard is concrete counterevidence but does not protect this path. Separately authorized local business test reproduced: unrelated operator GET mission403 but POST telemetry200, creating a victim synthetic customer's notification. All disposable outbound subscriptions were disabled; no external messages.

Validation method: independent source trace plus isolated business runtime reproduction

**Operational role can submit arbitrary mission telemetry** — `backend/src/main/java/com/uav/platform/modules/sar/controller/SarController.java:53-56`

Controller checks operational permission then forwards caller-selected missionId and telemetry to evaluateTelemetry.

```java
    @PostMapping("/telemetry-evaluate")
    @PreAuthorize("@permissionService.has(authentication, 'MISSION_STATUS_UPDATE') or @permissionService.has(authentication, 'MISSION_VIEW_ALL')")
    public ResponseEntity<TelemetryEvaluateResponse> evaluateTelemetry(@RequestBody TelemetryEvaluateRequest request, Authentication auth) {
        return ResponseEntity.ok(sarService.evaluateTelemetry(request, auth));
```

**Evaluation starts without mission ownership check** — `backend/src/main/java/com/uav/platform/modules/sar/service/impl/ISarService.java:185-199`

Authentication is accepted but no mission lookup or ownership guard precedes calculation on supplied telemetry.

```java
    @Override
    public TelemetryEvaluateResponse evaluateTelemetry(TelemetryEvaluateRequest request, Authentication authentication) {
        double cruiseSpeed = request.cruiseSpeedMs() > 0 ? request.cruiseSpeedMs() : 12.0;
        double dischargeRate = (request.dischargeRatePctPerMin() != null && request.dischargeRatePctPerMin() > 0)
            ? request.dischargeRatePctPerMin() : 2.2;
        double safetyReserve = (request.safetyReservePct() != null && request.safetyReservePct() >= 0)
            ? request.safetyReservePct() : 20.0;

        double distMeters = haversineDistance(
            request.currentLat(), request.currentLng(),
            request.homeLat(), request.homeLng()
        );
        double returnTimeSec = distMeters / cruiseSpeed;
        double returnTimeMin = returnTimeSec / 60.0;
        double flightDrainPct = returnTimeMin * dischargeRate;
```

**Attacker input selects safety alert side effects** — `backend/src/main/java/com/uav/platform/modules/sar/service/impl/ISarService.java:225-229`

Low battery or geofence breach calls triggerSafetyAlert on the same request.

```java
            recommendation = "CAUTION: Approaching RTH battery threshold (" + requiredBatteryPct + "%). Prepare recovery.";
        }

        if (mustTriggerRth || !insideGeofence) {
            alertDispatched = triggerSafetyAlert(request, distMeters, requiredBatteryPct, mustTriggerRth, insideGeofence, recommendation);
```

**Platform broadcasts caller-supplied mission alert** — `backend/src/main/java/com/uav/platform/modules/sar/service/impl/ISarService.java:309-325`

The mission ID and UAV identity remain caller-controlled when broadcast to subscribers.

```java
            Map<String, Object> alertPayload = Map.of(
                "missionId", req.missionId() != null ? req.missionId() : 0L,
                "uavCode", req.uavCode() != null ? req.uavCode() : "UAV-SAR-01",
                "batteryPct", req.batteryPct(),
                "requiredBatteryPct", requiredBatteryPct,
                "distanceToHomeMeters", Math.round(distMeters),
                "insideGeofence", insideGeofence,
                "recommendation", recommendation
            );
            if (!insideGeofence) {
                webhookService.broadcastEvent("GEOFENCE_BREACH", alertPayload);
            }
            if (mustTriggerRth) {
                webhookService.broadcastEvent("BATTERY_CRITICAL_RTH", alertPayload);
            }
            dispatched = true;
        }
```

**Another mission's participant receives the alert** — `backend/src/main/java/com/uav/platform/modules/sar/service/impl/ISarService.java:326-342`

Mission lookup chooses operator/customer recipient but does not authorize the sender.

```java
        if (notificationService != null && req.missionId() != null) {
            missionRepository.findById(req.missionId()).ifPresent(mission -> {
                Long targetUserId = mission.getOperator() != null
                    ? mission.getOperator().getId()
                    : (mission.getCustomer() != null ? mission.getCustomer().getId() : null);
                if (targetUserId != null) {
                    try {
                        notificationService.sendNotification(new CreateNotificationRequest(
                            targetUserId,
                            "UAV Safety Alert: " + (req.uavCode() != null ? req.uavCode() : "UAV-SAR-01"),
                            recommendation,
                            NotificationType.SYSTEM,
                            "MISSION",
                            mission.getId()
                        ));
                    } catch (RuntimeException ignored) {
                    }
```

**Sibling SAR operations have a mission access guard** — `backend/src/main/java/com/uav/platform/modules/sar/service/impl/ISarService.java:69-85`

The reusable guard rejects unrelated users but is not called by telemetry evaluation.

```java
    private void requireMissionAccess(Mission mission, Authentication auth, boolean requireOperationalAuthority) {
        if (mission == null || auth == null || permissionService == null) {
            return;
        }
        if (permissionService.has(auth, "MISSION_VIEW_ALL") || permissionService.has(auth, "USER_MANAGE")) {
            return;
        }
        String actor = auth.getName();
        boolean isOperator = mission.getOperator() != null && java.util.Objects.equals(mission.getOperator().getUsername(), actor);
        boolean isCustomer = mission.getCustomer() != null && java.util.Objects.equals(mission.getCustomer().getUsername(), actor);
        if (!isOperator && !isCustomer) {
            throw new org.springframework.security.access.AccessDeniedException("You do not have permission to access this mission");
        }
        if (requireOperationalAuthority && !isOperator && !permissionService.has(auth, "MISSION_STATUS_UPDATE")) {
            throw new org.springframework.security.access.AccessDeniedException("Only assigned operators or commanders can modify SAR operational status");
        }
    }
```

Limitations:
- No external receiver contacted; physical UAV control is not established.

#### Dataflow

POST /api/v1/sar/telemetry-evaluate accepts an arbitrary missionId and telemetry. evaluateTelemetry does not use its Authentication argument or call requireMissionAccess. Low battery or a geofence violation invokes triggerSafetyAlert, which broadcasts signed events and resolves the supplied mission ID to send a notification to its operator or customer.

**Operational role can submit arbitrary mission telemetry** — `backend/src/main/java/com/uav/platform/modules/sar/controller/SarController.java:53-56`

Controller checks operational permission then forwards caller-selected missionId and telemetry to evaluateTelemetry.

```java
    @PostMapping("/telemetry-evaluate")
    @PreAuthorize("@permissionService.has(authentication, 'MISSION_STATUS_UPDATE') or @permissionService.has(authentication, 'MISSION_VIEW_ALL')")
    public ResponseEntity<TelemetryEvaluateResponse> evaluateTelemetry(@RequestBody TelemetryEvaluateRequest request, Authentication auth) {
        return ResponseEntity.ok(sarService.evaluateTelemetry(request, auth));
```

**Evaluation starts without mission ownership check** — `backend/src/main/java/com/uav/platform/modules/sar/service/impl/ISarService.java:185-199`

Authentication is accepted but no mission lookup or ownership guard precedes calculation on supplied telemetry.

```java
    @Override
    public TelemetryEvaluateResponse evaluateTelemetry(TelemetryEvaluateRequest request, Authentication authentication) {
        double cruiseSpeed = request.cruiseSpeedMs() > 0 ? request.cruiseSpeedMs() : 12.0;
        double dischargeRate = (request.dischargeRatePctPerMin() != null && request.dischargeRatePctPerMin() > 0)
            ? request.dischargeRatePctPerMin() : 2.2;
        double safetyReserve = (request.safetyReservePct() != null && request.safetyReservePct() >= 0)
            ? request.safetyReservePct() : 20.0;

        double distMeters = haversineDistance(
            request.currentLat(), request.currentLng(),
            request.homeLat(), request.homeLng()
        );
        double returnTimeSec = distMeters / cruiseSpeed;
        double returnTimeMin = returnTimeSec / 60.0;
        double flightDrainPct = returnTimeMin * dischargeRate;
```

**Attacker input selects safety alert side effects** — `backend/src/main/java/com/uav/platform/modules/sar/service/impl/ISarService.java:225-229`

Low battery or geofence breach calls triggerSafetyAlert on the same request.

```java
            recommendation = "CAUTION: Approaching RTH battery threshold (" + requiredBatteryPct + "%). Prepare recovery.";
        }

        if (mustTriggerRth || !insideGeofence) {
            alertDispatched = triggerSafetyAlert(request, distMeters, requiredBatteryPct, mustTriggerRth, insideGeofence, recommendation);
```

**Platform broadcasts caller-supplied mission alert** — `backend/src/main/java/com/uav/platform/modules/sar/service/impl/ISarService.java:309-325`

The mission ID and UAV identity remain caller-controlled when broadcast to subscribers.

```java
            Map<String, Object> alertPayload = Map.of(
                "missionId", req.missionId() != null ? req.missionId() : 0L,
                "uavCode", req.uavCode() != null ? req.uavCode() : "UAV-SAR-01",
                "batteryPct", req.batteryPct(),
                "requiredBatteryPct", requiredBatteryPct,
                "distanceToHomeMeters", Math.round(distMeters),
                "insideGeofence", insideGeofence,
                "recommendation", recommendation
            );
            if (!insideGeofence) {
                webhookService.broadcastEvent("GEOFENCE_BREACH", alertPayload);
            }
            if (mustTriggerRth) {
                webhookService.broadcastEvent("BATTERY_CRITICAL_RTH", alertPayload);
            }
            dispatched = true;
        }
```

**Another mission's participant receives the alert** — `backend/src/main/java/com/uav/platform/modules/sar/service/impl/ISarService.java:326-342`

Mission lookup chooses operator/customer recipient but does not authorize the sender.

```java
        if (notificationService != null && req.missionId() != null) {
            missionRepository.findById(req.missionId()).ifPresent(mission -> {
                Long targetUserId = mission.getOperator() != null
                    ? mission.getOperator().getId()
                    : (mission.getCustomer() != null ? mission.getCustomer().getId() : null);
                if (targetUserId != null) {
                    try {
                        notificationService.sendNotification(new CreateNotificationRequest(
                            targetUserId,
                            "UAV Safety Alert: " + (req.uavCode() != null ? req.uavCode() : "UAV-SAR-01"),
                            recommendation,
                            NotificationType.SYSTEM,
                            "MISSION",
                            mission.getId()
                        ));
                    } catch (RuntimeException ignored) {
                    }
```

#### Reachability

An authenticated operator with the default MISSION_STATUS_UPDATE permission but no access to the target mission. Controller operational permission is sufficient; victim mission need only exist.

- **Attacker:** An authenticated operator with the default MISSION_STATUS_UPDATE permission but no access to the target mission.

Limitations:
- The controller requires an operational permission. Other SAR operations call requireMissionAccess and reject unrelated users; this endpoint omits that control. Flight-plan generation alone was not treated as an authorization defect because it only computes a response from supplied values.

#### Severity

**Medium** — An ordinary operator can inject another mission's alerts, crossing ownership. Impact is integrity of platform notifications and configured callbacks, not physical UAV control; no real rescue receiver or deployment verified.

Real downstream automation acting on these events could increase impact; removing side effects or enforcing mission authority eliminates this path.

#### Remediation

Resolve the mission and enforce operational mission access before evaluating or dispatching telemetry alerts. Validate that the referenced UAV belongs to the mission. Keep any calculation-only endpoint free of notification and webhook side effects.

Tests:
- Unrelated operator receives403 and no notification or webhook is enqueued.
- Missing mission returns404 with no side effect; assigned UAV identity must match.

<a id="finding-3"></a>

### [3] A source-embedded default secret authenticates anonymous payment callbacks (baseline; removed in working tree)

| Field | Value |
| --- | --- |
| Severity | medium |
| Confidence | high |
| Confidence rationale | Original auditor retained exact lines and parent traced the active verification consumer. Credential value is intentionally redacted and was never used. |
| Category | Hardcoded payment verification credential |
| CWE | CWE-798 |
| Affected lines | backend/src/main/resources/application.properties:45, backend/src/main/java/com/uav/platform/modules/billing/service/impl/IBillingService.java:65-97, backend/src/main/java/com/uav/platform/modules/billing/service/impl/IBillingService.java:299-312, backend/src/main/java/com/uav/platform/security/SecurityConfig.java:90-96, backend/src/main/java/com/uav/platform/config/routes/ApiRoutes.java:201-205 |

#### Summary

Baseline source embedded a payment-verification credential, and the public callback accepted that raw credential as proof. Task2 removed all defaults/raw-secret acceptance and disables provider settlement until explicit configuration. Previous deployments and secret rotation remain unverified.

#### Root Cause

Payment-verification credentials must be deployment-specific secrets unavailable to source readers. Source-contained defaults reached the payment verifier, which accepted the raw shared key instead of only authenticating a complete payload.

**Pre-fix deployment fallback credential redacted** — `backend/src/main/resources/application.properties:45`

The original property contained concrete credential material, not a blank placeholder. That fallback flowed into constructor injection/default assignment; the literal is redacted to comply with evidence policy.

```properties
app.billing.ipn-secret=${APP_BILLING_IPN_SECRET:[REDACTED_SOURCE_DEFAULT]}
```

**Pre-fix verifier accepts the signing key itself** — `backend/src/main/java/com/uav/platform/modules/billing/service/impl/IBillingService.java:305`

Original retained source compares caller-provided proof directly with the configured secret and accepts it, enabling source readers of the fallback to authenticate fabricated callbacks.

```java
if (java.security.MessageDigest.isEqual(providedBytes, secretBytes)) {
```

#### Validation

Parent verified credential purpose, constructor/property defaults and raw-secret branch using original source observed during the scan. Auditor later supplied exact retained lines45/88/97/305 without new history reads. Current Task2 removes those defaults and rejects raw-secret callbacks; focused proof/security tests10/10pass.

Validation method: independent source disclosure and consumer trace; current fix regression

**Pre-fix deployment fallback credential redacted** — `backend/src/main/resources/application.properties:45`

The original property contained concrete credential material, not a blank placeholder. That fallback flowed into constructor injection/default assignment; the literal is redacted to comply with evidence policy.

```properties
app.billing.ipn-secret=${APP_BILLING_IPN_SECRET:[REDACTED_SOURCE_DEFAULT]}
```

**Pre-fix verifier accepts the signing key itself** — `backend/src/main/java/com/uav/platform/modules/billing/service/impl/IBillingService.java:305`

Original retained source compares caller-provided proof directly with the configured secret and accepts it, enabling source readers of the fallback to authenticate fabricated callbacks.

```java
if (java.security.MessageDigest.isEqual(providedBytes, secretBytes)) {
```

Limitations:
- No discovered credential used; no external service contacted.
- No deployed configuration or previous-secret rotation verified. Source snippets/locations describe pre-fix discovery state and redact credential material.

#### Dataflow

The production application properties and injected billing-service constructor supply the same embedded fallback credential. The public payment callback accepts that credential directly through its signature/secret header and then performs settlement without requiring a user session.

**Pre-fix deployment fallback credential redacted** — `backend/src/main/resources/application.properties:45`

The original property contained concrete credential material, not a blank placeholder. That fallback flowed into constructor injection/default assignment; the literal is redacted to comply with evidence policy.

```properties
app.billing.ipn-secret=${APP_BILLING_IPN_SECRET:[REDACTED_SOURCE_DEFAULT]}
```

**Pre-fix verifier accepts the signing key itself** — `backend/src/main/java/com/uav/platform/modules/billing/service/impl/IBillingService.java:305`

Original retained source compares caller-provided proof directly with the configured secret and accepts it, enabling source readers of the fallback to authenticate fabricated callbacks.

```java
if (java.security.MessageDigest.isEqual(providedBytes, secretBytes)) {
```

#### Reachability

A source reader able to reach a deployment that has not overridden APP_BILLING_IPN_SECRET.

Limitations:
- APP_BILLING_IPN_SECRET can override the fallback. No deployed configuration or credential validity was tested. This is active verification material, rather than an environment-variable reference or a replacement placeholder.

#### Severity

**Medium** — Source access plus a reachable deployment retaining the default enabled forged anonymous payment settlement. Financial impact is substantial, but deployment/default use is unknown; this rates the pre-fix path.

A verified reachable deployment retaining the default would increase likelihood. Current removal/default-disabled provider closes the source-default path; any prior deployment must separately rotate credentials.

#### Remediation

Remove the embedded fallback from properties and constructors. Require an externally supplied secret or disable settlement when it is absent. Rotate any deployment that used the fallback. Authenticate the complete callback payload with a provider signature instead of accepting the raw shared secret.

Tests:
- No default IPN key remains in active properties/constructors.
- Unset provider configuration and raw-key callbacks cannot settle invoices; HMAC must bind successful status and invoice/amount/transaction.

<a id="finding-4"></a>

### [4] Webhook validation permits private IPv6 unique-local destinations

| Field | Value |
| --- | --- |
| Severity | low |
| Confidence | high |
| Confidence rationale | Current source omits fc00::/7 validation; IPv6 site-local is a different address class. Entry permission, HTTP sink and log response exposure traced independently. |
| Category | Server-side request forgery |
| CWE | CWE-918 |
| Affected lines | backend/src/main/java/com/uav/platform/modules/webhook/controller/WebhookController.java:33-36, backend/src/main/java/com/uav/platform/modules/webhook/controller/WebhookController.java:53-69, backend/src/main/java/com/uav/platform/modules/webhook/service/impl/IWebhookService.java:92-105, backend/src/main/java/com/uav/platform/modules/webhook/service/impl/IWebhookService.java:162-195, backend/src/main/java/com/uav/platform/modules/webhook/mapper/WebhookMapper.java:37-49 |

#### Summary

A supplied targetUrl is saved as a subscription. URL validation blocks selected hostnames and IPv4 ranges. Delivery checks InetAddress locality predicates, but these do not reject IPv6 unique-local addresses in fc00::/7. The backend sends an HTTP POST to the accepted address and stores the response, which webhook managers can retrieve through the logs endpoint.

#### Root Cause

Webhook destinations must not provide access to internal network resources through the backend. Textual checks cover selected IPv4/private names and the later InetAddress guard does not cover IPv6 ULA. HttpClient resolves/connects independently.

**Webhook manager supplies destination** — `backend/src/main/java/com/uav/platform/modules/webhook/controller/WebhookController.java:33-37`

A USER_MANAGE holder/admin supplies targetUrl to subscription service.

```java
    @PostMapping("/subscriptions")
    @PreAuthorize("@permissionService.has(authentication, 'USER_MANAGE') or hasAnyAuthority('ROLE_ADMIN', 'ADMIN')")
    public ResponseEntity<WebhookSubscriptionResponse> createSubscription(@Valid @RequestBody WebhookSubscriptionRequest request) {
        return ResponseEntity.ok(webhookService.createSubscription(request));
    }
```

**Destination passes textual guard** — `backend/src/main/java/com/uav/platform/modules/webhook/service/impl/IWebhookService.java:71-75`

Subscription stores URL after hostname/IPv4 checks.

```java
    @Override
    public WebhookSubscriptionResponse createSubscription(String name, String targetUrl, String secretKey, String eventsSubscribed) {
        validateSafeWebhookUrl(targetUrl);
        WebhookSubscription sub = new WebhookSubscription(name, targetUrl.trim(), secretKey, eventsSubscribed);
        return WebhookMapper.toSubscriptionResponse(subscriptionRepository.save(sub));
```

**Textual range guard omits IPv6 ULA** — `backend/src/main/java/com/uav/platform/modules/webhook/service/impl/IWebhookService.java:99-104`

No fc00::/7 prefix check rejects unique-local IPv6 literals.

```java
                || host.endsWith(".internal") || host.endsWith(".local")) {
            throw new SystemException("Webhook targetUrl cannot target internal, loopback, or metadata hosts", org.springframework.http.HttpStatus.BAD_REQUEST, "UNSAFE_WEBHOOK_URL");
        }
        if (host.startsWith("10.") || host.startsWith("192.168.") || host.startsWith("169.254.") || host.startsWith("127.")
                || host.matches("^172\\.(1[6-9]|2[0-9]|3[0-1])\\..*")) {
            throw new SystemException("Webhook targetUrl cannot target private network IP ranges", org.springframework.http.HttpStatus.BAD_REQUEST, "UNSAFE_WEBHOOK_URL");
```

**Resolved-address guard and HTTP connection** — `backend/src/main/java/com/uav/platform/modules/webhook/service/impl/IWebhookService.java:168-193`

InetAddress predicates omit IPv6 unique-local range; client sends request and reads response.

```java
                }
                HttpRequest request = HttpRequest.newBuilder()
                        .uri(uri)
                        .header("Content-Type", "application/json")
                        .header("X-Signature-SHA256", signature)
                        .header("X-Event-Type", eventType)
                        .header("User-Agent", "UAV-PAS-VJU-Webhook-Dispatcher/1.0")
                        .timeout(Duration.ofSeconds(4))
                        .POST(HttpRequest.BodyPublishers.ofString(jsonPayload, StandardCharsets.UTF_8))
                        .build();

                HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
                statusCode = response.statusCode();
                responseBody = response.body();
                success = statusCode >= 200 && statusCode < 300;
            }
        } catch (Exception ex) {
            log.warn("Webhook dispatch error to {}: {}", sub.getTargetUrl(), ex.getMessage());
            statusCode = 504;
            responseBody = "Dispatch Blocked or Failed: " + ex.getMessage();
            success = false;
        }

        int duration = (int) (System.currentTimeMillis() - start);
        WebhookDeliveryLog deliveryLog = new WebhookDeliveryLog(
                sub, eventType, jsonPayload, statusCode, responseBody, duration, success
```

**Delivery response returned to managers** — `backend/src/main/java/com/uav/platform/modules/webhook/mapper/WebhookMapper.java:37-49`

Stored response body is exposed in log DTO.

```java
    public static WebhookDeliveryLogResponse toDeliveryLogResponse(WebhookDeliveryLog log) {
        return new WebhookDeliveryLogResponse(
            log.getId(),
            log.getSubscription() != null ? log.getSubscription().getId() : null,
            log.getSubscription() != null ? log.getSubscription().getName() : "N/A",
            log.getEventType(),
            log.getPayload(),
            log.getResponseStatusCode(),
            log.getResponseBody(),
            log.getDeliveryDurationMs(),
            log.getIsSuccess(),
            log.getRetryCount(),
            log.getAttemptedAt()
```

#### Validation

Parent reviewed URL validation, delivery resolver/predicates, manager-only controller guards, response persistence and DTO. Unique-local IPv6 is not rejected by site-local/link-local/loopback/multicast predicates.

Validation method: independent static source trace

**Webhook manager supplies destination** — `backend/src/main/java/com/uav/platform/modules/webhook/controller/WebhookController.java:33-37`

A USER_MANAGE holder/admin supplies targetUrl to subscription service.

```java
    @PostMapping("/subscriptions")
    @PreAuthorize("@permissionService.has(authentication, 'USER_MANAGE') or hasAnyAuthority('ROLE_ADMIN', 'ADMIN')")
    public ResponseEntity<WebhookSubscriptionResponse> createSubscription(@Valid @RequestBody WebhookSubscriptionRequest request) {
        return ResponseEntity.ok(webhookService.createSubscription(request));
    }
```

**Destination passes textual guard** — `backend/src/main/java/com/uav/platform/modules/webhook/service/impl/IWebhookService.java:71-75`

Subscription stores URL after hostname/IPv4 checks.

```java
    @Override
    public WebhookSubscriptionResponse createSubscription(String name, String targetUrl, String secretKey, String eventsSubscribed) {
        validateSafeWebhookUrl(targetUrl);
        WebhookSubscription sub = new WebhookSubscription(name, targetUrl.trim(), secretKey, eventsSubscribed);
        return WebhookMapper.toSubscriptionResponse(subscriptionRepository.save(sub));
```

**Textual range guard omits IPv6 ULA** — `backend/src/main/java/com/uav/platform/modules/webhook/service/impl/IWebhookService.java:99-104`

No fc00::/7 prefix check rejects unique-local IPv6 literals.

```java
                || host.endsWith(".internal") || host.endsWith(".local")) {
            throw new SystemException("Webhook targetUrl cannot target internal, loopback, or metadata hosts", org.springframework.http.HttpStatus.BAD_REQUEST, "UNSAFE_WEBHOOK_URL");
        }
        if (host.startsWith("10.") || host.startsWith("192.168.") || host.startsWith("169.254.") || host.startsWith("127.")
                || host.matches("^172\\.(1[6-9]|2[0-9]|3[0-1])\\..*")) {
            throw new SystemException("Webhook targetUrl cannot target private network IP ranges", org.springframework.http.HttpStatus.BAD_REQUEST, "UNSAFE_WEBHOOK_URL");
```

**Resolved-address guard and HTTP connection** — `backend/src/main/java/com/uav/platform/modules/webhook/service/impl/IWebhookService.java:168-193`

InetAddress predicates omit IPv6 unique-local range; client sends request and reads response.

```java
                }
                HttpRequest request = HttpRequest.newBuilder()
                        .uri(uri)
                        .header("Content-Type", "application/json")
                        .header("X-Signature-SHA256", signature)
                        .header("X-Event-Type", eventType)
                        .header("User-Agent", "UAV-PAS-VJU-Webhook-Dispatcher/1.0")
                        .timeout(Duration.ofSeconds(4))
                        .POST(HttpRequest.BodyPublishers.ofString(jsonPayload, StandardCharsets.UTF_8))
                        .build();

                HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
                statusCode = response.statusCode();
                responseBody = response.body();
                success = statusCode >= 200 && statusCode < 300;
            }
        } catch (Exception ex) {
            log.warn("Webhook dispatch error to {}: {}", sub.getTargetUrl(), ex.getMessage());
            statusCode = 504;
            responseBody = "Dispatch Blocked or Failed: " + ex.getMessage();
            success = false;
        }

        int duration = (int) (System.currentTimeMillis() - start);
        WebhookDeliveryLog deliveryLog = new WebhookDeliveryLog(
                sub, eventType, jsonPayload, statusCode, responseBody, duration, success
```

**Delivery response returned to managers** — `backend/src/main/java/com/uav/platform/modules/webhook/mapper/WebhookMapper.java:37-49`

Stored response body is exposed in log DTO.

```java
    public static WebhookDeliveryLogResponse toDeliveryLogResponse(WebhookDeliveryLog log) {
        return new WebhookDeliveryLogResponse(
            log.getId(),
            log.getSubscription() != null ? log.getSubscription().getId() : null,
            log.getSubscription() != null ? log.getSubscription().getName() : "N/A",
            log.getEventType(),
            log.getPayload(),
            log.getResponseStatusCode(),
            log.getResponseBody(),
            log.getDeliveryDurationMs(),
            log.getIsSuccess(),
            log.getRetryCount(),
            log.getAttemptedAt()
```

Limitations:
- No network request made. Sensitive internal IPv6 service reachability is deployment-dependent.

#### Dataflow

A supplied targetUrl is saved as a subscription. URL validation blocks selected hostnames and IPv4 ranges. Delivery checks InetAddress locality predicates, but these do not reject IPv6 unique-local addresses in fc00::/7. The backend sends an HTTP POST to the accepted address and stores the response, which webhook managers can retrieve through the logs endpoint.

**Webhook manager supplies destination** — `backend/src/main/java/com/uav/platform/modules/webhook/controller/WebhookController.java:33-37`

A USER_MANAGE holder/admin supplies targetUrl to subscription service.

```java
    @PostMapping("/subscriptions")
    @PreAuthorize("@permissionService.has(authentication, 'USER_MANAGE') or hasAnyAuthority('ROLE_ADMIN', 'ADMIN')")
    public ResponseEntity<WebhookSubscriptionResponse> createSubscription(@Valid @RequestBody WebhookSubscriptionRequest request) {
        return ResponseEntity.ok(webhookService.createSubscription(request));
    }
```

**Destination passes textual guard** — `backend/src/main/java/com/uav/platform/modules/webhook/service/impl/IWebhookService.java:71-75`

Subscription stores URL after hostname/IPv4 checks.

```java
    @Override
    public WebhookSubscriptionResponse createSubscription(String name, String targetUrl, String secretKey, String eventsSubscribed) {
        validateSafeWebhookUrl(targetUrl);
        WebhookSubscription sub = new WebhookSubscription(name, targetUrl.trim(), secretKey, eventsSubscribed);
        return WebhookMapper.toSubscriptionResponse(subscriptionRepository.save(sub));
```

**Textual range guard omits IPv6 ULA** — `backend/src/main/java/com/uav/platform/modules/webhook/service/impl/IWebhookService.java:99-104`

No fc00::/7 prefix check rejects unique-local IPv6 literals.

```java
                || host.endsWith(".internal") || host.endsWith(".local")) {
            throw new SystemException("Webhook targetUrl cannot target internal, loopback, or metadata hosts", org.springframework.http.HttpStatus.BAD_REQUEST, "UNSAFE_WEBHOOK_URL");
        }
        if (host.startsWith("10.") || host.startsWith("192.168.") || host.startsWith("169.254.") || host.startsWith("127.")
                || host.matches("^172\\.(1[6-9]|2[0-9]|3[0-1])\\..*")) {
            throw new SystemException("Webhook targetUrl cannot target private network IP ranges", org.springframework.http.HttpStatus.BAD_REQUEST, "UNSAFE_WEBHOOK_URL");
```

**Resolved-address guard and HTTP connection** — `backend/src/main/java/com/uav/platform/modules/webhook/service/impl/IWebhookService.java:168-193`

InetAddress predicates omit IPv6 unique-local range; client sends request and reads response.

```java
                }
                HttpRequest request = HttpRequest.newBuilder()
                        .uri(uri)
                        .header("Content-Type", "application/json")
                        .header("X-Signature-SHA256", signature)
                        .header("X-Event-Type", eventType)
                        .header("User-Agent", "UAV-PAS-VJU-Webhook-Dispatcher/1.0")
                        .timeout(Duration.ofSeconds(4))
                        .POST(HttpRequest.BodyPublishers.ofString(jsonPayload, StandardCharsets.UTF_8))
                        .build();

                HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
                statusCode = response.statusCode();
                responseBody = response.body();
                success = statusCode >= 200 && statusCode < 300;
            }
        } catch (Exception ex) {
            log.warn("Webhook dispatch error to {}: {}", sub.getTargetUrl(), ex.getMessage());
            statusCode = 504;
            responseBody = "Dispatch Blocked or Failed: " + ex.getMessage();
            success = false;
        }

        int duration = (int) (System.currentTimeMillis() - start);
        WebhookDeliveryLog deliveryLog = new WebhookDeliveryLog(
                sub, eventType, jsonPayload, statusCode, responseBody, duration, success
```

**Delivery response returned to managers** — `backend/src/main/java/com/uav/platform/modules/webhook/mapper/WebhookMapper.java:37-49`

Stored response body is exposed in log DTO.

```java
    public static WebhookDeliveryLogResponse toDeliveryLogResponse(WebhookDeliveryLog log) {
        return new WebhookDeliveryLogResponse(
            log.getId(),
            log.getSubscription() != null ? log.getSubscription().getId() : null,
            log.getSubscription() != null ? log.getSubscription().getName() : "N/A",
            log.getEventType(),
            log.getPayload(),
            log.getResponseStatusCode(),
            log.getResponseBody(),
            log.getDeliveryDurationMs(),
            log.getIsSuccess(),
            log.getRetryCount(),
            log.getAttemptedAt()
```

#### Reachability

A user allowed to manage webhook subscriptions, including USER_MANAGE holders or administrators, who lacks direct access to backend-private network services. Requires backend connectivity to the selected IPv6 service.

Limitations:
- Webhook management is privileged, redirects are disabled, and connection/request timeouts are present. Several IPv4 private ranges and local address classes are blocked. No network requests were made; exploit impact requires a reachable internal IPv6 service.

#### Severity

**Low** — A privileged webhook manager can cross the backend network boundary only where internal IPv6 ULA services are reachable. Redirects/timeouts constrain requests and no real deployment reachability is established.

Reachable sensitive internal IPv6 services or less privileged subscription writers would raise severity; complete destination validation and pinned connections remove the path.

#### Remediation

Reject all non-public destination ranges explicitly, including IPv6 fc00::/7. Validate every resolved address and ensure the outbound connection uses an approved address. Apply network-level egress restrictions as an additional boundary.

Tests:
- Reject IPv6 ULA, mixed public/private DNS answers, mapped/private IPv4 and redirects.
- Verify outbound connection uses only validated IP without DNS re-resolution.

## Reviewed Surfaces

| Surface | Risk Area | Outcome | Notes |
| --- | --- | --- | --- |
| Independent baseline source audit | Payment authority, resource ownership and outbound destinations | Reported | Independent offline review completed; all four candidates validated once and retained with calibrated severity. Follow-up remediation verified on frozen canonical product, see artifacts/canonical-followup-verification.md. No complete repository or post-refactor audit claimed. |
| SAR telemetry ownership before safety side effects | Cross-mission operational integrity | Reported | Parent source validation confirms baseline candidate; remediation queued in Task4. Follow-up Task4 remediation and regression now verified on frozen725 canonical snapshot; later refactor remains outside this audit. See artifacts/canonical-followup-verification.md. |
| Webhook destination validation and log response boundary | Privileged SSRF | Reported | Source-validated ULA gap. Baseline severity medium recalibrated low due privileged prerequisite and deployment-dependent network reachability; original retained. Follow-up Task4 remediation and regression now verified on frozen725 canonical snapshot; later refactor remains outside this audit. See artifacts/canonical-followup-verification.md. |
| Maintenance, UAV, station and mission resource lifecycle | Resource mutation authorization and lifecycle invariants | No issue found | \[{"question":"Can ordinary mission authority reach maintenance or direct UAV/station mutations?","resolution":"No bypass established. MaintenanceController has a class-level UAV_MANAGE guard; every UAV mutation requires UAV_MANAGE; station mutations require STATION_MANAGE. SecurityConfig enables method security and authenticates remaining routes. IPermissionService resolves permissions from the current enabled, unlocked user with explicit overrides and role templates. Globally authorized resource management is intentional authority, not an ownership escalation.","evidence":\["backend/src/main/java/com/uav/platform/modules/maintenance/controller/MaintenanceController.java:20-53","backend/src/main/java/com/uav/platform/modules/uav/controller/UavController.java:29-42","backend/src/main/java/com/uav/platform/modules/station/controller/StationController.java:33-48","backend/src/main/java/com/uav/platform/modules/user/service/impl/IPermissionService.java:62-72","backend/src/main/java/com/uav/platform/security/SecurityConfig.java:21-24"\]},{"question":"Can maintenance lifecycle changes bypass mission ownership, availability, or concurrent assignment protection?","resolution":"No validated bypass. Repair writes lock and refresh the UAV before locking the repair order or schedule. Starting and completing repairs reject assigned/in-use UAVs and every nonterminal mission reference. Mission assignment uses the same pessimistic UAV lock and refresh, verifies availability and exclusive nonterminal ownership, and routes status changes through the in-progress-repair guard. Repair cancellation deliberately retains UAV maintenance status. OPEN orders intentionally permit dispatch; the tests explicitly document this behavior.","evidence":\["backend/src/main/java/com/uav/platform/modules/maintenance/service/MaintenanceService.java:116-159","backend/src/main/java/com/uav/platform/modules/uav/service/impl/IUavService.java:136-156","backend/src/main/java/com/uav/platform/modules/mission/service/impl/IMissionService.java:248-265","backend/src/test/java/com/uav/platform/modules/maintenance/MaintenancePlanningIntegrationTest.java:116-172","backend/src/test/java/com/uav/platform/modules/maintenance/MaintenancePlanningIntegrationTest.java:260-268"\]},{"question":"Can supplied IDs or stale versions modify another customer's assignment, repair schedule, or reserved equipment?","resolution":"No validated bypass. Mission mutations acquire a mission write lock, refresh it, and enforce customer/operator visibility or MISSION_VIEW_ALL. Dispatch routes require their corresponding assignment permissions. Resource redispatch checks mission versions, reservation ownership, resource status, station compatibility, and quantity; it resets operator acceptance. Repair order creation rejects schedules belonging to another UAV. Repair edits require the persisted version and reject terminal orders. Direct inventory release preserves the aggregate quantity owned by active mission reservations.","evidence":\["backend/src/main/java/com/uav/platform/modules/mission/controller/MissionController.java:94-160","backend/src/main/java/com/uav/platform/modules/mission/service/impl/IMissionService.java:453-503","backend/src/main/java/com/uav/platform/modules/mission/service/impl/IMissionService.java:526-536","backend/src/main/java/com/uav/platform/modules/mission/service/impl/IMissionService.java:767-776","backend/src/main/java/com/uav/platform/modules/mission/service/impl/IMissionService.java:871-881","backend/src/main/java/com/uav/platform/modules/maintenance/service/MaintenanceService.java:97-113","backend/src/main/java/com/uav/platform/modules/inventory/service/impl/IInventoryService.java:97-102"\]},{"question":"Are station lifecycle races or inventory arithmetic a demonstrated security boundary violation?","resolution":"Not established. Station updates use no explicit lock shared with dispatch/preflight station reads, so concurrent station deactivation can leave a mission referencing an inactive station. The demonstrated writer requires global STATION_MANAGE; no lesser-authority path or forbidden cross-customer mutation was found. Treat this as a functional lifecycle policy question, not a security finding. Equipment arithmetic uses int, but the migration adds nonnegative and balance constraints; persistent overflow corruption was not established.","evidence":\["backend/src/main/java/com/uav/platform/modules/station/service/impl/IStationService.java:47-58","backend/src/main/java/com/uav/platform/modules/mission/service/impl/IMissionService.java:572-584","backend/src/main/java/com/uav/platform/modules/inventory/entity/Equipment.java:45-48","backend/src/main/resources/db/migration/V3__indexing_and_constraints.sql:35"\]},{"question":"What policy, source timing, and verification limitations apply?","resolution":"The offline policy resolver returned no SECURITY.md for maintenance, UAV, station, mission, inventory, user, security, SAR, or maintenance tests. Review was read-only and offline; no application or tests were executed. Existing tests were inspected as counterevidence, not reported as passing. No credential/private-key evidence was present in the fully inspected files; synthetic test password placeholders are not credentials. Current-source checkpoint: 2026-10-17T02:03:58.730609Z. Concurrent mission/inventory implementation means conclusions apply to the observed source, not subsequent edits.","source_hashes":{"backend/src/main/java/com/uav/platform/modules/maintenance/service/MaintenanceService.java":"2d0f86ac7de509c705d7dccad5a879ec2843546e4f44b88410ea12f51d0c5aa1","backend/src/main/java/com/uav/platform/modules/uav/service/impl/IUavService.java":"e013c7edeef23a52576055a43dec9fbea021be5cf459ce5adafbe0570b4d000d","backend/src/main/java/com/uav/platform/modules/station/service/impl/IStationService.java":"9b6971c0c2a58c562b9e96b16e334bd75cab1ee67c613cfc733f78efea9c8fab","backend/src/main/java/com/uav/platform/modules/mission/service/impl/IMissionService.java":"cfa05a5860482334cdc991c07cb9c08ad109b1e8db75977df4db20cdf4cc4e0c","backend/src/main/java/com/uav/platform/modules/inventory/service/impl/IInventoryService.java":"c39fe160ee2094cfad96d1b8b59982a0b855a95720dc9fcaa9aab307f42cc00b"}}\] |
| Payment callback provider authority | Financial integrity | Reported | Genuine baseline finding independently reproduced; Task2 current working-tree fix and regression verified. Original payload retained, not a false positive. |
| Embedded payment verification defaults | Credential disclosure and forged financial authority | Reported | Genuine baseline finding; current working-tree fallback removed. Original high severity calibrated medium because deployment retaining fallback not established; original preserved. No credential use. |

## Open Questions And Follow Up

- Whole-repository security review remains incomplete:83 deduplicated fully reviewed source files vs host estimate1677 files. Final newly authorized backend refactor has not received a complete independent security audit.
- No real HTTPS staging, cross-domain SSO, productionsecret overrides/privateIPv6reachability, provider/government/hardware verification.
- Root and legacy production dependency audits0; full dev-toolchain audit retains5HIGH per tree; no fixedrelease established.
