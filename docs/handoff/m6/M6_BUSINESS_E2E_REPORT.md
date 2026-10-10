# M6 business E2E report

**Status: PASS for isolated synthetic API runtime; browser SSO remains NOT_VERIFIED.**

The current complete flow was executed against Spring on port 18080 with disposable PostgreSQL/MinIO: customer A created and submitted a mission; admin confirmed and assigned station/UAV/operator/equipment; operator accepted, marked ready, started and completed it; customer/operator/admin read the timeline; customer uploaded and attached private media; customer B received 403; admin read audit logs. Evidence: `evidence/tests/m6-current-isolated-runtime.json`.

The first probe returned errors caused by the synthetic fixture, not a source change: `ResourceAssignmentRequest.quantity` is required, assigning a UAV to a station first changes it out of `AVAILABLE`, media size must match the uploaded bytes, and the accepted media role is `OUTPUT` rather than `DELIVERABLE`. The corrected rerun passed all of those steps; these corrections were confined to the disposable test harness.

The flow proves direct API business behavior for synthetic data. It does not prove cross-portal browser SSO because the approved cookie/session contract is not implemented. AI, SAR and Payment remain deferred/not implemented and were not expanded in M6.
