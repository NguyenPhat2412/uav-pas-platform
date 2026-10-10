# M1 Next Steps

M2 is intentionally not started. Before implementation begins:

1. Resume and complete Codex Security scan `715164bc-1b82-43e5-aa9b-052936d4b76e`; record validated findings separately from the M1 foundation.
2. Decide how to address the five high development-toolchain advisories without forcing npm’s breaking downgrade of `eslint-config-next`.
3. Confirm the M2 operations route list and permission matrix from the existing architecture documents.
4. Migrate operations screens incrementally into `apps/operations`, preserving legacy aliases and real API request bodies.
5. Add app-level tests around permission gates, scoped Query keys, error states and deep-link refresh before any route redirect is enabled.

M1 provides the workspace boundary, package exports, environment contract, standalone builds and health checks. It does not implement SSO, route redirects, business pages, backend CORS changes or data migration.
