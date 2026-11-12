# Đường dẫn frontend sau hợp nhất

Cột cuối trỏ tới file route hiện tại trong `src/app` (cập nhật 31/10/2026; thư mục `src/features/*/pages` của đợt hợp nhất 18/10 không còn). Các URL dưới đây dùng cùng origin `http://localhost:3100`. Website giữ URL cũ; các khu vực chuyển từ cổng riêng sang prefix.

| Khu vực | Đường dẫn cũ | Đường dẫn mới | Route hiện tại |
|---|---|---|---|
| operations | `/login` | `/operations/login` | `frontend/src/app/(operations)/operations/(auth)/login/page.tsx` |
| operations | `/assigned-missions` | `/operations/assigned-missions` | `frontend/src/app/(operations)/operations/(portal)/assigned-missions/page.tsx` |
| operations | `/audit` | `/operations/audit` | `frontend/src/app/(operations)/operations/(portal)/audit/page.tsx` |
| operations | `/dispatch/missions` | `/operations/dispatch/missions` | `frontend/src/app/(operations)/operations/(portal)/dispatch/missions/page.tsx` |
| operations | `/inventory` | `/operations/inventory` | `frontend/src/app/(operations)/operations/(portal)/inventory/page.tsx` |
| operations | `/maintenance` | `/operations/maintenance` | `frontend/src/app/(operations)/operations/(portal)/maintenance/page.tsx` |
| operations | `/media` | `/operations/media` | `frontend/src/app/(operations)/operations/(portal)/media/page.tsx` |
| operations | `/missions/[id]` | `/operations/missions/[id]` | `frontend/src/app/(operations)/operations/(portal)/missions/[id]/page.tsx` |
| operations | `/notifications` | `/operations/notifications` | `frontend/src/app/(operations)/operations/(portal)/notifications/page.tsx` |
| operations | `/overview` | `/operations/overview` | `frontend/src/app/(operations)/operations/(portal)/overview/page.tsx` |
| operations | `/sar-cockpit` | `/operations/sar-cockpit` | `frontend/src/app/(operations)/operations/(portal)/sar-cockpit/page.tsx` |
| operations | `/stations` | `/operations/stations` | `frontend/src/app/(operations)/operations/(portal)/stations/page.tsx` |
| operations | `/uavs` | `/operations/uavs` | `frontend/src/app/(operations)/operations/(portal)/uavs/page.tsx` |
| operations | `/admin/missions` | `/operations/admin/missions` | `frontend/src/app/(operations)/operations/admin/missions/page.tsx` |
| operations | `/operations` | `/operations/operations` | `frontend/src/app/(operations)/operations/operations/page.tsx` |
| operations | `/operator/missions` | `/operations/operator/missions` | `frontend/src/app/(operations)/operations/operator/missions/page.tsx` |
| operations | `/` | `/operations/` | `frontend/src/app/(operations)/operations/page.tsx` |
| admin | `/login` | `/admin/login` | `frontend/src/app/(admin)/admin/(auth)/login/page.tsx` |
| admin | `/access-control` | `/admin/access-control` | `frontend/src/app/(admin)/admin/(portal)/access-control/page.tsx` |
| admin | `/audit-logs` | `/admin/audit-logs` | `frontend/src/app/(admin)/admin/(portal)/audit-logs/page.tsx` |
| admin | `/billing` | `/admin/billing` | `frontend/src/app/(admin)/admin/(portal)/billing/page.tsx` |
| admin | `/dashboard` | `/admin/dashboard` | `frontend/src/app/(admin)/admin/(portal)/dashboard/page.tsx` |
| admin | `/permissions` | `/admin/permissions` | `frontend/src/app/(admin)/admin/(portal)/permissions/page.tsx` |
| admin | `/reports` | `/admin/reports` | `frontend/src/app/(admin)/admin/(portal)/reports/page.tsx` |
| admin | `/role-templates` | `/admin/role-templates` | `frontend/src/app/(admin)/admin/(portal)/role-templates/page.tsx` |
| admin | `/settings` | `/admin/settings` | `frontend/src/app/(admin)/admin/(portal)/settings/page.tsx` |
| admin | `/users/[id]` | `/admin/users/[id]` | `frontend/src/app/(admin)/admin/(portal)/users/[id]/page.tsx` |
| admin | `/users` | `/admin/users` | `frontend/src/app/(admin)/admin/(portal)/users/page.tsx` |
| admin | `/webhooks` | `/admin/webhooks` | `frontend/src/app/(admin)/admin/(portal)/webhooks/page.tsx` |
| admin | `/` | `/admin/` | `frontend/src/app/(admin)/admin/page.tsx` |
| customer | `/login` | `/customer/login` | `frontend/src/app/(customer)/customer/(auth)/login/page.tsx` |
| customer | `/register` | `/customer/register` | `frontend/src/app/(customer)/customer/(auth)/register/page.tsx` |
| customer | `/billing` | `/customer/billing` | `frontend/src/app/(customer)/customer/(portal)/billing/page.tsx` |
| customer | `/dashboard` | `/customer/dashboard` | `frontend/src/app/(customer)/customer/(portal)/dashboard/page.tsx` |
| customer | `/missions/[id]/edit` | `/customer/missions/[id]/edit` | `frontend/src/app/(customer)/customer/(portal)/missions/[id]/edit/page.tsx` |
| customer | `/missions/[id]` | `/customer/missions/[id]` | `frontend/src/app/(customer)/customer/(portal)/missions/[id]/page.tsx` |
| customer | `/missions/create` | `/customer/missions/create` | `frontend/src/app/(customer)/customer/(portal)/missions/create/page.tsx` |
| customer | `/missions` | `/customer/missions` | `frontend/src/app/(customer)/customer/(portal)/missions/page.tsx` |
| customer | `/notifications` | `/customer/notifications` | `frontend/src/app/(customer)/customer/(portal)/notifications/page.tsx` |
| customer | `/profile` | `/customer/profile` | `frontend/src/app/(customer)/customer/(portal)/profile/page.tsx` |
| customer | `/services` | `/customer/services` | `frontend/src/app/(customer)/customer/(portal)/services/page.tsx` |
| customer | `/` | `/customer/` | `frontend/src/app/(customer)/customer/page.tsx` |
| web | `/about` | `/about` | `frontend/src/app/(public)/about/page.tsx` |
| web | `/contact` | `/contact` | `frontend/src/app/(public)/contact/page.tsx` |
| web | `/faq` | `/faq` | `frontend/src/app/(public)/faq/page.tsx` |
| web | `/how-it-works` | `/how-it-works` | `frontend/src/app/(public)/how-it-works/page.tsx` |
| web | `/login` | `/login` | `frontend/src/app/(public)/login/page.tsx` |
| web | `/` | `/` | `frontend/src/app/(public)/page.tsx` |
| web | `/pricing` | `/pricing` | `frontend/src/app/(public)/pricing/page.tsx` |
| web | `/privacy` | `/privacy` | `frontend/src/app/(public)/privacy/page.tsx` |
| web | `/register` | `/register` | `frontend/src/app/(public)/register/page.tsx` |
| web | `/services/[slug]` | `/services/[slug]` | `frontend/src/app/(public)/services/[slug]/page.tsx` |
| web | `/services` | `/services` | `frontend/src/app/(public)/services/page.tsx` |
| web | `/solutions/[slug]` | `/solutions/[slug]` | `frontend/src/app/(public)/solutions/[slug]/page.tsx` |
| web | `/solutions` | `/solutions` | `frontend/src/app/(public)/solutions/page.tsx` |
| web | `/terms` | `/terms` | `frontend/src/app/(public)/terms/page.tsx` |
