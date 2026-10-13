package com.uav.platform.modules.sar.service.impl;

import com.uav.platform.error.SystemException;
import com.uav.platform.modules.mission.entity.Mission;
import com.uav.platform.modules.mission.repository.MissionRepository;
import com.uav.platform.modules.sar.common.SarStatus;
import com.uav.platform.modules.sar.config.request.SarMissionRequest;
import com.uav.platform.modules.sar.config.response.SarMissionResponse;
import com.uav.platform.modules.sar.entity.SarMission;
import com.uav.platform.modules.sar.repository.SarMissionRepository;
import com.uav.platform.modules.sar.service.SarService;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class ISarService implements SarService {

    private final SarMissionRepository sarRepository;
    private final MissionRepository missionRepository;

    public ISarService(SarMissionRepository sarRepository, MissionRepository missionRepository) {
        this.sarRepository = sarRepository;
        this.missionRepository = missionRepository;
    }

    @Override
    public SarMissionResponse registerSar(SarMissionRequest request, Authentication authentication) {
        Mission mission = missionRepository.findById(request.missionId())
            .orElseThrow(() -> SystemException.notFound("Mission not found with id: " + request.missionId()));

        SarMission sar = sarRepository.findByMissionId(request.missionId())
            .orElseGet(() -> new SarMission(
                mission,
                request.searchAreaPolygon(),
                request.lkpLatitude(),
                request.lkpLongitude(),
                request.driftRadiusMeters(),
                request.emergencyContact(),
                request.victimCountEstimated(),
                request.notes()
            ));

        sar.setSearchAreaPolygon(request.searchAreaPolygon());
        sar.setLkpLatitude(request.lkpLatitude());
        sar.setLkpLongitude(request.lkpLongitude());
        if (request.driftRadiusMeters() != null) sar.setDriftRadiusMeters(request.driftRadiusMeters());
        if (request.emergencyContact() != null) sar.setEmergencyContact(request.emergencyContact());
        if (request.victimCountEstimated() != null) sar.setVictimCountEstimated(request.victimCountEstimated());
        if (request.notes() != null) sar.setNotes(request.notes());

        SarMission saved = sarRepository.save(sar);
        return toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public SarMissionResponse getByMissionId(Long missionId, Authentication authentication) {
        SarMission sar = sarRepository.findByMissionId(missionId)
            .orElseThrow(() -> SystemException.notFound("SAR details not found for mission id: " + missionId));
        return toResponse(sar);
    }

    @Override
    public SarMissionResponse updateSarStatus(Long missionId, SarStatus status, Authentication authentication) {
        SarMission sar = sarRepository.findByMissionId(missionId)
            .orElseThrow(() -> SystemException.notFound("SAR details not found for mission id: " + missionId));
        sar.setSarStatus(status);
        SarMission saved = sarRepository.save(sar);
        return toResponse(saved);
    }

    private SarMissionResponse toResponse(SarMission sar) {
        return new SarMissionResponse(
            sar.getId(),
            sar.getMission().getId(),
            sar.getSearchAreaPolygon(),
            sar.getLkpLatitude(),
            sar.getLkpLongitude(),
            sar.getDriftRadiusMeters(),
            sar.getSarStatus(),
            sar.getEmergencyContact(),
            sar.getVictimCountEstimated(),
            sar.getNotes(),
            sar.getCreatedAt(),
            sar.getUpdatedAt()
        );
    }
}
