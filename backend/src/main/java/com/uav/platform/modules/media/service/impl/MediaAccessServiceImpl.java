package com.uav.platform.modules.media.service.impl;

import com.uav.platform.modules.inventory.repository.EquipmentRepository;
import com.uav.platform.modules.media.entity.MediaAsset;
import com.uav.platform.modules.media.enums.*;
import com.uav.platform.modules.media.service.MediaAccessService;
import com.uav.platform.modules.mission.repository.MissionRepository;
import com.uav.platform.modules.permission.service.PermissionService;
import com.uav.platform.modules.station.repository.StationRepository;
import com.uav.platform.modules.uav.repository.UavRepository;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class MediaAccessServiceImpl implements MediaAccessService {
    private final PermissionService permissions;
    private final MissionRepository missions;
    private final StationRepository stations;
    private final UavRepository uavs;
    private final EquipmentRepository equipment;

    public MediaAccessServiceImpl(
            PermissionService permissions,
            MissionRepository missions,
            StationRepository stations,
            UavRepository uavs,
            EquipmentRepository equipment) {
        this.permissions = permissions;
        this.missions = missions;
        this.stations = stations;
        this.uavs = uavs;
        this.equipment = equipment;
    }

    @Override
    public org.springframework.data.jpa.domain.Specification<MediaAsset> readableBy(String actor) {
        if (actor == null) return (root, query, cb) -> cb.disjunction();
        var auth = UsernamePasswordAuthenticationToken.authenticated(actor, null, List.of());
        var scope =
                new com.uav.platform.modules.media.specification.MediaVisibilitySpecifications
                        .ReadPermissions(
                        permissions.has(auth, "MEDIA_MANAGE"),
                                permissions.has(auth, "MISSION_MEDIA_VIEW"),
                        permissions.has(auth, "MISSION_VIEW_ALL"),
                                permissions.has(auth, "STATION_READ"),
                        permissions.has(auth, "UAV_READ"), permissions.has(auth, "INVENTORY_READ"));
        return com.uav.platform.modules.media.specification.MediaVisibilitySpecifications
                .readableBy(actor, scope);
    }

    public void requireLink(String type, String id, String actor, boolean write) {
        if ((type == null || type.isBlank()) && (id == null || id.isBlank())) return;
        if (type == null || id == null)
            throw new IllegalArgumentException("Linked type and ID must both be supplied");
        long resourceId;
        try {
            resourceId = Long.parseLong(id);
        } catch (NumberFormatException ex) {
            throw new IllegalArgumentException("Linked ID must be numeric");
        }
        var auth = UsernamePasswordAuthenticationToken.authenticated(actor, null, List.of());
        switch (type) {
            case "MISSION" -> {
                String capability = write ? "MISSION_MEDIA_UPLOAD" : "MISSION_MEDIA_VIEW";
                if (!permissions.has(auth, capability)) throw denied();
                var mission =
                        (write
                                        ? missions.findByIdForUpdate(resourceId)
                                        : missions.findById(resourceId))
                                .orElseThrow(MediaAccessServiceImpl::denied);
                boolean visible =
                        permissions.has(auth, "MISSION_VIEW_ALL")
                                || mission.getCustomer().getUsername().equals(actor)
                                || (mission.getOperator() != null
                                        && mission.getOperator().getUsername().equals(actor));
                if (!visible) throw denied();
                if (write) mission.requireMediaWritable();
            }
            case "STATION" -> {
                if (!permissions.has(auth, write ? "STATION_MANAGE" : "STATION_READ")
                        || !stations.existsById(resourceId)) throw denied();
            }
            case "UAV" -> {
                if (!permissions.has(auth, write ? "UAV_MANAGE" : "UAV_READ")
                        || !uavs.existsById(resourceId)) throw denied();
            }
            case "EQUIPMENT" -> {
                if (!permissions.has(auth, write ? "INVENTORY_MANAGE" : "INVENTORY_READ")
                        || !equipment.existsById(resourceId)) throw denied();
            }
            default -> throw new IllegalArgumentException("Unsupported linked resource type");
        }
    }

    public void requireFile(MediaAsset asset, String actor, boolean write) {
        if (actor == null) throw denied();
        var auth = UsernamePasswordAuthenticationToken.authenticated(actor, null, List.of());
        requireLink(asset.getLinkedEntityType(), asset.getLinkedEntityId(), actor, write);
        if (!java.util.Objects.equals(asset.getUploadedBy(), actor)
                && !permissions.has(auth, "MEDIA_MANAGE")) {
            // Mission participants may view confirmed linked outputs but cannot overwrite another
            // uploader's file.
            if (write || !"MISSION".equals(asset.getLinkedEntityType())) throw denied();
        }
    }

    private static AccessDeniedException denied() {
        return new AccessDeniedException("File or linked resource access denied");
    }
}
