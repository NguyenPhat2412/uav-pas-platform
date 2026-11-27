package com.uav.platform.config;

import com.uav.platform.dao.IMarketplaceListingDao;
import com.uav.platform.dao.IProjectDao;
import com.uav.platform.dao.IProviderPilotDao;
import com.uav.platform.dao.IProviderProfileDao;
import com.uav.platform.dao.IProviderWalletDao;
import com.uav.platform.dao.IUavDao;
import com.uav.platform.dao.IUserDao;
import com.uav.platform.entity.AppUser;
import com.uav.platform.entity.MarketplaceListing;
import com.uav.platform.entity.Project;
import com.uav.platform.entity.ProviderPilot;
import com.uav.platform.entity.ProviderProfile;
import com.uav.platform.entity.ProviderWallet;
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

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;

/**
 * Local development & automated QA account initializer. Disabled by default in all environments
 * (`app.dev-seed.enabled=false`); only runs when explicitly opted in and reads the password from
 * `APP_DEV_SEED_PASSWORD` so credentials are never hardcoded in source control.
 */
@Slf4j
@Component
@ConditionalOnProperty(name = "app.dev-seed.enabled", havingValue = "true")
@RequiredArgsConstructor
public class DevSeedDataInitializer implements ApplicationRunner {

    public static final String DEMO_CUSTOMER_USERNAME = "demo_customer";
    public static final String DEMO_FLEET_USERNAME = "demo_fleet";
    public static final String DEMO_PILOT_USERNAME = "demo_pilot";
    public static final String DEMO_ADMIN_USERNAME = "demo_admin";

    private final IUserDao users;
    private final IProviderProfileDao providers;
    private final IProviderWalletDao wallets;
    private final IProviderPilotDao pilots;
    private final IMarketplaceListingDao listings;
    private final IUavDao uavs;
    private final IProjectDao projects;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.dev-seed.password:}")
    private String rawPassword;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (rawPassword == null || rawPassword.isBlank()) {
            log.warn(
                    "app.dev-seed.enabled=true but APP_DEV_SEED_PASSWORD is empty; skipping dev seed account password sync.");
            return;
        }
        String encoded = passwordEncoder.encode(rawPassword);

        AppUser admin =
                upsertAccount(
                        DEMO_ADMIN_USERNAME,
                        "demo.admin@uav.local",
                        "Quản trị viên Demo",
                        UserRole.ROLE_ADMIN,
                        encoded);
        AppUser customer =
                upsertAccount(
                        DEMO_CUSTOMER_USERNAME,
                        "demo.customer@uav.local",
                        "Khách hàng Dự án",
                        UserRole.ROLE_PILOT,
                        encoded);
        AppUser fleetOwner =
                upsertAccount(
                        DEMO_FLEET_USERNAME,
                        "demo.fleet@uav.local",
                        "Chủ đội bay Miền Nam",
                        UserRole.ROLE_PILOT,
                        encoded);
        AppUser fleetPilot =
                upsertAccount(
                        DEMO_PILOT_USERNAME,
                        "demo.pilot@uav.local",
                        "Kỹ sư Trần Minh Quân",
                        UserRole.ROLE_OPERATOR,
                        encoded);

        ensureCustomerProject(customer);
        ProviderProfile fleet = ensureVerifiedFleet(fleetOwner);
        ensureTenFleetUavs(fleet);
        ensureTwoFleetPilots(fleet, fleetPilot, fleetOwner);
        ensureDemoListings(fleet);

        log.info(
                "DevSeedDataInitializer provisioned local test accounts: {}, {}, {}, {}",
                admin.getUsername(),
                customer.getUsername(),
                fleetOwner.getUsername(),
                fleetPilot.getUsername());
    }

    private AppUser upsertAccount(
            String username, String email, String fullName, UserRole role, String passwordHash) {
        AppUser user =
                users.findByUsername(username)
                        .orElseGet(
                                () -> {
                                    AppUser created = new AppUser();
                                    created.setUsername(username);
                                    created.setEmail(email);
                                    return created;
                                });
        user.setFullName(fullName);
        user.setRole(role);
        user.setStatus(UserStatus.ACTIVE);
        user.setEmailVerified(true);
        user.setManualLocked(false);
        user.setFailedAttempts(0);
        user.setTwoFactorEnabled(false);
        user.setPasswordHash(passwordHash);
        return users.save(user);
    }

    private void ensureCustomerProject(AppUser customer) {
        if (!projects.existsByCode("PRJ-2026-DEMO01")) {
            Project p = new Project();
            p.setCustomer(customer);
            p.setCode("PRJ-2026-DEMO01");
            p.setName("Dự án Khu Đô Thị Sinh Thái Nam Sài Gòn");
            p.setProvince("TP. Hồ Chí Minh");
            p.setAreaGeoJson(
                    "{\"type\":\"Polygon\",\"coordinates\":[[[106.7010,10.7280],[106.7120,10.7280],[106.7120,10.7360],[106.7010,10.7360],[106.7010,10.7280]]]}");
            p.setNote("Dự án mẫu minh hoạ cho tài khoản khách hàng kiểm thử.");
            p.setStatus(ProjectStatus.ACTIVE);
            p.setDeleted(false);
            projects.save(p);
        }
    }

    private ProviderProfile ensureVerifiedFleet(AppUser fleetOwner) {
        ProviderProfile profile =
                providers
                        .findByUserId(fleetOwner.getId())
                        .orElseGet(
                                () -> {
                                    ProviderProfile created = new ProviderProfile();
                                    created.setUser(fleetOwner);
                                    created.setSlug("doi-bay-mien-nam-minh-hoa");
                                    return created;
                                });
        profile.setDisplayName("Đội bay Khảo sát Miền Nam");
        profile.setProviderType(ProviderType.COMPANY);
        profile.setProvince("TP. Hồ Chí Minh");
        profile.setServiceRadiusKm(300);
        profile.setBio("Đội bay khảo sát hạ tầng quy mô 10 thiết bị bay — dữ liệu minh hoạ.");
        profile.setVerificationStatus(ProviderVerificationStatus.VERIFIED);
        if (profile.getVerifiedAt() == null) {
            profile.setVerifiedAt(LocalDateTime.now());
            profile.setVerifiedBy("SYSTEM");
        }
        if (profile.getRatingAvg() == null || profile.getRatingAvg().signum() == 0) {
            profile.setRatingAvg(new BigDecimal("4.90"));
            profile.setReviewCount(24);
        }
        ProviderProfile saved = providers.save(profile);
        if (wallets.findByProviderId(saved.getId()).isEmpty()) {
            ProviderWallet wallet = new ProviderWallet();
            wallet.setProvider(saved);
            wallets.save(wallet);
        }
        return saved;
    }

    private void ensureTenFleetUavs(ProviderProfile fleet) {
        for (int i = 1; i <= 10; i++) {
            String sn = String.format("DEMO-SGN-UAV-%02d", i);
            if (!uavs.existsBySerialNumber(sn)) {
                Uav uav = new Uav(i <= 4 ? "Matrice 350 Survey" : "Mavic 3 Enterprise", sn, "DJI");
                uav.setProvider(fleet);
                uav.setStatus(UavStatus.AVAILABLE);
                uavs.save(uav);
            }
        }
    }

    private void ensureTwoFleetPilots(
            ProviderProfile fleet, AppUser fleetPilot, AppUser fleetOwner) {
        List<ProviderPilot> current =
                pilots.findByProviderIdAndDeletedFalseOrderByCreatedAtDesc(fleet.getId());
        if (current.size() >= 2) {
            ProviderPilot first = current.get(current.size() - 1);
            if (first.getPilotUser() == null
                    || !Objects.equals(first.getPilotUser().getId(), fleetPilot.getId())) {
                first.setPilotUser(fleetPilot);
                pilots.save(first);
            }
            return;
        }
        if (current.isEmpty()) {
            ProviderPilot p1 = new ProviderPilot();
            p1.setProvider(fleet);
            p1.setPilotUser(fleetPilot);
            p1.setFullName("Kỹ sư Trần Minh Quân");
            p1.setPhone("0909300101");
            p1.setLicenseNumber("CC-BAY-DEMO-101");
            p1.setSpecialization("Khảo sát bản đồ & mô hình 3D");
            p1.setPilotStatus(ProviderPilotStatus.AVAILABLE);
            pilots.save(p1);
        }
        ProviderPilot p2 = new ProviderPilot();
        p2.setProvider(fleet);
        p2.setPilotUser(fleetOwner);
        p2.setFullName("Kỹ sư Lê Hoàng Hải");
        p2.setPhone("0909300102");
        p2.setLicenseNumber("CC-BAY-DEMO-102");
        p2.setSpecialization("Kiểm tra nhiệt hạ tầng & điện mặt trời");
        p2.setPilotStatus(ProviderPilotStatus.AVAILABLE);
        pilots.save(p2);
    }

    private void ensureDemoListings(ProviderProfile fleet) {
        String slug = "khao-sat-ban-do-2d-du-an-minh-hoa";
        if (!listings.existsBySlug(slug)) {
            MarketplaceListing l = new MarketplaceListing();
            l.setProvider(fleet);
            l.setSlug(slug);
            l.setTitle("Khảo sát bản đồ trực giao 2D khu đất dự án");
            l.setSummary("Chụp ảnh lập thể và ghép bình đồ tiến độ theo dự án — giá minh hoạ.");
            l.setDescription("Dịch vụ khảo sát khu đất xây dựng theo lịch dự án — minh hoạ.");
            l.setListingType(ListingType.FLIGHT_SERVICE);
            l.setMissionType(MissionType.DATA_COLLECTION);
            l.setPricingModel(PricingModel.PER_HECTARE);
            l.setBasePriceVnd(new BigDecimal("450000"));
            l.setMinBookingUnits(new BigDecimal("5"));
            l.setProvince("TP. Hồ Chí Minh");
            l.setServiceRadiusKm(250);
            l.setCoverImageUrl("/images/process/step-05-data-handover.webp");
            l.setModerationStatus(ListingModerationStatus.PUBLISHED);
            l.setFeatured(true);
            listings.save(l);
        }
    }
}
