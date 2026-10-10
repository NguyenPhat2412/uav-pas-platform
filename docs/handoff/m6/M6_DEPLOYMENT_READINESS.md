# M6 deployment readiness

**Classification: NOT_READY for deployment review.** Local frontend artifacts and isolated authenticated API evidence are available, but SSO/CSRF, exact staging CORS, hosted CI and production deployment evidence remain unresolved.

Reviewed deployment details:

- Four standalone Dockerfiles build one app artifact each and expose 3100/3101/3102/3103.
- Startup commands are node apps/<app>/server.js in containers.
- Local Next start scripts now match those ports.
- Environment examples provide API URL, app URL, auth origin, app id and environment.
- Backend defaults still allow only http://localhost:3000; deployment must inject an exact allowlist for all approved origins and storage CORS.
- Cookie domain/TLS/CSRF values are design requirements, not currently implemented runtime behavior.
- No production DNS, deployment or data was changed.
- Rollback design is documented: route traffic to the legacy artifact, disable new cookie flag, preserve database/refresh records and aliases.

A deployment review can resume after approved staging credentials, backend SSO/CSRF implementation, hosted CI gates and staging-like browser evidence are available. The isolated port verification does not replace those gates.
