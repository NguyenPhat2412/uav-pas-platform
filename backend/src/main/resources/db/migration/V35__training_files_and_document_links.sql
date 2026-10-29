-- V35: training content comes from files and links that administrators upload or paste, not from text
-- written into migrations (docs/training-courses-api.md, Addendum 2).

-- 1. Switch off (never delete) the ARTICLE lessons that V34 generated from each document's
--    content_markdown. V34 created training_lessons and filled it in the same transaction with one
--    INSERT ... SELECT, so its rows are the first lessons ever stored and all carry that transaction's
--    CURRENT_TIMESTAMP as created_at; every lesson an administrator adds later gets its own timestamp.
--    The batch timestamp is taken from the first lesson only when that row still has V34's fixed shape
--    (ARTICLE, section 'Nội dung', sort order 10), so a database where V34 generated nothing keeps every
--    administrator lesson. An untouched copy of the overview (same section, sort order and body) is
--    also matched directly. Learner progress rows stay; a course with no active lessons simply shows
--    "Chưa có bài học" until an administrator adds files.
WITH v34_batch AS (
    SELECT l.created_at
    FROM training_lessons l
    WHERE l.id = (SELECT MIN(id) FROM training_lessons)
      AND l.lesson_type = 'ARTICLE'
      AND l.section_title = 'Nội dung'
      AND l.sort_order = 10
)
UPDATE training_lessons l
SET active = FALSE,
    updated_at = CURRENT_TIMESTAMP
FROM training_documents d
WHERE d.id = l.document_id
  AND l.active = TRUE
  AND l.lesson_type = 'ARTICLE'
  AND (
      l.created_at = (SELECT created_at FROM v34_batch)
      OR (
          l.section_title = 'Nội dung'
          AND l.sort_order = 10
          AND l.body_markdown IS NOT DISTINCT FROM d.content_markdown
      )
  );

-- 2. A DOCUMENT lesson takes one source: an uploaded PDF (document_asset_id) or a Google Docs / Slides /
--    Sheets or Drive file link, stored as the administrator entered it. Learners receive the embeddable
--    /preview URL computed from it.
ALTER TABLE training_lessons ADD COLUMN IF NOT EXISTS document_url VARCHAR(500);
