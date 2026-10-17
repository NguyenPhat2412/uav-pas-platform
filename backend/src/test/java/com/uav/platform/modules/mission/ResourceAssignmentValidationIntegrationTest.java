package com.uav.platform.modules.mission;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.uav.platform.modules.billing.repository.ServicePlanRepository;
import com.uav.platform.modules.inventory.dto.request.QuantityRequest;
import com.uav.platform.modules.inventory.entity.Equipment;
import com.uav.platform.modules.inventory.enums.EquipmentType;
import com.uav.platform.modules.inventory.repository.EquipmentRepository;
import com.uav.platform.modules.inventory.service.InventoryService;
import com.uav.platform.modules.mission.dto.request.MissionCreateRequest;
import com.uav.platform.modules.mission.enums.MissionPriority;
import com.uav.platform.modules.mission.enums.MissionStatus;
import com.uav.platform.modules.mission.enums.MissionType;
import com.uav.platform.modules.mission.service.MissionService;
import com.uav.platform.modules.station.entity.Station;
import com.uav.platform.modules.station.enums.StationStatus;
import com.uav.platform.modules.station.repository.StationRepository;
import com.uav.platform.modules.station.service.impl.StationOperations;
import com.uav.platform.modules.uav.entity.Uav;
import com.uav.platform.modules.uav.repository.UavRepository;
import com.uav.platform.modules.user.entity.AppUser;
import com.uav.platform.modules.user.enums.UserRole;
import com.uav.platform.modules.user.enums.UserStatus;
import com.uav.platform.modules.user.repository.UserRepository;
import com.uav.platform.support.ServicePlanTestData;

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

/** Uses the actual MVC JSON converter, validation, security chain, services and database. */
@SpringBootTest(
        properties =
                "spring.datasource.url=jdbc:h2:mem:uav_assignment_validation;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE")
class ResourceAssignmentValidationIntegrationTest {
    @Autowired WebApplicationContext context;
    @Autowired ServicePlanRepository servicePlans;
    @Autowired MissionService missions;
    @Autowired UserRepository users;
    @Autowired StationRepository stations;
    @Autowired UavRepository uavs;
    @Autowired EquipmentRepository equipment;
    @Autowired InventoryService inventory;
    @Autowired JdbcTemplate db;
    private MockMvc mvc;
    private AppUser admin;
    private Long missionId;
    private Long stationId;
    private Long uavId;
    private Long operatorId;
    private Long equipmentId;

    @BeforeEach
    void fixture() {
        ServicePlanTestData.ensureBasicPlan(servicePlans);
        mvc =
                MockMvcBuilders.webAppContextSetup(context)
                        .defaultRequest(
                                org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                                        .get("/")
                                        .with(
                                                org.springframework.security.test.web.servlet
                                                        .request
                                                        .SecurityMockMvcRequestPostProcessors
                                                        .csrf()))
                        .apply(springSecurity())
                        .build();
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        admin = user("validation_admin_" + suffix, UserRole.ROLE_ADMIN);
        var customer = user("validation_customer_" + suffix, UserRole.ROLE_PILOT);
        operatorId = user("validation_operator_" + suffix, UserRole.ROLE_OPERATOR).getId();
        Station station =
                stations.save(
                        StationOperations.create(
                                "VAL-" + suffix,
                                "Validation station",
                                "Hanoi",
                                null,
                                null,
                                StationStatus.ACTIVE));
        stationId = station.getId();
        Uav uav = new Uav("Validation UAV", "VAL-" + suffix, "Synthetic");
        uav.setStation(station);
        uavId = uavs.save(uav).getId();
        equipmentId =
                equipment
                        .save(
                                new Equipment(
                                        "Validation battery", EquipmentType.BATTERY, null, station))
                        .getId();
        inventory.stockIn(
                equipmentId, new QuantityRequest(5, "Synthetic stock"), admin.getUsername());
        LocalDateTime start = LocalDateTime.now().plusDays(4).withNano(0);
        missionId =
                missions.create(
                                new MissionCreateRequest(
                                        MissionType.AREA_INSPECTION,
                                        "Validation mission",
                                        null,
                                        start.toLocalDate(),
                                        start,
                                        start.plusHours(1),
                                        "Hanoi",
                                        null,
                                        null,
                                        null,
                                        MissionPriority.NORMAL,
                                        null),
                                customer.getUsername())
                        .id();
        missions.submit(missionId, auth(customer));
        missions.confirm(missionId, auth(admin));
    }

    @ParameterizedTest
    @ValueSource(strings = {"assign-station", "assign-uav", "assign-operator", "reserve-equipment"})
    void missingQuantityReturns400WithoutMutation(String action) throws Exception {
        assertInvalid(action, "{\"resourceId\":" + resourceId(action) + "}");
    }

    @ParameterizedTest
    @ValueSource(strings = {"assign-station", "assign-uav", "assign-operator", "reserve-equipment"})
    void nullQuantityReturns400WithoutMutation(String action) throws Exception {
        assertInvalid(action, "{\"resourceId\":" + resourceId(action) + ",\"quantity\":null}");
    }

    @ParameterizedTest
    @ValueSource(strings = {"assign-station", "assign-uav", "assign-operator", "reserve-equipment"})
    void zeroQuantityReturns400WithoutMutation(String action) throws Exception {
        assertInvalid(action, "{\"resourceId\":" + resourceId(action) + ",\"quantity\":0}");
    }

    @ParameterizedTest
    @ValueSource(strings = {"assign-station", "assign-uav", "assign-operator", "reserve-equipment"})
    void negativeQuantityReturns400WithoutMutation(String action) throws Exception {
        assertInvalid(action, "{\"resourceId\":" + resourceId(action) + ",\"quantity\":-1}");
    }

    @ParameterizedTest
    @ValueSource(strings = {"assign-station", "assign-uav", "assign-operator", "reserve-equipment"})
    void missingResourceIdReturns400WithoutMutation(String action) throws Exception {
        assertInvalid(action, "{\"quantity\":1}");
    }

    @ParameterizedTest
    @ValueSource(strings = {"assign-station", "assign-uav", "assign-operator", "reserve-equipment"})
    void nullResourceIdReturns400WithoutMutation(String action) throws Exception {
        assertInvalid(action, "{\"resourceId\":null,\"quantity\":1}");
    }

    @Test
    void validRequestsStillAssignEveryResourceAndReserveRequestedQuantity() throws Exception {
        for (String action :
                List.of("assign-station", "assign-uav", "assign-operator", "reserve-equipment")) {
            int quantity = action.equals("reserve-equipment") ? 2 : 1;
            mvc.perform(
                            post(endpoint(action))
                                    .with(authentication(auth(admin)))
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content(
                                            "{\"resourceId\":"
                                                    + resourceId(action)
                                                    + ",\"quantity\":"
                                                    + quantity
                                                    + "}"))
                    .andExpect(status().isOk());
        }
        var assigned = missions.get(missionId, auth(admin));
        assertEquals(stationId, assigned.stationId());
        assertEquals(uavId, assigned.uavId());
        assertEquals(operatorId, assigned.operatorId());
        assertEquals(MissionStatus.RESOURCE_RESERVED, assigned.status());
        assertEquals(2, inventory.get(equipmentId).reservedQuantity());
        assertEquals(3, inventory.get(equipmentId).availableQuantity());
    }

    private void assertInvalid(String action, String payload) throws Exception {
        var before = snapshot();
        mvc.perform(
                        post(endpoint(action))
                                .with(authentication(auth(admin)))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(payload))
                .andExpect(status().isBadRequest());
        assertEquals(
                before,
                snapshot(),
                "Rejected input must not alter mission, UAV, stock, timeline or audit");
    }

    private String endpoint(String action) {
        return "/api/v1/missions/" + missionId + "/" + action;
    }

    private Long resourceId(String action) {
        return switch (action) {
            case "assign-station" -> stationId;
            case "assign-uav" -> uavId;
            case "assign-operator" -> operatorId;
            default -> equipmentId;
        };
    }

    private List<?> snapshot() {
        return List.of(
                db.queryForMap(
                        "SELECT status, station_id, uav_id, operator_id, version FROM missions WHERE id=?",
                        missionId),
                db.queryForMap("SELECT status FROM uavs WHERE id=?", uavId),
                db.queryForMap(
                        "SELECT quantity, available_quantity, reserved_quantity, version FROM equipment WHERE id=?",
                        equipmentId),
                db.queryForObject(
                        "SELECT count(*) FROM mission_events WHERE mission_id=?",
                        Integer.class,
                        missionId),
                db.queryForObject(
                        "SELECT count(*) FROM audit_logs WHERE actor_username=?",
                        Integer.class,
                        admin.getUsername()));
    }

    private AppUser user(String name, UserRole role) {
        return users.save(
                new AppUser(
                        name,
                        name + "@example.invalid",
                        "synthetic-placeholder",
                        null,
                        null,
                        null,
                        null,
                        role,
                        UserStatus.ACTIVE));
    }

    private UsernamePasswordAuthenticationToken auth(AppUser user) {
        return UsernamePasswordAuthenticationToken.authenticated(
                user.getUsername(), "n/a", List.of());
    }
}
