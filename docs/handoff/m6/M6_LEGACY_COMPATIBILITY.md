# M6 legacy compatibility

**Status: PASS for local regression.**

The legacy frontend/ directory remains present and was not removed or rewritten by M6. Its lint, typecheck, 5 API/session tests and production build all pass. Existing bearer/refresh behavior remains available for rollback and compatibility.

The branch was clean at HEAD before this handoff evidence was written. The current dirty state contains documentation/evidence changes only; no legacy or backend source was changed during this verification.
