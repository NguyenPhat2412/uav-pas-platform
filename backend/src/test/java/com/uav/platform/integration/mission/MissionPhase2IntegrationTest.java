package com.uav.platform.integration.mission;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.uav.platform.dto.request.inventory.QuantityRequest;
import com.uav.platform.dto.request.mission.*;
import com.uav.platform.dto.response.mission.*;
import com.uav.platform.entity.inventory.*;
import com.uav.platform.entity.mission.*;
import com.uav.platform.entity.station.*;
import com.uav.platform.entity.uav.*;
import com.uav.platform.entity.user.AppUser;
import com.uav.platform.enums.audit.*;
import com.uav.platform.enums.inventory.*;
import com.uav.platform.enums.media.*;
import com.uav.platform.enums.mission.*;
import com.uav.platform.enums.station.*;
import com.uav.platform.enums.uav.*;
import com.uav.platform.enums.user.UserRole;
import com.uav.platform.enums.user.UserStatus;
import com.uav.platform.repository.billing.ServicePlanRepository;
import com.uav.platform.repository.inventory.EquipmentRepository;
import com.uav.platform.repository.station.StationRepository;
import com.uav.platform.repository.uav.UavRepository;
import com.uav.platform.repository.user.UserRepository;
import com.uav.platform.service.impl.station.StationOperations;
import com.uav.platform.service.inventory.InventoryService;
import com.uav.platform.service.mission.MissionService;
import com.uav.platform.support.ServicePlanTestData;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@SpringBootTest
@Transactional
class MissionPhase2IntegrationTest {
    @Autowired ServicePlanRepository servicePlans;
    @Autowired MissionService missions;
    @Autowired org.springframework.jdbc.core.JdbcTemplate db;
    @Autowired UserRepository users;
    @Autowired StationRepository stations;
    @Autowired UavRepository uavs;
    @Autowired EquipmentRepository equipment;
    @Autowired InventoryService inventory;
    @Autowired PasswordEncoder encoder;

    @Test
    void customerToOperatorDemoFlowCompletesAndReleasesResources() {
        ServicePlanTestData.ensureBasicPlan(servicePlans);
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        AppUser customer =
                users.save(
                        new AppUser(
                                "customer_" + suffix,
                                "customer_" + suffix + "@test.vn",
                                encoder.encode("Secret123!"),
                                null,
                                UserStatus.ACTIVE));
        AppUser operator =
                users.save(
                        new AppUser(
                                "operator_" + suffix,
                                "operator_" + suffix + "@test.vn",
                                encoder.encode("Secret123!"),
                                null,
                                null,
                                null,
                                null,
                                UserRole.ROLE_OPERATOR,
                                UserStatus.ACTIVE));
        AppUser admin =
                users.save(
                        new AppUser(
                                "admin_" + suffix,
                                "admin_" + suffix + "@test.vn",
                                encoder.encode("Secret123!"),
                                null,
                                null,
                                null,
                                null,
                                UserRole.ROLE_ADMIN,
                                UserStatus.ACTIVE));
        Station station =
                stations.save(
                        StationOperations.create(
                                "ST-" + suffix,
                                "Hanoi Station",
                                "Hanoi",
                                null,
                                null,
                                StationStatus.ACTIVE));
        Uav uav = new Uav("Mavic", "UAV-" + suffix, "DJI");
        uav.setStation(station);
        uav = uavs.save(uav);
        Equipment battery =
                equipment.save(
                        new Equipment("Battery", EquipmentType.BATTERY, "BAT-" + suffix, station));
        inventory.stockIn(battery.getId(), new QuantityRequest(2, "seed"), admin.getUsername());

        var customerAuth = auth(customer.getUsername());
        var adminAuth = auth(admin.getUsername());
        var operatorAuth = auth(operator.getUsername());
        MissionResponse created =
                missions.create(
                        new MissionCreateRequest(
                                MissionType.AREA_INSPECTION,
                                "Inspect north sector",
                                "Demo mission",
                                LocalDate.now().plusDays(1),
                                LocalDateTime.now().plusDays(1),
                                LocalDateTime.now().plusDays(1).plusHours(2),
                                "Hanoi",
                                null,
                                null,
                                null,
                                MissionPriority.NORMAL,
                                null),
                        customer.getUsername());
        missions.submit(created.id(), customerAuth);
        missions.confirm(created.id(), adminAuth);
        missions.assignStation(
                created.id(), new ResourceAssignmentRequest(station.getId()), adminAuth);
        missions.assignUav(created.id(), new ResourceAssignmentRequest(uav.getId()), adminAuth);
        missions.assignOperator(
                created.id(), new ResourceAssignmentRequest(operator.getId()), adminAuth);
        MissionResponse reserved =
                missions.reserveEquipment(
                        created.id(),
                        new ResourceAssignmentRequest(battery.getId(), 1, "flight"),
                        adminAuth);
        assertEquals(MissionStatus.RESOURCE_RESERVED, reserved.status());
        MissionHandoverTestData.accept(missions, created.id(), operatorAuth);
        missions.ready(created.id(), adminAuth);
        missions.start(created.id(), operatorAuth);
        MissionHandoverTestData.result(db, created.id(), operator.getUsername());
        MissionResponse completed =
                missions.complete(
                        created.id(),
                        new MissionCompletionRequest("Flight complete", "Good"),
                        operatorAuth);

        assertEquals(MissionStatus.COMPLETED, completed.status());
        assertEquals(UavStatus.AVAILABLE, uavs.findById(uav.getId()).orElseThrow().getStatus());
        assertEquals(2, equipment.findById(battery.getId()).orElseThrow().getAvailableQuantity());
    }

    private UsernamePasswordAuthenticationToken auth(String username) {
        return UsernamePasswordAuthenticationToken.authenticated(username, "n/a", List.of());
    }
}
