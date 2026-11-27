package com.uav.platform.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.uav.platform.dao.IMarketplaceListingDao;
import com.uav.platform.dao.IProjectDao;
import com.uav.platform.dao.IProviderPilotDao;
import com.uav.platform.dao.IProviderProfileDao;
import com.uav.platform.dao.IUavDao;
import com.uav.platform.dao.IUserDao;
import com.uav.platform.entity.AppUser;
import com.uav.platform.entity.MarketplaceListing;
import com.uav.platform.entity.Project;
import com.uav.platform.entity.ProviderPilot;
import com.uav.platform.entity.ProviderProfile;
import com.uav.platform.entity.Uav;
import com.uav.platform.enums.ListingModerationStatus;
import com.uav.platform.enums.ListingType;
import com.uav.platform.enums.MissionType;
import com.uav.platform.enums.PricingModel;
import com.uav.platform.enums.ProjectStatus;
import com.uav.platform.enums.ProviderPilotStatus;
import com.uav.platform.enums.ProviderType;
import com.uav.platform.enums.ProviderVerificationStatus;
import com.uav.platform.enums.UavStatus;
import com.uav.platform.enums.UserRole;
import com.uav.platform.enums.UserStatus;

import jakarta.persistence.EntityManager;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * Executes V67 SQL statements directly on the Spring Boot H2 PostgreSQL-mode schema (rolled back
 * after each test) to verify name scrubbing, unique clean cover assignment, banned cover removal,
 * rfq_enabled=false default, and strict idempotency on re-execution.
 */
@SpringBootTest
@Transactional
class V67CleanDemoDataMigrationTest {

    private static final Path V67_PATH =
            Path.of(
                    "src/main/resources/db/migration/V67__clean_demo_names_covers_and_disable_rfq.sql");

    private static final Set<String> ALLOWED_CLEAN_COVERS =
            Set.of(
                    "/images/services/aerial-inspection-grid.webp",
                    "/images/services/aerial-recording-cinema.webp",
                    "/images/services/uav-rental-fleet.webp",
                    "/images/solutions/infra-3d-survey.webp",
                    "/images/solutions/edge-ai-kv260-tracking.webp",
                    "/images/solutions/sar-emergency-response.webp",
                    "/images/process/step-05-data-handover.webp");

    private static final List<String> BANNED_COVER_TOKENS =
            List.of(
                    "usgs",
                    "data-collection-corridor",
                    "managed-ops-command",
                    "step-01-select-service");

    @Autowired private JdbcTemplate jdbc;
    @Autowired private EntityManager entityManager;
    @Autowired private IUserDao users;
    @Autowired private IProviderProfileDao providers;
    @Autowired private IProviderPilotDao pilots;
    @Autowired private IUavDao uavs;
    @Autowired private IProjectDao projects;
    @Autowired private IMarketplaceListingDao listings;

    @Test
    void v67CleansAllNameSuffixVariantsAssignsUniqueCleanCoversDisablesRfqAndIsIdempotent()
            throws Exception {
        AppUser fleetUser = new AppUser();
        fleetUser.setUsername("demo_v67_fleet");
        fleetUser.setEmail("demo.v67.fleet@uav.local");
        fleetUser.setPasswordHash("hash");
        fleetUser.setFullName("Chủ đội bay Miền Nam — minh hoạ");
        fleetUser.setPhoneNumber("0909887701");
        fleetUser.setRole(UserRole.ROLE_PILOT);
        fleetUser.setStatus(UserStatus.ACTIVE);
        fleetUser = users.save(fleetUser);

        AppUser customerUser = new AppUser();
        customerUser.setUsername("demo_v67_customer");
        customerUser.setEmail("demo.v67.customer@uav.local");
        customerUser.setPasswordHash("hash");
        customerUser.setFullName("Khách hàng Dự án (minh hoạ)");
        customerUser.setPhoneNumber("0909887702");
        customerUser.setRole(UserRole.ROLE_PILOT);
        customerUser.setStatus(UserStatus.ACTIVE);
        customerUser = users.save(customerUser);

        ProviderProfile provider = new ProviderProfile();
        provider.setUser(fleetUser);
        provider.setSlug("doi-bay-v67-test");
        provider.setDisplayName("Đội bay Khảo sát Miền Nam – minh họa");
        provider.setProviderType(ProviderType.COMPANY);
        provider.setBio("Mô tả đội bay giữ nguyên — dữ liệu minh hoạ.");
        provider.setProvince("TP. Hồ Chí Minh");
        provider.setServiceRadiusKm(300);
        provider.setVerificationStatus(ProviderVerificationStatus.VERIFIED);
        provider = providers.save(provider);

        Uav uav = new Uav("Matrice 350 Survey — minh hoạ", "V67-SN-01", "DJI");
        uav.setProvider(provider);
        uav.setStatus(UavStatus.AVAILABLE);
        uavs.save(uav);

        ProviderPilot pilot = new ProviderPilot();
        pilot.setProvider(provider);
        pilot.setPilotUser(fleetUser);
        pilot.setFullName("Kỹ sư Trần Minh Quân · minh hoạ");
        pilot.setPhone("0909887703");
        pilot.setLicenseNumber("CC-V67-01");
        pilot.setPilotStatus(ProviderPilotStatus.AVAILABLE);
        pilots.save(pilot);

        Project project = new Project();
        project.setCustomer(customerUser);
        project.setCode("PRJ-V67-01");
        project.setName("Dự án Khu Đô Thị Nam Sài Gòn minh hoạ");
        project.setProvince("TP. Hồ Chí Minh");
        project.setNote("Ghi chú dự án minh hoạ.");
        project.setStatus(ProjectStatus.ACTIVE);
        project.setDeleted(false);
        projects.save(project);

        String[][] demoListings = {
            {
                "khao-sat-ban-do-2d-du-an-minh-hoa",
                "Khảo sát bản đồ trực giao 2D — minh hoạ",
                "/images/services/data-collection-corridor.webp"
            },
            {
                "kiem-tra-nhiet-dien-mat-troi-minh-hoa",
                "Kiểm tra ảnh nhiệt áp mái – minh họa",
                "/images/uav-photos/usgs-plum-island-team.webp"
            },
            {
                "quay-phim-tien-do-cong-trinh-4k-minh-hoa",
                "Ghi hình 4K công trình (minh hoạ)",
                "/images/solutions/managed-ops-command.webp"
            },
            {
                "danh-gia-chi-so-cay-trong-da-pho-minh-hoa",
                "Phân tích ảnh đa phổ · minh hoạ",
                "/images/process/step-01-select-service.webp"
            },
            {
                "kiem-tra-hanh-lang-cau-cang-ha-tang-minh-hoa",
                "Kiểm tra dầm cầu hạ tầng minh hoạ",
                null
            },
            {
                "mo-hinh-3d-hien-trang-quy-hoach-minh-hoa",
                "Dựng mô hình 3D quy hoạch - minh hoạ",
                "/images/uav-photos/usgs-yosemite-preflight.webp"
            },
            {
                "custom-unlisted-usgs-cover",
                "Dịch vụ tuỳ biến — minh hoạ",
                "/images/uav-photos/usgs-plum-island-team.webp"
            }
        };

        for (String[] row : demoListings) {
            MarketplaceListing listing = new MarketplaceListing();
            listing.setProvider(provider);
            listing.setSlug(row[0]);
            listing.setTitle(row[1]);
            listing.setSummary("Tóm tắt giữ nguyên — giá minh hoạ.");
            listing.setDescription("Mô tả chi tiết giữ nguyên — dữ liệu minh hoạ.");
            listing.setListingType(ListingType.FLIGHT_SERVICE);
            listing.setMissionType(MissionType.AREA_INSPECTION);
            listing.setPricingModel(PricingModel.PER_HOUR);
            listing.setBasePriceVnd(new BigDecimal("2000000"));
            listing.setMinBookingUnits(BigDecimal.ONE);
            listing.setSecurityDepositVnd(BigDecimal.ZERO);
            listing.setProvince("Hà Nội");
            listing.setServiceRadiusKm(100);
            listing.setCoverImageUrl(row[2]);
            listing.setModerationStatus(ListingModerationStatus.PUBLISHED);
            listing.setFeatured(true);
            listing.setDeleted(false);
            listings.save(listing);
        }

        entityManager.flush();

        // Force rfq_enabled to true before running V67
        jdbc.update(
                "UPDATE system_configurations SET config_value = 'true' WHERE config_key = 'marketplace.rfq_enabled'");

        List<String> statements = readV67Statements();
        int firstRunUpdated = 0;
        for (String stmt : statements) {
            firstRunUpdated += jdbc.update(stmt);
        }
        assertTrue(firstRunUpdated > 0, "First run of V67 must clean dirty rows");

        // 1. No entity name contains "minh ho"
        for (String[] pair :
                List.of(
                        new String[] {"marketplace_listings", "title"},
                        new String[] {"uavs", "model"},
                        new String[] {"users", "full_name"},
                        new String[] {"provider_pilots", "full_name"},
                        new String[] {"projects", "name"},
                        new String[] {"provider_profiles", "display_name"},
                        new String[] {"service_plans", "name"},
                        new String[] {"missions", "title"})) {
            List<String> values =
                    jdbc.queryForList(
                            "SELECT "
                                    + pair[1]
                                    + " FROM "
                                    + pair[0]
                                    + " WHERE "
                                    + pair[1]
                                    + " IS NOT NULL",
                            String.class);
            for (String v : values) {
                assertFalse(
                        v.toLowerCase(Locale.ROOT).contains("minh ho"),
                        pair[0] + "." + pair[1] + " must not contain 'minh ho': " + v);
            }
        }

        // Long descriptions stay untouched
        String bio =
                jdbc.queryForObject(
                        "SELECT bio FROM provider_profiles WHERE slug = 'doi-bay-v67-test'",
                        String.class);
        assertNotNull(bio);
        assertTrue(bio.contains("minh hoạ"));

        // 2. Demo listing covers are unique, clean, and contain zero banned paths; unlisted banned
        // cover becomes NULL
        String unlistedCover =
                jdbc.queryForObject(
                        "SELECT cover_image_url FROM marketplace_listings WHERE slug = 'custom-unlisted-usgs-cover'",
                        String.class);
        assertNull(unlistedCover, "Banned cover on non-demo listing must be nulled");

        Set<String> seenCovers = new HashSet<>();
        List<String> demoCovers =
                jdbc.queryForList(
                        "SELECT cover_image_url FROM marketplace_listings WHERE slug LIKE '%-minh-hoa'",
                        String.class);
        assertEquals(6, demoCovers.size());
        for (String cover : demoCovers) {
            assertNotNull(cover);
            String lower = cover.toLowerCase(Locale.ROOT);
            for (String banned : BANNED_COVER_TOKENS) {
                assertFalse(lower.contains(banned), "Banned cover leaked: " + cover);
            }
            assertTrue(ALLOWED_CLEAN_COVERS.contains(cover), "Unexpected cover: " + cover);
            assertTrue(seenCovers.add(cover), "Duplicate cover across demo listings: " + cover);
        }

        // 3. rfq_enabled is false
        String rfqVal =
                jdbc.queryForObject(
                        "SELECT config_value FROM system_configurations WHERE config_key = 'marketplace.rfq_enabled'",
                        String.class);
        assertEquals("false", rfqVal);

        // 4. Re-running every V67 statement changes 0 rows (strict idempotency)
        for (String stmt : statements) {
            assertEquals(0, jdbc.update(stmt), "Re-running V67 must update 0 rows: " + stmt);
        }
    }

    private static List<String> readV67Statements() throws Exception {
        String sql = Files.readString(V67_PATH);
        return java.util.Arrays.stream(sql.split(";"))
                .map(s -> s.replaceAll("(?m)^--.*$", "").trim())
                .filter(s -> !s.isEmpty())
                .toList();
    }
}
