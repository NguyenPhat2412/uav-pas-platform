-- H2 tests use Hibernate create-drop for entities; this non-entity sequence is
-- owned by Flyway V5 on PostgreSQL. Default SQL init only applies to embedded DBs.
CREATE SEQUENCE IF NOT EXISTS mission_code_seq START WITH 1;
