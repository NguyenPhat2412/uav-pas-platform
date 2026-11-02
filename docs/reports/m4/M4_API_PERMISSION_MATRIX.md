# M4 API and Permission Matrix

| Capability | Endpoint | Required backend permission | Customer UI |
|---|---|---|---|
| Current user | `GET /api/v1/auth/me` | authenticated | yes |
| Permissions | `GET /api/v1/permissions/me` | authenticated | session gate |
| Service catalog | `GET /api/v1/uav-services` | `MISSION_VIEW` | yes |
| Mission list/detail | `GET /api/v1/missions`, `/{id}` | `MISSION_VIEW` + owner enforcement | yes |
| Availability | `GET /api/v1/missions/availability` | `MISSION_VIEW` | review hint only |
| Create | `POST /api/v1/missions` | `MISSION_CREATE` | yes |
| Draft update | `PATCH /api/v1/missions/{id}` | `MISSION_UPDATE` + owner/status enforcement | service method ready; UI deferred |
| Submit | `POST /api/v1/missions/{id}/submit` | `MISSION_UPDATE` + owner/status enforcement | DRAFT only |
| Cancel | `POST /api/v1/missions/{id}/cancel` | `MISSION_CANCEL` + owner/status enforcement | PENDING only |
| Timeline | `GET /api/v1/missions/{id}/timeline` | `MISSION_TIMELINE_VIEW` + owner | yes |
| Mission media | `GET /api/v1/missions/{id}/media` | `MISSION_MEDIA_VIEW` + owner | metadata |
| Signed download | `GET /api/v1/media/{id}/download-url` | `MEDIA_READ` + linked mission access | yes, server URL only |

Customer must never receive assignment, inventory, command, global audit, or permission-management controls.
