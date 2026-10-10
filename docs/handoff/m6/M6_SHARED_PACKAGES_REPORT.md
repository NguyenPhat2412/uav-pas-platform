# M6 shared packages report

**Status: PASS for compile/build compatibility.**

The workspace resolves and builds @uav/api-client, @uav/auth-contracts, @uav/config, @uav/design-tokens, @uav/query, @uav/types and @uav/ui for all four apps. Root lint, typecheck, tests and production builds pass. App configs use transpilePackages; no app-to-app dependency was introduced.

The shared auth/query boundary still exposes the current bearer/localStorage compatibility model. That is documented as an SSO blocker rather than hidden in a package wrapper.
