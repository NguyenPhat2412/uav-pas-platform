# UAV PAS operations redesign

## 1. Design Strategy Summary
A desktop operations console: graphite navigation, cool gray workspace, white data surfaces, aviation blue actions, a dark UAV inspection stage. The existing Next.js app and real API contracts remain authoritative. No invented telemetry, weather, battery, mission, fleet, health or online indicators appear in the product.

## 2. UI/UX Principles Applied
Title → action toolbar → filters → data → contextual detail. Medium density with 14px body/table text and 12px metadata. Creation and mutations live in focused dialogs/drawers rather than permanently occupying the top of a list. Short labels, explicit outcomes, keyboard-accessible controls, persistent navigation, and a locale switcher across authenticated modules.

## 3. Page Architecture
| Surface | Structure |
| --- | --- |
| Dashboard `/` | API KPIs, mission distribution, fleet/station snapshots, inventory quantities, recent audit, quick links, selectable UAV inspection |
| Operations `?tab=stations` | Search/status/sort/pagination; station drawer with overview, assigned UAVs, inventory and station audit |
| Operations `?tab=uavs` | Fleet table; detail drawer with real identity/status/station, reference 3D model, overview/maintenance/assignment/activity/media tabs |
| Operations `?tab=equipment` | Equipment table, serial/quantity distinction, stock/reserve/release/transfer form, movement history |
| Operations `?tab=media` | File table, type/confirmation filters, linked-resource metadata, upload/confirm/retry, preview/download, guarded deletion |
| Operations `?tab=audit` | Module/actor/action/date filters, detail drawer |
| Access Control | User table, role/status filters, profile drawer, grouped template/override permission controls, reset semantics, manager rejection |
| Missions | Search/status/type table; detail workflow, assignments, equipment reservation, timeline and attachments; validated create form |
| Login/register | Existing functional forms retained; visual system aligned without changing authentication behavior |

## 4. Design System Specification
Background #f3f6fb; panel #ffffff; navigation #0d1b2e; ink #132943; secondary #52667d; border #dce5ef; primary #0068bc. Status: available/active/complete green; in-progress/ready blue; maintenance/pending/reserved amber; failed/error red; offline/inactive/draft neutral. Status text always accompanies color.
Page title 28/34, section 18/26, card title 16/24, body/table 14/21, metadata/badges 12/18. Base spacing 8px, compact gap 4px, page gutter 24–32px, controls 36–40px, radius 8–12px. Thin borders, restrained shadows. Tablet/mobile navigation remains reachable; tables scroll locally without page overflow.

## 5. 3D UAV Integration Plan
The UAV detail drawer renders an original CSS 3D reference quadcopter only after the user chooses **Xem mô hình 3D**. It is explicitly a reference model, not a manufacturer-accurate digital twin. Drag, keyboard arrows, zoom, reset and an expanded dialog are functional. The CSS reference avoids loading a model for every table row and has no flight, battery, GPS or sensor telemetry. The identity/status metadata and management actions remain available when the viewer is closed.

## 6. Implementation Plan
1. Shared shell, header, status system, query/error/permission states and accessible drawers/tabs.
2. Typed TanStack Table with search, select filters, sorting, visibility, pagination and empty state; reusable React Hook Form/Zod form fields.
3. Abortable, session-scoped collection queries over existing paginated APIs. Fetch each page before global client filtering; show loading/error until the complete collection exists. Preserve authorization and targeted invalidation.
4. Dashboard using real data and permission-aware sections; on-demand CSS 3D reference viewer with a closed-state fallback. Operations has no synthetic API/telemetry status chips.
5. Full Operations, Access and Mission surfaces; retain existing mutation contracts and inventory replay protection.
6. Unit/integration checks for collection completeness, validation and session isolation; browser flows with explicit API fixtures plus a live authenticated smoke where available; capture screenshots and inspect visual quality.
7. Record exact commands, exits, route/feature coverage and limitations in verification report. No commit/push.

## 7. Testing Checklist
- Title/readability/8px rhythm/status/action consistency on all modules.
- Search, filtering, sorting, visibility, pagination beyond first page, and zero-result reset.
- Forms reject invalid quantities/dates; errors remain visible; duplicate uncertain inventory requests reuse IDs.
- Dialog open/close/Escape/focus, detail tabs, navigation and mobile overflow.
- Session/permission boundaries; existing Access grant/deny/reset and last-manager rejection.
- 3D reference drag/keyboard rotation, zoom/reset, inspection, expansion and closed-state fallback.
- Lint, typecheck, production build, tests, browser console and screenshots.

## 8. Acceptance Criteria
Every requested module uses the shared UI. Tables operate on complete API collections rather than silently only the first page. Empty/loading/error/denied states are observable. All visible actions work or are disabled for a specific reason. The 3D reference geometry is inspectable with a closed-state fallback. Data is authentic to the API; deterministic fixture data exists only in tests. No successful completion claim before current verification.

## 9. Changed Files / Proposed File Structure
`src/components/layout` shell/header; `src/components/data` typed table/state/drawer/tabs; `src/components/forms` schema form; `src/components/visuals` viewer/scene; feature queries and components under `features/{dashboard,operations,access,missions}`; route files remain composition boundaries; `tests` and `docs/ui-redesign` retain evidence.

## 10. Final Notes / Risks / Next Steps
Existing resource APIs expose pagination but not all filters. Frontend loads their complete permitted collection before client table transforms; this is suitable for the current dataset and explicitly documented. For very large fleets, add backend search/filter/sort plus server-side table adapters. The model is schematic; per-model GLB assets and telemetry require future data contracts. Existing Mission business policy is preserved, not rebuilt. No destructive bulk mutations added.
