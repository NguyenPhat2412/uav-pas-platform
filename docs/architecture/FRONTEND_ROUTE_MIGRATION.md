# Đường dẫn frontend sau hợp nhất

Các URL dưới đây dùng cùng origin `http://localhost:3100`. Website giữ URL cũ; các khu vực chuyển từ cổng riêng sang prefix.

| Khu vực | Đường dẫn cũ | Đường dẫn mới | Mã trang |
|---|---|---|---|
| operations | `/login` | `/operations/login` | `src/features/auth/pages/operations/login.tsx` |
| operations | `/assigned-missions` | `/operations/assigned-missions` | `src/features/missions/pages/operations/assigned-missions.tsx` |
| operations | `/audit` | `/operations/audit` | `src/features/audit/pages/operations/audit.tsx` |
| operations | `/dispatch/missions` | `/operations/dispatch/missions` | `src/features/missions/pages/operations/dispatch-missions.tsx` |
| operations | `/inventory` | `/operations/inventory` | `src/features/inventory/pages/operations/inventory.tsx` |
| operations | `/maintenance` | `/operations/maintenance` | `src/features/maintenance/pages/operations/maintenance.tsx` |
| operations | `/media` | `/operations/media` | `src/features/media/pages/operations/media.tsx` |
| operations | `/missions/[id]` | `/operations/missions/[id]` | `src/features/missions/pages/operations/missions-[id].tsx` |
| operations | `/notifications` | `/operations/notifications` | `src/features/notifications/pages/operations/notifications.tsx` |
| operations | `/overview` | `/operations/overview` | `src/features/dashboard/pages/operations/overview.tsx` |
| operations | `/sar-cockpit` | `/operations/sar-cockpit` | `src/features/sar/pages/operations/sar-cockpit.tsx` |
| operations | `/stations` | `/operations/stations` | `src/features/stations/pages/operations/stations.tsx` |
| operations | `/uavs` | `/operations/uavs` | `src/features/uavs/pages/operations/uavs.tsx` |
| operations | `/admin/missions` | `/operations/admin/missions` | `src/features/navigation/pages/operations/admin-missions.tsx` |
| operations | `/operations` | `/operations/operations` | `src/features/navigation/pages/operations/operations.tsx` |
| operations | `/operator/missions` | `/operations/operator/missions` | `src/features/navigation/pages/operations/operator-missions.tsx` |
| operations | `/` | `/operations/` | `src/features/navigation/pages/operations/index.tsx` |
| admin | `/login` | `/admin/login` | `src/features/auth/pages/admin/login.tsx` |
| admin | `/access-control` | `/admin/access-control` | `src/features/access/pages/admin/access-control.tsx` |
| admin | `/audit-logs` | `/admin/audit-logs` | `src/features/audit/pages/admin/audit-logs.tsx` |
| admin | `/billing` | `/admin/billing` | `src/features/billing/pages/admin/billing.tsx` |
| admin | `/dashboard` | `/admin/dashboard` | `src/features/dashboard/pages/admin/dashboard.tsx` |
| admin | `/permissions` | `/admin/permissions` | `src/features/access/pages/admin/permissions.tsx` |
| admin | `/reports` | `/admin/reports` | `src/features/reports/pages/admin/reports.tsx` |
| admin | `/role-templates` | `/admin/role-templates` | `src/features/access/pages/admin/role-templates.tsx` |
| admin | `/settings` | `/admin/settings` | `src/features/settings/pages/admin/settings.tsx` |
| admin | `/users/[id]` | `/admin/users/[id]` | `src/features/users/pages/admin/users-[id].tsx` |
| admin | `/users` | `/admin/users` | `src/features/users/pages/admin/users.tsx` |
| admin | `/webhooks` | `/admin/webhooks` | `src/features/webhooks/pages/admin/webhooks.tsx` |
| admin | `/` | `/admin/` | `src/features/navigation/pages/admin/index.tsx` |
| customer | `/login` | `/customer/login` | `src/features/auth/pages/customer/login.tsx` |
| customer | `/register` | `/customer/register` | `src/features/auth/pages/customer/register.tsx` |
| customer | `/billing` | `/customer/billing` | `src/features/billing/pages/customer/billing.tsx` |
| customer | `/dashboard` | `/customer/dashboard` | `src/features/dashboard/pages/customer/dashboard.tsx` |
| customer | `/missions/[id]/edit` | `/customer/missions/[id]/edit` | `src/features/missions/pages/customer/missions-[id]-edit.tsx` |
| customer | `/missions/[id]` | `/customer/missions/[id]` | `src/features/missions/pages/customer/missions-[id].tsx` |
| customer | `/missions/create` | `/customer/missions/create` | `src/features/missions/pages/customer/missions-create.tsx` |
| customer | `/missions` | `/customer/missions` | `src/features/missions/pages/customer/missions.tsx` |
| customer | `/notifications` | `/customer/notifications` | `src/features/notifications/pages/customer/notifications.tsx` |
| customer | `/profile` | `/customer/profile` | `src/features/profile/pages/customer/profile.tsx` |
| customer | `/services` | `/customer/services` | `src/features/catalog/pages/customer/services.tsx` |
| customer | `/` | `/customer/` | `src/features/navigation/pages/customer/index.tsx` |
| web | `/about` | `/about` | `src/features/marketing/pages/web/about.tsx` |
| web | `/contact` | `/contact` | `src/features/marketing/pages/web/contact.tsx` |
| web | `/faq` | `/faq` | `src/features/marketing/pages/web/faq.tsx` |
| web | `/how-it-works` | `/how-it-works` | `src/features/marketing/pages/web/how-it-works.tsx` |
| web | `/login` | `/login` | `src/features/marketing/pages/web/login.tsx` |
| web | `/` | `/` | `src/features/marketing/pages/web/index.tsx` |
| web | `/pricing` | `/pricing` | `src/features/marketing/pages/web/pricing.tsx` |
| web | `/privacy` | `/privacy` | `src/features/marketing/pages/web/privacy.tsx` |
| web | `/register` | `/register` | `src/features/marketing/pages/web/register.tsx` |
| web | `/services/[slug]` | `/services/[slug]` | `src/features/catalog/pages/web/services-[slug].tsx` |
| web | `/services` | `/services` | `src/features/catalog/pages/web/services.tsx` |
| web | `/solutions/[slug]` | `/solutions/[slug]` | `src/features/marketing/pages/web/solutions-[slug].tsx` |
| web | `/solutions` | `/solutions` | `src/features/marketing/pages/web/solutions.tsx` |
| web | `/terms` | `/terms` | `src/features/marketing/pages/web/terms.tsx` |
