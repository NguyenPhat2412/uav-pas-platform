-- V45: Remove retired V34 auto-generated ARTICLE lessons (which V35 marked active = false)
-- so Admin and Operations lesson panels only list actual uploaded PDF, Video, Slide, or authored lessons.
DELETE FROM training_lessons l
USING training_documents d
WHERE l.document_id = d.id
  AND l.active = false
  AND l.lesson_type = 'ARTICLE'
  AND l.body_markdown = d.content_markdown;
