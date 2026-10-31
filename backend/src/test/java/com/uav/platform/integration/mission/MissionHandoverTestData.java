package com.uav.platform.integration.mission;

import org.springframework.jdbc.core.JdbcTemplate;

import java.util.UUID;

/** Synthetic persisted result for lifecycle tests; real object integrity is tested with MinIO. */
final class MissionHandoverTestData {
    private MissionHandoverTestData() {}

    static void result(JdbcTemplate db, Long missionId, String operator) {
        String key = "test-handover/" + UUID.randomUUID();
        db.update(
                "INSERT INTO media_assets (original_name,object_key,content_type,size,type,linked_entity_type,linked_entity_id,uploaded_by,storage_provider,confirmed,deleted,delete_attempts,created_at,updated_at) VALUES ('result.pdf',?,'application/pdf',52,'DOCUMENT','MISSION',?,?,'test',true,false,0,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)",
                key,
                missionId.toString(),
                operator);
        Long asset =
                db.queryForObject(
                        "SELECT id FROM media_assets WHERE object_key=?", Long.class, key);
        Long actor =
                db.queryForObject("SELECT id FROM users WHERE username=?", Long.class, operator);
        db.update(
                "INSERT INTO mission_media (mission_id,media_id,media_role,uploaded_by,created_at,updated_at) VALUES (?,?,'OUTPUT',?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)",
                missionId,
                asset,
                actor);
    }

    static void accept(
            com.uav.platform.service.mission.MissionService missions,
            Long id,
            org.springframework.security.core.Authentication actor) {
        var mission = missions.get(id, actor);
        if (!mission.operatorAccepted())
            missions.acceptOperator(
                    id,
                    new com.uav.platform.dto.request.mission.MissionAcceptanceRequest(
                            mission.version()),
                    actor);
    }
}
