# M5 SEO Report

- Root metadata uses the Next.js Metadata API with environment-aware `metadataBase`.
- Every implemented page has a title, description, canonical path, Open Graph image and Twitter card; dynamic service/solution pages have unique titles.
- `sitemap.xml` contains only public routes and excludes login/register and private portals.
- `robots.txt` allows public content and disallows `/login`, `/register`, `/health`; it points at the environment sitemap.
- The only JSON-LD is a factual `WebSite` object containing name and URL. No unsupported Organization, Review, Offer, rating, partner, or certification schema is emitted.
- Public markup uses one primary heading per route, semantic navigation/main/footer and image-free illustrative CSS for the hero.

Browser evidence: `evidence/tests/browser.json`; route/status evidence: `evidence/tests/route-status.log`.

Production limitation: `NEXT_PUBLIC_APP_URL` must be set to the approved production HTTPS origin before deployment; local fallback is intentionally localhost-only.
