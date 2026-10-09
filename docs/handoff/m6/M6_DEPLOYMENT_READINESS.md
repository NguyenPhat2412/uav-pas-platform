# M6 deployment readiness

**Classification: NOT_READY for deployment review.** Local frontend artifacts are buildable, but backend/API origin, SSO contract, exact CORS and authenticated integration evidence are unresolved.

Reviewed deployment details:

- Four standalone Dockerfiles build one app artifact each and expose 3100/3101/3102/3103.
- Startup commands are node apps/<app>/server.js in containers.
- Local Next start scripts now match those ports.
- Environment examples provide API URL, app URL, auth origin, app id and environment.
- Backend defaults still allow only http://localhost:3000; deployment must inject an exact allowlist for all approved origins and storage CORS.
- Cookie domain/TLS/CSRF values are design requirements, not currently implemented runtime behavior.
- No production DNS, deployment or data was changed.
- Rollback design is documented: route traffic to the legacy artifact, disable new cookie flag, preserve database/refresh records and aliases.

A deployment review can resume after a clean backend port, approved credentials, backend SSO/CSRF implementation and staging-like browser evidence are available.
