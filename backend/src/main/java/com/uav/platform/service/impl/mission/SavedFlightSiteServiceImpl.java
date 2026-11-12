package com.uav.platform.service.impl.mission;

import com.uav.platform.dto.request.mission.SavedFlightSiteUpsertRequest;
import com.uav.platform.dto.response.mission.FlightPlanResponse;
import com.uav.platform.dto.response.mission.SavedFlightSiteResponse;
import com.uav.platform.entity.mission.SavedFlightSite;
import com.uav.platform.entity.user.AppUser;
import com.uav.platform.enums.audit.AuditAction;
import com.uav.platform.error.SystemException;
import com.uav.platform.repository.mission.SavedFlightSiteRepository;
import com.uav.platform.repository.user.UserRepository;
import com.uav.platform.service.audit.AuditLogService;
import com.uav.platform.service.mission.MissionAccessService;
import com.uav.platform.service.mission.SavedFlightSiteService;

import lombok.RequiredArgsConstructor;

import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

@Service
@Transactional
@RequiredArgsConstructor
public class SavedFlightSiteServiceImpl implements SavedFlightSiteService {

    private static final long MAX_SAVED_SITES_PER_USER = 30;

    private final SavedFlightSiteRepository siteRepository;
    private final UserRepository userRepository;
    private final MissionAccessService accessService;
    private final AuditLogService auditLogService;

    @Override
    @Transactional(readOnly = true)
    public List<SavedFlightSiteResponse> listMySites(Authentication authentication) {
        AppUser user = requireUser(authentication);
        return siteRepository.findByUserIdOrderByUpdatedAtDescIdDesc(user.getId()).stream()
                .map(SavedFlightSiteServiceImpl::toResponse)
                .toList();
    }

    @Override
    public SavedFlightSiteResponse createSite(
            SavedFlightSiteUpsertRequest request, Authentication authentication) {
        AppUser user = requireUser(authentication);
        if (userRepository != null && user.getId() != null) {
            userRepository.findByIdForUpdate(user.getId());
        }
        if (siteRepository.countByUserId(user.getId()) >= MAX_SAVED_SITES_PER_USER) {
            throw SystemException.conflict(
                    "Mỗi tài khoản lưu tối đa 30 địa điểm bay thường dùng.",
                    "SAVED_SITE_LIMIT_REACHED");
        }

        SavedFlightSite site = new SavedFlightSite();
        site.setUser(user);
        site.setName(request.name().trim());
        site.setLocationName(request.locationName().trim());
        site.setDefaultMissionType(request.defaultMissionType());
        site.setNotes(
                request.notes() == null || request.notes().isBlank()
                        ? null
                        : request.notes().trim());

        if (request.flightPlan() != null) {
            FlightPlanResponse resolved = FlightPlanOperations.resolve(request.flightPlan());
            site.setFlightPlan(FlightPlanOperations.write(resolved));
            BigDecimal lat =
                    request.latitude() != null
                            ? request.latitude().setScale(7, RoundingMode.HALF_UP)
                            : BigDecimal.valueOf(resolved.centerLatitude())
                                    .setScale(7, RoundingMode.HALF_UP);
            BigDecimal lng =
                    request.longitude() != null
                            ? request.longitude().setScale(7, RoundingMode.HALF_UP)
                            : BigDecimal.valueOf(resolved.centerLongitude())
                                    .setScale(7, RoundingMode.HALF_UP);
            site.setLatitude(lat);
            site.setLongitude(lng);
        } else {
            if (request.latitude() == null || request.longitude() == null) {
                throw SystemException.badRequest(
                                "Chọn tọa độ khu vực bay hoặc vẽ hành lang bay trước khi lưu.",
                                "FLIGHT_TAKEOFF_REQUIRED")
                        .at("latitude");
            }
            site.setLatitude(request.latitude().setScale(7, RoundingMode.HALF_UP));
            site.setLongitude(request.longitude().setScale(7, RoundingMode.HALF_UP));
        }

        SavedFlightSite saved = siteRepository.save(site);
        if (auditLogService != null) {
            auditLogService.record(
                    user.getId(),
                    user.getUsername(),
                    AuditAction.CREATE,
                    "SAVED_FLIGHT_SITE",
                    saved.getId() == null ? saved.getName() : saved.getId().toString(),
                    saved.getName());
        }
        return toResponse(saved);
    }

    @Override
    public void deleteSite(Long id, Authentication authentication) {
        AppUser user = requireUser(authentication);
        SavedFlightSite site =
                siteRepository
                        .findByIdAndUserId(id, user.getId())
                        .orElseThrow(
                                () ->
                                        SystemException.notFound(
                                                "Không tìm thấy địa điểm bay đã lưu.",
                                                "SAVED_SITE_NOT_FOUND"));
        String name = site.getName();
        siteRepository.delete(site);
        if (auditLogService != null) {
            auditLogService.record(
                    user.getId(),
                    user.getUsername(),
                    AuditAction.DELETE,
                    "SAVED_FLIGHT_SITE",
                    id.toString(),
                    name);
        }
    }

    private AppUser requireUser(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw SystemException.unauthorized("Vui lòng đăng nhập để tiếp tục.");
        }
        return accessService.user(authentication.getName());
    }

    private static SavedFlightSiteResponse toResponse(SavedFlightSite site) {
        return new SavedFlightSiteResponse(
                site.getId(),
                site.getName(),
                site.getLocationName(),
                site.getLatitude(),
                site.getLongitude(),
                site.getDefaultMissionType(),
                FlightPlanOperations.read(site.getFlightPlan()),
                site.getNotes(),
                site.getCreatedAt(),
                site.getUpdatedAt());
    }
}
