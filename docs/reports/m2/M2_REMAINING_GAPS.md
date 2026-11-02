# M2 Remaining Gaps

- Run authenticated browser checks with the backend, seeded permission profiles, real mission/UAV/station/inventory/media data, and signed storage.
- Confirm permission-code names and route behavior against the deployed authorization catalog; UI gates are defensive and backend remains authoritative.
- Replace the current CSS reference UAV viewer only when a real GLB/telemetry contract is approved; M2 deliberately keeps the existing reference viewer.
- Complete responsive and accessibility evidence at the supported viewport matrix.
- Finish and review the repository-wide security scan. The currently delegated scan is resumable and must not be interpreted as a clean report.
- The full npm audit still reports high-severity development-toolchain advisories; production dependencies report zero high-severity vulnerabilities. Resolve the toolchain advisory through a planned upgrade rather than an unreviewed breaking downgrade.
- Keep cross-domain SSO and any operations/customer/admin shared workflow changes out of M2; those belong to the documented follow-up plan.
