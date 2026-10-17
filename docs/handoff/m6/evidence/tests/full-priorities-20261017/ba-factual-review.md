# BA v3 final factual review — 2026-10-17

**Final factual review: Spec PASS / Quality APPROVE.** All four correction groups and the remaining FR-26/redispatch wording are resolved in the fresh draft identified below. Initial findings and interim verdicts are retained as review history and superseded by the final recheck. The earlier application-source approval is unchanged. No source, BA draft, canonical document, service, database or Git state was modified; this review report is the only output written.

## Reviewed identity and scope

- `docs/work/full-priorities-20261017/ba-v3/BA_V3.md`: 2,323 lines, chapters 1–33, 48 distinct FR table IDs; SHA-256 `ae5261433fbbe659bd796aff5e3882ef417d51c0058a5e63a693a98b20bfab3b`.
- `docs/work/full-priorities-20261017/ba-v3/TRACEABILITY_V3.md`: 90 lines, 48 distinct FR IDs; SHA-256 `d940e5a59a809e94167f1d4476306046ae754bbf325259ee974b128dabf60e6a`.

The author was still editing during review. Findings use the line numbers in the final read above; revisions require a narrow factual recheck. Read chapter groups throughout the draft, the complete standalone traceability matrix, approved decisions and final source/evidence context. Focused checks cover current policies, actual contracts, state transitions, source/test locators and evidence claims. Some broad output reads were truncated; this is not a claim of word-for-word review of every table cell or full visual/render review. Figure captions were read; image pixels, pagination, final DOCX/PDF and final release status are outside this factual pass.

## Required corrections

### 1. Correct conflict status and version semantics

**BA lines 439 (UC08) and 1454 (EX-03).** Both say reporting a conflict leaves the mission's main status unchanged. The actual `Mission.reportOperatorConflict` changes **READY → RESOURCE_RESERVED**, clears acceptance and retains resources; CONFIRMED/RESOURCE_RESERVED remain at their existing status. This matters because the operator must reaccept and the dispatcher must re-establish READY before START.

UC08 also groups version validation across accept and report-conflict. `MissionLifecycleService.acceptOperator` checks `expectedVersion`; `reportOperatorConflict` accepts a note and acts under the mission row lock without a client version parameter (`MissionController` report-conflict endpoint). Say explicitly which command carries the expected version. Correct the corresponding FR-26 phrasing if it continues to imply both commands accept a version.

Suggested factual wording: “Báo vướng mắc đặt trạng thái tiếp nhận thành chưa nhận; nếu nhiệm vụ đang READY thì đưa về RESOURCE_RESERVED, không giải phóng tài nguyên. Tiếp nhận dùng expectedVersion; báo vướng mắc kiểm tra người được giao, ghi chú và trạng thái hiện hành dưới khóa.”

### 2. Align media role selection and the 24-hour limit with the actual workflow

**BA line 801 (§10.5).** “video vẫn sử dụng FLIGHT_DATA” is stale. The release Operations mission page initializes `mediaRole` to OUTPUT (line 64), passes the selected role to attach (line 124), and offers OUTPUT/DOCUMENT/FLIGHT_DATA independently of MIME (line 221). A video can therefore be a handover OUTPUT. Describe the selector and explicitly retain that FLIGHT_DATA does not satisfy the required OUTPUT/DOCUMENT handover condition.

**BA line 1866 (VAL-F03).** “URL mới chỉ cấp ... bản đăng ký chưa quá hạn 24 giờ” is too broad. The registration-age condition applies to new **upload** URLs for unconfirmed assets. Authorized download URLs for confirmed retained files do not expire merely because registration is over 24 hours old (`MediaServiceImpl.uploadUrl` versus `downloadUrl`). Narrow this sentence to upload; keep the existing confirmed-file retention rule intact.

### 3. Remove the claim that the current AuthController implements Zalo endpoints

**BA line 911 (§12.2).** The draft says AuthController still obtains a Zalo URL and handles callback. The final controller provides register/login/refresh/logout/me only. Graph discovery found frontend Zalo remnants/design references; a fallback scan of all current `@RestController` bodies found no Zalo handler. Frontend route constants and old designs do not establish an existing backend integration.

Replace with an explicit distinction: historical/frontend references exist, but this final backend does not expose the stated Zalo authorize/callback contract and no provider integration is verified. Do not add endpoints or redesign authentication to make the prose true.

### 4. Replace two nonresolving test citations in both matrices

**BA lines 2117 and 2123; TRACEABILITY lines 65 and 71.** `AuditServiceTest` and `DashboardServiceTest` do not exist in either the final 445-file source manifest or the retained pre-refactor complete source map. They cannot serve as evidence locators for FR-35 and FR-36.

Use actual tests/assertions and evidence supporting the specific claim, or remove the nonexistent locator while preserving the qualified PARTIAL scope. `MissionHandoverIntegrationTest` already cited for FR-35 contains actual handover/audit evidence; `MissionDashboardTest` exists for its specific mission-dashboard coverage, and `ReportTruthTest` covers the reporting subset. Do not substitute a similarly named class as proof for uninspected assertions. Final frontend KPI/guard evidence can support its own UI scope.

`UavServiceControllerTest` is different: it is a real historical name mapped by `complete-source-map.json` to `ServiceOfferingControllerTest`. The draft already explains that names can refer to historical evidence, so this is not a false citation; adding the explicit old → new name would improve navigation.

## Corrections observed during review / remaining precision

- The initial §4.2 assertion that ROLE_ADMIN never bypasses override was inconsistent with the inherited webhook authority branch. The current draft adds the endpoint exception and §9.4 correctly says backend USER_MANAGE **or** ROLE_ADMIN/ADMIN versus UI USER_MANAGE. Preserve this as a residual policy question, not a newly designed policy or an implicit waiver.
- Initial §3.3/UC01/UC17/SCR-W04 wording asserted separate auth sessions for every frontend origin. Current edits distinguish per-origin UI/cache from cookie scope and retain unverified real topology/SSO. This is the correct distinction: shared AuthProvider initializes through `/auth/me`, and API requests include cookies; a common backend cookie can be usable across local frontend ports. Neither universal separation nor universal cross-domain SSO is established.
- The UC01 natural-expiry statement has real **historical** support: `M6_BUSINESS_UI_E2E_2026_10_15.md:45` records disposable 5000-ms TTL and 401 → refresh 200. Retain only with the historical date/source scope; do not count it as natural expiry of the final artifact. The new 15-check auth probe is a separate result.
- UC06 and other broad redispatch prose says all replacement commands send a version. Operator/station/equipment requests do; UAV replace/unassign instead carry `expectedCurrentUavId` plus reason. Prefer “expected version or expected current assignment, according to the command” where describing every resource command together. This is precision of documentation, not a request to alter the API.
- Record final post-refactor evidence as a distinct entry when the owner provides stable artifact paths: root now reports **26 browser checks + 15 auth checks PASS**, backend **726/0 failures/errors/skips**, **445 source hashes without drift**, and **151 frontend contracts PASS**. Do not rewrite E17's historical 725/421 evidence to mean the new source. At dispatch, backup/cutover was in progress and **LIVE_READY was not established**; update activation only from a later owner result.

## Policies and claims assessed as consistent

The reviewed sections correctly preserve planned-hour quota, auto-invoice OFF without approved price, separate durable invoice attempts after enqueue, mission-invoice payment granting zero extra hours, plan limits preserving used hours/current cycle, six MIME types with decimal 100,000,000/1,000,000,000-byte inclusive limits, 24-hour unconfirmed cleanup, retained confirmed/attached files, both required completion notes, three required handover types using **AERIAL_RECORDING**, redispatch invalidation of acceptance, terminal immutability, and self-profile name/phone-only updates.

The broad report consistently distinguishes PARTIAL / NOT_READY from local passing tests. HTTPS staging, real cross-domain SSO, actual payment/government/UAV integration, complete security coverage and production capacity are not falsely certified. Production audits of zero and five HIGH development findings per root/legacy tree remain distinct. The local small load probe is not presented as an SLA. Interviews, RACI, future UAT/KPIs and sign-off are labelled proposals rather than invented completed research or approvals.

The traceability structure contains all 48 FR IDs and separates broad partial coverage from the cited local passes. Removing the two nonexistent test locators and correcting the contract/state descriptions above is necessary before factual approval of the final BA bytes. No new product test run is needed to resolve these documentation findings.

## Narrow correction recheck

Fresh read: BA SHA-256 `4164bc01d189cd539414870bd31b214906229276db94c49d9877200faf35308c`, 2,329 lines; TRACEABILITY SHA-256 `5e822be17759b9521409b78b6ca0d0a226f017a19be79f01fd6b174d2e586c74`, 90 lines. Both retain 48 FR IDs.

- UC08 (441) and EX-03 (1460) now state READY → RESOURCE_RESERVED and correctly distinguish acceptance expectedVersion from conflict's locked current state. **One corresponding sentence remains:** FR-26 (306) still describes both actions as using the current version. Narrow that requirement to acceptance's expectedVersion and conflict's current locked state.
- Media role selection (803) and upload-versus-download expiry (1872): resolved.
- AuthController / Zalo contract statement (913): resolved.
- FR-35 / FR-36 test citations in BA (2123/2129) and TRACEABILITY (65/71): resolved, with the appropriate partial-coverage qualifications.
- BR-05 restored (222). Cookie-scope distinction (3.3), webhook admin-authority exception (4.2/9.4), and local-only LIVE_READY versus production NOT_READY are explicit. Parent now reports owner LIVE_READY for local backend 18082 and five frontends, plus 11 independent read-only checks PASS; this supersedes the earlier pre-cutover status, without implying production readiness.
- Existing redispatch precision note remains at BR-06 (224), UC06 (419), EX-06 (1478), SCR-O03 (1749): use expected version or expected current assignment according to the command, because UAV replace/unassign uses expectedCurrentUavId.

No new broad source review, product test run, service action or application modification occurred in this recheck.

## Final narrow recheck — approved

The author completed the last edits after the preceding read. Fresh exact-sentence review confirms:

- **FR-26 (306)** now distinguishes acceptance with expectedVersion from conflict with a note on the locked current state, consistent with corrected UC08 and EX-03.
- **FR-24 (304), BR-06 (224), UC06 (419), EX-06 (1480), SCR-O03 (1751), Q-05 (1286)** now distinguish expectedVersion from expectedCurrentUavId according to the command.
- The previously checked media-role/upload-expiry, AuthController/Zalo, and both traceability-matrix corrections remain resolved. No outstanding factual finding remains from this review.

**Reviewed final identities:**

| File | Lines | Distinct FR IDs | SHA-256 |
|---|---:|---:|---|
| BA_V3.md | 2,331 | 48 | `3b774bbc66ec48a66807b186a9696848c16f064d6287f9576569406e09db5634` |
| TRACEABILITY_V3.md | 90 | 48 | `5e822be17759b9521409b78b6ca0d0a226f017a19be79f01fd6b174d2e586c74` |

**Spec PASS / Quality APPROVE** applies to the factual documentation scope and these bytes. The prior scope limits still apply: this is not a full rendered-artifact/visual review, full security certification, production-readiness approval, or independent rerun of application tests. Local activation evidence and production NOT_READY remain distinct. No broader review or application mutation was performed for this final recheck.
