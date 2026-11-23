-- V69: Fix mixed-script katakana typo ("GNSS/スポofing" -> "GNSS/Spoofing") in operations emergency SOP summary.
UPDATE training_documents
SET summary = REPLACE(summary, 'GNSS/スポofing', 'GNSS/Spoofing'),
    updated_at = NOW()
WHERE summary LIKE '%スポofing%';
