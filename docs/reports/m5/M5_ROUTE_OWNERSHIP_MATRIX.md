# M5 Route Ownership Matrix

| Route | Purpose / primary action | Data source | Customer destination | Rendering | API dependency | Status / evidence |
|---|---|---|---|---|---|---|
| `/` | Explain platform and start request | Approved static repository content | `NEXT_PUBLIC_CUSTOMER_URL/register` | Static server component | None | PASS browser |
| `/about` | Explain platform boundary | Static content | Customer Portal | Static | None | PASS |
| `/services` | Discover service categories | Static approved categories | Customer Portal services | Static | None | PASS |
| `/services/[slug]` | Explain request category and limitations | Static catalog plus detail copy | Customer Portal services | SSG | None | PASS |
| `/solutions` | Explore available/planned outcomes | Static content | Relevant service or Customer Portal | Static | None | PASS |
| `/solutions/[slug]` | Explain use case, workflow, limitation | Static content | Customer Portal for AVAILABLE only | SSG | None | PASS |
| `/how-it-works` | Explain request and operations review | Static workflow | Customer Portal register | Static | None | PASS |
| `/pricing` | Declare pricing status | Static publication status | Customer Portal request | Static | None | PASS; no prices |
| `/contact` | Route service requests safely | Static limitation | Customer Portal | Static | None | PASS; no fake form |
| `/faq` | Answer public boundary questions | Static content | Customer Portal | Static | None | PASS |
| `/privacy`, `/terms` | Legal publication placeholders | Static reviewed-boundary text | None | Static | None | PASS; approval pending |
| `/login`, `/register` | Delegate auth entry | Env origin | Customer Portal | Server redirect | None | PASS; noindex |
| `/sitemap.xml`, `/robots.txt`, `/health` | Crawler/health metadata | Env/static | None | Route handlers | None | PASS |

Private mission, media, payment, AI-result and profile data remain owned by `apps/customer`; operations and admin routes remain outside public ownership.
