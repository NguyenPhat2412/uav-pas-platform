package com.uav.platform.dao.base;

import static org.junit.jupiter.api.Assertions.*;

import com.uav.platform.config.HibernateConfig;
import com.uav.platform.dao.IAirspaceZoneDao;
import com.uav.platform.dao.IMissionDao;
import com.uav.platform.dao.IUserDao;
import com.uav.platform.entity.AirspaceZone;
import com.uav.platform.entity.AppUser;
import com.uav.platform.enums.AirspaceGeometryType;
import com.uav.platform.enums.AirspaceZoneType;
import com.uav.platform.enums.UserRole;
import com.uav.platform.enums.UserStatus;

import jakarta.persistence.EntityManager;

import org.hibernate.Session;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@SpringBootTest
@Transactional
class HibernateGenericDaoAndSearchTest {

    @Autowired private IUserDao userDao;
    @Autowired private IAirspaceZoneDao airspaceZoneDao;
    @Autowired private IMissionDao missionDao;
    @Autowired private HibernateConfig hibernateConfig;
    @Autowired private EntityManager entityManager;

    private AppUser newUser(String suffix, UserRole role, UserStatus status) {
        AppUser u =
                new AppUser(
                        "hdao_" + suffix,
                        "hdao_" + suffix + "@example.com",
                        "hash",
                        "09" + Math.abs(suffix.hashCode() % 100000000),
                        "Full " + suffix,
                        null,
                        role,
                        status);
        u.setFailedAttempts(suffix.length());
        return u;
    }

    @Test
    void crudLifecycleAndHibernateConfigWorkEndToEnd() {
        assertNotNull(hibernateConfig.sessionFactory());
        try (Session session = hibernateConfig.openStatelessOrNewSession()) {
            assertTrue(session.isOpen());
        }

        AppUser created =
                userDao.create(newUser("crud1", UserRole.ROLE_OPERATOR, UserStatus.ACTIVE));
        assertNotNull(created.getId());
        assertNotNull(created.getCreatedAt());
        assertNotNull(created.getUpdatedAt());

        AppUser fetched = userDao.getById(created.getId());
        assertNotNull(fetched);
        assertEquals("hdao_crud1", fetched.getUsername());
        assertTrue(userDao.existsById(created.getId()));
        assertNotNull(userDao.getReferenceById(created.getId()));

        fetched.setFullName("Updated Name");
        AppUser updated = userDao.update(fetched);
        userDao.flush();
        userDao.refresh(updated);
        assertEquals("Updated Name", updated.getFullName());

        AppUser savedAndFlushed =
                userDao.saveAndFlush(newUser("crud2", UserRole.ROLE_PILOT, UserStatus.ACTIVE));
        assertNotNull(savedAndFlushed.getId());

        List<AppUser> batch =
                userDao.saveAllAndFlush(
                        List.of(
                                newUser("crud3", UserRole.ROLE_PILOT, UserStatus.ACTIVE),
                                newUser("crud4", UserRole.ROLE_OPERATOR, UserStatus.SUSPENDED)));
        assertEquals(2, batch.size());

        List<AppUser> byIds =
                userDao.findAllById(List.of(created.getId(), savedAndFlushed.getId()));
        assertEquals(2, byIds.size());
        assertTrue(userDao.findAllById(List.of()).isEmpty());

        assertFalse(userDao.getAll().isEmpty());
        assertFalse(userDao.findAll(Sort.by(Sort.Direction.DESC, "id")).isEmpty());
        Page<AppUser> page = userDao.findAll(PageRequest.of(0, 2, Sort.by("username")));
        assertEquals(2, page.getContent().size());
        Page<AppUser> unpaged = userDao.findAll(Pageable.unpaged());
        assertFalse(unpaged.getContent().isEmpty());

        userDao.deleteByPk(savedAndFlushed.getId());
        userDao.flush();
        assertNull(userDao.getById(savedAndFlushed.getId()));

        userDao.deleteById(batch.get(0).getId());
        userDao.deleteAll(List.of(batch.get(1)));
        userDao.flush();
        assertFalse(userDao.existsById(batch.get(0).getId()));
        assertFalse(userDao.existsById(batch.get(1).getId()));
    }

    @Test
    void embeddedSearchLanguageSortingPaginationAndCountWorkInHibernateDao() {
        userDao.saveAllAndFlush(
                List.of(
                        newUser("alpha", UserRole.ROLE_OPERATOR, UserStatus.ACTIVE),
                        newUser("beta", UserRole.ROLE_PILOT, UserStatus.ACTIVE),
                        newUser("gamma", UserRole.ROLE_PILOT, UserStatus.SUSPENDED)));

        // Equality + AND
        List<AppUser> activePilots =
                userDao.search(
                        "username:hdao_;role==ROLE_PILOT;status==ACTIVE", 0, 10, "username", "ASC");
        assertEquals(1, activePilots.size());
        assertEquals("hdao_beta", activePilots.get(0).getUsername());

        // OR + wildcard (~) + DESC sorting + pagination limits
        List<AppUser> orResults =
                userDao.search(
                        "username==\"hdao_alpha\",username~*gamma*", 0, 1, "username", "DESC");
        assertEquals(1, orResults.size());
        assertEquals("hdao_gamma", orResults.get(0).getUsername());

        // Second page offset
        List<AppUser> page2 = userDao.search("username~hdao_", 1, 1, "username", "ASC");
        assertEquals(1, page2.size());

        // Inequality & numeric comparisons & null checks
        Integer countActive =
                userDao.getCount(
                        "username:hdao_;status!=SUSPENDED;failedAttempts>=4;avatarUrl==null");
        assertEquals(2, countActive);

        Integer countGt = userDao.getCount("username:hdao_;failedAttempts>4;failedAttempts<=10");
        assertTrue(countGt >= 1);

        Integer countLt = userDao.getCount("username:hdao_;failedAttempts<10;username!=null");
        assertTrue(countLt >= 3);

        // Blank/null query returns all
        assertTrue(userDao.getCount(null) >= 3);
        assertTrue(userDao.getCount("   ") >= 3);
        assertFalse(userDao.search("", null, null, null, null).isEmpty());

        // Invalid syntax throws InvalidDataAccessApiUsageException (wrapping
        // IllegalArgumentException)
        assertThrows(
                org.springframework.dao.InvalidDataAccessApiUsageException.class,
                () -> userDao.search("invalid_no_operator", 0, 10, null, null));
        assertThrows(
                org.springframework.dao.InvalidDataAccessApiUsageException.class,
                () -> userDao.search("username>null", 0, 10, null, null));
    }

    @Test
    void hibernateSpecificationCombinatorsAndTypeConversionCoverAllBranches() {
        AppUser saved =
                userDao.saveAndFlush(newUser("spec1", UserRole.ROLE_OPERATOR, UserStatus.ACTIVE));

        HibernateSpecification<AppUser> byName =
                (root, query, cb) -> cb.equal(root.get("username"), "hdao_spec1");
        HibernateSpecification<AppUser> byActive =
                (root, query, cb) -> cb.equal(root.get("status"), UserStatus.ACTIVE);

        assertTrue(userDao.findOne(HibernateSpecification.where(byName)).isPresent());
        assertTrue(userDao.exists(HibernateSpecification.allOf(byName, byActive)));
        assertEquals(1L, userDao.count(HibernateSpecification.allOf(List.of(byName, byActive))));
        assertTrue(userDao.exists(HibernateSpecification.anyOf(byName, null)));
        assertTrue(userDao.exists(HibernateSpecification.anyOf(List.of(byName))));
        assertFalse(userDao.findAll(HibernateSpecification.not(byName)).contains(saved));
        assertNotNull(HibernateSpecification.not(null));
        assertNotNull(HibernateSpecification.where(null));
        assertNotNull(HibernateSpecification.of(null));
        assertNotNull(HibernateSpecification.allOf((HibernateSpecification<AppUser>[]) null));
        assertNotNull(HibernateSpecification.anyOf((HibernateSpecification<AppUser>[]) null));
        assertNotNull(
                HibernateSpecification.allOf((Iterable<HibernateSpecification<AppUser>>) null));
        assertNotNull(
                HibernateSpecification.anyOf((Iterable<HibernateSpecification<AppUser>>) null));
        assertSame(byName, byName.and(null));
        assertSame(byName, byName.or(null));
        assertFalse(userDao.findAll(byName.or(byActive), Sort.by("id")).isEmpty());
        assertFalse(
                userDao.findAll(byName.and(byActive), PageRequest.of(0, 5, Sort.by("id")))
                        .isEmpty());
        assertFalse(userDao.findAll(byName, Pageable.unpaged()).isEmpty());

        // Type converter coverage across primitive/wrapper/time/UUID types
        assertEquals("abc", HibernateSearchQueryParser.convert("abc", String.class));
        assertEquals(42L, HibernateSearchQueryParser.convert("42", Long.class));
        assertEquals(42L, HibernateSearchQueryParser.convert("42", long.class));
        assertEquals(7, HibernateSearchQueryParser.convert("7", Integer.class));
        assertEquals(7, HibernateSearchQueryParser.convert("7", int.class));
        assertEquals((short) 2, HibernateSearchQueryParser.convert("2", Short.class));
        assertEquals((short) 2, HibernateSearchQueryParser.convert("2", short.class));
        assertEquals(1.5d, HibernateSearchQueryParser.convert("1.5", Double.class));
        assertEquals(1.5f, HibernateSearchQueryParser.convert("1.5", Float.class));
        assertEquals(
                new BigDecimal("99.95"),
                HibernateSearchQueryParser.convert("99.95", BigDecimal.class));
        assertEquals(Boolean.TRUE, HibernateSearchQueryParser.convert("true", Boolean.class));
        assertEquals(
                UserRole.ROLE_ADMIN,
                HibernateSearchQueryParser.convert("role_admin", UserRole.class));
        assertEquals(
                LocalDate.of(2026, 5, 1),
                HibernateSearchQueryParser.convert("2026-05-01", LocalDate.class));
        assertEquals(
                LocalDateTime.of(2026, 5, 1, 10, 30),
                HibernateSearchQueryParser.convert("2026-05-01T10:30:00", LocalDateTime.class));
        assertEquals(
                Instant.parse("2026-05-01T00:00:00Z"),
                HibernateSearchQueryParser.convert("2026-05-01T00:00:00Z", Instant.class));
        UUID uuid = UUID.randomUUID();
        assertEquals(uuid, HibernateSearchQueryParser.convert(uuid.toString(), UUID.class));
    }

    @Test
    void deleteAllAndDeleteAllInBatchWorkOnAirspaceZones() {
        AirspaceZone z1 = new AirspaceZone();
        z1.setCode("Z-TEST-A");
        z1.setName("Zone A");
        z1.setZoneType(AirspaceZoneType.RESTRICTED);
        z1.setGeometryType(AirspaceGeometryType.CIRCLE);
        z1.setCenterLat(new BigDecimal("21.0285000"));
        z1.setCenterLng(new BigDecimal("105.8542000"));
        z1.setRadiusMeters(500);
        z1.setAuthority("CAAV");
        z1.setActive(true);
        airspaceZoneDao.saveAndFlush(z1);
        assertTrue(airspaceZoneDao.count() >= 1);

        airspaceZoneDao.deleteAll();
        airspaceZoneDao.flush();
        assertEquals(0L, airspaceZoneDao.count());

        AirspaceZone z2 = new AirspaceZone();
        z2.setCode("Z-TEST-B");
        z2.setName("Zone B");
        z2.setZoneType(AirspaceZoneType.PROHIBITED);
        z2.setGeometryType(AirspaceGeometryType.CIRCLE);
        z2.setCenterLat(new BigDecimal("21.0300000"));
        z2.setCenterLng(new BigDecimal("105.8500000"));
        z2.setRadiusMeters(300);
        z2.setAuthority("CAAV");
        z2.setActive(true);
        airspaceZoneDao.saveAndFlush(z2);
        airspaceZoneDao.deleteAllInBatch();
        airspaceZoneDao.flush();
        assertEquals(0L, airspaceZoneDao.count());

        // Exercise nested relation sort & search on MissionDao
        assertNotNull(
                missionDao.search("customer.username==nobody", 0, 5, "customer.username", "ASC"));
    }
}
