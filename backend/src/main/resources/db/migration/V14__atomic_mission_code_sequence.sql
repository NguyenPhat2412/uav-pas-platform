-- Stop old application writers before upgrading: their count-based allocator
-- cannot coordinate with this sequence. Existing mission codes are unchanged.
CREATE SEQUENCE mission_code_seq AS bigint START WITH 1 INCREMENT BY 1 NO CYCLE;

-- Suffixes were historically shared across years. Imports/deletions may leave
-- a maximum much higher than count(*), so continue above every canonical code.
SELECT setval('mission_code_seq', GREATEST(COALESCE(
    (SELECT MAX(substring(code FROM '^MSN-[0-9]{4}-([0-9]+)$')::bigint)
       FROM missions
      WHERE code ~ '^MSN-[0-9]{4}-[0-9]+$'), 0) + 1, 1), false);
