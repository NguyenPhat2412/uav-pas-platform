# API Permission Matrix

Source of truth: controller annotations and service checks at current `HEAD` `6ecc85111a28e53679b2a6d8ac7ec93730d80be4`. `docs/handoff/final/openapi.json` is a sanitized 64-path artifact; it matches the fresh current-HEAD export at `evidence/infra/openapi-8093.json` after normalizing the server URL. SpringDoc does not currently emit the method-level `@PreAuthorize` expressions as per-operation `security` requirements (only the top-level bearer scheme is present); the permission column below therefore comes from controllers, not from the generated contract.

Unless noted, unauthenticated requests are `401`, a failed `@PreAuthorize` is `403`, validation is `400`, missing records are `404`, and domain conflicts are `409` through `GlobalExceptionHandler`. Request/response names are the current DTOs.

## Authentication and identity

| Method | Path | Permission / scope | Request → response | Important errors |
|---|---|---|---|---|
| POST | `/api/v1/auth/register` | public | `RegisterRequest` → `UserResponse` | 400 validation; 409 duplicate email/username/phone |
| POST | `/api/v1/auth/login` | public | `LoginRequest` → `AuthResponse` | 401 invalid/locked; 400 inactive/validation |
| GET | `/api/v1/auth/zalo/url` | public | none → URL map | provider/config errors |
| POST | `/api/v1/auth/zalo/callback` | public | `ZaloLoginRequest` → `AuthResponse` | 400 provider failure/inactive |
| POST | `/api/v1/auth/refresh` | public token exchange | `RefreshTokenRequest` → `AuthResponse` | 400 missing; 401 invalid/expired; 400 inactive |
| POST | `/api/v1/auth/logout` | authenticated filter is not required; invalidates supplied access/refresh token | optional `LogoutRequest` → message map | no-op for absent token |
| GET | `/api/v1/auth/me` | authenticated | none → `UserResponse` | 401; 404 user |
| GET | `/api/v1/users` | `USER_READ` | page/sort/filter query → `PageResponse<UserResponse>` | 401/403; sort/page sanitized |
| GET | `/api/v1/users/{id}` | `USER_READ` | none → `UserResponse` | 404 |
| POST | `/api/v1/users/{id}/lock` | `USER_MANAGE`; last-manager guard | none → 204 | 403; 404; 409 last manager |
| POST | `/api/v1/users/{id}/unlock` | `USER_MANAGE` | none → 204 | 403/404 |
| PUT | `/api/v1/users/{id}/role` | `USER_MANAGE`; last-manager guard | `RoleUpdateRequest` → `UserResponse` | 400; 403/404; 409 last manager |

## Permission and role templates

| Method | Path | Permission / scope | Request → response | Important errors |
|---|---|---|---|---|
| GET | `/api/v1/permissions/me` | authenticated; evaluates all current codes | none → `List<String>` | 401 |
| GET | `/api/v1/permissions` | `PERMISSION_MANAGE` | none → `List<PermissionResponse>` | 403 |
| GET | `/api/v1/permissions/users/{userId}` | `PERMISSION_MANAGE` | none → `List<UserPermissionResponse>` | 403/404 |
| PUT | `/api/v1/permissions/users/{userId}/{code}` | `PERMISSION_MANAGE`; last-manager guard | `granted` query → 204 | 400 invalid enum; 403; 404/409 |
| DELETE | `/api/v1/permissions/users/{userId}/{code}` | `PERMISSION_MANAGE`; reset-to-template; last-manager guard | none → 204 | 400 invalid enum; 403; 404/409 |
| GET | `/api/v1/role-templates` | `PERMISSION_MANAGE` | none → `List<RoleTemplateResponse>` | 403 |
| PUT | `/api/v1/role-templates/{role}/permissions/{code}` | `PERMISSION_MANAGE`; last-manager guard | `granted` query → 204 | 400 enum; 403/409 |

## Phase-1 resource catalog

| Method | Path | Permission / scope | Request → response | Important errors |
|---|---|---|---|---|
| GET | `/api/v1/stations` | `STATION_READ` | page/size → `PageResponse<StationResponse>` | 403 |
| GET | `/api/v1/stations/{id}` | `STATION_READ` | none → `StationResponse` | 403/404 |
| POST | `/api/v1/stations` | `STATION_MANAGE` | `StationRequest` → 201 `StationResponse` | 400; 403; 409 duplicate code |
| PUT | `/api/v1/stations/{id}` | `STATION_MANAGE` | `StationRequest` → `StationResponse` | 400/403/404 |
| DELETE | `/api/v1/stations/{id}` | `STATION_MANAGE` | none → 204 | 403/404; FK conflicts depend on DB |
| GET | `/api/v1/uavs` | `UAV_READ` | page/size → `PageResponse<UavResponse>` | 403 |
| GET | `/api/v1/uavs/{id}` | `UAV_READ` | none → `UavResponse` | 403/404 |
| POST | `/api/v1/uavs` | `UAV_MANAGE` | `UavRequest` → 201 `UavResponse` | 400; 403; 409 duplicate serial |
| PUT | `/api/v1/uavs/{id}` | `UAV_MANAGE` | `UavRequest` → `UavResponse` | 400/403/404 |
| PUT | `/api/v1/uavs/{id}/station/{stationId}` | `UAV_MANAGE` | none → `UavResponse` | 403/404; status side effect is current implementation |
| PUT | `/api/v1/uavs/{id}/status` | `UAV_MANAGE` | `status`, optional `reason` → `UavResponse` | 403/404 |
| POST | `/api/v1/uavs/{id}/maintenance` | `UAV_MANAGE` | none → `UavResponse` | 403/404 |
| GET | `/api/v1/uavs/{id}/history` | `UAV_READ` | page/size → `PageResponse<UavStatusHistoryResponse>` | 403/404 |
| GET | `/api/v1/inventory/equipment` | `INVENTORY_READ` | page/size → `PageResponse<EquipmentResponse>` | 403 |
| GET | `/api/v1/inventory/equipment/{id}` | `INVENTORY_READ` | none → `EquipmentResponse` | 403/404 |
| GET | `/api/v1/inventory/equipment/history` | `INVENTORY_READ` | page/size → `PageResponse<InventoryMovementResponse>` | 403 |
| POST | `/api/v1/inventory/equipment` | `INVENTORY_MANAGE` | `EquipmentRequest` → 201 `EquipmentResponse` | 400; 403; 409 duplicate serial |
| PUT | `/api/v1/inventory/equipment/{id}` | `INVENTORY_MANAGE` | `EquipmentRequest` → `EquipmentResponse` | 400/403/404 |
| POST | `/api/v1/inventory/equipment/{id}/stock-in` | `INVENTORY_MANAGE` | `QuantityRequest` → `EquipmentResponse` | 400 non-positive; 403/404 |
| POST | `/api/v1/inventory/equipment/{id}/stock-out` | `INVENTORY_MANAGE` | `QuantityRequest` → `EquipmentResponse` | 400/403/404; 409 insufficient |
| POST | `/api/v1/inventory/equipment/{id}/reserve` | `INVENTORY_MANAGE` | `QuantityRequest` (optional requestId) → `EquipmentResponse` | 400/403/404; 409 insufficient/replay mismatch |
| POST | `/api/v1/inventory/equipment/{id}/release` | `INVENTORY_MANAGE` | `QuantityRequest` → `EquipmentResponse` | 400/403/404; 409 beyond reserved |
| POST | `/api/v1/inventory/equipment/{id}/transfer/{stationId}` | `INVENTORY_MANAGE` | `QuantityRequest` → `EquipmentResponse` | 400 same station/quantity; 403/404; 409 insufficient/replay mismatch |
| GET | `/api/v1/media` | `MEDIA_READ` plus linked-resource scope | page/size → `PageResponse<MediaAssetResponse>` | 403/404 visibility-filtered |
| POST | `/api/v1/media` | `MEDIA_MANAGE` plus linked-resource write scope | `MediaUploadRequest` → 201 `MediaAssetResponse` | 400 link/type; 403; 409 domain |
| GET | `/api/v1/media/{id}/upload-url` | `MEDIA_MANAGE` + uploader/resource write | none → `SignedMediaUrlResponse` | 403/404; 409 confirmed/linked |
| GET | `/api/v1/media/{id}/download-url` | `MEDIA_READ` + owner/resource scope + confirmed | none → `SignedMediaUrlResponse` | 403/404; 409 not confirmed |
| POST | `/api/v1/media/{id}/confirm` | `MEDIA_MANAGE` + owner/resource write | none → `MediaAssetResponse` | 403/404; 409 object/metadata |
| DELETE | `/api/v1/media/{id}` | `MEDIA_MANAGE` + owner/resource write | none → 204 | 403/404; 409 mission-attached |

## Mission and UAV service booking

| Method | Path | Permission / scope | Request → response | Important errors |
|---|---|---|---|---|
| GET | `/api/v1/uav-services` | `MISSION_VIEW` | none → active service list | 403 |
| POST | `/api/v1/uav-services` | `MISSION_CONFIRM` | `UavServiceRequest` → 201 `UavServiceResponse` | 400; 403; duplicate code currently `IllegalStateException` path |
| GET | `/api/v1/missions` | `MISSION_VIEW`; list is owner/operator filtered unless `MISSION_VIEW_ALL` | filter/page query → `PageResponse<MissionResponse>` | 403 |
| GET | `/api/v1/missions/availability` | `MISSION_VIEW` | start/end/resource query → `MissionAvailabilityResponse` | 403; invalid window returns conflict status in body |
| GET | `/api/v1/missions/{id}` | `MISSION_VIEW` + customer/operator/all scope | none → `MissionResponse` | 403/404 |
| POST | `/api/v1/missions` | `MISSION_CREATE` | `MissionCreateRequest` → 201 `MissionResponse` | 400; 403; 404 inactive service |
| PATCH | `/api/v1/missions/{id}` | `MISSION_UPDATE` + owner/operator/all scope | `MissionUpdateRequest` → `MissionResponse` | 400/403/404; 409 invalid state |
| POST | `/api/v1/missions/{id}/submit` | `MISSION_UPDATE` + scope | none → `MissionResponse` | 403/404; 409 invalid state |
| POST | `/api/v1/missions/{id}/cancel` | `MISSION_CANCEL` + scope | none → `MissionResponse` | 403/404; 409 invalid state |
| POST | `/api/v1/missions/{id}/assign-station` | `MISSION_ASSIGN_STATION` + scope | `ResourceAssignmentRequest` → `MissionResponse` | 403/404; 409 resource/state |
| POST | `/api/v1/missions/{id}/assign-uav` | `MISSION_ASSIGN_UAV` + scope | `ResourceAssignmentRequest` → `MissionResponse` | 403/404; 409 unavailable/time conflict |
| POST | `/api/v1/missions/{id}/assign-operator` | `MISSION_ASSIGN_OPERATOR` + scope | `ResourceAssignmentRequest` → `MissionResponse` | 403/404; 409 unavailable/time conflict |
| POST | `/api/v1/missions/{id}/reserve-equipment` | `MISSION_RESERVE_EQUIPMENT` + scope | `ResourceAssignmentRequest` → `MissionResponse` | 403/404; 409 inventory/state |
| POST | `/api/v1/missions/{id}/confirm` | `MISSION_CONFIRM` + scope | none → `MissionResponse` | 403/404; 409 invalid state |
| POST | `/api/v1/missions/{id}/reject` | `MISSION_REJECT` + scope | `reason` query → `MissionResponse` | 403/404; 409 invalid state |
| POST | `/api/v1/missions/{id}/ready` | `MISSION_STATUS_UPDATE` + scope | none → `MissionResponse` | 403/404; 409 missing resources/state |
| POST | `/api/v1/missions/{id}/start` | `MISSION_START` + assigned operator | none → `MissionResponse` | 403/404; 409 UAV/state |
| POST | `/api/v1/missions/{id}/accept` | `MISSION_STATUS_UPDATE` + assigned operator | none → `MissionResponse` | 403/404; 409 state |
| POST | `/api/v1/missions/{id}/report-conflict` | `MISSION_STATUS_UPDATE` + assigned operator | `note` query → `MissionResponse` | 403/404 |
| POST | `/api/v1/missions/{id}/complete` | `MISSION_COMPLETE` + assigned operator | `MissionCompletionRequest` → `MissionResponse` | 400/403/404; 409 invalid state |
| POST | `/api/v1/missions/{id}/fail` | `MISSION_STATUS_UPDATE` + assigned operator | `MissionFailureRequest` → `MissionResponse` | 400/403/404; 409 invalid state |
| GET | `/api/v1/missions/{id}/media` | `MISSION_MEDIA_VIEW` + mission visibility scope | none → `List<MissionMediaResponse>` | 403/404 |
| POST | `/api/v1/missions/{id}/media` | `MISSION_MEDIA_UPLOAD` + mission visibility scope | `MissionMediaRequest` → 201 `MissionMediaResponse` | 400/403/404; 409 unconfirmed/duplicate |
| POST | `/api/v1/missions/{id}/media/upload-url` | `MISSION_MEDIA_UPLOAD` + mission visibility scope | `MediaUploadRequest` → `SignedMediaUrlResponse` | 400/403/404 |
| POST | `/api/v1/missions/{id}/media/{mediaId}/confirm` | `MISSION_MEDIA_UPLOAD` + mission visibility scope | none → `MediaAssetResponse` | 403/404; 409 object/metadata |
| GET | `/api/v1/missions/{id}/timeline` | `MISSION_TIMELINE_VIEW` + mission visibility scope | none → `List<MissionEventResponse>` | 403/404 |

## Dashboard and audit

| Method | Path | Permission / scope | Request → response | Important errors |
|---|---|---|---|---|
| GET | `/api/v1/dashboard/summary` | `DASHBOARD_READ`; individual counts are further filtered by read permissions | none → `DashboardResponse` | 403 |
| GET | `/api/v1/dashboard/missions` | `DASHBOARD_MISSION`; customer scope unless `MISSION_VIEW_ALL` | none → `MissionDashboardResponse` | 403 |
| GET | `/api/v1/audit-logs` | `AUDIT_READ` | page/size → `PageResponse<AuditLogResponse>` | 403 |

## Contract gaps

- The exported OpenAPI is useful for routes and DTO schemas but does not declare Spring Security requirements, so consumers cannot derive permission enforcement from it.
- The endpoint list exposes broad operational permissions where the requested action-level matrix would need separate codes. In particular, inventory stock-in/out/transfer and UAV station assignment/status/maintenance share `INVENTORY_MANAGE` or `UAV_MANAGE`.
- The actual controller has mission media upload-url and confirm routes; these are present in the 64-path export. No payment, AI/KV260, rescue, notification, or entitlement endpoints exist.

## Source-level permission/business warnings

- The default commander role is seeded with `MISSION_VIEW_ALL` but not `MISSION_VIEW`; mission controllers require `MISSION_VIEW` before service-level view-all logic runs. This is a current source mismatch, not a runtime claim.
- `POST /api/v1/missions/{id}/reject` can reject a `CONFIRMED` mission, but the service path does not call resource release. The API contract should document this until the behavior is corrected.
- `MediaUploadRequest` has no content-type allowlist or maximum-size constraint; API documentation cannot infer such a policy.
