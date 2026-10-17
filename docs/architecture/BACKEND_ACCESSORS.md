# Backend Entity, Service and DTO conventions

The 2026-10-17 entity/service refactor supersedes the earlier accessor-only policy. Feature entities now hold persistence data, JPA mappings, defaults and simple constructors/accessors. Business validation and transitions belong to service implementations.

## Layers

- `modules/<feature>/entity`: persisted fields, mapping annotations, Lombok getters/setters and assignment-only constructors. Do not use `@Data`, which would also change identity and string output. Do not add business methods or validation to entity constructors.
- `modules/<feature>/service`: application service contracts and existing orchestration services. Controllers depend on service contracts and never query repositories or map entities directly.
- `modules/<feature>/service/impl`: application implementations and internal `*Operations` helpers for state changes, validation and calculations. These helpers operate on entities inside the transaction and locking boundaries owned by application services. Helpers do not open transactions or expose entities through HTTP.
- `modules/<feature>/mapper`: conversion to response DTOs; persistence objects remain internal.
- `modules/<feature>/dto/request`: HTTP JSON input, including Java records used as input DTOs.
- `modules/<feature>/dto/response`: HTTP output, including Java records used as response DTOs. Shared response DTOs live in `common/dto/response`.
- `modules/<feature>/dto/record`: intermediate records used inside the backend, such as object metadata, media permission snapshots, queue counts and internal alert results. These are not endpoint request or response types.

## Entity and framework behavior

Business operations formerly on Mission, Equipment, maintenance, MediaAsset, Station, Uav, RoleTemplate, AppUser and RefreshToken now live in service implementations. Creation rules for billing plans/quotas, SAR tasks/missions, notification types and configuration categories also live in service helpers. ServiceOffering duration validation also runs in the service layer. Its controller delegates listing and creation to ServiceOfferingService.

Lombok accessors perform literal field reads/writes. Rules that normalize values, enforce quantity or state constraints, update multiple fields, or apply account defaults must use the corresponding service helper. Application callers were migrated together with their existing behavioral tests.

`BaseEntity` retains technical identity (`equals`, `hashCode`, `isNew`) and JPA audit timestamp callbacks; these are persistence infrastructure, not domain operations. `UserAccountPersistenceListener` delegates insertion defaults to `UserAccountServiceImpl`, preserving direct repository inserts without putting rules back in AppUser. AppUser is no longer a Spring Security UserDetails implementation; authentication continues using the existing username principal and service-generated authorities.

## API compatibility

Controllers receive request DTOs and return response DTOs, optionally wrapped in a list, page or ResponseEntity. Empty responses and binary CSV exports retain their HTTP transport types. Authentication, path variables, query parameters and pagination are transport metadata.

The JSON format is unchanged. Flexible webhook/rescue payloads and strict profile patches use delegating request DTOs to preserve the original flat JSON object, including unknown fields and explicit nulls. Profile allowlist/type validation still runs before writes. PermissionCodesResponse serializes as the original JSON array. Status, count and message DTOs preserve their original field names. ErrorResponse moved to common/dto/response without changing its payload.

## Verification

EntityDtoBoundaryTest checks entity method boundaries, constructor assignment-only rules, request/response endpoint types and record placement. EntityCreationRulesTest verifies defaults and billing-cycle derivation at the service boundary. ArchitecturePackageTest checks package and controller dependencies. DtoWireContractTest checks flat JSON input, arbitrary payload preservation, malformed bodies, optional rescue input and response shapes. Existing behavioral, authorization, concurrency, database and media-storage tests remain required.

Run the full backend verify with disposable PostgreSQL and MinIO, with zero failures, errors or skipped tests. No database migration is required for this refactor. Keep production data and running services separate from verification environments.
