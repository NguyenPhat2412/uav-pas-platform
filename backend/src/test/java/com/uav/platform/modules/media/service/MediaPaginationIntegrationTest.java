package com.uav.platform.modules.media.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.uav.platform.modules.media.entity.MediaAsset;
import com.uav.platform.modules.media.enums.MediaType;
import com.uav.platform.modules.media.repository.MediaAssetRepository;
import com.uav.platform.modules.media.service.impl.MediaAssetOperations;
import com.uav.platform.modules.mission.entity.Mission;
import com.uav.platform.modules.mission.enums.*;
import com.uav.platform.modules.mission.service.impl.MissionOperations;
import com.uav.platform.modules.permission.service.PermissionService;
import com.uav.platform.modules.station.service.impl.StationOperations;
import com.uav.platform.modules.user.entity.AppUser;
import com.uav.platform.modules.user.enums.UserRole;
import com.uav.platform.modules.user.enums.UserStatus;

import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityManagerFactory;

import org.hibernate.SessionFactory;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

@SpringBootTest(
        properties = {
            "spring.datasource.url=jdbc:h2:mem:media_pagination;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE",
            "spring.jpa.properties.hibernate.generate_statistics=true",
            "logging.level.org.hibernate.stat=OFF",
            "logging.level.org.hibernate.engine.internal.StatisticalLoggingSessionEventListener=OFF",
            "app.media.cleanup-enabled=false",
            "app.billing.invoice-worker-enabled=false",
            "app.financial-outbox.worker-enabled=false",
            "app.webhook.retry-delay-ms=3600000"
        })
@Transactional
class MediaPaginationIntegrationTest {
    @Autowired MediaService service;
    @Autowired MediaAccessService access;
    @Autowired MediaAssetRepository assets;
    @Autowired EntityManager entityManager;
    @Autowired EntityManagerFactory entityManagerFactory;
    @Autowired JdbcTemplate db;
    @MockitoBean PermissionService permissions;
    Set<String> grants = new HashSet<>();
    AppUser owner;
    AppUser other;

    @BeforeEach
    void setup() {
        when(permissions.has(any(), anyString()))
                .thenAnswer(call -> grants.contains(call.getArgument(1)));
        owner = user("page_owner");
        other = user("page_other");
        SecurityContextHolder.getContext()
                .setAuthentication(
                        UsernamePasswordAuthenticationToken.authenticated(
                                owner.getUsername(), null, List.of()));
    }

    @AfterEach
    void clearAuthentication() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void smallPageLoadsOnlyItsRowsEvenWhenHundredsOfAssetsAreVisible() {
        for (int i = 0; i < 240; i++) asset(null, null, owner.getUsername());
        entityManager.flush();
        entityManager.clear();
        var statistics = entityManagerFactory.unwrap(SessionFactory.class).getStatistics();
        statistics.clear();
        var page = service.list(PageRequest.of(7, 5, Sort.by("id")));
        assertEquals(240, page.totalElements());
        assertEquals(5, page.content().size());
        assertEquals(48, page.totalPages());
        assertTrue(
                statistics.getEntityLoadCount() <= 5,
                () -> "A five-row page loaded " + statistics.getEntityLoadCount() + " entities");
        assertTrue(
                statistics.getPrepareStatementCount() <= 2,
                () ->
                        "Expected bounded page+count SQL, got "
                                + statistics.getPrepareStatementCount());
    }

    @Test
    void missionLinkedPageAlsoUsesBoundedQueriesAndDoesNotLoadMissionEntities() {
        grants.add("MISSION_MEDIA_VIEW");
        var m = mission(owner);
        for (int i = 0; i < 240; i++) asset("MISSION", m.getId().toString(), other.getUsername());
        entityManager.flush();
        entityManager.clear();
        var statistics = entityManagerFactory.unwrap(SessionFactory.class).getStatistics();
        statistics.clear();
        var page = service.list(PageRequest.of(7, 5, Sort.by("id")));
        assertEquals(240, page.totalElements());
        assertEquals(5, page.content().size());
        assertEquals(5, statistics.getEntityLoadCount());
        assertEquals(2, statistics.getPrepareStatementCount());
    }

    @Test
    void absentActorCannotListEvenUnlinkedFiles() {
        asset(null, null, owner.getUsername());
        grants.add("MEDIA_MANAGE");
        entityManager.flush();
        entityManager.clear();
        SecurityContextHolder.clearContext();
        assertEquals(0, service.list(PageRequest.of(0, 10)).totalElements());
    }

    @Test
    void invalidSignsCannotMatchAnImportedNegativeResourceId() {
        grants.add("STATION_READ");
        db.update(
                "INSERT INTO uav_stations(id,code,name,status) VALUES(-1,'PAGE-NEGATIVE','Test','ACTIVE')");
        var valid = asset("STATION", "-0001", owner.getUsername());
        asset("STATION", "000-1", owner.getUsername());
        asset("STATION", "+000-1", owner.getUsername());
        asset("STATION", "--1", owner.getUsername());
        entityManager.flush();
        entityManager.clear();
        var page = service.list(PageRequest.of(0, 10));
        assertEquals(List.of(valid.getId()), page.content().stream().map(a -> a.id()).toList());
    }

    @Test
    void legacyUnicodeDigitsAndBlankWhitespaceKeepTheSameReadPermissions() {
        grants.add("MISSION_MEDIA_VIEW");
        var m = mission(owner);
        var unicodeId = new StringBuilder();
        for (char digit : m.getId().toString().toCharArray())
            unicodeId.append((char) ('\u0660' + digit - '0'));
        var linked = asset("MISSION", unicodeId.toString(), other.getUsername());
        var standalone = asset("\t\u2003\n", "\r", owner.getUsername());
        var nonblank = asset("\u0085", null, owner.getUsername());
        asset(null, "\u0085", owner.getUsername());
        assertThrows(
                IllegalArgumentException.class,
                () -> access.requireFile(nonblank, owner.getUsername(), false));
        assertDoesNotThrow(() -> access.requireFile(linked, owner.getUsername(), false));
        assertDoesNotThrow(() -> access.requireFile(standalone, owner.getUsername(), false));
        entityManager.flush();
        entityManager.clear();
        var page = service.list(PageRequest.of(0, 10, Sort.by("id")));
        assertEquals(
                List.of(linked.getId(), standalone.getId()),
                page.content().stream().map(a -> a.id()).toList());
    }

    @Test
    void numericSpellingsMatchFileAuthorizationForEveryLinkedResourceType() {
        grants.addAll(Set.of("MISSION_MEDIA_VIEW", "STATION_READ", "UAV_READ", "INVENTORY_READ"));
        var m = mission(owner);
        var station = StationOperations.create("PAGE-NUMERIC", "Test", null, null, null, null);
        var uav = new com.uav.platform.modules.uav.entity.Uav("Test", "PAGE-NUMERIC", "Test");
        var equipment =
                new com.uav.platform.modules.inventory.entity.Equipment(
                        "Test",
                        com.uav.platform.modules.inventory.enums.EquipmentType.BATTERY,
                        "PAGE-NUMERIC",
                        station);
        entityManager.persist(station);
        entityManager.persist(uav);
        entityManager.persist(equipment);
        for (var resource :
                Map.of(
                                "MISSION",
                                m.getId(),
                                "STATION",
                                station.getId(),
                                "UAV",
                                uav.getId(),
                                "EQUIPMENT",
                                equipment.getId())
                        .entrySet()) {
            String id = resource.getValue().toString();
            var mixed = new StringBuilder("+\u0660\uff10");
            for (int i = 0; i < id.length(); i++)
                mixed.append((char) ((i % 2 == 0 ? '\uff10' : '\u0660') + id.charAt(i) - '0'));
            for (String spelling :
                    List.of(
                            id,
                            "+000" + id,
                            "0".repeat(50) + id,
                            mixed.toString(),
                            "9223372036854775807",
                            "-9223372036854775808",
                            "9223372036854775808",
                            "-9223372036854775809",
                            " " + id,
                            id + "\n",
                            "++" + id,
                            "\uff0b" + id,
                            id + ".0",
                            id + "x",
                            "+",
                            "-")) {
                asset(resource.getKey(), spelling, owner.getUsername());
            }
        }
        asset(" \tX", "\n", owner.getUsername());
        entityManager.flush();
        entityManager.clear();
        var expected =
                assets.findAll().stream()
                        .filter(
                                a -> {
                                    try {
                                        access.requireFile(a, owner.getUsername(), false);
                                        return true;
                                    } catch (AccessDeniedException
                                            | IllegalArgumentException denied) {
                                        return false;
                                    }
                                })
                        .map(MediaAsset::getId)
                        .sorted()
                        .toList();
        assertEquals(16, expected.size());
        entityManager.clear();
        var actual = new ArrayList<Long>();
        for (int i = 0; i < 4; i++) {
            var page = service.list(PageRequest.of(i, 5, Sort.by("id")));
            assertEquals(expected.size(), page.totalElements());
            actual.addAll(page.content().stream().map(a -> a.id()).toList());
        }
        assertEquals(expected, actual);
    }

    @Test
    void databasePagesAndTotalsMatchPerFileAuthorizationAcrossPermissionCombinations() {
        asset(null, null, owner.getUsername());
        asset("  ", "", owner.getUsername());
        asset(null, null, other.getUsername());
        var owned = mission(owner);
        var assigned = mission(other);
        var foreign = mission(other);
        entityManager.flush();
        db.update("UPDATE missions SET operator_id=? WHERE id=?", owner.getId(), assigned.getId());
        asset("MISSION", owned.getId().toString(), other.getUsername());
        asset("MISSION", assigned.getId().toString(), other.getUsername());
        asset("MISSION", foreign.getId().toString(), owner.getUsername());
        asset("MISSION", "999999999", owner.getUsername());
        var station = StationOperations.create("PAGE-STATION", "Test", null, null, null, null);
        entityManager.persist(station);
        var uav = new com.uav.platform.modules.uav.entity.Uav("Test", "PAGE-UAV", "Test");
        entityManager.persist(uav);
        var equipment =
                new com.uav.platform.modules.inventory.entity.Equipment(
                        "Test",
                        com.uav.platform.modules.inventory.enums.EquipmentType.BATTERY,
                        "PAGE-EQUIPMENT",
                        station);
        entityManager.persist(equipment);
        for (var entry :
                Map.of(
                                "STATION",
                                station.getId(),
                                "UAV",
                                uav.getId(),
                                "EQUIPMENT",
                                equipment.getId())
                        .entrySet()) {
            asset(entry.getKey(), entry.getValue().toString(), owner.getUsername());
            asset(entry.getKey(), entry.getValue().toString(), other.getUsername());
            asset(entry.getKey(), "999999999", owner.getUsername());
        }
        MediaAssetOperations.markDeleted(asset(null, null, owner.getUsername()));
        entityManager.flush();
        entityManager.clear();
        for (Set<String> allowed :
                List.of(
                        Set.<String>of(),
                        Set.of("MISSION_MEDIA_VIEW"),
                        Set.of("MEDIA_MANAGE"),
                        Set.of("MISSION_VIEW_ALL"),
                        Set.of("MISSION_MEDIA_VIEW", "STATION_READ", "UAV_READ", "INVENTORY_READ"),
                        Set.of(
                                "MEDIA_MANAGE",
                                "MISSION_MEDIA_VIEW",
                                "MISSION_VIEW_ALL",
                                "STATION_READ",
                                "UAV_READ",
                                "INVENTORY_READ"))) {
            grants.clear();
            grants.addAll(allowed);
            var expected =
                    assets.findAll().stream()
                            .filter(a -> !a.isDeleted())
                            .filter(
                                    a -> {
                                        try {
                                            access.requireFile(a, owner.getUsername(), false);
                                            return true;
                                        } catch (AccessDeniedException denied) {
                                            return false;
                                        }
                                    })
                            .map(MediaAsset::getId)
                            .sorted()
                            .toList();
            entityManager.clear();
            var actual = new ArrayList<Long>();
            int pages = Math.max(1, (expected.size() + 2) / 3);
            for (int index = 0; index < pages; index++) {
                var page = service.list(PageRequest.of(index, 3, Sort.by("id")));
                assertEquals(expected.size(), page.totalElements(), allowed.toString());
                actual.addAll(page.content().stream().map(a -> a.id()).toList());
            }
            assertEquals(expected, actual, allowed.toString());
            assertEquals(actual.size(), new HashSet<>(actual).size());
            var beyond = service.list(PageRequest.of(pages + 1, 3, Sort.by("id")));
            assertTrue(beyond.content().isEmpty());
            assertEquals(expected.size(), beyond.totalElements());
        }
    }

    @Test
    void equalTimestampsHaveStableIdTieBreakWithoutMissingOrDuplicatingRows() {
        var expected = new ArrayList<Long>();
        for (int i = 0; i < 13; i++) expected.add(asset(null, null, owner.getUsername()).getId());
        entityManager.flush();
        db.update(
                "UPDATE media_assets SET created_at=? WHERE uploaded_by=?",
                LocalDateTime.of(2026, 1, 1, 0, 0),
                owner.getUsername());
        entityManager.clear();
        var actual = new ArrayList<Long>();
        for (int i = 0; i < 4; i++)
            actual.addAll(
                    service
                            .list(PageRequest.of(i, 4, Sort.by("createdAt").descending()))
                            .content()
                            .stream()
                            .map(a -> a.id())
                            .toList());
        assertEquals(expected, actual);
    }

    @Test
    void paddedNumericLinksRemainVisibleButMalformedLinksNeverExposeFiles() {
        grants.addAll(Set.of("MEDIA_MANAGE", "MISSION_MEDIA_VIEW", "MISSION_VIEW_ALL"));
        var m = mission(owner);
        var padded = asset("MISSION", "+000" + m.getId(), other.getUsername());
        asset("MISSION", "not-a-number", owner.getUsername());
        asset("MISSION", "9223372036854775808", owner.getUsername());
        asset("UNKNOWN", m.getId().toString(), owner.getUsername());
        entityManager.flush();
        entityManager.clear();
        var page = service.list(PageRequest.of(0, 10, Sort.by("id")));
        assertEquals(List.of(padded.getId()), page.content().stream().map(a -> a.id()).toList());
        assertEquals(1, page.totalElements());
    }

    private AppUser user(String name) {
        var user =
                new AppUser(
                        name,
                        name + "@example.invalid",
                        "fixture",
                        null,
                        null,
                        null,
                        null,
                        UserRole.ROLE_PILOT,
                        UserStatus.ACTIVE);
        entityManager.persist(user);
        return user;
    }

    private Mission mission(AppUser customer) {
        var start = LocalDateTime.of(2091, 1, 1, 9, 0);
        var m =
                MissionOperations.draft(
                        customer,
                        MissionType.AREA_INSPECTION,
                        "Test",
                        null,
                        start.toLocalDate(),
                        start,
                        start.plusHours(1),
                        "Test",
                        null,
                        null,
                        MissionPriority.NORMAL,
                        null);
        m.setCode("PAGE-" + UUID.randomUUID().toString().substring(0, 20));
        entityManager.persist(m);
        return m;
    }

    private MediaAsset asset(String type, String id, String uploader) {
        var a =
                new MediaAsset(
                        "fixture.pdf",
                        "page/" + UUID.randomUUID(),
                        "application/pdf",
                        10,
                        MediaType.DOCUMENT,
                        type,
                        id,
                        uploader,
                        "test");
        entityManager.persist(a);
        return a;
    }
}
