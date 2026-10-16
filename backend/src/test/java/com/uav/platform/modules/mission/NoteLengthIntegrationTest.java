package com.uav.platform.modules.mission;

import com.uav.platform.modules.inventory.common.EquipmentType;
import com.uav.platform.modules.inventory.config.request.QuantityRequest;
import com.uav.platform.modules.inventory.entity.Equipment;
import com.uav.platform.modules.inventory.repository.EquipmentRepository;
import com.uav.platform.modules.inventory.service.InventoryService;
import com.uav.platform.modules.mission.common.MissionPriority;
import com.uav.platform.modules.mission.common.MissionStatus;
import com.uav.platform.modules.mission.common.MissionType;
import com.uav.platform.modules.mission.config.request.MissionCreateRequest;
import com.uav.platform.modules.mission.service.MissionService;
import com.uav.platform.modules.station.common.StationStatus;
import com.uav.platform.modules.station.entity.Station;
import com.uav.platform.modules.station.repository.StationRepository;
import com.uav.platform.modules.uav.entity.Uav;
import com.uav.platform.modules.uav.repository.UavRepository;
import com.uav.platform.modules.user.common.UserRole;
import com.uav.platform.modules.user.common.UserStatus;
import com.uav.platform.modules.user.entity.AppUser;
import com.uav.platform.modules.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.junit.jupiter.api.Assertions.assertTrue;
import java.util.Map;
import tools.jackson.databind.ObjectMapper;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** HTTP note limits must reject before transactional state, stock or audit changes. */
@SpringBootTest(properties = "spring.datasource.url=jdbc:h2:mem:uav_note_validation;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE")
class NoteLengthIntegrationTest {
    @Autowired WebApplicationContext context;
    @Autowired MissionService missions;
    @Autowired UserRepository users;
    @Autowired StationRepository stations;
    @Autowired UavRepository uavs;
    @Autowired EquipmentRepository equipment;
    @Autowired InventoryService inventory;
    @Autowired JdbcTemplate db;
    @Autowired ObjectMapper json;
    MockMvc mvc;
    AppUser admin, customer, operator;
    Long missionId, stationId, uavId, equipmentId;
    LocalDateTime start;

    @BeforeEach
    void fixture() {
        mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        admin = user("note_admin_" + suffix, UserRole.ROLE_ADMIN);
        customer = user("note_customer_" + suffix, UserRole.ROLE_PILOT);
        operator = user("note_operator_" + suffix, UserRole.ROLE_OPERATOR);
        Station station = stations.save(new Station("NOTE-" + suffix, "Note station", "Hanoi", null, null, StationStatus.ACTIVE));
        stationId = station.getId();
        Uav uav = new Uav("Note UAV", "NOTE-" + suffix, "Synthetic"); uav.setStation(station);
        uavId = uavs.save(uav).getId();
        equipmentId = equipment.save(new Equipment("Note battery", EquipmentType.BATTERY, null, station)).getId();
        inventory.stockIn(equipmentId, new QuantityRequest(5, "Fixture"), admin.getUsername());
        start = LocalDateTime.now().plusDays(4).withNano(0);
        missionId = missions.create(new MissionCreateRequest(MissionType.AREA_INSPECTION, "Note mission", null,
                start.toLocalDate(), start, start.plusHours(1), "Hanoi", null, null, null, MissionPriority.NORMAL, null), customer.getUsername()).id();
    }

    @ParameterizedTest
    @ValueSource(strings = {"reject", "report-conflict", "complete", "equipmentCondition", "failureReason", "failureNotes", "create", "update", "stock-in", "stock-out", "reserve", "release", "transfer"})
    void oversizedNoteReturns400WithoutMutation(String action) throws Exception {
        prepare(action);
        var before = snapshot();
        var response = invoke(action, "á".repeat(limit(action) + 1));
        assertEquals(400, response.getResponse().getStatus(), "Oversized " + action + " must be an input error, not a persistence error");
        assertEquals(before, snapshot(), "No mission, UAV, stock, timeline or audit may change");
    }

    @ParameterizedTest
    @ValueSource(strings = {"reject", "report-conflict", "complete", "equipmentCondition", "failureReason", "failureNotes", "create", "update", "stock-in", "stock-out", "reserve", "release", "transfer"})
    void maximumLengthNoteIsPersistedWithoutTruncation(String action) throws Exception {
        prepare(action);
        String note = "á".repeat(limit(action));
        var response = invoke(action, note).getResponse();
        assertTrue(response.getStatus() >= 200 && response.getStatus() < 300, action + " valid boundary status=" + response.getStatus());
        if (List.of("stock-in", "stock-out", "reserve", "release", "transfer").contains(action)) {
            assertEquals(note, db.queryForObject("SELECT note FROM inventory_movements WHERE equipment_id=? ORDER BY id DESC LIMIT 1", String.class, equipmentId));
        } else if (action.equals("reject")) {
            assertEquals(note, db.queryForObject("SELECT description FROM mission_events WHERE mission_id=? ORDER BY id DESC LIMIT 1", String.class, missionId));
        } else {
            Long id = action.equals("create") ? json.readTree(response.getContentAsString()).get("id").asLong() : missionId;
            String column = switch (action) { case "report-conflict" -> "operator_conflict_note"; case "complete" -> "completion_note"; case "equipmentCondition" -> "equipment_condition"; case "failureReason" -> "failure_reason"; case "failureNotes" -> "failure_notes"; default -> "notes"; };
            assertEquals(note, db.queryForObject("SELECT " + column + " FROM missions WHERE id=?", String.class, id));
        }
    }

    @Test
    void missingCompletionNotesAreRejectedWithoutReleasingResources() throws Exception {
        prepare("complete");
        mvc.perform(post("/api/v1/missions/" + missionId + "/complete").with(authentication(auth(operator)))
                .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest());
        assertEquals(MissionStatus.IN_PROGRESS, missions.get(missionId, auth(admin)).status());
        assertEquals(3, inventory.get(equipmentId).availableQuantity());
    }

    private int limit(String action) { return switch(action) { case "failureNotes", "create", "update" -> 2000; case "stock-in", "stock-out", "reserve", "release", "transfer" -> 255; default -> 500; }; }
    private void prepare(String action) {
        if (List.of("create", "update", "stock-in", "stock-out", "reserve", "transfer").contains(action)) return;
        if (action.equals("release")) { inventory.reserve(equipmentId, new QuantityRequest(2, "Fixture"), admin.getUsername()); return; }
        missions.submit(missionId, auth(customer)); missions.confirm(missionId, auth(admin));
        missions.assignStation(missionId, new com.uav.platform.modules.mission.config.request.ResourceAssignmentRequest(stationId), auth(admin));
        missions.assignUav(missionId, new com.uav.platform.modules.mission.config.request.ResourceAssignmentRequest(uavId), auth(admin));
        missions.assignOperator(missionId, new com.uav.platform.modules.mission.config.request.ResourceAssignmentRequest(operator.getId()), auth(admin));
        if (action.equals("reject") || action.equals("report-conflict")) return;
        missions.reserveEquipment(missionId, new com.uav.platform.modules.mission.config.request.ResourceAssignmentRequest(equipmentId, 2, null), auth(admin));
        MissionHandoverTestData.accept(missions,missionId,auth(operator));
        missions.ready(missionId, auth(admin)); missions.start(missionId, auth(operator));
        MissionHandoverTestData.result(db,missionId,operator.getUsername());
    }
    private org.springframework.test.web.servlet.MvcResult invoke(String action, String note) throws Exception {
        var request = post("/api/v1/missions/" + missionId + "/" + action).with(authentication(auth(operator)));
        if (action.equals("reject")) request = post("/api/v1/missions/" + missionId + "/reject").param("reason", note).with(authentication(auth(admin)));
        else if (action.equals("report-conflict")) request.param("note", note);
        else if (List.of("complete", "equipmentCondition", "failureReason", "failureNotes").contains(action)) {
            boolean fail = action.startsWith("failure");
            request = post("/api/v1/missions/" + missionId + (fail ? "/fail" : "/complete")).with(authentication(auth(operator)));
            Map<String,String> body = switch(action) { case "complete" -> Map.of("completionNote",note,"equipmentCondition","Intact"); case "equipmentCondition" -> Map.of("equipmentCondition",note,"completionNote","Done"); case "failureReason" -> Map.of("failureReason",note); default -> Map.of("failureReason","Fixture reason","notes",note); };
            request.contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body));
        } else if (action.equals("create") || action.equals("update")) {
            Map<String,Object> body = new java.util.HashMap<>(Map.of("missionType","AREA_INSPECTION","title","Note mission","requestedDate",start.toLocalDate().toString(),"startTime",start.toString(),"expectedEndTime",start.plusHours(1).toString(),"locationName","Hanoi","notes",note));
            if (action.equals("update")) body.put("expectedVersion", missions.get(missionId, auth(customer)).version());
            request = (action.equals("create") ? post("/api/v1/missions") : patch("/api/v1/missions/" + missionId)).with(authentication(auth(customer))).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body));
        } else {
            request = post("/api/v1/inventory/equipment/" + equipmentId + "/" + action).with(authentication(auth(admin))).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("quantity",1,"note",note)));
            if (action.equals("transfer")) {
                var target = stations.save(new Station("DEST-" + UUID.randomUUID().toString().substring(0,8),"Target","Hanoi",null,null,StationStatus.ACTIVE));
                request = post("/api/v1/inventory/equipment/" + equipmentId + "/transfer/" + target.getId()).with(authentication(auth(admin))).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("quantity",1,"note",note)));
            }
        }
        return mvc.perform(request).andReturn();
    }
    private List<?> snapshot() {
        return List.of(db.queryForMap("SELECT status, station_id, uav_id, operator_id, version, coalesce(notes,'') as notes FROM missions WHERE id=?", missionId),
            db.queryForMap("SELECT status FROM uavs WHERE id=?", uavId),
            db.queryForMap("SELECT quantity, available_quantity, reserved_quantity, version FROM equipment WHERE id=?", equipmentId),
            db.queryForObject("SELECT count(*) FROM missions", Integer.class),
            db.queryForObject("SELECT count(*) FROM mission_events", Integer.class),
            db.queryForObject("SELECT count(*) FROM inventory_movements", Integer.class),
            db.queryForObject("SELECT count(*) FROM audit_logs", Integer.class));
    }
    private AppUser user(String name, UserRole role) { return users.save(new AppUser(name,name+"@example.invalid","synthetic-placeholder",null,null,null,null,role,UserStatus.ACTIVE)); }
    private UsernamePasswordAuthenticationToken auth(AppUser user) { return UsernamePasswordAuthenticationToken.authenticated(user.getUsername(),"n/a",List.of()); }
}
