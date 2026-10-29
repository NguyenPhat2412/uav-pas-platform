# Training courses (Udemy-style) — API contract

A training document becomes a **course**: an overview (existing `contentMarkdown`), the existing
practical checklist, and an ordered list of **lessons** grouped into sections. A lesson is a
**VIDEO** (uploaded file in R2 or an external YouTube/Vimeo link), **SLIDES** (ordered images
viewed one at a time) or an **ARTICLE** (markdown). Learners see courses for portals their role
may use (same rule as today: admin all, commander/operator OPERATIONS, customer CUSTOMER).

All paths are under `/api/v1/training`. Existing endpoints (`GET /?portal=`, `GET /{codeOrSlug}`,
`PUT /{id}/progress`, `POST /`, `PUT /{id}`) keep working unchanged.

## Learner endpoints (any authenticated user, portal rule applies; hidden or other-portal → 404)

`GET /courses?portal=CUSTOMER|OPERATIONS|ADMIN`
```json
[{ "id": 1, "code": "TRN-CUST-01", "slug": "…", "title": "…", "summary": "…",
   "category": "SITE_PREP", "level": "STANDARD", "targetPortal": "CUSTOMER",
   "isMandatory": true, "estimatedMinutes": 15,
   "coverUrl": "https://signed…" | null,
   "lessonCount": 4, "videoCount": 2, "completedLessons": 1, "progressPercent": 25,
   "status": "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" }]
```

`GET /courses/{codeOrSlug}`
```json
{ …all summary fields…, "overviewMarkdown": "…", "checklistSteps": ["…"], "checkedSteps": [0],
  "sections": [{ "title": "Bắt đầu", "lessons": [
     { "id": 10, "title": "…", "type": "VIDEO" | "SLIDES" | "ARTICLE",
       "durationMinutes": 6, "completed": false } ] }] }
```
Sections are derived from each lesson's `sectionTitle` in lesson order (null/blank → "Nội dung").

`GET /lessons/{id}`
```json
{ "id": 10, "courseCode": "TRN-CUST-01", "courseSlug": "…", "title": "…", "type": "VIDEO",
  "durationMinutes": 6,
  "video": { "kind": "FILE", "url": "https://signed-get…", "contentType": "video/mp4" }
         | { "kind": "EXTERNAL", "url": "https://www.youtube-nocookie.com/embed/ID" } | null,
  "slides": [{ "url": "https://signed-get…", "caption": "…" }],
  "bodyMarkdown": "…" | null,
  "completed": false, "positionSeconds": 0,
  "prevLessonId": 9 | null, "nextLessonId": 11 | null }
```
Signed URLs are valid long enough to watch (e.g. 2 h). External links are normalised server-side
to embed URLs; only youtube.com / youtu.be / vimeo.com are accepted.

`PUT /lessons/{id}/progress` body `{ "completed": true, "positionSeconds": 123 }` → the lesson
detail. Completing every lesson (and the checklist, if any) marks the course COMPLETED in the
existing progress record so the old overview counters stay correct.

## Admin endpoints (`PERMISSION_MANAGE`, as the existing create/update)

- `GET /admin/courses/{id}/lessons` → lessons with all editable fields (below), in order.
- `POST /admin/lessons` / `PUT /admin/lessons/{id}` body:
  ```json
  { "courseId": 1, "sectionTitle": "Bắt đầu", "title": "…", "type": "VIDEO",
    "sortOrder": 10, "durationMinutes": 6, "active": true,
    "videoUrl": "https://youtu.be/…" | null, "videoAssetId": 5 | null,
    "bodyMarkdown": "…" | null,
    "slides": [{ "assetId": 7, "caption": "…" }] }
  ```
  VIDEO needs exactly one of videoUrl / videoAssetId (asset must be a READY video);
  SLIDES needs ≥1 READY image asset; ARTICLE needs bodyMarkdown.
- `DELETE /admin/lessons/{id}` (soft: `active=false` is also fine via PUT).
- `PUT /admin/courses/{id}/cover` body `{ "assetId": 3 | null }`.
- `POST /admin/assets` body `{ "fileName": "intro.mp4", "contentType": "video/mp4", "size": 12345678 }`
  → `{ "assetId": 5, "uploadUrl": "https://signed-put…", "method": "PUT",
       "headers": { "Content-Type": "video/mp4" } }`.
  Allowed: video/mp4, video/webm (≤ 500 MB); image/png, image/jpeg, image/webp (≤ 10 MB).
- `POST /admin/assets/{id}/confirm` → `{ "assetId": 5, "status": "READY", "contentType": "…", "size": … }`
  (checks the object exists in storage with the declared type/size).

Storage keys live under `training/` in the existing R2 bucket. Browsers upload straight to R2 with
the signed PUT URL (bucket CORS already allows the app origin for mission media).

## Addendum: documents and lesson resources (Udemy "Resources")

- New lesson type **DOCUMENT**: a PDF guide viewed inline. `POST/PUT /admin/lessons` accepts
  `documentAssetId` (READY `application/pdf` asset) for DOCUMENT lessons. Lesson detail adds
  `"document": { "url": "https://signed-get…", "fileName": "huong-dan.pdf", "size": 123456 } | null`.
- Every lesson may carry downloadable **resources** (any lesson type): admin body adds
  `"resources": [{ "assetId": 12, "title": "Checklist bay.pdf" }]`; lesson detail adds
  `"resources": [{ "title": "…", "url": "https://signed-get…", "contentType": "application/pdf", "size": 123456 }]`
  and the course detail's lesson items add `"resourceCount": 2`.
- Assets: also allow `application/pdf` (≤ 50 MB). Resources may also be images (png/jpeg/webp).
- Learner course summary adds `"documentCount": n` (DOCUMENT lessons).
