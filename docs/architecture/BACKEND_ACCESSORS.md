# Backend getter/setter conventions

Use Lombok for mechanical accessors while preserving the existing public contract and domain behavior.

- Prefer `@Getter` for ordinary field reads. Retain explicit methods that calculate a value or implement framework behavior.
- Use `@Setter` only where unrestricted assignment is already intentional. A class-level `@Setter` is appropriate when every existing instance field already has a plain public setter.
- Preserve explicit setters that validate, normalize, apply defaults, or update related fields. Examples include `AppUser.setRole()` and `AppUser.setStatus()`.
- Keep domain operations such as `Mission.transitionTo()` and `MediaAsset.confirm()`. Do not add a class-level setter to these entities merely to make their annotations look alike.
- Preserve constructors, defaults, JPA mappings, accessor names, types, and visibility during accessor-only refactors. In particular, boxed `Boolean isActive` and `Boolean isSuccess` retain `getIsActive()` and `getIsSuccess()`.
- Do not replace these annotations with `@Data`: that also introduces equality, hash-code, and string-generation behavior outside the accessor scope.
- Changing inherited setters for identity or audit fields in `BaseEntity` requires a separate caller review; it is not a mechanical cleanup.

The 2026-10-17 cleanup replaces 70 plain accessors in `PaymentTransaction`, `WebhookSubscription`, and `WebhookDeliveryLog`. It preserves their six constructors and does not alter business methods, database migrations, or JSON property names.

Verification for future accessor-only changes should compare the compiled public methods and JavaBean properties, then run the backend suite with disposable PostgreSQL and MinIO. A passing run must have no skipped integration tests.

## Verification of the 2026-10-17 cleanup

- Before/after compilation comparison: all 70 accessors and six constructors retain their signatures and bytecode instructions, after normalizing declaration order and constant-pool references. Field names, types, and descriptors are unchanged.
- Source comparison: constructors, defaults, JPA annotations, and all non-accessor source are unchanged.
- Full Maven `verify`: 726 tests, zero failures, zero errors, zero skipped; formatting and packaging passed. PostgreSQL and MinIO used disposable, dedicated containers that were removed afterward.
- Existing local runtime: backend health `UP`; web, customer, operations, admin, and legacy pages returned HTTP 200. The running services were not restarted or redeployed as part of this source cleanup.
