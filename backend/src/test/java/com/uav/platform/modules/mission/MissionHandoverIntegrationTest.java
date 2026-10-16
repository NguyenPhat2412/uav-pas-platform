package com.uav.platform.modules.mission;

import com.uav.platform.modules.mission.common.MediaRole;
import com.uav.platform.modules.mission.config.request.ResourceAssignmentRequest;

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
@SpringBootTest(properties = "spring.datasource.url=jdbc:h2:mem:uav_handover;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE")
class MissionHandoverIntegrationTest {
    @Autowired WebApplicationContext context;
    @Autowired MissionService missions;
    @Autowired UserRepository users;
    @Autowired StationRepository stations;
    @Autowired UavRepository uavs;
    @Autowired EquipmentRepository equipment;
    @Autowired InventoryService inventory;
    @Autowired JdbcTemplate db;
    @Autowired ObjectMapper json;
    @Autowired com.uav.platform.modules.media.repository.MediaAssetRepository assets;
    @Autowired com.uav.platform.modules.mission.repository.MissionMediaRepository links;
    @Autowired com.uav.platform.modules.mission.repository.MissionRepository missionRepository;
    @org.springframework.test.context.bean.override.mockito.MockitoSpyBean
    com.uav.platform.modules.audit.service.AuditLogService audit;
    MockMvc mvc;
    AppUser admin, customer, operator;
    Long missionId, stationId, uavId, equipmentId;
    LocalDateTime start;

    @BeforeEach
    void fixture() {
        mvc = MockMvcBuilders.webAppContextSetup(context)
                .defaultRequest(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/")
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf()))
                .apply(springSecurity()).build();
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

    @Test void readyRequiresAcceptanceAndDoesNotChangeResources() throws Exception {
        allocate(); var before = snapshot();
        command("ready", admin, null, 409);
        assertEquals(before, snapshot());
        accept(); command("ready", admin, null, 200);
    }

    @Test void startRechecksAcceptanceForExistingReadyRows() throws Exception {
        allocate(); accept(); command("ready", admin, null, 200);
        db.update("UPDATE missions SET operator_accepted=false WHERE id=?", missionId);
        var before=snapshot(); command("start", operator, null, 409); assertEquals(before,snapshot());
    }

    @Test void acceptanceRequiresCurrentVersionAndCannotRepeat() throws Exception {
        allocate(); long v=missions.get(missionId,auth(operator)).version();
        command("accept", operator, Map.of("expectedVersion", v+10), 409);
        command("accept", operator, Map.of(), 400);
        command("accept", operator, Map.of("expectedVersion", -1), 400);
        command("accept", admin, Map.of("expectedVersion", v), 403);
        command("accept", customer, Map.of("expectedVersion", v), 403);
        command("accept", operator, Map.of("expectedVersion",v),200);
        var before=snapshot(); command("accept",operator,Map.of("expectedVersion",v),409);assertEquals(before,snapshot());
    }

    @Test void newReservationAfterEarlyAcceptanceRequiresAcceptanceAgain() throws Exception {
        allocate(); accept();
        var extra=equipment.save(new Equipment("Extra battery",EquipmentType.BATTERY,null,stations.findById(stationId).orElseThrow()));
        inventory.stockIn(extra.getId(),new QuantityRequest(2,"Fixture"),admin.getUsername());
        missions.reserveEquipment(missionId,new ResourceAssignmentRequest(extra.getId(),1,null),auth(admin));
        assertEquals(false,missions.get(missionId,auth(operator)).operatorAccepted());
        command("ready",admin,null,409);
    }

    @Test void conflictAfterReadyRequiresAcceptanceAndReadyAgain() throws Exception {
        allocate();accept();command("ready",admin,null,200);
        command("report-conflict?note=Weather",operator,null,200);
        assertEquals(MissionStatus.RESOURCE_RESERVED,missions.get(missionId,auth(operator)).status());
        command("start",operator,null,409);accept();command("ready",admin,null,200);command("start",operator,null,200);
    }

    @Test void conflictResponseVersionCanBeUsedForReacceptance() throws Exception {
        allocate();accept();command("ready",admin,null,200);
        var response=mvc.perform(post("/api/v1/missions/"+missionId+"/report-conflict").param("note","Check battery")
                .with(authentication(auth(operator)))).andReturn().getResponse();
        assertEquals(200,response.getStatus());
        long returnedVersion=json.readTree(response.getContentAsString()).get("version").asLong();
        assertEquals(missions.get(missionId,auth(operator)).version(),returnedVersion,"Mutation response must carry the persisted revision");
        command("accept",operator,Map.of("expectedVersion",returnedVersion),200);
    }

    @ParameterizedTest @ValueSource(strings={"{}","{\"completionNote\":\"Done\"}","{\"equipmentCondition\":\"Intact\"}","{\"completionNote\":\"   \",\"equipmentCondition\":\"Intact\"}","{\"completionNote\":\"Done\",\"equipmentCondition\":\"  \\n\"}"})
    void missingCompletionFieldsReturn400AndKeepStock(String body) throws Exception {
        startMission();attach(MediaRole.OUTPUT,true,false);
        var before=snapshot();raw("complete",operator,body,400);assertEquals(before,snapshot());
    }

    @ParameterizedTest @org.junit.jupiter.params.provider.EnumSource(MissionType.class)
    void resultRequirementDependsOnMissionType(MissionType type) throws Exception {
        startMission();db.update("UPDATE missions SET mission_type=? WHERE id=?",type.name(),missionId);
        boolean required=List.of(MissionType.AREA_INSPECTION,MissionType.AERIAL_RECORDING,MissionType.DATA_COLLECTION).contains(type);
        var before=snapshot();command("complete",operator,completion(),required?409:200);
        if(required){assertEquals(before,snapshot());attach(MediaRole.OUTPUT,true,false);command("complete",operator,completion(),200);}
        assertEquals(MissionStatus.COMPLETED,missions.get(missionId,auth(operator)).status());
        assertEquals(0,inventory.get(equipmentId).reservedQuantity());
        assertEquals(5,inventory.get(equipmentId).availableQuantity());
    }

    @ParameterizedTest @ValueSource(strings={"INPUT","FLIGHT_DATA","OTHER","UNCONFIRMED","DELETED","WRONG_MISSION"})
    void invalidEvidenceDoesNotSatisfyCompletion(String kind) throws Exception {
        startMission();
        if(kind.equals("WRONG_MISSION")) {
            var a=asset(true,false); // registered to this mission, but never attached
            assertTrue(a.getId()>0);
        } else attach(kind.equals("UNCONFIRMED")||kind.equals("DELETED")?MediaRole.OUTPUT:MediaRole.valueOf(kind),!kind.equals("UNCONFIRMED"),kind.equals("DELETED"));
        var before=snapshot();command("complete",operator,completion(),409);assertEquals(before,snapshot());
    }

    @Test void documentResultCompletesOnlyForAssignedOperatorAndOnlyOnce() throws Exception {
        startMission();attach(MediaRole.DOCUMENT,true,false);
        command("complete",admin,completion(),403);command("complete",customer,completion(),403);
        command("complete",operator,completion(),200);var before=snapshot();command("complete",operator,completion(),409);assertEquals(before,snapshot());
    }

    @ParameterizedTest @ValueSource(strings={"COMPLETED","FAILED","CANCELLED","REJECTED"})
    void terminalMissionRejectsAllMediaWriteEntrypoints(String state) throws Exception {
        allocate();var existing=asset(false,false);var confirmed=asset(true,false);
        db.update("UPDATE missions SET status=? WHERE id=?",state,missionId);
        var before=snapshot();
        var body=Map.of("originalName","result.txt","contentType","text/plain","size",4,"type","DOCUMENT","linkedEntityType","MISSION","linkedEntityId",missionId.toString());
        command("media/upload-url",operator,body,409);
        rawPath("/api/v1/media",admin,json.writeValueAsString(body),409);
        mvc.perform(get("/api/v1/media/"+existing.getId()+"/upload-url").with(authentication(auth(admin)))).andExpect(status().isConflict());
        rawPath("/api/v1/media/"+existing.getId()+"/confirm",admin,null,409);
        command("media/"+existing.getId()+"/confirm",operator,null,409);
        command("media",operator,Map.of("mediaId",confirmed.getId(),"mediaRole","OUTPUT"),409);
        mvc.perform(delete("/api/v1/media/"+existing.getId()).with(authentication(auth(admin)))).andExpect(status().isConflict());
        assertEquals(before,snapshot());
        command("accept",operator,Map.of("expectedVersion",missions.get(missionId,auth(operator)).version()),409);
        command("report-conflict?note=Late",operator,null,409);
    }

    @Test void completionFailureRollsBackResourceReleaseAndHistory() throws Exception {
        startMission();var before=snapshot();
        command("complete",operator,completion(),409);assertEquals(before,snapshot());
        assertEquals("IN_USE",db.queryForObject("SELECT status FROM uavs WHERE id=?",String.class,uavId));
        assertEquals(2,inventory.get(equipmentId).reservedQuantity());
    }

    @Test void concurrentCompletionsReleaseResourcesExactlyOnce() throws Exception {
        startMission();attach(MediaRole.OUTPUT,true,false);
        var results=race("complete","complete");
        assertEquals(1,results.stream().filter(s->s==200).count());
        assertEquals(1,results.stream().filter(s->s==409).count());
        assertEquals(0,inventory.get(equipmentId).reservedQuantity());
        assertEquals(1,db.queryForObject("SELECT count(*) FROM mission_events WHERE mission_id=? AND event_type='COMPLETED'",Integer.class,missionId));
        assertEquals(1,db.queryForObject("SELECT count(*) FROM inventory_movements WHERE equipment_id=? AND type='RELEASE'",Integer.class,equipmentId));
    }

    @Test void completionAndFailureCannotBothPublishTerminalOutcome() throws Exception {
        startMission();attach(MediaRole.OUTPUT,true,false);
        var results=race("complete","fail");
        assertEquals(1,results.stream().filter(s->s==200).count());
        assertEquals(1,results.stream().filter(s->s==409).count());
        assertEquals(0,inventory.get(equipmentId).reservedQuantity());
        assertEquals(1,db.queryForObject("SELECT count(*) FROM mission_events WHERE mission_id=? AND event_type IN ('COMPLETED','FAILED')",Integer.class,missionId));
    }

    @Test void auditFailureRollsBackHandoverStatusStockAndTimeline() throws Exception {
        startMission();attach(MediaRole.OUTPUT,true,false);var before=snapshot();
        org.mockito.Mockito.doThrow(new IllegalStateException("Injected handover audit failure")).when(audit).record(
            org.mockito.ArgumentMatchers.isNull(),org.mockito.ArgumentMatchers.eq(operator.getUsername()),
            org.mockito.ArgumentMatchers.eq(com.uav.platform.modules.audit.common.AuditAction.STATUS_CHANGE),
            org.mockito.ArgumentMatchers.eq("MISSION"),org.mockito.ArgumentMatchers.eq(missionId.toString()),org.mockito.ArgumentMatchers.eq("COMPLETED"));
        org.junit.jupiter.api.Assertions.assertThrows(IllegalStateException.class,()->missions.complete(missionId,
            new com.uav.platform.modules.mission.config.request.MissionCompletionRequest("Done","Intact"),auth(operator)));
        assertEquals(before,snapshot());
    }

    private List<Integer> race(String first,String second) throws Exception {
        var gate=new java.util.concurrent.CountDownLatch(1);
        var pool=java.util.concurrent.Executors.newFixedThreadPool(2);
        try {
            var futures=new java.util.ArrayList<java.util.concurrent.Future<Integer>>();
            for(String suffix:List.of(first,second))futures.add(pool.submit(()->{
                gate.await();var body=suffix.equals("complete")?completion():Map.of("failureReason","Weather");
                return mvc.perform(post("/api/v1/missions/"+missionId+"/"+suffix).with(authentication(auth(operator)))
                    .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body))).andReturn().getResponse().getStatus();
            }));
            gate.countDown();return List.of(futures.get(0).get(20,java.util.concurrent.TimeUnit.SECONDS),futures.get(1).get(20,java.util.concurrent.TimeUnit.SECONDS));
        } finally {pool.shutdownNow();}
    }

    private void allocate() {
        missions.submit(missionId,auth(customer));missions.confirm(missionId,auth(admin));
        missions.assignStation(missionId,new ResourceAssignmentRequest(stationId),auth(admin));
        missions.assignUav(missionId,new ResourceAssignmentRequest(uavId),auth(admin));
        missions.assignOperator(missionId,new ResourceAssignmentRequest(operator.getId()),auth(admin));
        missions.reserveEquipment(missionId,new ResourceAssignmentRequest(equipmentId,2,null),auth(admin));
    }
    private void accept() throws Exception {command("accept",operator,Map.of("expectedVersion",missions.get(missionId,auth(operator)).version()),200);}
    private void startMission() throws Exception {allocate();accept();command("ready",admin,null,200);command("start",operator,null,200);}
    private Map<String,String> completion(){return Map.of("completionNote","Đã bàn giao kết quả","equipmentCondition","Đủ số lượng, nguyên vẹn");}
    private void command(String suffix,AppUser actor,Object body,int expected) throws Exception {raw(suffix,actor,body==null?null:json.writeValueAsString(body),expected);}
    private void raw(String suffix,AppUser actor,String body,int expected) throws Exception {rawPath("/api/v1/missions/"+missionId+"/"+suffix,actor,body,expected);}
    private void rawPath(String path,AppUser actor,String body,int expected) throws Exception {
        var request=post(path).with(authentication(auth(actor)));
        if(body!=null)request.contentType(MediaType.APPLICATION_JSON).content(body);
        assertEquals(expected,mvc.perform(request).andReturn().getResponse().getStatus(),path);
    }
    private com.uav.platform.modules.media.entity.MediaAsset asset(boolean confirmed,boolean deleted) {
        var a=new com.uav.platform.modules.media.entity.MediaAsset("result.txt","handover/"+UUID.randomUUID(),"text/plain",4,com.uav.platform.modules.media.common.MediaType.DOCUMENT,"MISSION",missionId.toString(),operator.getUsername(),"test");
        if(confirmed)a.confirm();if(deleted)a.markDeleted();return assets.save(a);
    }
    private void attach(MediaRole role,boolean confirmed,boolean deleted) {
        var a=asset(confirmed,deleted);
        links.save(new com.uav.platform.modules.mission.entity.MissionMedia(missionRepository.findById(missionId).orElseThrow(),a,role,operator));
    }
    private List<?> snapshot(){return List.of(db.queryForMap("SELECT status,operator_accepted,version FROM missions WHERE id=?",missionId),
        db.queryForMap("SELECT status FROM uavs WHERE id=?",uavId),
        db.queryForMap("SELECT quantity,available_quantity,reserved_quantity,version FROM equipment WHERE id=?",equipmentId),
        db.queryForObject("SELECT count(*) FROM mission_events",Integer.class),db.queryForObject("SELECT count(*) FROM audit_logs",Integer.class),
        db.queryForObject("SELECT count(*) FROM media_assets",Integer.class),db.queryForObject("SELECT count(*) FROM mission_media",Integer.class));}
    private AppUser user(String name, UserRole role) {return users.save(new AppUser(name,name+"@example.invalid","synthetic-placeholder",null,null,null,null,role,UserStatus.ACTIVE));}
    private UsernamePasswordAuthenticationToken auth(AppUser user){return UsernamePasswordAuthenticationToken.authenticated(user.getUsername(),"n/a",List.of());}
}
