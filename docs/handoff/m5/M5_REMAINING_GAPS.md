# M5 Remaining Gaps

1. Authenticated Customer Portal booking E2E needs a seeded account and backend fixture; current evidence is link/redirect level only.
2. Public contact submission is intentionally absent because no approved contact API or verified contact address exists.
3. Pricing, privacy and terms remain publication placeholders pending approved content.
4. Production deployment origin, Customer Portal origin and HTTPS values must be supplied through environment configuration; local fallbacks must not ship.
5. Lighthouse/Core Web Vitals and real-device assistive-technology coverage are not measured.
6. Codex Security scan `715164bc-1b82-43e5-aa9b-052936d4b76e` remains in progress against the M1 baseline; release status is not security-clear.

These gaps are why the milestone is marked **PARTIAL** and M6 is **BLOCKED** pending the release gates above.
