-- V34: training documents become Udemy-style courses. A course keeps its overview (content_markdown)
-- and checklist, and gains ordered lessons (VIDEO / SLIDES / ARTICLE / DOCUMENT) grouped by section
-- title, downloadable lesson resources, uploaded media assets (stored under training/ in the object
-- store), a cover image and per-lesson learner progress.

-- Files uploaded by administrators for lessons and covers. PENDING until the upload is confirmed
-- (object present with the declared content type and size); only READY assets can be attached.
CREATE TABLE IF NOT EXISTS training_assets (
    id BIGSERIAL PRIMARY KEY,
    object_key VARCHAR(400) NOT NULL UNIQUE,
    file_name VARCHAR(255) NOT NULL,
    content_type VARCHAR(100) NOT NULL,
    size_bytes BIGINT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    uploaded_by VARCHAR(100),
    confirmed_at TIMESTAMP(6),
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE training_documents ADD COLUMN IF NOT EXISTS cover_asset_id BIGINT;
ALTER TABLE training_documents
    ADD CONSTRAINT fk_training_documents_cover_asset
    FOREIGN KEY (cover_asset_id) REFERENCES training_assets (id) ON DELETE SET NULL;

-- video_url keeps the link as the administrator entered it (youtube.com / youtu.be / vimeo.com);
-- learners receive the normalised embed URL computed from it.
CREATE TABLE IF NOT EXISTS training_lessons (
    id BIGSERIAL PRIMARY KEY,
    document_id BIGINT NOT NULL REFERENCES training_documents (id) ON DELETE CASCADE,
    section_title VARCHAR(120),
    title VARCHAR(220) NOT NULL,
    lesson_type VARCHAR(20) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    duration_minutes INT NOT NULL DEFAULT 5,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    video_url VARCHAR(500),
    video_asset_id BIGINT REFERENCES training_assets (id) ON DELETE SET NULL,
    document_asset_id BIGINT REFERENCES training_assets (id) ON DELETE SET NULL,
    body_markdown TEXT,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_training_lessons_type CHECK (lesson_type IN ('VIDEO', 'SLIDES', 'ARTICLE', 'DOCUMENT'))
);

CREATE INDEX IF NOT EXISTS idx_training_lessons_document
    ON training_lessons (document_id, active, sort_order);

-- Slide images of a SLIDES lesson, in viewing order.
CREATE TABLE IF NOT EXISTS training_lesson_slides (
    lesson_id BIGINT NOT NULL REFERENCES training_lessons (id) ON DELETE CASCADE,
    sort_order INT NOT NULL,
    asset_id BIGINT NOT NULL REFERENCES training_assets (id),
    caption VARCHAR(300),
    PRIMARY KEY (lesson_id, sort_order)
);

-- Downloadable files (PDF or image) attached to a lesson of any type, in display order.
CREATE TABLE IF NOT EXISTS training_lesson_resources (
    lesson_id BIGINT NOT NULL REFERENCES training_lessons (id) ON DELETE CASCADE,
    sort_order INT NOT NULL,
    asset_id BIGINT NOT NULL REFERENCES training_assets (id),
    title VARCHAR(220) NOT NULL,
    PRIMARY KEY (lesson_id, sort_order)
);

CREATE TABLE IF NOT EXISTS training_lesson_progress (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    lesson_id BIGINT NOT NULL REFERENCES training_lessons (id) ON DELETE CASCADE,
    completed_at TIMESTAMP WITH TIME ZONE,
    position_seconds INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_training_lesson_progress UNIQUE (user_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS idx_training_lesson_progress_lesson
    ON training_lesson_progress (lesson_id);

-- Existing courses are not left empty: each document becomes one ARTICLE lesson with its content.
INSERT INTO training_lessons (
    document_id, section_title, title, lesson_type, sort_order, duration_minutes, active,
    body_markdown, created_at, updated_at
)
SELECT d.id, 'Nội dung', d.title, 'ARTICLE', 10, d.estimated_minutes, TRUE,
       d.content_markdown, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM training_documents d
WHERE NOT EXISTS (SELECT 1 FROM training_lessons l WHERE l.document_id = d.id);

-- Learners who already completed a document keep a consistent course: its migrated lesson is done.
INSERT INTO training_lesson_progress (
    user_id, lesson_id, completed_at, position_seconds, created_at, updated_at
)
SELECT p.user_id, l.id, COALESCE(p.completed_at, CURRENT_TIMESTAMP), 0,
       CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM user_training_progress p
JOIN training_lessons l ON l.document_id = p.document_id
WHERE p.status = 'COMPLETED'
  AND NOT EXISTS (
      SELECT 1 FROM training_lesson_progress x WHERE x.user_id = p.user_id AND x.lesson_id = l.id
  );
