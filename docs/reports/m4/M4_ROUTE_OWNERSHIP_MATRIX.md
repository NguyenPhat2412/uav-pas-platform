# M4 Route Ownership Matrix

| Route | Owner | Backend/API | Status |
|---|---|---|---|
| `/login`, `/register` | Customer | `/api/v1/auth/*` | Implemented |
| `/dashboard` | Customer | services + owner-scoped missions | Implemented, aggregate is client-side from authorized list |
| `/services` | Customer | `GET /api/v1/uav-services` | Implemented; active fields only |
| `/missions` | Customer | `GET /api/v1/missions` | Implemented; backend owns filtering |
| `/missions/create` | Customer | availability + `POST /api/v1/missions` | Implemented |
| `/missions/[id]` | Customer | get, submit, cancel, timeline, media, signed download | Implemented with backend authorization |
| `/profile` | Customer | `GET /api/v1/auth/me` | Read-only; update backend contract missing |
| Operations assignment/status controls | Operations | internal mission endpoints | Not copied |
| Admin users/access/audit | Admin | admin permission endpoints | Not copied |
| AI/payments/notifications | Deferred | no verified contract | Omitted |
