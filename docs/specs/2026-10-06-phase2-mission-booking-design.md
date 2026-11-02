# Phase 2 Mission & UAV Service Booking Design

## Goal

Turn the Phase 1 resource catalog into a complete UAV service workflow: a customer creates and submits a mission, operations assigns station/UAV/operator/equipment, an operator executes it, media is attached, and the platform records timeline and audit history.

## Scope

Phase 2 includes mission management, service definitions, resource and operator assignment, inventory reservation, execution, mission media, mission timeline, mission dashboard statistics, and permission/audit integration. Supported mission types are `UAV_RENTAL`, `AREA_INSPECTION`, `AERIAL_RECORDING`, `DATA_COLLECTION`, and `OTHER`.

Payment, subscriptions, AI detection, KV260/YOLO processing, search and rescue, e-learning, certificates, and training authorization remain out of scope. Payment is therefore not required for a mission.

## State machine

The only forward transitions are:

```text
DRAFT -> PENDING_CONFIRMATION -> CONFIRMED -> RESOURCE_RESERVED
       -> READY -> IN_PROGRESS -> COMPLETED
```

`CANCELLED`, `REJECTED`, and `FAILED` are terminal states reachable only from states where the action is meaningful. A transition that is not explicitly listed is rejected with `MISSION_INVALID_STATUS`. `READY` requires an active station, an assigned UAV, an assigned active operator, and all requested equipment reservations.

## Domain model

The backend adds these entities:

- `Mission`: code, customer, optional service, type, title/description, requested date/time window, location, station, UAV, operator, priority, status, notes, and lifecycle timestamps.
- `UavService`: code, name, description, active flag, and default duration.
- `MissionEvent`: mission, event type, actor, old/new status, description, metadata, and timestamp.
- `MissionMedia`: mission/media link, role (`INPUT`, `FLIGHT_DATA`, `OUTPUT`, `DOCUMENT`, `OTHER`), uploader, and timestamp.

Existing Station, UAV, Inventory, Media, User, and Audit entities remain the source of truth for their respective resources. Equipment reservations reuse the existing inventory reservation mechanism with `reference_type = MISSION` and `reference_id = missionId`.

## Service boundaries and transactions

`MissionService` owns mission commands, state validation, visibility rules, event creation, and orchestration of resource services. Every assignment/reservation command runs in one database transaction: load and validate the mission, check availability and time overlap, mutate the resource reservation/assignment, append a mission event and audit record, then commit. A failure rolls the whole operation back.

UAV and operator overlap uses half-open time windows `[start, end)`, so a booking ending exactly when another starts is allowed. A UAV must be `AVAILABLE` before assignment; an operator must be active and cannot have an overlapping mission. Cancellation, completion, and failure release reservations according to the existing inventory/UAV lifecycle APIs.

## API surface

All routes use `/api/v1` and the existing security configuration:

```text
GET    /missions
GET    /missions/{id}
POST   /missions
PATCH  /missions/{id}
POST   /missions/{id}/submit
POST   /missions/{id}/cancel
POST   /missions/{id}/assign-station
POST   /missions/{id}/assign-uav
POST   /missions/{id}/assign-operator
POST   /missions/{id}/reserve-equipment
POST   /missions/{id}/confirm
POST   /missions/{id}/ready
POST   /missions/{id}/start
POST   /missions/{id}/complete
POST   /missions/{id}/fail
GET    /missions/{id}/media
POST   /missions/{id}/media
GET    /missions/{id}/timeline
```

List endpoints support status, type, station, operator, customer, date, and text search filters. Customers see their own missions; users with `MISSION_VIEW_ALL` see all missions.

## Permissions

The Phase 2 registry adds the mission permissions from the supplied specification (`MISSION_VIEW`, `MISSION_VIEW_ALL`, `MISSION_CREATE`, `MISSION_UPDATE`, `MISSION_CANCEL`, `MISSION_CONFIRM`, `MISSION_ASSIGN_STATION`, `MISSION_ASSIGN_UAV`, `MISSION_ASSIGN_OPERATOR`, `MISSION_START`, `MISSION_COMPLETE`, `MISSION_STATUS_UPDATE`, `MISSION_MEDIA_VIEW`, `MISSION_MEDIA_UPLOAD`, `MISSION_TIMELINE_VIEW`) and `DASHBOARD_MISSION`. Controllers enforce these permissions, with ownership checks for customer reads/updates.

## Frontend

The frontend adds shared mission types/services/hooks and three role-aware surfaces: `/missions`, `/missions/create`, and `/missions/[id]`, plus `/operator/missions` and `/admin/missions` entry points that reuse the same list/detail components and expose actions according to permissions. Mission detail is the center of the flow with Overview, Resources, Operator, Media, Timeline, and Activity sections; assignment and lifecycle actions use dialogs/drawers.

TanStack Query is not currently a dependency in the repository, so Phase 2 uses the existing API client and a small query/mutation layer only if the dependency is introduced deliberately. No unrelated frontend dependency is added just for this phase.

## Error contract

Business failures use the existing error response mechanism and these stable codes: `MISSION_NOT_FOUND`, `MISSION_INVALID_STATUS`, `MISSION_RESOURCE_MISSING`, `MISSION_TIME_CONFLICT`, `UAV_NOT_AVAILABLE`, `UAV_TIME_CONFLICT`, `OPERATOR_NOT_AVAILABLE`, `OPERATOR_TIME_CONFLICT`, and `INVENTORY_NOT_AVAILABLE`.

## Verification

Backend tests cover valid/invalid transitions, customer visibility, available/maintenance/reserved/overlapping UAV assignment, overlapping operator assignment, equipment availability and release, READY prerequisites, start/complete/fail behavior, media permissions, event creation, and mission dashboard counts. Integration tests exercise the secured API routes. Frontend verification covers type-check/build, list/create/detail rendering, and the primary demo flow with a running backend.
