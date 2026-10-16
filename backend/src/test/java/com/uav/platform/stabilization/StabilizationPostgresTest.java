package com.uav.platform.stabilization;

import com.uav.platform.modules.user.common.*;
import com.uav.platform.modules.uav.common.*;
import com.uav.platform.modules.station.common.*;
import com.uav.platform.modules.inventory.common.*;
import com.uav.platform.modules.media.common.*;
import com.uav.platform.modules.audit.common.*;
import com.uav.platform.modules.mission.common.*;

import com.uav.platform.modules.user.entity.*;
import com.uav.platform.modules.user.repository.UserRepository;
import com.uav.platform.modules.user.service.*;
import com.uav.platform.modules.inventory.config.request.*;
import com.uav.platform.modules.inventory.config.response.*;
import com.uav.platform.modules.inventory.entity.*;
import com.uav.platform.modules.inventory.repository.EquipmentRepository;
import com.uav.platform.modules.inventory.service.InventoryService;
import com.uav.platform.modules.station.config.request.StationRequest;
import com.uav.platform.modules.station.service.StationService;
import com.uav.platform.error.SystemException;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import java.util.*;
import java.util.concurrent.*;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@EnabledIfEnvironmentVariable(named="UAV_STABILIZATION_DB_URL", matches="jdbc:postgresql://127\\.0\\.0\\.1:[0-9]+/uav_(stabilization|ba_test_suite)")
class StabilizationPostgresTest {
    private static final String SCHEMA="stabilization_"+UUID.randomUUID().toString().replace("-","");
    @DynamicPropertySource static void database(DynamicPropertyRegistry p) {
        p.add("spring.datasource.url",()->System.getenv("UAV_STABILIZATION_DB_URL"));
        p.add("spring.datasource.username",()->System.getenv("UAV_STABILIZATION_DB_USER"));
        p.add("spring.datasource.password",()->System.getenv("UAV_STABILIZATION_DB_PASSWORD"));
        p.add("spring.datasource.driver-class-name",()->"org.postgresql.Driver");
        p.add("spring.jpa.database-platform",()->"org.hibernate.dialect.PostgreSQLDialect");
        p.add("spring.flyway.enabled",()->true);
        p.add("spring.flyway.schemas",()->SCHEMA);
        p.add("spring.flyway.default-schema",()->SCHEMA);
        p.add("spring.jpa.properties.hibernate.default_schema",()->SCHEMA);
        p.add("spring.datasource.hikari.connection-init-sql",()->"SET search_path TO "+SCHEMA);
        p.add("spring.jpa.hibernate.ddl-auto",()->"validate");
        p.add("app.phase1.compatibility-schema.enabled",()->false);
    }
    @Autowired JdbcTemplate db;
    @Autowired InventoryService inventory;
    @Autowired EquipmentRepository equipment;
    @Autowired StationService stations;
    @Autowired UserRepository users;
    @Autowired PermissionService permissions;
    @Autowired UserService userService;
    @BeforeEach void cleanIsolatedSchema() {
        db.execute("TRUNCATE users,uav_stations,equipment,media_assets,inventory_movements,audit_logs CASCADE");
    }
    EquipmentResponse batch(int amount) {
        var item=inventory.create(new EquipmentRequest("Battery batch",EquipmentType.BATTERY,null,null),"sample");
        return inventory.stockIn(item.id(),new QuantityRequest(amount,"sample","stock-"+UUID.randomUUID()),"sample");
    }
    @Test void concurrentReservationsCannotOverAllocateAndHaveMatchingAudit() throws Exception {
        var item=batch(5);
        var pool=Executors.newFixedThreadPool(8); var gate=new CountDownLatch(1);
        try {
            List<Future<Boolean>> outcomes=new ArrayList<>();
            for(int i=0;i<8;i++) outcomes.add(pool.submit(()->{gate.await();try{inventory.reserve(item.id(),new QuantityRequest(1,"reserve",UUID.randomUUID().toString()),"sample");return true;}catch(IllegalStateException ex){return false;}}));
            gate.countDown(); long successes=0;
            for(var outcome:outcomes) if(outcome.get(20,TimeUnit.SECONDS)) successes++;
            assertEquals(5,successes);
            var finalItem=inventory.get(item.id()); assertEquals(0,finalItem.availableQuantity()); assertEquals(5,finalItem.reservedQuantity());
            assertEquals(5,db.queryForObject("SELECT count(*) FROM inventory_movements WHERE type='RESERVE'",Integer.class));
            assertEquals(5,db.queryForObject("SELECT count(*) FROM audit_logs WHERE action='RESERVE'",Integer.class));
        } finally {pool.shutdownNow();}
    }
    @Test void simultaneousReplayAppliesOnlyOnceAndRejectsPayloadReuse() throws Exception {
        var item=batch(5); var pool=Executors.newFixedThreadPool(4); var gate=new CountDownLatch(1);
        try {
            List<Future<EquipmentResponse>> outcomes=new ArrayList<>();
            for(int i=0;i<4;i++) outcomes.add(pool.submit(()->{gate.await();return inventory.reserve(item.id(),new QuantityRequest(2,"same","same-id"),"sample");}));
            gate.countDown();for(var outcome:outcomes) outcome.get(20,TimeUnit.SECONDS);
            assertEquals(3,inventory.get(item.id()).availableQuantity());
            assertEquals(1,db.queryForObject("SELECT count(*) FROM inventory_movements WHERE request_id='same-id'",Integer.class));
            assertThrows(SystemException.class,()->inventory.reserve(item.id(),new QuantityRequest(3,"same","same-id"),"sample"));
            inventory.release(item.id(),new QuantityRequest(2,"return","return-id"),"sample");
            inventory.release(item.id(),new QuantityRequest(2,"return","return-id"),"sample");
            assertEquals(5,inventory.get(item.id()).availableQuantity());
        } finally {pool.shutdownNow();}
    }
    @Test void invalidQuantitiesRollbackMovementAndAudit() {
        var item=batch(3);
        assertThrows(IllegalArgumentException.class,()->inventory.reserve(item.id(),new QuantityRequest(-1,"bad"),"sample"));
        assertThrows(IllegalStateException.class,()->inventory.reserve(item.id(),new QuantityRequest(4,"bad"),"sample"));
        assertThrows(IllegalStateException.class,()->inventory.release(item.id(),new QuantityRequest(1,"bad"),"sample"));
        assertEquals(3,inventory.get(item.id()).availableQuantity());
        assertEquals(1,db.queryForObject("SELECT count(*) FROM inventory_movements",Integer.class));
        assertEquals(0,db.queryForObject("SELECT count(*) FROM audit_logs WHERE action IN ('RESERVE','RELEASE')",Integer.class));
    }
    @Test void fullAndPartialTransfersPreservePerStationStock() {
        var a=stations.create(new StationRequest("SAMPLE-A","Source",null,null,null,null),"sample");
        var b=stations.create(new StationRequest("SAMPLE-B","Target",null,null,null,null),"sample");
        var source=inventory.create(new EquipmentRequest("Batteries",EquipmentType.BATTERY,null,a.id()),"sample");
        inventory.stockIn(source.id(),new QuantityRequest(10,"seed"),"sample");
        inventory.transfer(source.id(),b.id(),new QuantityRequest(4,"partial","partial-id"),"sample");
        assertEquals(6,inventory.get(source.id()).quantity()); assertEquals(a.id(),inventory.get(source.id()).stationId());
        assertEquals(4,db.queryForObject("SELECT sum(quantity) FROM equipment WHERE station_id=?",Integer.class,b.id()));
        inventory.transfer(source.id(),b.id(),new QuantityRequest(6,"full","full-id"),"sample");
        inventory.transfer(source.id(),b.id(),new QuantityRequest(6,"full","full-id"),"sample");
        assertEquals(b.id(),inventory.get(source.id()).stationId());
        assertEquals(10,db.queryForObject("SELECT sum(quantity) FROM equipment WHERE station_id=?",Integer.class,b.id()));
        assertEquals(2,db.queryForObject("SELECT count(*) FROM inventory_movements WHERE type='TRANSFER'",Integer.class));
        assertEquals(2,db.queryForObject("SELECT count(*) FROM audit_logs WHERE action='TRANSFER'",Integer.class));
    }
    @Test void concurrentRecoveryRevocationsRetainOneEffectiveManager() throws Exception {
        var a=users.save(new AppUser("manager_a","a@example.test","hash",null,UserStatus.ACTIVE));
        var b=users.save(new AppUser("manager_b","b@example.test","hash",null,UserStatus.ACTIVE));
        for(var u:List.of(a,b)) {permissions.setUserPermission(u.getId(),PermissionCode.PERMISSION_MANAGE,true,"setup");permissions.setUserPermission(u.getId(),PermissionCode.USER_MANAGE,true,"setup");}
        var pool=Executors.newFixedThreadPool(2);var gate=new CountDownLatch(1);
        try {
            List<Future<Boolean>> results=new ArrayList<>();
            for(var u:List.of(a,b)) results.add(pool.submit(()->{gate.await();try{permissions.setUserPermission(u.getId(),PermissionCode.PERMISSION_MANAGE,false,"sample");return true;}catch(SystemException ex){return false;}}));
            gate.countDown();int success=0;for(var result:results) if(result.get(20,TimeUnit.SECONDS)) success++;
            assertEquals(1,success);
        } finally {pool.shutdownNow();}
    }
}
